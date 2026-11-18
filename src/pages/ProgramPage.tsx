import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store, useData } from '../lib/store';
import { PROGRAM, programPosition, programSession, sessionMinutes } from '../data/programs';
import { EQUIP_LABEL, EX } from '../data/exercises';
import { programDone, programTotal } from '../lib/progress';
import { Figure } from '../components/Figure';
import { Back, Empty, Modal, Progress, toast, useTitle } from '../components/ui';

export default function ProgramPage() {
  const { id = '' } = useParams();
  const p = PROGRAM[id];
  const d = useData();
  const nav = useNavigate();
  const [exInfo, setExInfo] = useState<string | null>(null);
  useTitle(p?.name ?? 'Программа');
  if (!p) return <Empty emoji="🤷" text="Программа не найдена" />;

  const done = programDone(d, p.id);
  const total = programTotal(p.id);
  const finished = !p.endless && done >= total;
  const idx = p.endless ? done : Math.min(done, total - 1);
  const next = programPosition(p, idx);
  const session = programSession(p, idx);
  const isActive = d.settings.activeProgram === p.id;

  return (
    <div>
      <Back to="/workouts" label="Тренировки" />
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="emoji-box" style={{ width: 56, height: 56, fontSize: 30 }}>{p.emoji}</div>
          <div className="grow"><h1 style={{ margin: 0 }}>{p.name}</h1><div className="muted">{p.goal}</div></div>
        </div>
        <p>{p.description}</p>
        <div className="chips" style={{ marginBottom: 14 }}>
          <span className="chip accent">{p.level}</span>
          <span className="chip">{EQUIP_LABEL[p.equip]}</span>
          <span className="chip">{p.endless ? 'каждый день' : `${p.weeks} нед. · ${p.perWeek} трен./нед.`}</span>
          <span className="chip">⏱ {p.minutes} мин</span>
        </div>
        {!p.endless && <>
          <Progress value={done / total} />
          <div className="muted small" style={{ margin: '6px 0 14px' }}>Выполнено {done} из {total}{finished ? ' — программа пройдена! 🎉' : ''}</div>
        </>}
        <div className="row wrap">
          <button className="btn lg" onClick={() => { if (!isActive) store.setSettings({ activeProgram: p.id }); nav(`/play/program/${p.id}`); }}>
            ▶ {finished ? 'Повторить последнюю' : `Начать: ${next.workout.name}`}
          </button>
          {!isActive
            ? <button className="btn secondary" onClick={() => { store.setSettings({ activeProgram: p.id }); toast('Программа выбрана'); }}>Сделать текущей</button>
            : <span className="chip ok">Текущая программа</span>}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Следующая: {p.endless ? '' : `неделя ${next.week + 1}, `}{next.scheme.rounds} {next.scheme.rounds === 1 ? 'круг' : 'круга'} · работа {next.scheme.work} с / отдых {next.scheme.rest} с · ~{sessionMinutes(session)} мин</p>
      </div>

      {p.workouts.map((w, wi) => (
        <div key={wi} className="section">
          <h2>{w.name}</h2>
          <div className="grid g4">
            {w.items.map((ex) => (
              <div key={ex} className="card click" style={{ padding: 10 }} onClick={() => setExInfo(ex)}>
                <div className="fig-box"><Figure exId={ex} /></div>
                <div style={{ fontWeight: 600, marginTop: 6, fontSize: 14 }}>{EX[ex]?.name}</div>
                <div className="muted small">{EX[ex]?.group}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!p.endless && (
        <div className="section card">
          <h3>Нагрузка по неделям</h3>
          <table className="table">
            <thead><tr><th>Неделя</th><th>Круги</th><th>Работа</th><th>Отдых</th></tr></thead>
            <tbody>{p.scheme.map((s, i) => (
              <tr key={i} className={i === next.week && !finished ? 'me' : ''}><td>{i + 1}</td><td>{s.rounds}</td><td>{s.work} с</td><td>{s.rest} с</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {exInfo && <ExerciseModal id={exInfo} onClose={() => setExInfo(null)} />}
    </div>
  );
}

export function ExerciseModal({ id, onClose }: { id: string; onClose: () => void }) {
  const ex = EX[id];
  return (
    <Modal title={ex.name} onClose={onClose} actions={<button className="btn" onClick={onClose}>Понятно</button>}>
      <div className="fig-box" style={{ maxWidth: 240, margin: '0 auto 12px' }}><Figure exId={id} /></div>
      <div className="chips" style={{ marginBottom: 10 }}><span className="chip accent">{ex.group}</span><span className="chip">{EQUIP_LABEL[ex.equip]}</span>{ex.perSide && <span className="chip">на каждую сторону</span>}</div>
      <ol style={{ paddingLeft: 20, margin: '0 0 10px' }}>{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="muted small">💡 {ex.tip}</p>
    </Modal>
  );
}
