import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { TRAITS, scoreAnswers } from '../data/traits';
import { todayKey, uid } from '../lib/util';
import { XP } from '../lib/stats';
import { Radar } from '../components/Charts';
import { Back, Progress, toast, useTitle } from '../components/ui';
import { MAX_ACTIVE_TRAITS } from './Growth';

const SCALE = ['Совсем не про меня', 'Скорее нет', 'Отчасти', 'Скорее да', 'Точно про меня'];

export default function TraitTest() {
  useTitle('Тест черт личности');
  const nav = useNavigate();
  // перемешиваем вопросы разных черт, но стабильно в рамках сеанса
  const questions = useMemo(() => {
    const qs = TRAITS.flatMap((t) => t.questions.map((q, i) => ({ trait: t.id, i, text: q.text })));
    const out: typeof qs = [];
    const maxQ = Math.max(...TRAITS.map((t) => t.questions.length));
    for (let i = 0; i < maxQ; i++) TRAITS.forEach((t) => { const q = qs.find((x) => x.trait === t.id && x.i === i); if (q) out.push(q); });
    return out;
  }, []);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const answer = (v: number) => {
    const q = questions[pos];
    const a = { ...answers, [q.trait]: [...(answers[q.trait] || [])] };
    a[q.trait][q.i] = v;
    setAnswers(a);
    if (pos + 1 < questions.length) setTimeout(() => setPos(pos + 1), 150);
    else {
      const scores = scoreAnswers(a);
      store.put('assessments', { id: uid(), date: todayKey(), scores });
      toast(`Тест сохранён · +${XP.assessment} XP`);
      setResult(scores);
    }
  };

  if (result) {
    const sorted = [...TRAITS].sort((x, y) => result[x.id] - result[y.id]);
    const weak = sorted.slice(0, 2);
    const strong = sorted.slice(-2).reverse();
    const startWeak = () => {
      const cur = store.get().settings.activeTraits;
      const next = [...new Set([...cur, ...weak.map((w) => w.id)])].slice(0, MAX_ACTIVE_TRAITS);
      store.setSettings({ activeTraits: next });
      nav('/growth');
    };
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1>Ваш профиль</h1>
        <div className="card">
          <Radar labels={TRAITS.map((t) => t.name)} series={[TRAITS.map((t) => result[t.id])]} colors={['var(--accent)']} />
        </div>
        <div className="grid g2 section">
          <div className="card"><h3>💎 Сильные стороны</h3>
            {strong.map((t) => <p key={t.id}>{t.emoji} <b>{t.name}</b> — {result[t.id]}/100</p>)}
            <p className="muted small">Опирайтесь на них — они помогают развивать остальное.</p></div>
          <div className="card"><h3>🌱 Зоны роста</h3>
            {weak.map((t) => <p key={t.id}>{t.emoji} <b>{t.name}</b> — {result[t.id]}/100</p>)}
            <button className="btn block" onClick={startWeak}>Начать курсы по этим чертам</button></div>
        </div>
        <p className="muted small">Тест — инструмент самонаблюдения, а не психологическая диагностика. Повторите его через месяц, чтобы увидеть изменения.</p>
        <button className="btn secondary" onClick={() => nav('/growth')}>К развитию</button>
      </div>
    );
  }

  const q = questions[pos];
  const cur = answers[q.trait]?.[q.i];
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Back to="/growth" label="Развитие" />
      <h1>Тест черт личности</h1>
      <p className="muted">Отвечайте честно и быстро — первое, что приходит в голову. Правильных ответов нет.</p>
      <Progress value={pos / questions.length} />
      <p className="muted small" style={{ marginTop: 6 }}>Вопрос {pos + 1} из {questions.length}</p>
      <div className="card section">
        <h2 style={{ minHeight: 60 }}>{q.text}</h2>
        <div className="col">
          {SCALE.map((s, i) => (
            <button key={i} className={'btn ' + (cur === i + 1 ? '' : 'secondary')} style={{ justifyContent: 'flex-start' }} onClick={() => answer(i + 1)}>
              <span className="chip" style={{ minWidth: 26 }}>{i + 1}</span> {s}
            </button>
          ))}
        </div>
      </div>
      {pos > 0 && <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setPos(pos - 1)}>← Предыдущий вопрос</button>}
    </div>
  );
}
