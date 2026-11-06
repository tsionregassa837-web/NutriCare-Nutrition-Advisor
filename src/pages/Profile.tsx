import { useEffect, useState, type FormEvent } from 'react';
import type { ActivityLevel, Goal, Profile as P, Sex } from '../../shared/types';
import { api } from '../api';
import { ErrorNote, Icon, LoadingNote, Screen, TopBar, useAsync } from '../components/ui';
import { useApp } from '../ctx';

export function Profile() {
  const { user, t, go, logout, refresh } = useApp();
  const [err, setErr] = useState('');
  if (!user) return null;
  const update = async (profile: Partial<P>) => { try { await api('/me', { method: 'PUT', body: { profile } }); await refresh(); } catch (e) { setErr((e as Error).message); } };
  const Row = ({ label, value, onClick }: { label: string; value?: string; onClick: () => void }) => (
    <button className="menu-row" onClick={onClick}><span>{label}</span><span className="muted">{value}<Icon name="chevron" size={16} /></span></button>
  );
  return (
    <Screen nav="profile">
      <div className="profile-head"><div className="avatar big">{user.name.charAt(0).toUpperCase()}</div><h1>{user.name}</h1><button className="btn small" onClick={() => go('/profile/account')}>{t('editProfile')}</button></div>
      <ErrorNote msg={err} />
      <p className="section-hdr">{t('nutritionHdr')}</p>
      <div className="card menu"><Row label={t('goals')} onClick={() => go('/profile/goals')} /><Row label={t('dietPrefs')} onClick={() => go('/profile/diet')} /><Row label={t('allergies')} onClick={() => go('/profile/allergies')} /><Row label={t('analytics')} onClick={() => go('/analytics')} /></div>
      <p className="section-hdr">{t('settingsHdr')}</p>
      <div className="card menu">
        <Row label={t('units')} value={user.profile.units === 'metric' ? 'Metric' : 'Imperial'} onClick={() => update({ units: user.profile.units === 'metric' ? 'imperial' : 'metric' })} />
        <Row label={t('language')} value={user.profile.lang === 'en' ? 'English' : 'አማርኛ'} onClick={() => update({ lang: user.profile.lang === 'en' ? 'am' : 'en' })} />
        <Row label={t('account')} onClick={() => go('/profile/account')} />
      </div>
      <button className="btn danger" onClick={logout}>{t('logOut')}</button>
      <p className="muted small center">{t('disclaimer')}</p>
    </Screen>
  );
}

const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;
const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
const inToCm = (i: number) => Math.round(i * 2.54 * 10) / 10;

export function ProfileSub({ page, setup = false }: { page: string; setup?: boolean }) {
  const { user, targets, t, refresh, go } = useApp();
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [prof, setProf] = useState<P | null>(user?.profile ?? null);
  const [name, setName] = useState(user?.name ?? '');
  const [tag, setTag] = useState('');
  useEffect(() => { if (user) { setProf(user.profile); setName(user.name); } }, [user]);
  if (!user || !prof) return null;
  const imperial = prof.units === 'imperial';

  async function save(body: { name?: string; profile?: Partial<P> }, ok = 'Saved.'): Promise<boolean> {
    setErr(''); setMsg('');
    try { await api('/me', { method: 'PUT', body }); await refresh(); setMsg(ok); return true; } catch (e) { setErr((e as Error).message); return false; }
  }
  const num = (v: string) => (v === '' ? undefined : Number(v));

  if (page === 'goals') {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const { age, sex, heightCm, weightKg, activity, goal } = prof;
      void save({ profile: { age, sex, heightCm, weightKg, activity, goal } }, 'Goals saved.').then((ok) => { if (ok && setup) go('/home'); });
    };
    return (
      <Screen nav="profile"><TopBar title={t('goals')} back={setup ? undefined : '/profile'} />
        {setup && <section className="card"><h3>Welcome to NutriCare, {user.name.split(' ')[0]}!</h3><p className="muted small">Tell us a little about you so we can estimate your daily calorie and nutrient targets. You can change this any time in Profile.</p></section>}
        <form onSubmit={submit}>
          <label className="field">Sex (used for the energy-needs formula)<select value={prof.sex ?? ''} onChange={(e) => setProf({ ...prof, sex: (e.target.value || undefined) as Sex | undefined })}><option value="">Select</option><option value="female">Female</option><option value="male">Male</option></select></label>
          <label className="field">Age<input type="number" inputMode="numeric" value={prof.age ?? ''} onChange={(e) => setProf({ ...prof, age: num(e.target.value) })} /></label>
          <label className="field">Height ({imperial ? 'in' : 'cm'})<input type="number" inputMode="decimal" value={prof.heightCm === undefined ? '' : imperial ? cmToIn(prof.heightCm) : prof.heightCm} onChange={(e) => { const v = num(e.target.value); setProf({ ...prof, heightCm: v === undefined ? undefined : imperial ? inToCm(v) : v }); }} /></label>
          <label className="field">Weight ({imperial ? 'lb' : 'kg'})<input type="number" inputMode="decimal" value={prof.weightKg === undefined ? '' : imperial ? kgToLb(prof.weightKg) : prof.weightKg} onChange={(e) => { const v = num(e.target.value); setProf({ ...prof, weightKg: v === undefined ? undefined : imperial ? lbToKg(v) : v }); }} /></label>
          <label className="field">Activity level<select value={prof.activity ?? ''} onChange={(e) => setProf({ ...prof, activity: (e.target.value || undefined) as ActivityLevel | undefined })}><option value="">Select</option><option value="sedentary">Mostly sitting</option><option value="light">Light (1–3 days/week)</option><option value="moderate">Moderate (3–5 days/week)</option><option value="active">Very active (6–7 days/week)</option></select></label>
          <label className="field">Goal<select value={prof.goal ?? ''} onChange={(e) => setProf({ ...prof, goal: (e.target.value || undefined) as Goal | undefined })}><option value="">Select</option><option value="lose">Gentle weight loss</option><option value="maintain">Maintain weight</option><option value="gain">Gain weight</option></select></label>
          <ErrorNote msg={err} />{msg && <p className="ok">{msg}</p>}
          <button className="btn primary">{setup ? 'Save and continue' : t('save')}</button>
          {setup && <button type="button" className="link center" onClick={() => go('/home')}>Skip for now</button>}
        </form>
        {targets && <section className="card"><h3>Your estimated targets</h3>
          <p><strong>{targets.kcal} kcal</strong> · P {targets.protein}g · C {targets.carbs}g · F {targets.fat}g</p>
          {targets.bmi !== null && <p className="muted small">BMI {targets.bmi} · BMR ≈ {targets.bmr} kcal</p>}
          {targets.notes.map((n) => <p className="muted small" key={n}>{n}</p>)}</section>}
        <p className="muted small center">Only the details needed for these estimates are stored. They are not shared with AI beyond goal, activity and age.</p>
      </Screen>
    );
  }
  if (page === 'diet') {
    const opts = [['vegetarian', 'Vegetarian (no meat or fish)'], ['vegan', 'Vegan (no animal products)'], ['fasting', 'Fasting-day foods (no meat, dairy or eggs)']];
    const toggle = (k: string) => setProf({ ...prof, diets: prof.diets.includes(k) ? prof.diets.filter((x) => x !== k) : [...prof.diets, k] });
    return (
      <Screen nav="profile"><TopBar title={t('dietPrefs')} back="/profile" />
        <div className="card menu">{opts.map(([k, l]) => <label key={k} className="check-row"><input type="checkbox" checked={prof.diets.includes(k)} onChange={() => toggle(k)} />{l}</label>)}</div>
        <p className="muted small">Meal plans only include foods tagged for every choice you select.</p>
        <ErrorNote msg={err} />{msg && <p className="ok">{msg}</p>}
        <button className="btn primary" onClick={() => save({ profile: { diets: prof.diets } })}>{t('save')}</button>
      </Screen>
    );
  }
  if (page === 'allergies') {
    const add = (v: string) => { const x = v.trim().toLowerCase(); if (x && !prof.allergies.includes(x)) setProf({ ...prof, allergies: [...prof.allergies, x] }); setTag(''); };
    return (
      <Screen nav="profile"><TopBar title={t('allergies')} back="/profile" />
        <div className="chips">{prof.allergies.map((a) => <button key={a} className="chip on" onClick={() => setProf({ ...prof, allergies: prof.allergies.filter((x) => x !== a) })}>{a} ×</button>)}{prof.allergies.length === 0 && <p className="muted">No allergies listed.</p>}</div>
        <div className="chips scroll">{['egg', 'milk', 'peanut', 'gluten', 'fish'].map((c) => <button key={c} className="chip" onClick={() => add(c)}>+ {c}</button>)}</div>
        <form className="add-line" onSubmit={(e) => { e.preventDefault(); add(tag); }}><input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Other allergy or food to avoid" maxLength={40} /><button className="btn small">{t('add')}</button></form>
        <p className="muted small">Listed items are excluded from meal plans and flagged in photo results. This is a helper, not a guarantee: always check labels and ingredients.</p>
        <ErrorNote msg={err} />{msg && <p className="ok">{msg}</p>}
        <button className="btn primary" onClick={() => save({ profile: { allergies: prof.allergies } })}>{t('save')}</button>
      </Screen>
    );
  }
  if (page === 'account') return <Account name={name} setName={setName} save={() => save({ name })} msg={msg} err={err} />;
  if (page === 'admin' && user.role === 'admin') return <Admin />;
  go('/profile'); return null;
}

function Account({ name, setName, save, msg, err }: { name: string; setName: (v: string) => void; save: () => void; msg: string; err: string }) {
  const { user, t, go } = useApp();
  const [pw, setPw] = useState({ current: '', next: '' }); const [pwMsg, setPwMsg] = useState(''); const [pwErr, setPwErr] = useState('');
  async function change(e: FormEvent) {
    e.preventDefault(); setPwErr(''); setPwMsg('');
    try { await api('/me/password', { method: 'PUT', body: pw }); setPwMsg('Password changed.'); setPw({ current: '', next: '' }); } catch (x) { setPwErr((x as Error).message); }
  }
  return (
    <Screen nav="profile"><TopBar title={t('account')} back="/profile" />
      <label className="field">Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field">{t('email')}<input value={user?.email ?? ''} disabled /></label>
      <ErrorNote msg={err} />{msg && <p className="ok">{msg}</p>}
      <button className="btn primary" onClick={save}>{t('save')}</button>
      <h3>Change password</h3>
      <form onSubmit={change}>
        <label className="field">Current password<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></label>
        <label className="field">New password<input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" /></label>
        <ErrorNote msg={pwErr} />{pwMsg && <p className="ok">{pwMsg}</p>}
        <button className="btn">Change password</button>
      </form>
      {user?.role === 'admin' && <button className="btn" onClick={() => go('/profile/admin')}>Administrator tools</button>}
    </Screen>
  );
}

function Admin() {
  const stats = useAsync(() => api<{ users: number; meals: number; customFoods: number; aiConfigured: boolean }>('/admin/stats'), []);
  const users = useAsync(() => api<{ users: { id: string; name: string; email: string; role: string }[] }>('/admin/users'), []);
  const [f, setF] = useState({ name: '', category: 'ethiopian', servingLabel: '1 serving', servingGrams: '100', kcal: '', protein: '', carbs: '', fat: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  async function add(e: FormEvent) {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await api('/admin/foods', { method: 'POST', body: { name: f.name, category: f.category, servingLabel: f.servingLabel, servingGrams: Number(f.servingGrams), kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat), source: 'Added by administrator' } });
      setMsg('Food added (values are per 100 g).'); setF({ ...f, name: '', kcal: '', protein: '', carbs: '', fat: '' });
    } catch (x) { setErr((x as Error).message); }
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Screen nav="profile"><TopBar title="Administrator" back="/profile/account" />
      <ErrorNote msg={stats.error ?? users.error} />
      {(stats.loading || users.loading) && <LoadingNote label="Loading administrator data…" />}
      {stats.data && <section className="card"><p>Users: <strong>{stats.data.users}</strong> · Meal entries: <strong>{stats.data.meals}</strong> · Custom foods: <strong>{stats.data.customFoods}</strong></p><p className="muted small">AI service: {stats.data.aiConfigured ? 'API key configured' : 'not configured'}</p></section>}
      <h3>Users</h3>
      <div className="card">{!users.loading && users.data?.users.length === 0 && <p className="muted small">No users found.</p>}{users.data?.users.map((u) => <p key={u.id} className="small">{u.name} · {u.email} · <em>{u.role}</em></p>)}</div>
      <h3>Add a food (per 100 g)</h3>
      <form onSubmit={add}>
        <label className="field">Name<input value={f.name} onChange={set('name')} required /></label>
        <label className="field">Category<select value={f.category} onChange={set('category')}>{['ethiopian', 'grains', 'protein', 'vegetables', 'fruit', 'drinks', 'other'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field">Serving label<input value={f.servingLabel} onChange={set('servingLabel')} /></label>
        <label className="field">Serving grams<input type="number" value={f.servingGrams} onChange={set('servingGrams')} /></label>
        <label className="field">kcal<input type="number" value={f.kcal} onChange={set('kcal')} required /></label>
        <label className="field">Protein g<input type="number" step="0.1" value={f.protein} onChange={set('protein')} required /></label>
        <label className="field">Carbs g<input type="number" step="0.1" value={f.carbs} onChange={set('carbs')} required /></label>
        <label className="field">Fat g<input type="number" step="0.1" value={f.fat} onChange={set('fat')} required /></label>
        <ErrorNote msg={err} />{msg && <p className="ok">{msg}</p>}
        <button className="btn primary">Add food</button>
      </form>
    </Screen>
  );
}