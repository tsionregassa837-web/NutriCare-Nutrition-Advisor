import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Icon, LoadingNote, Screen } from '../components/ui';
import { useApp } from '../ctx';
import { WEEKDAYS, addDays, startOfWeek, today } from '../dates';

type Mode = 'nutrition' | 'fitness';
interface Msg { role: 'user' | 'model'; text: string; error?: boolean }
const store: Record<Mode, Msg[]> = { nutrition: [], fitness: [] }; // short-lived UI cache; server is the source of truth
const CHIPS: Record<Mode, string[]> = {
  nutrition: ['Balanced Ethiopian breakfast', 'Increase my protein'],
  fitness: ['Home workout for beginners', 'Burn calories safely'],
};
const IDEAS = [
  { title: '30-minute brisk walk', tags: ['Low impact', 'Beginner', 'No equipment'] },
  { title: '15-minute gentle stretching', tags: ['Low impact', 'Beginner', 'No equipment'] },
  { title: '20-minute bodyweight circuit', tags: ['Moderate', 'Beginner', 'No equipment'] },
  { title: '10-minute stair climbing', tags: ['Moderate', 'Beginner', 'Stairs'] },
];

export function Advisor({ params }: { params: URLSearchParams }) {
  const { t, lang } = useApp();
  const [mode, setMode] = useState<Mode>(params.get('tab') === 'fitness' ? 'fitness' : 'nutrition');
  const [msgs, setMsgs] = useState<Msg[]>(store[mode]);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [historyLoading, setHistoryLoading] = useState(true);
  const [idea, setIdea] = useState(0); const [done, setDone] = useState<string[]>([]); const [actErr, setActErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(today());
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    let alive = true;
    setHistoryLoading(true); api<{ messages: Msg[] }>(`/ai/conversations?mode=${mode}`).then((r) => { if (alive) { store[mode] = r.messages; setMsgs(r.messages); } }).catch(() => { if (alive) setMsgs(store[mode]); }).finally(() => { if (alive) setHistoryLoading(false); });
    return () => { alive = false; };
  }, [mode]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);
  useEffect(() => {
    if (mode === 'fitness') api<{ done: string[] }>(`/activity?from=${week[0]}&to=${week[6]}`).then((r) => setDone(r.done)).catch((e: Error) => setActErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function send(message: string) {
    const clean = message.trim(); if (!clean || busy) return;
    const history = store[mode].filter((m) => !m.error).slice(-10).map(({ role, text }) => ({ role, text }));
    store[mode] = [...store[mode], { role: 'user', text: clean }]; setMsgs(store[mode]); setText(''); setBusy(true);
    try {
      const r = await api<{ reply: string }>('/ai/chat', { method: 'POST', body: { message: clean, mode, lang, history, date: today() } });
      store[mode] = [...store[mode], { role: 'model', text: r.reply }];
    } catch (e) { store[mode] = [...store[mode], { role: 'model', text: (e as Error).message, error: true }]; }
    setMsgs(store[mode]); setBusy(false);
  }
  async function toggleToday() {
    const d = today(); const isDone = done.includes(d);
    try { await api('/activity', { method: 'POST', body: { date: d, done: !isDone } }); setDone(isDone ? done.filter((x) => x !== d) : [...done, d]); setActErr(''); }
    catch (e) { setActErr((e as Error).message); }
  }
  const cur = IDEAS[idea % IDEAS.length];
  return (
    <Screen nav="advisor">
      <h1 className="page-title">{mode === 'fitness' ? t('aiAdvisor') : t('nutriAdvisor')}</h1>
      <div className="tabs" role="tablist" aria-label="Advisor mode"><button type="button" role="tab" aria-selected={mode === 'nutrition'} className={mode === 'nutrition' ? 'on' : ''} onClick={() => setMode('nutrition')}>{t('nutrition')}</button><button type="button" role="tab" aria-selected={mode === 'fitness'} className={mode === 'fitness' ? 'on' : ''} onClick={() => setMode('fitness')}>{t('fitness')}</button></div>
      {mode === 'nutrition' && <p className="muted small">{t('askAbout')}</p>}
      {mode === 'fitness' && (
        <>
          <section className="card">
            <p className="label">Suggested for today</p><h3>{cur.title}</h3>
            <div className="tags">{cur.tags.map((x) => <span key={x} className="tag">{x}</span>)}</div>
            <div className="btn-row"><button className="btn primary small" onClick={toggleToday}>{done.includes(today()) ? 'Done today ✓' : 'Start'}</button><button className="btn small" onClick={() => setIdea(idea + 1)}>Swap</button></div>
            {actErr && <p className="error">{actErr}</p>}
          </section>
          <section className="card"><div className="row-between"><h3>Weekly activity</h3><span className="muted">{done.length} of 5 days</span></div>
            <div className="week-dots">{week.map((d, i) => <div key={d} className={`dotday ${done.includes(d) ? 'on' : ''}`}><span>{WEEKDAYS[i]}</span><i>{done.includes(d) ? '✓' : ''}</i></div>)}</div></section>
        </>
      )}
      <div className="chat">
        {historyLoading ? <LoadingNote label="Loading conversation…" /> : msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'bot'} ${m.error ? 'err' : ''}`}>{m.text}</div>)}
        {busy && <div className="bubble bot" role="status">Thinking...</div>}
        <div ref={end} />
      </div>
      <div className="chips scroll" aria-label="Suggested prompts">{CHIPS[mode].map((c) => <button key={c} className="chip" onClick={() => send(c)}>{c}</button>)}</div>
      <p className="muted small center">AI guidance is general information, not medical advice.</p>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'fitness' ? t('askExercise') : t('askYourAdvisor')} maxLength={1000} aria-label="Message" />
        <button type="submit" className="round-btn" disabled={busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </Screen>
  );
}
