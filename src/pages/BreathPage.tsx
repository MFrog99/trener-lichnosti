import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BREATH } from '../data/relax';
import { store } from '../lib/store';
import { beep, chime } from '../lib/audio';
import { speak, stopSpeech } from '../lib/speech';
import { XP } from '../lib/stats';
import { todayKey, uid } from '../lib/util';
import { Back, Empty, toast, useTitle } from '../components/ui';

export default function BreathPage() {
  const { id = '' } = useParams();
  const b = BREATH[id];
  useTitle(b?.name ?? 'Дыхание');
  const [cycles, setCycles] = useState(b?.cycles ?? 6);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [guide, setGuide] = useState(store.get().settings.voice);
  const timer = useRef<number>();
  const started = useRef(0);

  useEffect(() => () => { window.clearInterval(timer.current); stopSpeech(); }, []);

  useEffect(() => {
    if (!running || !b) return;
    const p = b.phases[phase];
    setCount(p.sec);
    if (guide) speak(p.label, { rate: 0.85 }); else beep(p.scale > 0.6 ? 523 : 392, 0.2, 0.12);
    let left = p.sec;
    timer.current = window.setInterval(() => {
      left--;
      if (left > 0) { setCount(left); return; }
      window.clearInterval(timer.current);
      const nextPhase = (phase + 1) % b.phases.length;
      if (nextPhase === 0) {
        if (cycle + 1 >= cycles) { complete(); return; }
        setCycle((c) => c + 1);
      }
      setPhase(nextPhase);
    }, 1000);
    return () => window.clearInterval(timer.current);
  }, [running, phase, cycle]); // eslint-disable-line

  if (!b) return <Empty emoji="🤷" text="Техника не найдена" />;

  const complete = () => {
    setRunning(false);
    setFinished(true);
    chime();
    const min = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    store.put('relaxLog', { id: uid(), date: todayKey(), kind: 'breath', refId: b.id, title: b.name, minutes: min });
    toast(`Практика завершена · +${XP.relax} XP`);
  };
  const start = () => { setPhase(0); setCycle(0); setFinished(false); started.current = Date.now(); setRunning(true); };
  const stop = () => { setRunning(false); window.clearInterval(timer.current); stopSpeech(); };

  const p = b.phases[phase];
  const scale = running ? p.scale : 0.6;
  const totalMin = Math.round((b.phases.reduce((s, x) => s + x.sec, 0) * cycles) / 60);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Back to="/relax" label="Релакс" />
      <div className="center">
        <h1>{b.emoji} {b.name}</h1>
        <p className="muted">{b.description}</p>
      </div>
      <div className="breath-stage">
        <div className="breath-circle" style={{ transform: `scale(${scale})`, transitionDuration: running ? `${p.sec}s` : '0.6s' }} />
        <div className="breath-label">
          {running ? <><div style={{ fontSize: 20, fontWeight: 700 }}>{p.label}</div><div className="t">{count}</div></>
            : finished ? <div style={{ fontSize: 20, fontWeight: 700 }}>Готово 🌿</div>
            : <div style={{ fontSize: 18, fontWeight: 700 }}>Готовы?</div>}
        </div>
      </div>
      {running && <p className="center muted">Цикл {cycle + 1} из {cycles}</p>}
      {!running && (
        <div className="card" style={{ marginBottom: 14 }}>
          <label className="field"><span>Количество циклов: {cycles} (~{totalMin || 1} мин)</span>
            <input type="range" min={3} max={30} value={cycles} onChange={(e) => setCycles(+e.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /> Голосовые подсказки (иначе — тихие сигналы)</label>
        </div>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        {running ? <button className="btn lg secondary" onClick={stop}>⏹ Остановить</button>
          : <button className="btn lg" onClick={start}>{finished ? 'Ещё раз' : '▶ Начать'}</button>}
      </div>
    </div>
  );
}
