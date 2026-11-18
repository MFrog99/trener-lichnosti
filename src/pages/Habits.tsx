import { useState } from 'react';
import { Habit, items, store, useData } from '../lib/store';
import { EMOJIS, HABIT_COLORS, HABIT_TEMPLATES } from '../data/misc';
import { habitStreak, XP } from '../lib/stats';
import { addDays, parseKey, todayKey, uid, WEEK_ORDER, WEEKDAYS_SHORT } from '../lib/util';
import { Empty, Modal, PageHead, toast, useTitle } from '../components/ui';

export default function Habits() {
  useTitle('Привычки');
  const d = useData();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Partial<Habit> | null>(null);
  const today = todayKey();
  // неделя пн–вс
  const dow = (parseKey(today).getDay() + 6) % 7;
  const monday = addDays(today, -dow + offset * 7);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const habits = items(d, 'habits').filter((h) => !h.archived).sort((a, b) => a.createdAt - b.createdAt);
  const archived = items(d, 'habits').filter((h) => h.archived);

  const toggle = (h: Habit, date: string) => {
    if (date > today) return;
    const id = `${h.id}_${date}`;
    const cur = d.habitChecks[id];
    const done = !(cur && !cur.deleted && cur.done);
    store.put('habitChecks', { id, habitId: h.id, date, done });
    if (done) toast(`+${XP.habit} XP`);
  };

  return (
    <div>
      <PageHead title="Трекер привычек" sub="Маленькие ежедневные действия меняют жизнь"
        right={<button className="btn" onClick={() => setEditing({ emoji: '⭐', color: HABIT_COLORS[0], weekdays: [0, 1, 2, 3, 4, 5, 6] })}>＋ Привычка</button>} />

      {habits.length === 0 ? (
        <div className="card">
          <Empty emoji="🌱" text="Начните с одной простой привычки. Вот идеи:" />
          <div className="chips" style={{ justifyContent: 'center' }}>
            {HABIT_TEMPLATES.map((t) => (
              <button key={t.name} className="btn secondary sm" onClick={() => setEditing({ name: t.name, emoji: t.emoji, color: HABIT_COLORS[0], weekdays: [0, 1, 2, 3, 4, 5, 6] })}>{t.emoji} {t.name}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <button className="icon-btn" onClick={() => setOffset(offset - 1)}>‹</button>
            <b>{offset === 0 ? 'Эта неделя' : `${parseKey(week[0]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${parseKey(week[6]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}</b>
            <button className="icon-btn" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0}>›</button>
          </div>
          <div className="habit-grid">
            <div />
            {week.map((k) => <div key={k} className="habit-head">{WEEKDAYS_SHORT[parseKey(k).getDay()]}<br />{parseKey(k).getDate()}</div>)}
            {habits.map((h) => (
              <Row key={h.id} h={h} week={week} today={today} d={d} onToggle={toggle} onEdit={() => setEditing(h)} />
            ))}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <div className="section">
          <h3 className="muted">Архив</h3>
          {archived.map((h) => (
            <div key={h.id} className="list-item">
              <div className="emoji-box">{h.emoji}</div><div className="grow">{h.name}</div>
              <button className="btn sm secondary" onClick={() => store.put('habits', { ...h, archived: false })}>Вернуть</button>
            </div>
          ))}
        </div>
      )}
      <p className="muted small section">💡 Совет: привязывайте новую привычку к существующей — «после утреннего кофе я 5 минут читаю».</p>
      {editing && <HabitForm habit={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Row({ h, week, today, d, onToggle, onEdit }: { h: Habit; week: string[]; today: string; d: ReturnType<typeof useData>; onToggle: (h: Habit, k: string) => void; onEdit: () => void }) {
  const streak = habitStreak(d, h.id, h.weekdays);
  return (
    <>
      <div style={{ cursor: 'pointer', minWidth: 0 }} onClick={onEdit}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.emoji} {h.name}</div>
        <div className="muted small">{streak > 0 ? `🔥 ${streak}` : 'серия 0'}</div>
      </div>
      {week.map((k) => {
        const c = d.habitChecks[`${h.id}_${k}`];
        const done = c && !c.deleted && c.done;
        const scheduled = h.weekdays.includes(parseKey(k).getDay());
        const future = k > today;
        return (
          <button key={k} className={'habit-cell' + (k === today ? ' today' : '') + (future ? ' off' : '')}
            style={done ? { background: h.color, borderColor: h.color } : !scheduled ? { borderStyle: 'dashed' } : undefined}
            onClick={() => onToggle(h, k)} disabled={future}>{done ? '✓' : ''}</button>
        );
      })}
    </>
  );
}

function HabitForm({ habit, onClose }: { habit: Partial<Habit>; onClose: () => void }) {
  const [name, setName] = useState(habit.name ?? '');
  const [emoji, setEmoji] = useState(habit.emoji ?? '⭐');
  const [color, setColor] = useState(habit.color ?? HABIT_COLORS[0]);
  const [days, setDays] = useState<number[]>(habit.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  const save = () => {
    if (!name.trim()) return;
    store.put('habits', { id: habit.id ?? uid(), name: name.trim(), emoji, color, weekdays: days, createdAt: habit.createdAt ?? Date.now(), archived: false });
    onClose();
  };
  return (
    <Modal title={habit.id ? 'Привычка' : 'Новая привычка'} onClose={onClose}
      actions={<>
        {habit.id && <button className="btn ghost" onClick={() => { store.put('habits', { ...(habit as Habit), archived: true }); onClose(); }}>В архив</button>}
        {habit.id && <button className="btn danger" onClick={() => { if (confirm('Удалить привычку и всю её историю?')) { store.remove('habits', habit.id!); onClose(); } }}>Удалить</button>}
        <button className="btn" onClick={save} disabled={!name.trim() || !days.length}>Сохранить</button>
      </>}>
      <label className="field"><span>Название</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoFocus /></label>
      <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Значок</span>
        <div className="chips">{EMOJIS.map((e) => <button key={e} className={'btn sm ' + (emoji === e ? '' : 'ghost')} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
      <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Цвет</span>
        <div className="row">{HABIT_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 99, background: c, border: color === c ? '3px solid var(--text)' : '0', cursor: 'pointer' }} />)}</div></div>
      <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Дни недели</span>
        <div className="row wrap">{WEEK_ORDER.map((w) => (
          <button key={w} className={'btn sm ' + (days.includes(w) ? '' : 'ghost')} onClick={() => setDays(days.includes(w) ? days.filter((x) => x !== w) : [...days, w])}>{WEEKDAYS_SHORT[w]}</button>
        ))}</div></div>
    </Modal>
  );
}
