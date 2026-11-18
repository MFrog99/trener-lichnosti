import { Link, useNavigate } from 'react-router-dom';
import { items, store, useData } from '../lib/store';
import { useCloud } from '../lib/cloud';
import { computeStats, rankName, XP } from '../lib/stats';
import { greeting, lastDays, pickDaily, pl, todayKey } from '../lib/util';
import { journalToday, lastAssessment, programDone, relaxToday, todayMood, traitProgress, workoutToday } from '../lib/progress';
import { MOODS, QUOTES } from '../data/misc';
import { PROGRAM, programPosition } from '../data/programs';
import { TRAIT } from '../data/traits';
import { ActivityHeat } from '../components/Charts';
import { Progress, toast, useTitle } from '../components/ui';
import { parseKey } from '../lib/util';

export default function Home() {
  useTitle('Главная');
  const d = useData();
  const cloud = useCloud();
  const nav = useNavigate();
  const s = computeStats(d);
  const name = cloud.profile?.nickname || d.settings.name;
  const mood = todayMood(d);
  const today = todayKey();
  const wd = parseKey(today).getDay();

  const prog = d.settings.activeProgram ? PROGRAM[d.settings.activeProgram] : undefined;
  const progIdx = prog ? programDone(d, prog.id) : 0;
  const traits = d.settings.activeTraits.map((id) => TRAIT[id]).filter(Boolean);
  const habits = items(d, 'habits').filter((h) => !h.archived && h.weekdays.includes(wd));
  const habitsDone = habits.filter((h) => d.habitChecks[`${h.id}_${today}`]?.done && !d.habitChecks[`${h.id}_${today}`]?.deleted).length;

  const setMood = (v: number) => {
    store.put('moods', { id: today, date: today, value: v });
    toast(`Настроение отмечено · +${XP.mood} XP`);
  };

  const tasks: { emoji: string; title: string; sub: string; done: boolean; to: string }[] = [];
  if (prog) {
    const pos = programPosition(prog, progIdx);
    tasks.push({ emoji: prog.emoji, title: prog.endless ? prog.name : `${prog.name}: ${pos.workout.name}`, sub: prog.endless ? 'Ежедневно' : `Неделя ${pos.week + 1}`, done: workoutToday(d), to: `/workouts/program/${prog.id}` });
  } else {
    tasks.push({ emoji: '💪', title: 'Выберите программу тренировок', sub: 'Тренировки', done: workoutToday(d), to: '/workouts' });
  }
  traits.forEach((t) => {
    const p = traitProgress(d, t.id);
    if (p.completed) return;
    tasks.push({ emoji: t.emoji, title: `${t.name}: ${t.days[p.next - 1].title}`, sub: `День ${p.doneToday ? p.next - 1 : p.next} из 21`, done: p.doneToday, to: `/growth/trait/${t.id}` });
  });
  if (!traits.length) tasks.push({ emoji: '🚀', title: lastAssessment(d) ? 'Выберите черту для развития' : 'Пройдите тест черт личности', sub: 'Развитие', done: false, to: lastAssessment(d) ? '/growth' : '/growth/test' });
  tasks.push({ emoji: '🧘', title: 'Дыхание или медитация', sub: 'Релакс · от 2 минут', done: relaxToday(d), to: '/relax' });
  tasks.push({ emoji: '📔', title: 'Запись в дневнике', sub: 'Дневник', done: journalToday(d), to: '/journal' });
  if (habits.length) tasks.push({ emoji: '✅', title: `Привычки: ${habitsDone} из ${habits.length}`, sub: 'Привычки', done: habitsDone === habits.length, to: '/habits' });
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{greeting()}{name ? `, ${name}` : ''}!</h1>
          <p className="muted">{pickDaily(QUOTES)}</p>
        </div>
      </div>

      <div className="banner">
        <div className="row between wrap">
          <div>
            <div className="muted small">Уровень {s.level}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{rankName(s.level)}</div>
          </div>
          <div className="row" style={{ gap: 22 }}>
            <div className="center"><div style={{ fontSize: 22, fontWeight: 800 }}>🔥 {s.streak}</div><div className="muted small">серия дней</div></div>
            <div className="center"><div style={{ fontSize: 22, fontWeight: 800 }}>⭐ {s.xp}</div><div className="muted small">опыта</div></div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><Progress value={s.levelProgress} /></div>
        <div className="muted small" style={{ marginTop: 6 }}>До уровня {s.level + 1}: {s.levelNext - s.xp} XP</div>
      </div>

      <div className="grid g2 section">
        <div className="card">
          <div className="card-title"><h3>Как вы сегодня?</h3>{mood && <span className="chip ok">Отмечено</span>}</div>
          <div className="mood-pick">
            {MOODS.map((m) => (
              <button key={m.value} className={mood === m.value ? 'sel' : ''} title={m.label} onClick={() => setMood(m.value)}>{m.emoji}</button>
            ))}
          </div>
          <div className="section" style={{ marginTop: 18 }}>
            <div className="row between"><h3 style={{ margin: 0 }}>Активность за 30 дней</h3><span className="muted small">{s.activeDates.size} акт. дней всего</span></div>
            <div style={{ marginTop: 10 }}><ActivityHeat days={lastDays(30)} active={s.activeDates} /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><h3>План на сегодня</h3><span className="chip accent">{doneCount}/{tasks.length}</span></div>
          {tasks.map((t, i) => (
            <div key={i} className="list-item" style={{ cursor: 'pointer', opacity: t.done ? 0.65 : 1 }} onClick={() => nav(t.to)}>
              <div className="emoji-box">{t.done ? '✔️' : t.emoji}</div>
              <div className="grow">
                <div style={{ fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                <div className="muted small">{t.sub}</div>
              </div>
              <span className="muted">›</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g4 section">
        <Link to="/workouts" className="card click stat"><div className="v">{s.workouts}</div><div className="l">тренировок · {s.workoutMinutes} мин</div></Link>
        <Link to="/relax" className="card click stat"><div className="v">{s.relaxMinutes}</div><div className="l">минут релакса</div></Link>
        <Link to="/growth" className="card click stat"><div className="v">{s.traitDays}</div><div className="l">заданий развития</div></Link>
        <Link to="/achievements" className="card click stat"><div className="v">{s.achievements.length}</div><div className="l">{pl(s.achievements.length, ['достижение', 'достижения', 'достижений']).split(' ')[1]}</div></Link>
      </div>
    </div>
  );
}
