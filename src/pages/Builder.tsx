import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomItem, store } from '../lib/store';
import { EXERCISES, EX, EQUIP_LABEL } from '../data/exercises';
import { customSession, sessionMinutes } from '../data/programs';
import { uid } from '../lib/util';
import { Figure } from '../components/Figure';
import { Back, Modal, toast, useTitle } from '../components/ui';

export default function Builder() {
  const { id } = useParams();
  const nav = useNavigate();
  const existing = id ? store.get().customWorkouts[id] : undefined;
  useTitle(existing ? 'Редактирование тренировки' : 'Новая тренировка');
  const [name, setName] = useState(existing?.name ?? 'Моя тренировка');
  const [rounds, setRounds] = useState(existing?.rounds ?? 3);
  const [rest, setRest] = useState(existing?.rest ?? 20);
  const [list, setList] = useState<CustomItem[]>(existing?.items ?? []);
  const [picking, setPicking] = useState(false);

  const update = (i: number, patch: Partial<CustomItem>) => setList(list.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const c = [...list]; [c[i], c[j]] = [c[j], c[i]]; setList(c);
  };
  const save = () => {
    if (!list.length) { toast('Добавьте хотя бы одно упражнение'); return; }
    const w = store.put('customWorkouts', {
      id: existing?.id ?? uid(), name: name.trim() || 'Моя тренировка', items: list,
      rounds: Math.max(1, rounds), rest: Math.max(0, rest), createdAt: existing?.createdAt ?? Date.now(),
    });
    toast('Тренировка сохранена');
    nav('/workouts', { replace: true });
    return w;
  };
  const preview = customSession({ id: 'x', name, items: list, rounds, rest, createdAt: 0, updatedAt: 0 });

  return (
    <div>
      <Back to="/workouts" label="Тренировки" />
      <h1>{existing ? 'Редактирование' : 'Своя тренировка'}</h1>
      <div className="card">
        <label className="field"><span>Название</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
        <div className="grid g3">
          <label className="field"><span>Кругов</span><input type="number" min={1} max={10} value={rounds} onChange={(e) => setRounds(+e.target.value)} /></label>
          <label className="field"><span>Отдых между упражнениями, сек</span><input type="number" min={0} max={180} step={5} value={rest} onChange={(e) => setRest(+e.target.value)} /></label>
          <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Длительность</span><div style={{ fontSize: 22, fontWeight: 700 }}>~{sessionMinutes(preview)} мин</div></div>
        </div>
      </div>

      <div className="section">
        <div className="row between"><h2>Упражнения</h2><button className="btn" onClick={() => setPicking(true)}>＋ Добавить</button></div>
        {list.length === 0 && <p className="muted">Пока пусто — добавьте упражнения из библиотеки.</p>}
        {list.map((it, i) => (
          <div key={i} className="list-item">
            <div style={{ width: 54, height: 54, flexShrink: 0 }} className="fig-box"><Figure exId={it.ex} playing={false} /></div>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{EX[it.ex]?.name}</div>
              <div className="row" style={{ marginTop: 6, gap: 6 }}>
                <select value={it.mode} onChange={(e) => update(i, { mode: e.target.value as any, value: e.target.value === 'time' ? 40 : 12 })} style={{ width: 'auto', padding: '4px 8px' }}>
                  <option value="time">Время, сек</option><option value="reps">Повторы</option>
                </select>
                <input type="number" min={1} max={600} value={it.value} onChange={(e) => update(i, { value: +e.target.value })} style={{ width: 80, padding: '4px 8px' }} />
              </div>
            </div>
            <div className="col" style={{ gap: 0 }}>
              <button className="icon-btn" onClick={() => move(i, -1)}>▲</button>
              <button className="icon-btn" onClick={() => move(i, 1)}>▼</button>
            </div>
            <button className="icon-btn" onClick={() => setList(list.filter((_, k) => k !== i))}>🗑️</button>
          </div>
        ))}
      </div>

      <div className="row section">
        <button className="btn lg" onClick={save}>Сохранить</button>
        <button className="btn ghost lg" onClick={() => nav('/workouts')}>Отмена</button>
      </div>

      {picking && (
        <Modal title="Выберите упражнение" onClose={() => setPicking(false)}>
          {(['none', 'dumbbells', 'band'] as const).map((eq) => (
            <div key={eq} style={{ marginBottom: 14 }}>
              <h3>{EQUIP_LABEL[eq]}</h3>
              {EXERCISES.filter((e) => e.equip === eq).map((e) => (
                <div key={e.id} className="list-item" style={{ cursor: 'pointer', padding: 8 }}
                  onClick={() => { setList([...list, { ex: e.id, mode: 'time', value: e.stretch ? 45 : 40 }]); setPicking(false); }}>
                  <div style={{ width: 40, height: 40 }} className="fig-box"><Figure exId={e.id} playing={false} /></div>
                  <div className="grow"><div style={{ fontWeight: 600 }}>{e.name}</div><div className="muted small">{e.group}</div></div>
                  <span>＋</span>
                </div>
              ))}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
