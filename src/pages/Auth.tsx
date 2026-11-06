
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { ErrorNote } from '../components/ui';
import { useApp } from '../ctx';
import type { UserInfo } from '../ctx';
 
function Illustration() {
  return (
    <svg viewBox="0 0 240 200" width="240" height="200" role="img" aria-label="Food illustration">
      <circle cx="120" cy="100" r="92" fill="#e3efe9" />
      <ellipse cx="120" cy="128" rx="78" ry="22" fill="#c9591f" opacity=".15" />
      <circle cx="120" cy="104" r="62" fill="#f1d9a8" stroke="#d9b777" strokeWidth="3" />
      <circle cx="120" cy="104" r="44" fill="#f7e8c6" />
      <circle cx="102" cy="96" r="17" fill="#b8501a" /><circle cx="140" cy="92" r="14" fill="#2f8f5b" />
      <circle cx="128" cy="122" r="13" fill="#e0a52c" /><circle cx="100" cy="122" r="9" fill="#f3efe4" />
      <path d="M176 40c14 6 20 20 14 34-14-4-22-18-14-34z" fill="#228B5E" /><path d="M60 52c-10 8-12 22-4 32 12-6 16-22 4-32z" fill="#4aa979" />
    </svg>
  );
}
 
export function Onboarding() {
  const { go, t } = useApp();
  return (
    <div className="screen onboarding">
      <button type="button" className="skip" onClick={() => go('/login')}>{t('skip')}</button>
      <div className="illus"><Illustration /></div>
      <h1>Your Personal Nutrition Companion.</h1>
      <p className="tagline">Eat Better. Live Healthier.</p>
      <ul className="features">
        <li><span className="dot" />Analyze meals from a photo</li>
        <li><span className="dot" />Personal AI nutrition guidance</li>
        <li><span className="dot" />Ethiopian and international foods</li>
      </ul>
      <button className="btn primary" onClick={() => go('/register')}>{t('getStarted')}</button>
      <button type="button" className="link" onClick={() => go('/login')}>{t('signIn')}</button>
    </div>
  );
}
 
function PasswordField({ label, value, onChange, placeholder, autoComplete }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  return (
    <label className="field">{label}
      <span className="input-wrap">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
        <button type="button" className="inline-btn" onClick={() => setShow(!show)}>{show ? t('hide') : t('show')}</button>
      </span>
    </label>
  );
}
 
export function Login() {
  const { login, go, t } = useApp();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { const r = await api<{ token: string; user: UserInfo }>('/auth/login', { method: 'POST', body: { email, password } }); await login(r.token, r.user); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="screen auth">
      <p className="brand">NutriCare AI</p>
      <h1>{t('welcomeBack')}</h1>
      <p className="muted">Sign in to continue your nutrition journey.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">{t('email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <PasswordField label={t('password')} value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" />
        <ErrorNote msg={error} />
        <button className="btn primary" disabled={busy}>{busy ? t('loading') : t('signIn')}</button>
      </form>
      <p className="center muted">New here? <button type="button" className="link" onClick={() => go('/register')}>{t('createAccount')}</button></p>
    </div>
  );
}
 
export function Register() {
  const { login, go, t } = useApp();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (f.password !== f.confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try { const r = await api<{ token: string; user: UserInfo }>('/auth/register', { method: 'POST', body: { name: f.name, email: f.email, password: f.password } }); await login(r.token, r.user, '/profile/goals?setup=1'); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="screen auth">
      <p className="brand">NutriCare AI</p>
      <h1>{t('createAccount')}</h1>
      <p className="muted">Start tracking your nutrition today.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">Full name<input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Your full name" autoComplete="name" /></label>
        <label className="field">{t('email')}<input type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <PasswordField label={t('password')} value={f.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" />
        <PasswordField label="Confirm password" value={f.confirm} onChange={set('confirm')} placeholder="Repeat your password" autoComplete="new-password" />
        <ErrorNote msg={error} />
        <button className="btn primary" disabled={busy}>{busy ? t('loading') : t('createAccount')}</button>
      </form>
      <p className="center muted">Already have an account? <button type="button" className="link" onClick={() => go('/login')}>{t('signIn')}</button></p>
    </div>
  );
}
 
