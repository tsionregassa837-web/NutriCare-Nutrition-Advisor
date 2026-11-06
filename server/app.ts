
import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { computeTargets, nutritionForServings, sumMacros } from '../shared/nutrition';
import { MEAL_TYPES, type DayPlan, type Food, type MealEntry, type MealType, type Profile } from '../shared/types';
import { AiError, analyzePhoto, chat } from './ai';
import { Store, type User } from './db';
import { SEED_FOODS } from './foods';
import { candidatesFor, foodBlockReasons, generateDayPlan, isFoodAllowed } from './plans';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const mealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

const defaultProfile = (): Profile => ({ diets: [], allergies: [], units: 'metric', lang: 'en' });

const profileSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  sex: z.enum(['female', 'male']).optional(),
  heightCm: z.number().min(50).max(250).optional(),
  weightKg: z.number().min(10).max(400).optional(),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active']).optional(),
  goal: z.enum(['lose', 'maintain', 'gain']).optional(),
  diets: z.array(z.string().max(30)).max(10).optional(),
  allergies: z.array(z.string().max(40)).max(20).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  lang: z.enum(['en', 'am']).optional(),
});

export function createApp(store: Store) {
  const app = express();
  app.disable('x-powered-by');

  // In production, same-origin hosting does not need CORS. If a separate
  // frontend is used, CORS_ORIGIN must explicitly list the trusted origins.
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((x) => x.trim()).filter(Boolean) ?? [];
  if (corsOrigins.length) {
    app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }));
  } else if (process.env.NODE_ENV !== 'production') {
    // Development convenience only; production is fail-closed by default.
    app.use(cors());
  }

  // Small baseline security headers without adding another runtime dependency.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '9mb' }));

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === 'change-me' || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong, persistent secret of at least 32 characters. Refusing to start without it.');
  }

  const db = store.data;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && !adminPassword) {
    throw new Error('ADMIN_PASSWORD must be set whenever ADMIN_EMAIL is configured.');
  }
  if (adminEmail && adminPassword && adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }
  if (adminEmail && adminPassword) {
    const existingAdmin = db.users.find((u) => u.email.trim().toLowerCase() === adminEmail);
    if (!existingAdmin) {
      const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
      db.users.push({
        id: uid(),
        name,
        email: adminEmail,
        passwordHash: bcrypt.hashSync(adminPassword, 12),
        role: 'admin',
        profile: defaultProfile(),
        createdAt: new Date().toISOString(),
      });
      store.save();
    } else if (existingAdmin.role !== 'admin') {
      throw new Error(`ADMIN_EMAIL ${adminEmail} is already registered as a normal user. Refusing to promote it automatically.`);
    }
  }

  const foodMap = () => new Map<string, Food>([...SEED_FOODS, ...db.customFoods].map((f) => [f.id, f]));
  const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role, profile: u.profile });

  // ---------- middleware ----------
  const auth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Please sign in.' });
      return;
    }
    try {
      const payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] }) as { sub: string };
      const user = db.users.find((u) => u.id === payload.sub);
      if (!user) {
        res.status(401).json({ error: 'Account not found. Please sign in again.' });
        return;
      }
      res.locals.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
  };

  const admin = (_req: Request, res: Response, next: NextFunction) => {
    // Role is read from the database, never from the token or the client.
    if ((res.locals.user as User).role !== 'admin') {
      res.status(403).json({ error: 'Administrator access required.' });
      return;
    }
    next();
  };

  const me = (res: Response) => res.locals.user as User;

  // Zod 4 compatibility: use z.ZodType instead of z.ZodTypeAny.
  const parse = <T extends z.ZodType>(schema: T, data: unknown, res: Response): z.infer<T> | null => {
    const r = schema.safeParse(data);
    if (!r.success) {
      res.status(400).json({
        error: r.error.issues[0]?.message ?? 'Invalid request.',
        field: r.error.issues[0]?.path.join('.'),
      });
      return null;
    }
    return r.data;
  };

  const configuredAuthRateLimit = Number(process.env.AUTH_RATE_LIMIT ?? 30);
  if (!Number.isInteger(configuredAuthRateLimit) || configuredAuthRateLimit < 5 || configuredAuthRateLimit > 1000) {
    throw new Error('AUTH_RATE_LIMIT must be an integer between 5 and 1000.');
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: configuredAuthRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait and try again.' },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please wait a minute.' },
  });

  // ---------- health ----------
  app.get('/api/health', (_req, res) => res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  }));

  // ---------- auth ----------
  const registerSchema = z.object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(80),
    email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
  });

  app.post('/api/auth/register', authLimiter, (req, res) => {
    const b = parse(registerSchema, req.body, res);
    if (!b) return;

    // Reject attempts to register with the reserved administrator email first.
    if (adminEmail && b.email === adminEmail) {
      res.status(403).json({
        error: 'This email is reserved for the administrator account.',
      });
      return;
    }

    // Reject duplicate emails belonging to existing accounts.
    if (db.users.some((u) => u.email.trim().toLowerCase() === b.email)) {
      res.status(409).json({
        error: 'An account with this email already exists.',
      });
      return;
    }

    const user: User = {
      id: uid(),
      name: b.name,
      email: b.email,
      passwordHash: bcrypt.hashSync(b.password, 12),
      role: 'user',
      profile: defaultProfile(),
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    store.save();

    res.status(201).json({
      token: jwt.sign({ sub: user.id }, secret, { algorithm: 'HS256', expiresIn: '30d' }),
      user: publicUser(user),
    });
  });

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const b = parse(
      z.object({
        email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
        password: z.string().min(1, 'Enter your password.'),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const user = db.users.find((u) => u.email.trim().toLowerCase() === b.email);
    if (!user || !bcrypt.compareSync(b.password, user.passwordHash)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    res.json({
      token: jwt.sign({ sub: user.id }, secret, { algorithm: 'HS256', expiresIn: '30d' }),
      user: publicUser(user),
    });
  });

  // ---------- profile ----------
  app.get('/api/me', auth, (_req, res) => {
    const u = me(res);
    res.json({ user: publicUser(u), targets: computeTargets(u.profile) });
  });

  app.put('/api/me', auth, (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        profile: profileSchema.optional(),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    if (b.name) u.name = b.name;
    if (b.profile) u.profile = { ...u.profile, ...b.profile };
    store.save();
    res.json({ user: publicUser(u), targets: computeTargets(u.profile) });
  });

  app.put('/api/me/password', auth, (req, res) => {
    const b = parse(
      z.object({
        current: z.string(),
        next: z.string().min(8, 'New password must be at least 8 characters.').max(100),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    if (!bcrypt.compareSync(b.current, u.passwordHash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    u.passwordHash = bcrypt.hashSync(b.next, 12);
    store.save();
    res.json({ ok: true });
  });

  // ---------- foods ----------
  app.get('/api/foods', auth, (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const cat = String(req.query.category ?? '').toLowerCase();

    const list = [...foodMap().values()].filter((f) =>
      (!cat || cat === 'all' || f.category === cat) &&
      (!q || f.name.toLowerCase().includes(q) ||
        f.alt.some((a) => a.toLowerCase().includes(q)) ||
        (f.nameAm ?? '').includes(q)));

    const u = me(res);
    res.json({
      foods: list.map((f) => ({
        ...f,
        kcalPerServing: nutritionForServings(f, 1).kcal,
        allowed: isFoodAllowed(f, u.profile),
        blockReasons: foodBlockReasons(f, u.profile),
      })),
    });
  });

  // ---------- meals ----------
  const publicMeal = ({ userId: _u, ...m }: MealEntry & { userId: string }): MealEntry => m;

  const entryFor = (
    food: Food,
    quantity: number,
  ): Pick<MealEntry, 'foodId' | 'name' | 'quantity' | 'servingLabel' | 'grams' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'> => {
    const n = nutritionForServings(food, quantity);
    return {
      foodId: food.id,
      name: food.name,
      quantity,
      servingLabel: food.servingLabel,
      grams: n.grams,
      kcal: n.kcal,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
    };
  };

  const mealBody = z.object({
    date: dateStr,
    mealType,
    foodId: z.string().min(1),
    quantity: z.number().min(0.25, 'Quantity must be at least 0.25.').max(20),
    source: z.enum(['database', 'ai-photo']).optional(),
  });

  app.get('/api/meals', auth, (req, res) => {
    const date = dateStr.safeParse(req.query.date ?? today());
    if (!date.success) {
      res.status(400).json({ error: 'Invalid date.' });
      return;
    }

    const meals = db.meals
      .filter((m) => m.userId === me(res).id && m.date === date.data)
      .map(publicMeal);

    res.json({
      meals,
      totals: sumMacros(meals.map((m) => ({
        kcal: m.kcal,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        fiber: m.fiber,
      }))),
    });
  });

  app.post('/api/meals', auth, (req, res) => {
    const b = parse(
      z.union([mealBody, z.object({ items: z.array(mealBody).min(1).max(20) })]),
      req.body,
      res,
    );
    if (!b) return;

    const foods = foodMap();
    const list = 'items' in b ? b.items : [b];
    const created: MealEntry[] = [];

    for (const item of list) {
      const food = foods.get(item.foodId);
      if (!food) {
        res.status(400).json({ error: `Unknown food: ${item.foodId}` });
        return;
      }

      const reasons = foodBlockReasons(food, me(res).profile);
      if (reasons.length) {
        res.status(400).json({
          error: `${food.name} cannot be logged because it conflicts with your settings.`,
          reasons,
        });
        return;
      }

      const entry = {
        id: uid(),
        userId: me(res).id,
        date: item.date,
        mealType: item.mealType,
        ...entryFor(food, item.quantity),
        source: item.source ?? 'database',
        createdAt: new Date().toISOString(),
      } as MealEntry & { userId: string };

      db.meals.push(entry);
      created.push(publicMeal(entry));
    }

    store.save();
    res.status(201).json({ meals: created });
  });

  app.put('/api/meals/:id', auth, (req, res) => {
    const b = parse(
      z.object({
        quantity: z.number().min(0.25).max(20).optional(),
        mealType: mealType.optional(),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const m = db.meals.find((x) => x.id === req.params.id && x.userId === me(res).id);
    if (!m) {
      res.status(404).json({ error: 'Meal entry not found.' });
      return;
    }

    const food = foodMap().get(m.foodId);
    if (b.mealType) m.mealType = b.mealType;

    if (b.quantity !== undefined) {
      if (!food) {
        res.status(400).json({ error: 'This food no longer exists.' });
        return;
      }

      const reasons = foodBlockReasons(food, me(res).profile);
      if (reasons.length) {
        res.status(400).json({
          error: `${food.name} cannot be logged because it conflicts with your settings.`,
          reasons,
        });
        return;
      }

      Object.assign(m, entryFor(food, b.quantity));
    }

    store.save();
    res.json({ meal: publicMeal(m) });
  });

  app.delete('/api/meals/:id', auth, (req, res) => {
    const i = db.meals.findIndex((x) => x.id === req.params.id && x.userId === me(res).id);
    if (i < 0) {
      res.status(404).json({ error: 'Meal entry not found.' });
      return;
    }

    db.meals.splice(i, 1);
    store.save();
    res.json({ ok: true });
  });

  // ---------- summary / analytics ----------
  const waterFor = (userId: string, date: string) =>
    db.water.filter((w) => w.userId === userId && w.date === date).reduce((a, w) => a + w.ml, 0);

  app.get('/api/summary', auth, (req, res) => {
    const date = dateStr.safeParse(req.query.date ?? today());
    if (!date.success) {
      res.status(400).json({ error: 'Invalid date.' });
      return;
    }

    const u = me(res);
    const meals = db.meals.filter((m) => m.userId === u.id && m.date === date.data).map(publicMeal);
    const totals = sumMacros(meals.map((m) => ({
      kcal: m.kcal,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
    })));

    res.json({
      date: date.data,
      targets: computeTargets(u.profile),
      totals,
      meals,
      waterMl: waterFor(u.id, date.data),
    });
  });

  app.get('/api/analytics', auth, (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 120);
    const endQ = dateStr.safeParse(req.query.end);
    const end = endQ.success ? endQ.data : today();
    const start = addDays(end, -(days - 1));
    const u = me(res);

    const daily = Array.from({ length: days }, (_, i) => {
      const date = addDays(start, i);
      const t = sumMacros(db.meals.filter((m) => m.userId === u.id && m.date === date));
      return { date, ...t, waterMl: waterFor(u.id, date) };
    });

    const weights = db.weights
      .filter((w) => w.userId === u.id && w.date >= start && w.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, kg }) => ({ date, kg }));

    res.json({ days, daily, weights, targets: computeTargets(u.profile) });
  });

  app.post('/api/weights', auth, (req, res) => {
    const b = parse(z.object({ date: dateStr, kg: z.number().min(10).max(400) }), req.body, res);
    if (!b) return;

    const u = me(res);
    const existing = db.weights.find((w) => w.userId === u.id && w.date === b.date);
    if (existing) existing.kg = b.kg;
    else db.weights.push({ userId: u.id, ...b });

    const latest = db.weights
      .filter((w) => w.userId === u.id)
      .sort((a, c) => c.date.localeCompare(a.date))[0];

    if (latest) u.profile.weightKg = latest.kg;
    store.save();
    res.status(201).json({ ok: true });
  });

  app.post('/api/water', auth, (req, res) => {
    const b = parse(
      z.object({ date: dateStr, ml: z.number().int().min(-2000).max(2000) }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    const entry = db.water.find((w) => w.userId === u.id && w.date === b.date);
    if (entry) entry.ml = Math.max(0, entry.ml + b.ml);
    else db.water.push({ userId: u.id, date: b.date, ml: Math.max(0, b.ml) });

    store.save();
    res.json({ waterMl: waterFor(u.id, b.date) });
  });

  app.get('/api/activity', auth, (req, res) => {
    const from = dateStr.safeParse(req.query.from);
    const to = dateStr.safeParse(req.query.to);
    if (!from.success || !to.success) {
      res.status(400).json({ error: 'from and to dates are required.' });
      return;
    }

    res.json({
      done: db.activity
        .filter((a) => a.userId === me(res).id && a.date >= from.data && a.date <= to.data)
        .map((a) => a.date),
    });
  });

  app.post('/api/activity', auth, (req, res) => {
    const b = parse(z.object({ date: dateStr, done: z.boolean() }), req.body, res);
    if (!b) return;

    const u = me(res);
    db.activity = db.activity.filter((a) => !(a.userId === u.id && a.date === b.date));
    if (b.done) db.activity.push({ userId: u.id, date: b.date });

    store.save();
    res.json({ ok: true });
  });

  // ---------- meal planner (deterministic, uses the food database; no AI needed) ----------
  app.post('/api/plan/generate', auth, (req, res) => {
    const b = parse(
      z.object({
        startDate: dateStr,
        days: z.number().int().min(1).max(7).default(5),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    const t = computeTargets(u.profile);
    const foods = foodMap();
    const plans: Record<string, DayPlan> = {};

    for (let i = 0; i < b.days; i++) {
      plans[addDays(b.startDate, i)] = generateDayPlan(t.kcal, foods, u.profile, i);
    }

    res.json({
      plans,
      note: 'Suggestions respect your allergies and diet choices, but always check ingredients yourself.',
    });
  });

  app.get('/api/plan/alternatives', auth, (req, res) => {
    const slot = mealType.safeParse(req.query.slot);
    if (!slot.success) {
      res.status(400).json({ error: 'Invalid meal slot.' });
      return;
    }

    const exclude = String(req.query.exclude ?? '');
    res.json({ meals: candidatesFor(slot.data, foodMap(), me(res).profile).filter((m) => m.name !== exclude) });
  });

  app.get('/api/plan', auth, (req, res) => {
    const from = dateStr.safeParse(req.query.from);
    const to = dateStr.safeParse(req.query.to);
    if (!from.success || !to.success) {
      res.status(400).json({ error: 'from and to dates are required.' });
      return;
    }

    const plans: Record<string, DayPlan> = {};
    db.plans
      .filter((p) => p.userId === me(res).id && p.date >= from.data && p.date <= to.data)
      .forEach((p) => {
        plans[p.date] = p.plan;
      });

    res.json({ plans });
  });

  app.put('/api/plan', auth, (req, res) => {
    const item = z.object({
      foodId: z.string(),
      quantity: z.number().min(0.25).max(20),
    });

    const meal = z.object({
      name: z.string().max(100),
      items: z.array(item).min(1).max(10),
    });

    // Zod 4: partialRecord preserves optional meal slots in a daily plan.
    const b = parse(
      z.object({
        plans: z.record(dateStr, z.partialRecord(mealType, meal)),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    const foods = foodMap();

    for (const [date, day] of Object.entries(b.plans)) {
      const rebuilt: DayPlan = {};

      for (const slot of MEAL_TYPES) {
        const m = (day as Record<string, z.infer<typeof meal> | undefined>)[slot];
        if (!m) continue;

        const items = [];
        const macros = [];

        for (const it of m.items) {
          const food = foods.get(it.foodId);
          if (!food) {
            res.status(400).json({ error: `Unknown food: ${it.foodId}` });
            return;
          }

          if (!isFoodAllowed(food, u.profile)) {
            res.status(400).json({ error: `${food.name} conflicts with your allergies or diet settings.` });
            return;
          }

          items.push({
            foodId: food.id,
            name: food.name,
            quantity: it.quantity,
            servingLabel: food.servingLabel,
          });

          macros.push(nutritionForServings(food, it.quantity));
        }

        const s = sumMacros(macros);
        rebuilt[slot as MealType] = {
          name: m.name,
          items,
          kcal: s.kcal,
          protein: s.protein,
          carbs: s.carbs,
          fat: s.fat,
        };
      }

      db.plans = db.plans.filter((p) => !(p.userId === u.id && p.date === date));
      db.plans.push({ userId: u.id, date, plan: rebuilt });
    }

    store.save();
    res.json({ ok: true });
  });

  // ---------- AI ----------
  const handleAi = (res: Response, e: unknown) => {
    if (e instanceof AiError) {
      res.status(e.status).json({ error: e.message, code: e.code });
      return;
    }

    console.error('AI route error:', e instanceof Error ? e.message : e);
    res.status(500).json({ error: 'Something went wrong.' });
  };

  app.get('/api/ai/conversations', auth, (req, res) => {
    const mode = z.enum(['nutrition', 'fitness']).safeParse(req.query.mode);
    if (!mode.success) {
      res.status(400).json({ error: 'mode must be nutrition or fitness.' });
      return;
    }

    const u = me(res);
    const messages = db.conversations
      .filter((m) => m.userId === u.id && m.mode === mode.data)
      .slice(-50);

    res.json({
      messages: messages.map(({ role, text, createdAt }) => ({ role, text, createdAt })),
    });
  });

  app.post('/api/ai/chat', auth, aiLimiter, async (req, res) => {
    const b = parse(
      z.object({
        message: z.string().trim().min(1).max(1000),
        mode: z.enum(['nutrition', 'fitness']).default('nutrition'),
        lang: z.enum(['en', 'am']).default('en'),
        history: z.array(
          z.object({
            role: z.enum(['user', 'model']),
            text: z.string().max(2000),
          }),
        ).max(10).default([]),
        date: dateStr.optional(),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const u = me(res);
    const t = computeTargets(u.profile);
    const totals = sumMacros(db.meals.filter((m) => m.userId === u.id && m.date === (b.date ?? today())));

    // Only what the advisor needs. No name, email or exact identifiers are sent.
    const ctx = [
      `Goal: ${u.profile.goal ?? 'not set'}; activity: ${u.profile.activity ?? 'not set'}; age: ${u.profile.age ?? 'not set'}`,
      `Diet preferences: ${u.profile.diets.join(', ') || 'none'}; allergies: ${u.profile.allergies.join(', ') || 'none'}`,
      `Daily target ~${t.kcal} kcal${t.isDefault ? ' (default, profile incomplete)' : ''}; eaten today ${totals.kcal} kcal (protein ${totals.protein} g, carbs ${totals.carbs} g, fat ${totals.fat} g).`,
    ].join('\n');

    try {
      const reply = await chat({
        context: ctx,
        mode: b.mode,
        lang: b.lang,
        history: b.history,
        message: b.message,
      });

      db.conversations.push({
        userId: u.id,
        mode: b.mode,
        role: 'user',
        text: b.message,
        createdAt: new Date().toISOString(),
      });

      db.conversations.push({
        userId: u.id,
        mode: b.mode,
        role: 'model',
        text: reply,
        createdAt: new Date().toISOString(),
      });

      db.conversations = db.conversations.slice(-500);
      store.save();
      res.json({ reply });
    } catch (e) {
      handleAi(res, e);
    }
  });

  app.post('/api/ai/analyze-image', auth, aiLimiter, async (req, res) => {
    // Zod 4: use the error option instead of the removed errorMap option.
    const b = parse(
      z.object({
        image: z.string().min(100, 'Image is missing.'),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
          error: () => 'Only JPEG, PNG or WebP images are supported.',
        }),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const base64 = b.image.replace(/^data:[^,]+,/, '').replace(/\s/g, '');

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1) {
      res.status(400).json({ error: 'Image data is not valid.' });
      return;
    }

    const imageBytes = Buffer.from(base64, 'base64');
    if (!imageBytes.length) {
      res.status(400).json({ error: 'Image data is empty.' });
      return;
    }

    if (imageBytes.length > 6 * 1024 * 1024) {
      res.status(413).json({ error: 'Image is too large (max 6 MB).' });
      return;
    }

    const isJpeg = b.mimeType === 'image/jpeg' &&
      imageBytes[0] === 0xff &&
      imageBytes[1] === 0xd8 &&
      imageBytes[2] === 0xff;

    const isPng = b.mimeType === 'image/png' &&
      imageBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const isWebp = b.mimeType === 'image/webp' &&
      imageBytes.length >= 12 &&
      imageBytes.toString('ascii', 0, 4) === 'RIFF' &&
      imageBytes.toString('ascii', 8, 12) === 'WEBP';

    if (!(isJpeg || isPng || isWebp)) {
      res.status(400).json({ error: 'Image bytes do not match the declared image type.' });
      return;
    }

    const u = me(res);
    const foods = foodMap();

    // Give the vision model the full catalog so it can identify foods that may
    // conflict with the user's profile. The server, not the model, decides
    // whether an identified food is safe to include in the result.
    const catalog = [...foods.values()].map((f) => ({
      id: f.id,
      name: f.name,
      serving: f.servingLabel,
    }));

    try {
      const out = await analyzePhoto({ base64, mimeType: b.mimeType, catalog });
      const items = [];
      const unmatched: string[] = [];
      const blocked: {
        foodId: string;
        name: string;
        servings: number;
        confidence: number;
        reasons: string[];
      }[] = [];

      for (const f of out.foods) {
        const food = (f.foodId ? foods.get(f.foodId) : undefined) ??
          [...foods.values()].find((x) =>
            x.name.toLowerCase() === f.name.toLowerCase() ||
            x.alt.some((a) => a.toLowerCase() === f.name.toLowerCase()));

        if (!food) {
          unmatched.push(f.name);
          continue;
        }

        const reasons = foodBlockReasons(food, u.profile);
        if (reasons.length) {
          blocked.push({
            foodId: food.id,
            name: food.name,
            servings: f.servings,
            confidence: f.confidence,
            reasons,
          });
          continue;
        }

        items.push({
          ...entryFor(food, f.servings),
          confidence: f.confidence,
          allergenWarning: false,
        });
      }

      const total = sumMacros(items);
      res.json({
        items,
        blocked,
        unmatched,
        total,
        notes: out.notes ?? '',
        disclaimer: 'Estimated from a photo. Portions, oil and hidden ingredients cannot be seen, so please review and correct.',
      });
    } catch (e) {
      handleAi(res, e);
    }
  });

  // ---------- admin ----------
  app.get('/api/admin/stats', auth, admin, (_req, res) =>
    res.json({
      users: db.users.length,
      meals: db.meals.length,
      customFoods: db.customFoods.length,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    }),
  );

  app.get('/api/admin/users', auth, admin, (_req, res) =>
    res.json({
      users: db.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    }),
  );

  app.post('/api/admin/foods', auth, admin, (req, res) => {
    const n = z.number().min(0).max(2000);
    const b = parse(
      z.object({
        name: z.string().min(2).max(80),
        category: z.enum(['ethiopian', 'grains', 'protein', 'vegetables', 'fruit', 'drinks', 'other']),
        servingLabel: z.string().min(1).max(30),
        servingGrams: z.number().min(1).max(2000),
        kcal: n,
        protein: n,
        carbs: n,
        fat: n,
        fiber: n.default(0),
        allergens: z.array(z.string()).default([]),
        diet: z.array(z.string()).default([]),
        source: z.string().max(200).default('Added by administrator'),
      }),
      req.body,
      res,
    );
    if (!b) return;

    const food: Food = {
      id: `custom-${uid().slice(0, 8)}`,
      name: b.name,
      alt: [],
      category: b.category,
      servingLabel: b.servingLabel,
      servingGrams: b.servingGrams,
      per100g: {
        kcal: b.kcal,
        protein: b.protein,
        carbs: b.carbs,
        fat: b.fat,
        fiber: b.fiber,
      },
      allergens: b.allergens,
      diet: b.diet,
      source: b.source,
      quality: 'custom',
    };

    db.customFoods.push(food);
    store.save();
    res.status(201).json({ food });
  });

  app.delete('/api/admin/foods/:id', auth, admin, (req, res) => {
    const i = db.customFoods.findIndex((f) => f.id === req.params.id);
    if (i < 0) {
      res.status(404).json({ error: 'Custom food not found.' });
      return;
    }

    db.customFoods.splice(i, 1);
    store.save();
    res.json({ ok: true });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // Malformed JSON should be a client error, not an opaque 500.
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body contains invalid JSON.' });
      return;
    }
    next(err);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
