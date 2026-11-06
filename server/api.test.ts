
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from './app';
import { Store } from './db';

let base = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nutricare-'));
const file = path.join(tempDir, 'db.json');

delete process.env.GEMINI_API_KEY;
process.env.JWT_SECRET = 'test-only-jwt-secret-at-least-32-characters-long';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'test-admin-password-123456';
process.env.ADMIN_NAME = 'Test Admin';

test('JWT secret rejects missing, default, and weak production secrets', () => {
  const original = process.env.JWT_SECRET;
  for (const value of ['', 'change-me', 'too-short-secret']) {
    process.env.JWT_SECRET = value;
    assert.throws(
      () => createApp(new Store(path.join(tempDir, `jwt-${Math.random()}.json`))),
      /JWT_SECRET must be set to a strong, persistent secret of at least 32 characters/,
    );
  }
  process.env.JWT_SECRET = original;
});

before(() => {
  server = createApp(new Store(file)).listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function call(
  method: string,
  url: string,
  body?: unknown,
  token?: string,
) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: res.status,
    json: (await res.json()) as Record<string, any>,
  };
}

const reg = async (email: string) =>
  (
    await call('POST', '/api/auth/register', {
      name: 'Test User',
      email,
      password: 'password123',
    })
  ).json.token as string;

test('production security configuration and baseline headers are enforced', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCors = process.env.CORS_ORIGIN;
  const originalRate = process.env.AUTH_RATE_LIMIT;

  process.env.NODE_ENV = 'production';
  delete process.env.CORS_ORIGIN;
  delete process.env.AUTH_RATE_LIMIT;
  const productionApp = createApp(new Store(path.join(tempDir, `production-${Math.random()}.json`)));
  const productionServer = productionApp.listen(0);
  const port = (productionServer.address() as AddressInfo).port;
  const res = await fetch(`http://localhost:${port}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  productionServer.close();

  process.env.NODE_ENV = originalNodeEnv;
  if (originalCors === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = originalCors;
  if (originalRate === undefined) delete process.env.AUTH_RATE_LIMIT; else process.env.AUTH_RATE_LIMIT = originalRate;
});

test('invalid auth rate limit configuration is rejected at startup', () => {
  const original = process.env.AUTH_RATE_LIMIT;
  for (const value of ['0', '4', '1001', 'not-a-number']) {
    process.env.AUTH_RATE_LIMIT = value;
    assert.throws(
      () => createApp(new Store(path.join(tempDir, `rate-${Math.random()}.json`))),
      /AUTH_RATE_LIMIT must be an integer between 5 and 1000/,
    );
  }
  if (original === undefined) delete process.env.AUTH_RATE_LIMIT; else process.env.AUTH_RATE_LIMIT = original;
});

test('registration validation, duplicates, login', async () => {
  assert.equal(
    (
      await call('POST', '/api/auth/register', {
        name: 'A',
        email: 'bad',
        password: '123',
      })
    ).status,
    400,
  );

  const token = await reg('a@test.com');
  assert.ok(token);

  assert.equal(
    (
      await call('POST', '/api/auth/register', {
        name: 'Test User',
        email: 'a@test.com',
        password: 'password123',
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await call('POST', '/api/auth/login', {
        email: 'a@test.com',
        password: 'wrongpass',
      })
    ).status,
    401,
  );

  assert.equal(
    (
      await call('POST', '/api/auth/login', {
        email: 'a@test.com',
        password: 'password123',
      })
    ).status,
    200,
  );
});

test('protected routes reject missing or bad tokens', async () => {
  assert.equal((await call('GET', '/api/me')).status, 401);

  assert.equal(
    (await call('GET', '/api/meals', undefined, 'garbage')).status,
    401,
  );
});

test('meal CRUD computes nutrition on the server and isolates users', async () => {
  const userA = await reg('m1@test.com');
  const userB = await reg('m2@test.com');

  const created = await call(
    'POST',
    '/api/meals',
    {
      date: '2026-10-20',
      mealType: 'breakfast',
      foodId: 'injera',
      quantity: 2,
      kcal: 99999,
    },
    userA,
  );

  assert.equal(created.status, 201);

  const meal = created.json.meals[0];
  assert.equal(meal.kcal, 380); // Client-sent kcal must be ignored.

  assert.equal(
    (
      await call(
        'GET',
        '/api/meals?date=2026-10-20',
        undefined,
        userB,
      )
    ).json.meals.length,
    0,
  );

  assert.equal(
    (await call('DELETE', `/api/meals/${meal.id}`, undefined, userB)).status,
    404,
  );

  const updated = await call(
    'PUT',
    `/api/meals/${meal.id}`,
    { quantity: 1 },
    userA,
  );

  assert.equal(updated.json.meal.kcal, 190);

  const daily = await call(
    'GET',
    '/api/meals?date=2026-10-20',
    undefined,
    userA,
  );

  assert.equal(daily.json.totals.kcal, 190);

  assert.equal(
    (await call('DELETE', `/api/meals/${meal.id}`, undefined, userA)).status,
    200,
  );

  assert.equal(
    (
      await call(
        'POST',
        '/api/meals',
        {
          date: '2026-10-20',
          mealType: 'lunch',
          foodId: 'nope',
          quantity: 1,
        },
        userA,
      )
    ).status,
    400,
  );
});

test('profile persists and targets update', async () => {
  const token = await reg('p@test.com');

  const result = await call(
    'PUT',
    '/api/me',
    {
      profile: {
        sex: 'female',
        age: 30,
        heightCm: 165,
        weightKg: 60,
        activity: 'light',
        goal: 'maintain',
        allergies: ['egg'],
      },
    },
    token,
  );

  assert.equal(result.json.targets.kcal, 1820);

  const profile = await call('GET', '/api/me', undefined, token);
  assert.deepEqual(profile.json.user.profile.allergies, ['egg']);
});

test('admin account is bootstrapped securely and admin routes are enforced', async () => {
  const regularUserToken = await reg('u@test.com');

  const reserved = await call('POST', '/api/auth/register', {
    name: 'Attacker',
    email: 'admin@test.com',
    password: 'password123',
  });

  assert.equal(
    reserved.status,
    403,
    `Registration using the reserved admin email should return 403, but returned ${reserved.status}: ${JSON.stringify(reserved.json)}`,
  );

  const reservedCaseVariant = await call('POST', '/api/auth/register', {
    name: 'Attacker Two',
    email: '  ADMIN@TEST.COM  ',
    password: 'password123',
  });
  assert.equal(reservedCaseVariant.status, 403);

  const adminLogin = await call('POST', '/api/auth/login', {
    email: 'admin@test.com',
    password: 'test-admin-password-123456',
  });

  assert.equal(
    adminLogin.status,
    200,
    `Configured admin login failed: ${JSON.stringify(adminLogin.json)}`,
  );

  const adminToken = adminLogin.json.token as string;
  assert.ok(adminToken);

  assert.equal(
    (await call('GET', '/api/admin/users', undefined, regularUserToken))
      .status,
    403,
  );

  assert.equal(
    (await call('GET', '/api/admin/users', undefined, adminToken)).status,
    200,
  );

  const secondAdminLikeUser = await reg('admin2@test.com');

  assert.equal(
    (
      await call(
        'GET',
        '/api/admin/users',
        undefined,
        secondAdminLikeUser,
      )
    ).status,
    403,
  );
});

test('food catalog marks allergy/diet compatibility and meal logging rejects conflicts', async () => {
  const token = await reg('policy-save@test.com');
  await call('PUT', '/api/me', { profile: { allergies: ['egg'], diets: ['vegan'] } }, token);

  const foods = await call('GET', '/api/foods', undefined, token);
  const egg = foods.json.foods.find((f: any) => f.id === 'egg');
  const shiro = foods.json.foods.find((f: any) => f.id === 'shiro');
  assert.equal(egg.allowed, false);
  assert.deepEqual(egg.blockReasons, ['allergy: egg', 'diet: vegan']);
  assert.equal(shiro.allowed, true);
  assert.deepEqual(shiro.blockReasons, []);

  const blocked = await call('POST', '/api/meals', {
    items: [{ date: '2026-10-28', mealType: 'snack', foodId: 'egg', quantity: 1, source: 'database' }],
  }, token);
  assert.equal(blocked.status, 400);
  assert.deepEqual(blocked.json.reasons, ['allergy: egg', 'diet: vegan']);
});

test('plan generation respects allergies; saving rejects conflicts', async () => {
  const token = await reg('plan@test.com');

  await call(
    'PUT',
    '/api/me',
    { profile: { allergies: ['egg'] } },
    token,
  );

  const generated = await call(
    'POST',
    '/api/plan/generate',
    { startDate: '2026-10-19', days: 5 },
    token,
  );

  assert.ok(
    !JSON.stringify(generated.json.plans).includes('"foodId":"egg"'),
  );

  assert.equal(
    (
      await call(
        'PUT',
        '/api/plan',
        {
          plans: {
            '2026-10-19': {
              snack: {
                name: 'Egg',
                items: [{ foodId: 'egg', quantity: 1 }],
              },
            },
          },
        },
        token,
      )
    ).status,
    400,
  );

  assert.equal(
    (
      await call(
        'PUT',
        '/api/plan',
        { plans: generated.json.plans },
        token,
      )
    ).status,
    200,
  );
});

test('AI endpoints fail clearly without a key and validate images', async () => {
  const token = await reg('ai@test.com');

  const chat = await call(
    'POST',
    '/api/ai/chat',
    { message: 'hello', mode: 'nutrition', lang: 'en', history: [] },
    token,
  );

  assert.equal(chat.status, 503);
  assert.equal(chat.json.code, 'AI_NOT_CONFIGURED');

  assert.equal(
    (
      await call(
        'POST',
        '/api/ai/analyze-image',
        { image: 'x'.repeat(200), mimeType: 'image/gif' },
        token,
      )
    ).status,
    400,
  );

  assert.equal(
    (
      await call(
        'POST',
        '/api/ai/analyze-image',
        { image: 'x'.repeat(200) + '!!', mimeType: 'image/png' },
        token,
      )
    ).status,
    400,
  );

  const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAJ3RFWHRjb21tZW50AE51dHJpQ2FyZSB0ZXN0IGltYWdlIHZhbGlkYXRpb24JC/sxAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC';
  assert.equal(
    (
      await call(
        'POST',
        '/api/ai/analyze-image',
        { image: onePixelPng, mimeType: 'image/png' },
        token,
      )
    ).status,
    503,
  );

  assert.equal(
    (
      await call(
        'POST',
        '/api/ai/analyze-image',
        { image: onePixelPng, mimeType: 'image/jpeg' },
        token,
      )
    ).status,
    400,
  );
});

test('analytics and water/weight use saved records', async () => {
  const token = await reg('an@test.com');
  const date = new Date().toISOString().slice(0, 10);

  await call('POST', '/api/water', { date, ml: 500 }, token);
  await call('POST', '/api/weights', { date, kg: 61.5 }, token);

  const analytics = await call(
    'GET',
    '/api/analytics?days=7',
    undefined,
    token,
  );

  assert.equal(analytics.json.daily.length, 7);
  assert.equal(analytics.json.daily[6].waterMl, 500);
  assert.equal(analytics.json.weights[0].kg, 61.5);
});

test('AI conversation history is isolated per user and mode', async () => {
  const token = await reg('conversation@test.com');
  const emptyNutrition = await call('GET', '/api/ai/conversations?mode=nutrition', undefined, token);
  assert.equal(emptyNutrition.status, 200);
  assert.deepEqual(emptyNutrition.json.messages, []);
  const badMode = await call('GET', '/api/ai/conversations?mode=bad', undefined, token);
  assert.equal(badMode.status, 400);
});
