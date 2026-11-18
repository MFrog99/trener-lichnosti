import { useNavigate, Link } from 'react-router-dom';
import { items, store, useData } from '../lib/store';
import { TRAITS, COURSE_DAYS } from '../data/traits';
import { traitProgress } from '../lib/progress';
import { daysBetween, fmtDate, todayKey } from '../lib/util';
import { Radar } from '../components/Charts';
import { PageHead, Progress, toast, useTitle } from '../components/ui';

export const MAX_ACTIVE_TRAITS = 3;

export default function Growth() {
  useTitle('Развитие личности');
  const d = useData();
  const nav = useNavigate();
  const tests = items(d, 'assessments').sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  const last = tests[0];
  const prev = tests[1];
  const daysSince = last ? daysBetween(last.date, todayKey()) : 0;
  const active = d.settings.activeTraits;

  const toggle = (id: string) => {
    if (active.includes(id)) store.setSettings({ activeTraits: active.filter((x) => x !== id) });
    else if (active.length >= MAX_ACTIVE_TRAITS) toast(`Одновременно можно развивать до ${MAX_ACTIVE_TRAITS} черт`);
    else { store.setSettings({ activeTraits: [...active, id] }); toast('Курс добавлен в план на день'); }
  };

  return (
    <div>
      <PageHead title="Развитие личности" sub="Тест, курсы по 21 дню и рефлексия" />

      <div className="grid g2">
        <div className="card">
          <div className="card-title"><h3>Профиль черт</h3>{last && <span className="muted small">{fmtDate(last.date)}</span>}</div>
          {last ? (
            <>
              <Radar labels={TRAITS.map((t) => t.name)} series={[TRAITS.map((t) => last.scores[t.id] ?? 0), ...(prev ? [TRAITS.map((t) => prev.scores[t.id] ?? 0)] : [])]}
                colors={['var(--accent)', 'var(--muted)']} />
              {prev && <p className="muted small center">Пунктир — предыдущий тест ({fmtDate(prev.date)})</p>}
              <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
                <Link to="/growth/test" className={'btn ' + (daysSince >= 30 ? '' : 'secondary')}>{daysSince >= 30 ? 'Пора пройти тест снова' : 'Пройти тест заново'}</Link>
              </div>
            </>
          ) : (
            <div className="empty">
              <div className="big">🧭</div>
              <p>Пройдите короткий тест (28 вопросов, ~4 минуты), чтобы увидеть свои сильные стороны и зоны роста.</p>
              <Link to="/growth/test" className="btn">Пройти тест</Link>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Как это работает</h3>
          <ol style={{ paddingLeft: 20, margin: 0 }} className="col">
            <li><b>Тест</b> показывает текущий уровень 7 черт. Повторяйте его раз в месяц, чтобы видеть динамику.</li>
            <li><b>Выберите до {MAX_ACTIVE_TRAITS} черт</b> — их задания появятся в плане на день.</li>
            <li><b>Каждый день</b> — короткая теория и практическое задание. Новое задание открывается на следующий день.</li>
            <li><b>Рефлексия</b>: после задания запишите, что получилось. Это закрепляет навык.</li>
          </ol>
        </div>
      </div>

      <div className="section">
        <h2>Курсы</h2>
        <div className="grid g2">
          {TRAITS.map((t) => {
            const p = traitProgress(d, t.id);
            const on = active.includes(t.id);
            return (
              <div key={t.id} className="card click" onClick={() => nav(`/growth/trait/${t.id}`)} style={on ? { borderColor: t.color } : undefined}>
                <div className="row">
                  <div className="emoji-box" style={{ background: t.color + '22' }}>{t.emoji}</div>
                  <div className="grow"><h3 style={{ margin: 0 }}>{t.name}</h3><div className="muted small">{t.short}</div></div>
                  {last && <span className="chip">{last.scores[t.id]}/100</span>}
                </div>
                <div style={{ margin: '12px 0 6px' }}><Progress value={p.done / COURSE_DAYS} /></div>
                <div className="row between">
                  <span className="muted small">{p.completed ? 'Курс пройден 🎉' : `${p.done} из ${COURSE_DAYS} дней`}{p.doneToday ? ' · сегодня ✔' : ''}</span>
                  <button className={'btn sm ' + (on ? 'secondary' : '')} onClick={(e) => { e.stopPropagation(); toggle(t.id); }}>{on ? 'В плане ✓' : 'Развивать'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
