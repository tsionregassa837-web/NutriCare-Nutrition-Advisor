import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '../ctx';

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  diary: <><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M9 8h6M9 12h3" /></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 12h8" /></>,
  advisor: <path d="M4 5h16v11H9l-5 4z" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  chevron: <path d="M9 6l6 6-6 6" />, back: <path d="M15 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />, trash: <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  send: <path d="M4 12l16-8-6 16-3-7z" />, check: <path d="M5 12l5 5 9-10" />, chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
};
export function Icon({ name, size = 22, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>;
}

export function BottomNav({ active }: { active: string }) {
  const { t, go } = useApp();
  const items = [['home', 'home'], ['diary', 'diary'], ['scan', 'scan'], ['advisor', 'advisor'], ['profile', 'profile']] as const;
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(([id, icon]) => (
        <button type="button" key={id} className={active === id ? 'on' : ''} onClick={() => go(`/${id}`)} aria-current={active === id ? 'page' : undefined}>
          <Icon name={icon} /><span>{t(id)}</span>
        </button>
      ))}
    </nav>
  );
}

export function Screen({ children, nav, dark }: { children: ReactNode; nav?: string; dark?: boolean }) {
  return <div className={`screen ${dark ? 'dark' : ''}`}><div className={`content ${nav ? 'with-nav' : ''}`}>{children}</div>{nav && <BottomNav active={nav} />}</div>;
}

export function TopBar({ title, back }: { title: string; back?: string }) {
  const { go } = useApp();
  return <header className="topbar">{back ? <button type="button" className="icon-btn" onClick={() => go(back)} aria-label="Back"><Icon name="back" /></button> : <span className="icon-btn ghost" />}<h1>{title}</h1><span className="icon-btn ghost" /></header>;
}

export function Ring({ eaten, target }: { eaten: number; target: number }) {
  const r = 70, c = 2 * Math.PI * r, pct = Math.min(1, target ? eaten / target : 0);
  const left = Math.max(0, Math.round(target - eaten));
  const { t } = useApp();
  return (
    <div className="ring">
      <svg viewBox="0 0 170 170" width="170" height="170" role="img" aria-label={`${left} ${t('kcalLeft')}`}>
        <circle cx="85" cy="85" r={r} fill="none" stroke="#e3efe9" strokeWidth="12" />
        <circle cx="85" cy="85" r={r} fill="none" stroke="#228B5E" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 85 85)" />
      </svg>
      <div className="ring-text"><strong>{left.toLocaleString()}</strong><span>{t('kcalLeft')}</span></div>
    </div>
  );
}

export function Stepper({ value, onChange, step = 0.5, min = 0.5 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div className="stepper" role="group" aria-label="Portion size">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label="Decrease portion"><Icon name="minus" size={16} /></button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(20, value + step))} aria-label="Increase portion"><Icon name="plus" size={16} /></button>
    </div>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then((data) => live && setState({ data, loading: false })).catch((e: Error) => live && setState({ error: e.message, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ...state, reload: () => fn().then((data) => setState({ data, loading: false })).catch((e: Error) => setState({ error: e.message, loading: false })) };
}

export const ErrorNote = ({ msg }: { msg?: string }) => (msg ? <p className="error" role="alert">{msg}</p> : null);
export const LoadingNote = ({ label = 'Loading…' }: { label?: string }) => <div className="loading-note" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" />{label}</div>;
export const num = (n: number) => n.toLocaleString('en-US');
