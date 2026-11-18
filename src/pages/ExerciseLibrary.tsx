import { useState } from 'react';
import { EXERCISES, EQUIP_LABEL, Equip } from '../data/exercises';
import { Figure } from '../components/Figure';
import { Back, PageHead, Tabs, useTitle } from '../components/ui';
import { ExerciseModal } from './ProgramPage';

export default function ExerciseLibrary() {
  useTitle('Упражнения');
  const [eq, setEq] = useState<Equip | 'stretch'>('none');
  const [q, setQ] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const list = EXERCISES.filter((e) => (eq === 'stretch' ? e.stretch : e.equip === eq && !e.stretch))
    .filter((e) => !q || (e.name + e.group).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Back to="/workouts" label="Тренировки" />
      <PageHead title="Библиотека упражнений" sub="Нажмите на упражнение, чтобы увидеть технику" />
      <Tabs value={eq} onChange={setEq} items={[['none', EQUIP_LABEL.none], ['dumbbells', EQUIP_LABEL.dumbbells], ['band', EQUIP_LABEL.band], ['stretch', 'Растяжка']]} />
      <input type="text" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 14 }} />
      <div className="grid g4">
        {list.map((e) => (
          <div key={e.id} className="card click" style={{ padding: 10 }} onClick={() => setInfo(e.id)}>
            <div className="fig-box"><Figure exId={e.id} /></div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>{e.name}</div>
            <div className="muted small">{e.group}</div>
          </div>
        ))}
      </div>
      {info && <ExerciseModal id={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
