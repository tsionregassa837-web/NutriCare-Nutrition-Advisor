import { useState } from 'react';
import { api } from '../api';
import { ErrorNote, Screen, TopBar, num, useAsync } from '../components/ui';
import { useApp } from '../ctx';
import { today } from '../dates';

interface Day { date: string; kcal: number; protein: number; carbs: number; fat: number; waterMl: number }
interface Data { daily: Day[]; weights: { date: string; kg: number }[]; targets: { kcal: number } }

function Bars({ values, target, color = '#228B5E' }: { values: number[]; target?: number; color?: string }) {
  const max = Math.max(...values, target ?? 0, 1); const w = 300, h = 120; const bw = w / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Bar chart">
      {values.map((v, i) => <rect key={i} x={i * bw + bw * 0.15} y={h - (v / max) * h} width={bw * 0.7} height={(v / max) * h} rx="2" fill={color} />)}
      {target ? <line x1="0" x2={w} y1={h - (target / max) * h} y2={h - (target / max) * h} stroke="#6b7280" strokeDasharray="4 4" /> : null}
    </svg>
  );
}

export function Analytics() {
  const { t } = useApp();
  const [days, setDays] = useState(7);
  const [wInput, setWInput] = useState(''); const [err, setErr] = useState('');
  const { data, error, reload } = useAsync(() => api<Data>(`/analytics?days=${days}&end=${today()}`), [days]);
  const d = data?.daily ?? [];
  const logged = d.filter((x) => x.kcal > 0);
  const avg = (k: 'protein' | 'carbs' | 'fat') => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);
  const pK = avg('protein') * 4, cK = avg('carbs') * 4, fK = avg('fat') * 9, tot = pK + cK + fK || 1;
  const hasWater = d.some((x) => x.waterMl > 0);

  async function addWater() { try { await api('/water', { method: 'POST', body: { date: today(), ml: 250 } }); await reload(); } catch (e) { setErr((e as Error).message); } }
  async function addWeight() {
    const kg = Number(wInput);
    if (!kg || kg < 10 || kg > 400) { setErr('Enter a weight in kg between 10 and 400.'); return; }
    try { await api('/weights', { method: 'POST', body: { date: today(), kg } }); setWInput(''); setErr(''); await reload(); } catch (e) { setErr((e as Error).message); }
  }
  const wt = data?.weights ?? [];
  const wmin = Math.min(...wt.map((w) => w.kg)) - 1, wmax = Math.max(...wt.map((w) => w.kg)) + 1;
  const pts = wt.map((w, i) => `${wt.length === 1 ? 150 : (i / (wt.length - 1)) * 300},${120 - ((w.kg - wmin) / (wmax - wmin || 1)) * 120}`).join(' ');
  return (
    <Screen nav="home">
      <TopBar title="" back="/home" />
      <h1 className="page-title tight">{t('analytics')}</h1><p className="muted">{t('progress')}</p>
      <div className="chips">{[[7, t('days7')], [30, t('days30')], [90, t('months3')]].map(([n, l]) => <button key={n} className={`chip ${days === n ? 'on' : ''}`} onClick={() => setDays(n as number)}>{l}</button>)}</div>
      <ErrorNote msg={error ?? err} />
      <section className="card"><h3>Calorie trend</h3>{logged.length ? <><Bars values={d.map((x) => x.kcal)} target={data?.targets.kcal} /><p className="muted small">Average {num(Math.round(logged.reduce((a, x) => a + x.kcal, 0) / logged.length))} kcal on {logged.length} logged day(s). Dashed line = daily target.</p></> : <div className="placeholder">Log meals for a few days to see your trend here.</div>}</section>
      <section className="card"><h3>Macronutrients</h3>{logged.length ? <>
        <div className="splitbar"><i style={{ width: `${(pK / tot) * 100}%`, background: '#228B5E' }} /><i style={{ width: `${(cK / tot) * 100}%`, background: '#e0a52c' }} /><i style={{ width: `${(fK / tot) * 100}%`, background: '#c9591f' }} /></div>
        <p className="muted small">Share of calories: Protein {Math.round((pK / tot) * 100)}% · Carbs {Math.round((cK / tot) * 100)}% · Fat {Math.round((fK / tot) * 100)}%</p></> : <div className="placeholder">Protein, carbs and fat split appears once meals are logged.</div>}</section>
      <section className="card"><div className="row-between"><h3>Water intake</h3><button className="btn small" onClick={addWater}>+ 250 ml</button></div>{hasWater ? <><Bars values={d.map((x) => x.waterMl)} color="#3b82c4" /><p className="muted small">Today: {num(d[d.length - 1]?.waterMl ?? 0)} ml</p></> : <div className="placeholder">Track water to see your history.</div>}</section>
      <section className="card"><h3>Weight progress</h3>{wt.length ? <><svg viewBox="0 0 300 120" className="chart" role="img" aria-label="Weight chart"><polyline points={pts} fill="none" stroke="#228B5E" strokeWidth="2.5" />{wt.map((w, i) => <circle key={w.date} cx={wt.length === 1 ? 150 : (i / (wt.length - 1)) * 300} cy={120 - ((w.kg - wmin) / (wmax - wmin || 1)) * 120} r="4" fill="#228B5E" />)}</svg><p className="muted small">{wt[0].kg} kg → {wt[wt.length - 1].kg} kg</p></> : <div className="placeholder">Record your weight to see progress toward your goal.</div>}
        <div className="add-line"><input type="number" inputMode="decimal" value={wInput} onChange={(e) => setWInput(e.target.value)} placeholder="Weight today (kg)" aria-label="Weight in kg" /><button className="btn small" onClick={addWeight}>{t('add')}</button></div></section>
    </Screen>
  );
}
