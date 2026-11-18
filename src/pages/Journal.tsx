import { useState } from 'react';
import { items, JournalEntry, store, useData } from '../lib/store';
import { JOURNAL_PROMPTS, MOODS } from '../data/misc';
import { fmtDate, lastDays, pickDaily, todayKey, uid } from '../lib/util';
import { XP } from '../lib/stats';
import { MoodChart } from '../components/Charts';
import { Empty, Modal, PageHead, Tabs, toast, useTitle } from '../components/ui';

export default function Journal() {
  useTitle('Дневник');
  const d = useData();
  const [range, setRange] = useState<'14' | '30' | '90'>('14');
  const [prompt, setPrompt] = useState(pickDaily(JOURNAL_PROMPTS, 'j'));
  const [text, setText] = useState('');
  const [mood, setMood] = useState<number | undefined>(d.moods[todayKey()]?.deleted ? undefined : d.moods[todayKey()]?.value);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<JournalEntry | null>(null);

  const days = lastDays(+range);
  const moodVals: Record<string, number | undefined> = {};
  items(d, 'moods').forEach((m) => { moodVals[m.date] = m.value; });
  const known = days.map((k) => moodVals[k]).filter((v): v is number => !!v);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;

  const entries = items(d, 'journal').sort((a, b) => b.createdAt - a.createdAt)
    .filter((e) => !q || e.text.toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    if (!text.trim()) { toast('Напишите хоть пару строк'); return; }
    const date = todayKey();
    store.put('journal', { id: uid(), date, createdAt: Date.now(), text: text.trim(), prompt, mood });
    if (mood) store.put('moods', { id: date, date, value: mood });
    setText('');
    toast(`Запись сохранена · +${XP.journal} XP`);
  };

  return (
    <div>
      <PageHead title="Дневник и настроение" sub="Записывайте мысли — это снижает стресс и помогает понять себя" />
      <div className="grid g2">
        <div className="card">
          <h3>Новая запись</h3>
          <div className="row between" style={{ marginBottom: 8 }}>
            <i className="muted">💭 {prompt}</i>
            <button className="icon-btn" title="Другой вопрос" onClick={() => setPrompt(JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)])}>🔄</button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Пишите свободно…" style={{ minHeight: 140 }} />
          <div className="muted small" style={{ margin: '10px 0 6px', fontWeight: 600 }}>Настроение сегодня</div>
          <div className="mood-pick">
            {MOODS.map((m) => <button key={m.value} className={mood === m.value ? 'sel' : ''} title={m.label} onClick={() => setMood(m.value)}>{m.emoji}</button>)}
          </div>
          <button className="btn block" style={{ marginTop: 14 }} onClick={save}>Сохранить запись</button>
        </div>
        <div className="card">
          <div className="card-title"><h3>Настроение</h3>
            {avg > 0 && <span className="chip accent">в среднем {MOODS[Math.round(avg) - 1].emoji} {avg.toFixed(1)}</span>}</div>
          <Tabs value={range} onChange={setRange} items={[['14', '2 недели'], ['30', 'Месяц'], ['90', '3 месяца']]} />
          <MoodChart days={days} values={moodVals} />
          <p className="muted small" style={{ marginTop: 8 }}>Отмечено {known.length} из {days.length} дней. Отслеживайте, что поднимает настроение: тренировки, сон, общение.</p>
        </div>
      </div>

      <div className="section">
        <div className="row between wrap"><h2>Записи</h2>
          <input type="text" placeholder="Поиск по записям…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} /></div>
        {entries.length === 0 ? <Empty emoji="📔" text={q ? 'Ничего не найдено' : 'Здесь появятся ваши записи'} /> : entries.map((e) => (
          <div key={e.id} className="card" style={{ marginTop: 10 }}>
            <div className="row between">
              <div className="muted small">{fmtDate(e.date)} · {new Date(e.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} {e.mood ? MOODS[e.mood - 1].emoji : ''}</div>
              <div className="row" style={{ gap: 0 }}>
                <button className="icon-btn" onClick={() => setEdit(e)}>✏️</button>
                <button className="icon-btn" onClick={() => confirm('Удалить запись?') && store.remove('journal', e.id)}>🗑️</button>
              </div>
            </div>
            {e.prompt && <div className="muted small"><i>{e.prompt}</i></div>}
            <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{e.text}</p>
          </div>
        ))}
      </div>

      {edit && <EditEntry entry={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditEntry({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const [text, setText] = useState(entry.text);
  return (
    <Modal title="Редактировать запись" onClose={onClose}
      actions={<><button className="btn secondary" onClick={onClose}>Отмена</button>
        <button className="btn" onClick={() => { store.put('journal', { ...entry, text }); onClose(); }}>Сохранить</button></>}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 200 }} />
    </Modal>
  );
}
