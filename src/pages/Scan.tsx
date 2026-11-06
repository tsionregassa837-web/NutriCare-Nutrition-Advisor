import { useEffect, useRef, useState } from 'react';
import { MEAL_TYPES, type Food, type MealType } from '../../shared/types';
import { nutritionForServings } from '../../shared/nutrition';
import { api } from '../api';
import { ErrorNote, Screen, Stepper, TopBar, num, useAsync } from '../components/ui';
import { useApp } from '../ctx';
import { defaultMealType, today } from '../dates';

export interface AnalysisItem {
  foodId: string; name: string; quantity: number; servingLabel: string; grams: number;
  kcal: number; protein: number; carbs: number; fat: number; fiber: number; confidence?: number; allergenWarning?: boolean;
}
export interface BlockedAnalysisItem { foodId: string; name: string; servings: number; confidence: number; reasons: string[] }
export interface AnalysisResult { items: AnalysisItem[]; blocked: BlockedAnalysisItem[]; unmatched: string[]; notes: string; disclaimer: string }

async function toJpegBase64(src: Blob | HTMLVideoElement): Promise<string> {
  let w: number, h: number; let draw: (c: CanvasRenderingContext2D, w: number, h: number) => void;
  if (src instanceof HTMLVideoElement) { w = src.videoWidth; h = src.videoHeight; draw = (c, a, b) => c.drawImage(src, 0, 0, a, b); }
  else {
    const bmp = await createImageBitmap(src);
    w = bmp.width; h = bmp.height; draw = (c, a, b) => c.drawImage(bmp, 0, 0, a, b);
  }
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not process the image.');
  draw(ctx, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export function Scan({ onResult }: { onResult: (r: AnalysisResult) => void }) {
  const { t, go } = useApp();
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const file = useRef<HTMLInputElement>(null);
  const [camOk, setCamOk] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [torch, setTorch] = useState(false);

  useEffect(() => {
    let dead = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then((s) => {
      if (dead) { s.getTracks().forEach((x) => x.stop()); return; }
      stream.current = s; setCamOk(true);
      if (video.current) { video.current.srcObject = s; void video.current.play(); }
    }).catch(() => setCamOk(false));
    return () => { dead = true; stream.current?.getTracks().forEach((x) => x.stop()); };
  }, []);
  useEffect(() => { if (camOk && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play(); } }, [camOk]);

  async function submit(getB64: () => Promise<string>) {
    setError(''); setBusy(true);
    try {
      const image = await getB64();
      const r = await api<AnalysisResult>('/ai/analyze-image', { method: 'POST', body: { image, mimeType: 'image/jpeg' } });
      onResult(r); go('/analysis');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const shutter = () => {
    if (camOk && video.current) void submit(() => toJpegBase64(video.current!));
    else file.current?.click();
  };
  async function flash() {
    const track = stream.current?.getVideoTracks()[0];
    try {
      await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch);
    } catch { setError('Flash is not available on this device or browser.'); }
  }
  return (
    <Screen dark>
      <div className="scan-top">
        <button type="button" className="circle-btn" onClick={() => go('/home')} aria-label="Close scanner">x</button>
        <h1>{t('scanFood')}</h1>
        <button type="button" className="circle-btn small" onClick={flash} disabled={!camOk} aria-label="Toggle camera flash">{t('flash')}</button>
      </div>
      <div className="frame">
        <video ref={video} playsInline muted className={camOk ? 'show' : ''} aria-label="Live camera preview" />
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        {!camOk && <p className="frame-note">Camera not available. Use the Gallery button or tap the shutter to choose a photo.</p>}
      </div>
      <h2 className="scan-msg">{t('placeMeal')}</h2>
      <p className="scan-sub">{t('goodLight')}</p>
      {busy && <p className="scan-sub" role="status">Analyzing your meal...</p>}
      {error && <p className="error light" role="alert">{error}</p>}
      <div className="scan-bottom">
        <button type="button" className="gallery" disabled={busy} onClick={() => file.current?.click()}>{t('gallery')}</button>
        <button type="button" className="shutter" onClick={shutter} disabled={busy} aria-label="Take photo"><span /></button>
        <span className="gallery ghost" />
      </div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setError('Only JPEG, PNG or WebP photos are supported.'); return; }
        if (f.size > 15 * 1024 * 1024) { setError('That photo is too large (max 15 MB).'); return; }
        void submit(() => toJpegBase64(f));
      }} />
    </Screen>
  );
}

export function Analysis({ result }: { result: AnalysisResult | null }) {
  const { t, go } = useApp();
  const [items, setItems] = useState<AnalysisItem[]>(result?.items ?? []);
  const [meal, setMeal] = useState<MealType>(defaultMealType());
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [addId, setAddId] = useState('');
  const { user } = useApp();
  const foods = useAsync(() => api<{ foods: (Food & { allowed?: boolean; blockReasons?: string[] })[] }>('/foods'), []);

  if (!result) return <Screen nav="scan"><TopBar title={t('mealAnalysis')} back="/scan" /><div className="card empty">No photo analysed yet.<br /><button className="link" onClick={() => go('/scan')}>{t('scanFood')}</button></div></Screen>;
  const unit = (i: AnalysisItem) => ({ kcal: i.kcal / i.quantity, protein: i.protein / i.quantity, carbs: i.carbs / i.quantity, fat: i.fat / i.quantity });
  const view = items.map((i) => { const u = unit(i); return { ...i, vk: Math.round(u.kcal * i.quantity), vp: u.protein * i.quantity, vc: u.carbs * i.quantity, vf: u.fat * i.quantity }; });
  const tot = view.reduce((a, i) => ({ k: a.k + i.vk, p: a.p + i.vp, c: a.c + i.vc, f: a.f + i.vf }), { k: 0, p: 0, c: 0, f: 0 });
  const setQty = (idx: number, q: number) => setItems(items.map((it, k) => (k === idx ? { ...it, ...(() => { const u = unit(it); return { quantity: q, kcal: Math.round(u.kcal * q), protein: u.protein * q, carbs: u.carbs * q, fat: u.fat * q }; })() } : it)));
  function addFood() {
    const f = foods.data?.foods.find((x) => x.id === addId); if (!f || f.allowed === false) return;
    const n = nutritionForServings(f, 1);
    setItems([...items, { foodId: f.id, name: f.name, quantity: 1, servingLabel: f.servingLabel, grams: n.grams, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, fiber: n.fiber }]); setAddId('');
  }
  async function save() {
    if (!items.length) { setErr('Add at least one food.'); return; }
    setBusy(true); setErr('');
    try { await api('/meals', { method: 'POST', body: { items: items.map((i) => ({ date: today(), mealType: meal, foodId: i.foodId, quantity: i.quantity, source: 'ai-photo' })) } }); go(`/diary?date=${today()}`); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Screen nav="scan">
      <TopBar title={t('mealAnalysis')} back="/scan" />
      <section className="card center-card"><strong className="big">≈ {num(tot.k)}</strong><span className="muted">{t('estCalories')}</span>
        <div className="three-col"><div><strong>{Math.round(tot.p)}g</strong><span className="muted">{t('protein')}</span></div><div><strong>{Math.round(tot.c)}g</strong><span className="muted">{t('carbs')}</span></div><div><strong>{Math.round(tot.f)}g</strong><span className="muted">{t('fat')}</span></div></div></section>
      {result.blocked.length > 0 && <div className="card"><strong className="warn">Some detected foods are blocked</strong>{result.blocked.map((b, idx) => <p className="muted small" key={`${b.foodId}-${idx}`}>{b.name} · {Math.round(b.confidence * 100)}% sure — {b.reasons.join('; ')}. It was not included in the nutrition total and cannot be saved from this analysis.</p>)}</div>}
      {view.map((i, idx) => (
        <div className="card food-row" key={`${i.foodId}-${idx}`}>
          <div><p>{i.name}</p><span className="muted small">{i.quantity} × {i.servingLabel}{i.confidence !== undefined ? ` · ${Math.round(i.confidence * 100)}% sure` : ''}</span>
            {i.allergenWarning && <span className="warn small"> Matches an allergy you listed!</span>}</div>
          <div className="entry-right"><Stepper value={i.quantity} onChange={(q) => setQty(idx, q)} /><button className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => setItems(items.filter((_, k) => k !== idx))}>×</button></div>
        </div>
      ))}
      {items.length === 0 && <div className="card empty">No foods were recognised. Add them below or try another photo.</div>}
      {result.unmatched.length > 0 && <p className="muted small">Could not match: {result.unmatched.join(', ')}. Add the closest food below.</p>}
      <div className="add-line"><select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add a food"><option value="">Add or correct a food...</option>{foods.data?.foods.filter((f) => f.allowed !== false).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select><button className="btn small" onClick={addFood} disabled={!addId}>{t('add')}</button></div>
      <div className="chips scroll">{MEAL_TYPES.map((m) => <button key={m} className={`chip ${meal === m ? 'on' : ''}`} onClick={() => setMeal(m)}>{t(m)}</button>)}</div>
      <p className="muted small center">{t('approx')} {result.disclaimer}</p>
      {(user?.profile.allergies.length || user?.profile.diets.length) ? <p className="muted small center">Foods blocked by your allergy and diet settings are excluded from the selectable list and cannot be saved.</p> : null}
      {result.notes && <p className="muted small center">AI note: {result.notes}</p>}
      <ErrorNote msg={err} />
      <button className="btn primary" onClick={save} disabled={busy}>{t('saveMeal')}</button>
    </Screen>
  );
}
