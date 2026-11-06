import { useEffect, useState } from 'react';
import { MEAL_TYPES, type DayPlan, type MealType, type PlanMeal } from '../../shared/types';
import { api } from '../api';
import { ErrorNote, LoadingNote, Screen, TopBar, num } from '../components/ui';
import { useApp } from '../ctx';
import { WEEKDAYS, addDays, parse, startOfWeek, today } from '../dates';

export function Planner() {
  const { t } = useApp();
  const start = startOfWeek(today());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [sel, setSel] = useState(today());
  const [plans, setPlans] = useState<Record<string, DayPlan>>({});
  const [dirty, setDirty] = useState(false); const [loading, setLoading] = useState(true); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { setLoading(true); api<{ plans: Record<string, DayPlan> }>(`/plan?from=${week[0]}&to=${week[6]}`).then((r) => setPlans(r.plans)).catch((e: Error) => setErr(e.message)).finally(() => setLoading(false)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function generate() {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await api<{ plans: Record<string, DayPlan>; note: string }>('/plan/generate', { method: 'POST', body: { startDate: start, days: 7 } }); setPlans(r.plans); setDirty(true); setMsg(r.note); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function replace(slot: MealType) {
    setErr('');
    try {
      const current = plans[sel]?.[slot]?.name ?? '';
      const r = await api<{ meals: PlanMeal[] }>(`/plan/alternatives?slot=${slot}&exclude=${encodeURIComponent(current)}`);
      if (!r.meals.length) { setErr('No other meals match your allergies and diet settings.'); return; }
      const next = r.meals[Math.floor(Math.random() * r.meals.length)];
      setPlans({ ...plans, [sel]: { ...plans[sel], [slot]: next } }); setDirty(true);
    } catch (e) { setErr((e as Error).message); }
  }
  async function save() {
    setBusy(true); setErr(''); setMsg('');
    try { await api('/plan', { method: 'PUT', body: { plans } }); setDirty(false); setMsg('Plan saved.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const day = plans[sel] ?? {};
  const kcal = MEAL_TYPES.reduce((a, s) => a + (day[s]?.kcal ?? 0), 0);
  return (
    <Screen nav="advisor">
      <TopBar title={t('mealPlanner')} back="/home" />
      <h2>{t('planWeek')}</h2>
      <div className="week">
        {week.map((d) => <button key={d} className={`day ${d === sel ? 'on' : ''}`} onClick={() => setSel(d)} aria-pressed={d === sel}><span>{WEEKDAYS[(parse(d).getDay() + 6) % 7]}</span><strong>{parse(d).getDate()}</strong></button>)}
      </div>
      {loading && <LoadingNote label="Loading your weekly plan…" />}
      {!loading && Object.keys(day).length === 0 && <div className="card empty">No plan for this day yet. Tap “{t('generatePlan')}”.</div>}
      {!loading && MEAL_TYPES.map((s) => day[s] && (
        <div className="card plan-row" key={s}>
          <div><span className="label">{t(s)}</span><p>{day[s]!.name}</p><span className="muted small">{day[s]!.kcal ? `${day[s]!.kcal} kcal` : '-- kcal'} · P {Math.round(day[s]!.protein)}g · C {Math.round(day[s]!.carbs)}g · F {Math.round(day[s]!.fat)}g</span></div>
          <button className="btn small" onClick={() => replace(s)} disabled={busy}>{t('replace')}</button>
        </div>
      ))}
      {kcal > 0 && <p className="muted small center">Day total ≈ {num(kcal)} kcal (estimate)</p>}
      <ErrorNote msg={err} />{msg && <p className="muted small center">{msg}</p>}
      <div className="btn-row stretch"><button className="btn" onClick={generate} disabled={busy}>{t('generatePlan')}</button><button className="btn primary" onClick={save} disabled={busy || !dirty}>{t('savePlan')}</button></div>
      <p className="muted small center">Plans are suggestions from the food database that respect your allergy and diet settings. Always check ingredients yourself.</p>
    </Screen>
  );
}
