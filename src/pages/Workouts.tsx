import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { items, store, useData } from '../lib/store';
import { PROGRAMS, PROGRAM, customSession, sessionMinutes } from '../data/programs';
import { EQUIP_LABEL, Equip } from '../data/exercises';
import { programDone, programTotal } from '../lib/progress';
import { fmtDate, fmtSec } from '../lib/util';
import { Empty, PageHead, Progress, Tabs, useTitle } from '../components/ui';

type Tab = 'programs' | 'mine' | 'history';

export default function Workouts() {
  useTitle('Тренировки');
  const d = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('programs');
  const [level, setLevel] = useState('all');
  const [equip, setEquip] = useState<'all' | Equip>('all');

  const active = d.settings.activeProgram ? PROGRAM[d.settings.activeProgram] : undefined;
  const list = PROGRAMS.filter((p) => (level === 'all' || p.level === level || p.level === 'Любой') && (equip === 'all' || p.equip === equip));
  const custom = items(d, 'customWorkouts').sort((a, b) => b.createdAt - a.createdAt);
  const history = items(d, 'workoutLog').sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <PageHead title="Тренировки" sub="Домашние программы для любого уровня"
        right={<div className="row"><Link to="/workouts/exercises" className="btn secondary">📚 Упражнения</Link><Link to="/workouts/builder" className="btn">＋ Своя тренировка</Link></div>} />

      {active && (
        <div className="card click" style={{ marginBottom: 18 }} onClick={() => nav(`/workouts/program/${active.id}`)}>
          <div className="row between">
            <div className="row"><div className="emoji-box">{active.emoji}</div>
              <div><div className="muted small">Текущая программа</div><h3 style={{ margin: 0 }}>{active.name}</h3></div></div>
            <button className="btn" onClick={(e) => { e.stopPropagation(); nav(`/play/program/${active.id}`); }}>▶ Начать</button>
          </div>
          {!active.endless && <div style={{ marginTop: 12 }}>
            <Progress value={programDone(d, active.id) / programTotal(active.id)} />
            <div className="muted small" style={{ marginTop: 4 }}>{programDone(d, active.id)} из {programTotal(active.id)} тренировок</div>
          </div>}
        </div>
      )}

      <Tabs value={tab} onChange={setTab} items={[['programs', 'Программы'], ['mine', 'Мои тренировки'], ['history', 'История']]} />

      {tab === 'programs' && (
        <>
          <div className="row wrap" style={{ marginBottom: 14 }}>
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">Любой уровень</option><option>Новичок</option><option>Средний</option><option>Продвинутый</option>
            </select>
            <select value={equip} onChange={(e) => setEquip(e.target.value as any)} style={{ width: 'auto' }}>
              <option value="all">Любой инвентарь</option>
              {(Object.keys(EQUIP_LABEL) as Equip[]).map((k) => <option key={k} value={k}>{EQUIP_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="grid g2">
            {list.map((p) => (
              <div key={p.id} className="card click" onClick={() => nav(`/workouts/program/${p.id}`)}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <div className="emoji-box">{p.emoji}</div>
                  <div className="grow"><h3 style={{ margin: 0 }}>{p.name}</h3><div className="muted small">{p.goal}</div></div>
                </div>
                <p className="muted small">{p.description}</p>
                <div className="chips">
                  <span className="chip accent">{p.level}</span>
                  <span className="chip">{EQUIP_LABEL[p.equip]}</span>
                  <span className="chip">{p.endless ? 'каждый день' : `${p.weeks} нед. × ${p.perWeek}`}</span>
                  <span className="chip">⏱ {p.minutes} мин</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'mine' && (custom.length === 0
        ? <Empty emoji="🛠️" text="Соберите свою тренировку из библиотеки упражнений"><Link to="/workouts/builder" className="btn">Создать</Link></Empty>
        : <div className="grid g2">
            {custom.map((w) => (
              <div key={w.id} className="card">
                <div className="row between"><h3 style={{ margin: 0 }}>{w.name}</h3>
                  <div className="row" style={{ gap: 2 }}>
                    <button className="icon-btn" title="Изменить" onClick={() => nav(`/workouts/builder/${w.id}`)}>✏️</button>
                    <button className="icon-btn" title="Удалить" onClick={() => confirm('Удалить тренировку?') && store.remove('customWorkouts', w.id)}>🗑️</button>
                  </div>
                </div>
                <p className="muted small">{w.items.length} упр. · {w.rounds} {w.rounds === 1 ? 'круг' : 'круга'} · ~{sessionMinutes(customSession(w))} мин</p>
                <button className="btn block" onClick={() => nav(`/play/custom/${w.id}`)}>▶ Начать</button>
              </div>
            ))}
          </div>)}

      {tab === 'history' && (history.length === 0
        ? <Empty emoji="📅" text="Здесь появятся завершённые тренировки" />
        : <div>{history.slice(0, 100).map((h) => (
            <div key={h.id} className="list-item">
              <div className="emoji-box">💪</div>
              <div className="grow"><div style={{ fontWeight: 600 }}>{h.title}</div>
                <div className="muted small">{fmtDate(h.date)} · {fmtSec(h.durationSec)} · {h.exercises} упр.</div></div>
            </div>
          ))}</div>)}
    </div>
  );
}
