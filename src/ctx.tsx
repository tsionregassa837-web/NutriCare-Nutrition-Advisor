import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lang, Profile, Targets } from '../shared/types';
import { api, getToken, setToken } from './api';
import { dict, type Key } from './i18n';

export interface UserInfo { id: string; name: string; email: string; role: 'user' | 'admin'; profile: Profile }
interface Ctx {
  user: UserInfo | null; targets: Targets | null; ready: boolean; lang: Lang;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  login: (token: string, user: UserInfo, dest?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  go: (path: string) => void;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [ready, setReady] = useState(!getToken());
  const lang: Lang = user?.profile.lang ?? (localStorage.getItem('nutricare_lang') as Lang | null) ?? 'en';

  const refresh = useCallback(async () => {
    const r = await api<{ user: UserInfo; targets: Targets }>('/me');
    setUser(r.user); setTargets(r.targets);
    localStorage.setItem('nutricare_lang', r.user.profile.lang);
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); setTargets(null); window.location.hash = '#/login'; }, []);
  const login = useCallback(async (token: string, u: UserInfo, dest = '/home') => { setToken(token); setUser(u); await refresh(); window.location.hash = `#${dest}`; }, [refresh]);

  useEffect(() => {
    if (!getToken()) return;
    refresh().catch(() => setToken(null)).finally(() => setReady(true));
  }, [refresh]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => { const h = () => logout(); window.addEventListener('nutricare:logout', h); return () => window.removeEventListener('nutricare:logout', h); }, [logout]);

  const t = useCallback((k: Key, vars?: Record<string, string | number>) => {
    let s = dict[lang][k] ?? dict.en[k];
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, String(b));
    return s;
  }, [lang]);
  const go = useCallback((p: string) => { window.location.hash = `#${p}`; }, []);

  return <C.Provider value={{ user, targets, ready, lang, t, login, logout, refresh, go }}>{children}</C.Provider>;
}

export function useRoute() {
  const read = () => {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = raw.split('?');
    return { path, params: new URLSearchParams(qs) };
  };
  const [r, setR] = useState(read);
  useEffect(() => { const h = () => setR(read()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  return r;
}