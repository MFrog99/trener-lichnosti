import { useData } from '../lib/store';
import { ACHIEVEMENTS, computeStats, RANKS, rankName, XP } from '../lib/stats';
import { PageHead, Progress, useTitle } from '../components/ui';

export default function Achievements() {
  useTitle('Достижения');
  const d = useData();
  const s = computeStats(d);
  return (
    <div>
      <PageHead title="Достижения" sub={`Открыто ${s.achievements.length} из ${ACHIEVEMENTS.length}`} />
      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Уровень {s.level} · {rankName(s.level)}</h3><span className="chip accent">⭐ {s.xp} XP</span></div>
        <div style={{ margin: '10px 0 6px' }}><Progress value={s.levelProgress} /></div>
        <div className="muted small">До следующего уровня: {s.levelNext - s.xp} XP · Лучшая серия: {s.bestStreak} дн.</div>
      </div>
      <div className="grid g4 section">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={'ach' + (s.achievements.includes(a.id) ? '' : ' locked')}>
            <div className="e">{a.emoji}</div>
            <div style={{ fontWeight: 700 }}>{a.title}</div>
            <div className="muted small">{a.desc}</div>
          </div>
        ))}
      </div>
      <div className="grid g2 section">
        <div className="card">
          <h3>Как получать опыт</h3>
          <table className="table"><tbody>
            <tr><td>💪 Тренировка</td><td>+{XP.workout}</td></tr>
            <tr><td>🚀 Задание развития</td><td>+{XP.traitDay}</td></tr>
            <tr><td>🧭 Тест черт</td><td>+{XP.assessment}</td></tr>
            <tr><td>🧘 Практика релакса</td><td>+{XP.relax}</td></tr>
            <tr><td>📔 Запись в дневнике</td><td>+{XP.journal}</td></tr>
            <tr><td>🎯 Этап цели / цель</td><td>+{XP.goalStep} / +{XP.goal}</td></tr>
            <tr><td>✅ Привычка · 🙂 настроение</td><td>+{XP.habit} · +{XP.mood}</td></tr>
          </tbody></table>
        </div>
        <div className="card">
          <h3>Звания</h3>
          {RANKS.map((r, i) => (
            <div key={r} className="row between" style={{ padding: '4px 0', fontWeight: rankName(s.level) === r ? 700 : 400 }}>
              <span>{rankName(s.level) === r ? '▶ ' : ''}{r}</span><span className="muted small">с {i * 2 + 1} ур.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
