import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { items, store, useData } from '../lib/store';
import { TRAIT, COURSE_DAYS } from '../data/traits';
import { traitProgress } from '../lib/progress';
import { XP } from '../lib/stats';
import { fmtDate, todayKey } from '../lib/util';
import { Back, Empty, Modal, Progress, toast, useTitle } from '../components/ui';
import { MAX_ACTIVE_TRAITS } from './Growth';

export default function TraitPage() {
  const { id = '' } = useParams();
  const t = TRAIT[id];
  const d = useData();
  useTitle(t?.name ?? 'Курс');
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState(0);
  const [view, setView] = useState<number | null>(null);
  if (!t) return <Empty emoji="🤷" text="Курс не найден" />;

  const p = traitProgress(d, t.id);
  const records = items(d, 'traitDays').filter((x) => x.trait === t.id);
  const byDay = Object.fromEntries(records.map((r) => [r.day, r]));
  const active = d.settings.activeTraits.includes(t.id);
  const day = t.days[p.next - 1];
  const todayRec = records.find((r) => r.date === todayKey());

  const complete = () => {
    if (reflection.trim().length < 3) { toast('Напишите хотя бы пару слов о том, как прошло задание'); return; }
    store.put('traitDays', { id: `${t.id}_${p.next}`, trait: t.id, day: p.next, date: todayKey(), reflection: reflection.trim(), rating: rating || undefined });
    if (!active && d.settings.activeTraits.length < MAX_ACTIVE_TRAITS) store.setSettings({ activeTraits: [...d.settings.activeTraits, t.id] });
    setReflection(''); setRating(0);
    toast(`День ${p.next} пройден · +${XP.traitDay} XP`);
  };

  const viewed = view ? t.days[view - 1] : null;
  const viewedRec = view ? byDay[view] : null;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Back to="/growth" label="Развитие" />
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="emoji-box" style={{ width: 56, height: 56, fontSize: 30, background: t.color + '22' }}>{t.emoji}</div>
        <div><h1 style={{ margin: 0 }}>{t.name}</h1><div className="muted">{t.short}</div></div>
      </div>
      <p>{t.description}</p>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Прогресс курса</h3>
          <span className="muted small">{p.done} / {COURSE_DAYS}</span>
        </div>
        <Progress value={p.done / COURSE_DAYS} />
        <div className="day-dots" style={{ marginTop: 14 }}>
          {t.days.map((_, i) => {
            const n = i + 1;
            const done = p.doneSet.has(n);
            const cur = !done && n === p.next && !p.doneToday;
            return (
              <button key={n} className={'day-dot' + (done ? ' done' : '') + (cur ? ' current' : '')}
                style={{ ...(done ? { background: t.color } : {}), cursor: done ? 'pointer' : 'default' }}
                onClick={() => done && setView(n)} title={done ? 'Посмотреть' : ''}>{n}</button>
            );
          })}
        </div>
      </div>

      <div className="section">
        {p.completed ? (
          <div className="card center"><div style={{ fontSize: 50 }}>🎉</div><h2>Курс пройден!</h2>
            <p className="muted">Вы прошли все {COURSE_DAYS} дней. Перепройдите тест, чтобы увидеть изменения, и выберите следующую черту.</p></div>
        ) : p.doneToday ? (
          <div className="card">
            <h2>✔️ Задание на сегодня выполнено</h2>
            <p className="muted">Следующий день — «{day.title}» — откроется завтра. Регулярность важнее скорости.</p>
            {todayRec && <div className="card flat" style={{ background: 'var(--card2)' }}><div className="muted small">Ваша рефлексия</div><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{todayRec.reflection}</p></div>}
          </div>
        ) : (
          <div className="card" style={{ borderColor: t.color }}>
            <div className="chip" style={{ background: t.color + '22', color: t.color }}>День {p.next}</div>
            <h2 style={{ marginTop: 8 }}>{day.title}</h2>
            <p>📖 {day.theory}</p>
            <div className="card flat" style={{ background: 'var(--card2)', marginBottom: 14 }}>
              <div className="muted small" style={{ fontWeight: 700 }}>ЗАДАНИЕ</div>
              <p style={{ margin: 0, fontSize: 16 }}>🎯 {day.task}</p>
            </div>
            <label className="field"><span>Рефлексия: что получилось, что было трудно, что заметили?</span>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Выполнив задание, запишите несколько мыслей…" /></label>
            <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Насколько удалось?</span>
              <div className="likert" style={{ marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map((v) => <button key={v} className={rating === v ? 'sel' : ''} onClick={() => setRating(v)}>{'★'.repeat(v)}</button>)}
              </div>
            </div>
            <button className="btn lg block" onClick={complete}>Задание выполнено</button>
          </div>
        )}
      </div>

      {viewed && (
        <Modal title={`День ${view}: ${viewed.title}`} onClose={() => setView(null)} actions={<button className="btn" onClick={() => setView(null)}>Закрыть</button>}>
          <p>📖 {viewed.theory}</p>
          <p><b>🎯 {viewed.task}</b></p>
          {viewedRec && <div className="card flat" style={{ background: 'var(--card2)' }}>
            <div className="muted small">{fmtDate(viewedRec.date)} {viewedRec.rating ? '· ' + '★'.repeat(viewedRec.rating) : ''}</div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewedRec.reflection}</p>
          </div>}
        </Modal>
      )}
    </div>
  );
}
