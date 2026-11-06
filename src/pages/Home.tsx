import { MEAL_TYPES, type MealEntry, type Macros, type Targets } from '../../shared/types';
import { api } from '../api';
import { ErrorNote, Ring, Screen, num, useAsync } from '../components/ui';
import { useApp } from '../ctx';
import { defaultMealType, longDate, today } from '../dates';

interface Summary { totals: Macros; targets: Targets; meals: MealEntry[] }

export function Home() {
  const { user, t, go } = useApp();
  const date = today();
  const { data, error, loading } = useAsync(() => api<Summary>(`/summary?date=${date}`), [date]);
  const h = new Date().getHours();
  const greet = h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
  const first = user?.name.split(' ')[0] ?? '';
  const eaten = data?.totals.kcal ?? 0; const target = data?.targets.kcal ?? 0;
  const grouped = MEAL_TYPES.map((mt) => ({ mt, items: (data?.meals ?? []).filter((m) => m.mealType === mt) })).filter((g) => g.items.length);

  return (
    <Screen nav="home">
      <header className="home-head">
        <div><p className="muted">{longDate(date)}</p><h1>{greet}, {first}</h1></div>
        <button className="avatar" onClick={() => go('/profile')} aria-label={t('profile')}>{first.charAt(0).toUpperCase()}</button>
      </header>
      <ErrorNote msg={error} />
      <section className="card center-card">
        <Ring eaten={eaten} target={target} />
        <div className="two-col">
          <div><span className="muted">{t('eaten')}</span><strong>{num(eaten)}</strong></div>
          <div><span className="muted">{t('dailyTarget')}</span><strong>{num(target)}</strong></div>
        </div>
        {data?.targets.isDefault && <p className="muted small">General 2,000 kcal target. <button className="link" onClick={() => go('/profile/goals')}>Set up your profile</button> for a personal estimate.</p>}
      </section>
      <div className="chips-row">
        <span className="chip-stat">{t('protein')} {Math.round(data?.totals.protein ?? 0)}g</span>
        <span className="chip-stat">{t('carbs')} {Math.round(data?.totals.carbs ?? 0)}g</span>
        <span className="chip-stat">{t('fat')} {Math.round(data?.totals.fat ?? 0)}g</span>
      </div>
      <div className="quick">
        <button onClick={() => go('/scan')}><span className="qi">◎</span>{t('analyze')}</button>
        <button onClick={() => go(`/foods?meal=${defaultMealType()}&date=${date}`)}><span className="qi">＋</span>{t('logMeal')}</button>
        <button onClick={() => go('/advisor')}><span className="qi">✦</span>{t('askAi')}</button>
        <button onClick={() => go('/planner')}><span className="qi">▦</span>{t('plan')}</button>
      </div>
      <div className="row-between"><h2>{t('todaysMeals')}</h2><button className="link" onClick={() => go('/analytics')}>{t('analytics')} ›</button></div>
      {loading && <p className="muted">{t('loading')}</p>}
      {!loading && grouped.length === 0 && <div className="card empty">{t('nothingLogged')}</div>}
      {grouped.map(({ mt, items }) => (
        <div className="card meal-row" key={mt}>
          <div><span className="label">{t(mt)}</span><p>{items.map((i) => i.name).join(', ')}</p></div>
          <strong>{num(items.reduce((a, i) => a + i.kcal, 0))} kcal</strong>
        </div>
      ))}
    </Screen>
  );
}
