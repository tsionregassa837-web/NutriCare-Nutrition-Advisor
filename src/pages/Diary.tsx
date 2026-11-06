import { useState } from 'react';
import { MEAL_TYPES, type Food, type MealEntry, type MealType, type Macros, type Targets } from '../../shared/types';
import { api } from '../api';
import { ErrorNote, Icon, LoadingNote, Screen, Stepper, TopBar, num, useAsync } from '../components/ui';
import { useApp } from '../ctx';
import { WEEKDAYS, addDays, defaultMealType, parse, startOfWeek, today } from '../dates';

interface Summary { totals: Macros; targets: Targets; meals: MealEntry[] }
const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function Diary({ params }: { params: URLSearchParams }) {
  const { t, go } = useApp();
  const q = params.get('date');
  const date = isDate(q) ? q : today();
  const { data, error, loading, reload } = useAsync(() => api<Summary>(`/summary?date=${date}`), [date]);
  const [err, setErr] = useState('');
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
  const setDate = (d: string) => go(`/diary?date=${d}`);

  async function change(m: MealEntry, quantity: number) {
    try { await api(`/meals/${m.id}`, { method: 'PUT', body: { quantity } }); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  async function remove(m: MealEntry) {
    if (!window.confirm(`Remove ${m.name}?`)) return;
    try { await api(`/meals/${m.id}`, { method: 'DELETE' }); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  const tot = data?.totals;
  return (
    <Screen nav="diary">
      <h1 className="page-title">{t('foodDiary')}</h1>
      <div className="week">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Previous week"><Icon name="back" size={18} /></button>
        {week.map((d) => (
          <button key={d} className={`day ${d === date ? 'on' : ''}`} onClick={() => setDate(d)} aria-pressed={d === date}>
            <span>{WEEKDAYS[(parse(d).getDay() + 6) % 7]}</span><strong>{parse(d).getDate()}</strong>
          </button>
        ))}
        <button className="icon-btn" onClick={() => setDate(addDays(date, 7))} aria-label="Next week"><Icon name="chevron" size={18} /></button>
      </div>
      <ErrorNote msg={error ?? err} />
      {loading && <LoadingNote label="Loading your diary…" />}
      <section className="card center-card">
        <strong className="big">{num(tot?.kcal ?? 0)}</strong>
        <span className="muted">{t('ofKcal', { n: num(data?.targets.kcal ?? 0) })}</span>
        <div className="three-col">
          <div><strong>{Math.round(tot?.protein ?? 0)}g</strong><span className="muted">{t('protein')}</span></div>
          <div><strong>{Math.round(tot?.carbs ?? 0)}g</strong><span className="muted">{t('carbs')}</span></div>
          <div><strong>{Math.round(tot?.fat ?? 0)}g</strong><span className="muted">{t('fat')}</span></div>
        </div>
      </section>
      {!loading && MEAL_TYPES.map((mt) => {
        const items = (data?.meals ?? []).filter((m) => m.mealType === mt);
        const kcal = items.reduce((a, i) => a + i.kcal, 0);
        return (
          <section className="card" key={mt}>
            <div className="row-between"><h3>{t(mt)}</h3><span className="muted">{items.length ? `${num(kcal)} kcal` : '--'}</span></div>
            {items.length === 0 && <p className="muted small">{t('nothingLogged')}</p>}
            {items.map((m) => (
              <div className="entry" key={m.id}>
                <div><p>{m.name}</p><span className="muted small">{m.quantity} × {m.servingLabel}{m.source === 'ai-photo' ? ' · AI estimate' : ''}</span></div>
                <div className="entry-right">
                  <Stepper value={m.quantity} onChange={(v) => change(m, v)} step={0.5} min={0.5} />
                  <strong>{m.kcal}</strong>
                  <button className="icon-btn" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}><Icon name="trash" size={18} /></button>
                </div>
              </div>
            ))}
            <button className="link" onClick={() => go(`/foods?meal=${mt}&date=${date}`)}>{t('addFood')}</button>
          </section>
        );
      })}
      <p className="muted small center">Calories are estimates based on standard serving sizes.</p>
    </Screen>
  );
}

const CATS = ['all', 'ethiopian', 'grains', 'protein', 'vegetables', 'fruit', 'drinks'] as const;

export function Foods({ params }: { params: URLSearchParams }) {
  const { t, go, lang } = useApp();
  const mealParam = params.get('meal');
  const meal: MealType = (MEAL_TYPES as string[]).includes(mealParam ?? '') ? (mealParam as MealType) : defaultMealType();
  const q0 = params.get('date');
  const date = isDate(q0) ? q0 : today();
  const [q, setQ] = useState(''); const [cat, setCat] = useState<(typeof CATS)[number]>('all');
  const [pick, setPick] = useState<(Food & { kcalPerServing: number }) | null>(null);
  const [qty, setQty] = useState(1); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const { data, error, loading } = useAsync(() => api<{ foods: (Food & { kcalPerServing: number })[] }>(`/foods?q=${encodeURIComponent(q)}&category=${cat}`), [q, cat]);
  const catLabel = (c: string) => (c === 'all' ? t('all') : c === 'protein' ? t('proteinCat') : t(c as 'ethiopian' | 'grains' | 'vegetables' | 'fruit' | 'drinks'));

  async function add() {
    if (!pick) return;
    setBusy(true); setErr('');
    try { await api('/meals', { method: 'POST', body: { date, mealType: meal, foodId: pick.id, quantity: qty } }); go(`/diary?date=${date}`); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Screen nav="diary">
      <TopBar title={t('foodDatabase')} back={`/diary?date=${date}`} />
      <p className="muted small center">{t(meal)} · {date}</p>
      <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchFoods')} aria-label={t('searchFoods')} />
      <div className="chips scroll">{CATS.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{catLabel(c)}</button>)}</div>
      <ErrorNote msg={error} />
      {loading && <p className="muted">{t('loading')}</p>}
      {data && data.foods.length === 0 && <div className="card empty">No foods found.</div>}
      {data?.foods.map((f) => (
        <div className="card food-row" key={f.id}>
          <div><p>{lang === 'am' && f.nameAm ? f.nameAm : f.name}</p><span className="muted small">{f.servingLabel}</span></div>
          <div className="entry-right"><span className="muted">{f.kcalPerServing} kcal</span>
            <button className="round-btn" onClick={() => { setPick(f); setQty(1); setErr(''); }} aria-label={`Add ${f.name}`}><Icon name="plus" size={18} /></button></div>
        </div>
      ))}
      <p className="muted small center">Values are approximate reference estimates, not lab-measured.</p>
      {pick && (
        <div className="sheet-bg" onClick={() => setPick(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Add ${pick.name}`}>
            <h3>{pick.name}</h3>
            <p className="muted">{qty} × {pick.servingLabel} · {Math.round(pick.servingGrams * qty)} g · ≈ {Math.round(pick.kcalPerServing * qty)} kcal</p>
            <p className="muted small">Per serving: P {(pick.per100g.protein * pick.servingGrams / 100).toFixed(1)}g · C {(pick.per100g.carbs * pick.servingGrams / 100).toFixed(1)}g · F {(pick.per100g.fat * pick.servingGrams / 100).toFixed(1)}g</p>
            <div className="center"><Stepper value={qty} onChange={setQty} step={0.5} min={0.5} /></div>
            <ErrorNote msg={err} />
            <button className="btn primary" disabled={busy} onClick={add}>{t('add')} → {t(meal)}</button>
            <button className="link center" onClick={() => setPick(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </Screen>
  );
}
