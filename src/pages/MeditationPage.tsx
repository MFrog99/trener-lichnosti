import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MEDITATION } from '../data/relax';
import { store } from '../lib/store';
import { chime, mixer, SOUNDS } from '../lib/audio';
import { hasRussianVoice, speak, stopSpeech } from '../lib/speech';
import { XP } from '../lib/stats';
import { todayKey, uid } from '../lib/util';
import { Back, Empty, Progress, toast, useTitle } from '../components/ui';

export default function MeditationPage() {
  const { id = '' } = useParams();
  const m = MEDITATION[id];
  useTitle(m?.name ?? 'Медитация');
  const [idx, setIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [voice, setVoice] = useState(true);
  const [bg, setBg] = useState('');
  const [finished, setFinished] = useState(false);
  const timer = useRef<number>();
  const started = useRef(0);
  const runId = useRef(0);

  useEffect(() => () => { window.clearTimeout(timer.current); stopSpeech(); if (bg) mixer.stop(bg); }, []); // eslint-disable-line

  if (!m) return <Empty emoji="🤷" text="Медитация не найдена" />;

  const play = (i: number, rid: number) => {
    if (rid !== runId.current) return;
    if (i >= m.steps.length) { complete(); return; }
    setIdx(i);
    const s = m.steps[i];
    const after = () => { timer.current = window.setTimeout(() => play(i + 1, rid), s.pause * 1000); };
    if (voice && hasRussianVoice()) speak(s.text, { rate: 0.85, onend: after });
    else timer.current = window.setTimeout(after, Math.max(3000, s.text.length * 65));
  };

  const start = () => {
    runId.current++;
    started.current = Date.now();
    setFinished(false);
    setRunning(true);
    if (bg) mixer.play(bg, 0.25);
    play(0, runId.current);
  };
  const stop = () => {
    runId.current++;
    window.clearTimeout(timer.current);
    stopSpeech();
    setRunning(false);
    setIdx(-1);
    if (bg) mixer.stop(bg);
  };
  const complete = () => {
    setRunning(false);
    setFinished(true);
    if (bg) mixer.stop(bg);
    chime();
    const min = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    store.put('relaxLog', { id: uid(), date: todayKey(), kind: 'meditation', refId: m.id, title: m.name, minutes: min });
    toast(`Медитация завершена · +${XP.relax} XP`);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Back to="/relax" label="Релакс" />
      <div className="center">
        <div style={{ fontSize: 60 }}>{m.emoji}</div>
        <h1>{m.name}</h1>
        <p className="muted">{m.description}</p>
      </div>

      {running && idx >= 0 && (
        <div className="card center" style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
          <p style={{ fontSize: 20, lineHeight: 1.5, margin: 0 }}>{m.steps[idx].text}</p>
        </div>
      )}
      {running && <div style={{ marginTop: 12 }}><Progress value={(idx + 1) / m.steps.length} /></div>}
      {finished && <div className="card center"><h2>🌿 Практика завершена</h2><p className="muted">Побудьте ещё немного в тишине, прежде чем вернуться к делам.</p></div>}

      {!running && (
        <div className="card" style={{ marginTop: 12 }}>
          <label className="check" style={{ marginBottom: 12 }}><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> Озвучивать голосом</label>
          {voice && !hasRussianVoice() && <p className="muted small">На устройстве не найден русский голос — текст будет показан на экране. Голос можно установить в настройках системы (Речь / Синтез речи).</p>}
          <label className="field"><span>Фоновый звук</span>
            <select value={bg} onChange={(e) => setBg(e.target.value)}>
              <option value="">Без фона</option>
              {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select></label>
          <p className="muted small" style={{ margin: 0 }}>Длительность ~{m.minutes} мин. Найдите тихое место; можно надеть наушники.</p>
        </div>
      )}

      <div className="row section" style={{ justifyContent: 'center' }}>
        {running ? <button className="btn lg secondary" onClick={stop}>⏹ Остановить</button>
          : <button className="btn lg" onClick={start}>{finished ? 'Ещё раз' : '▶ Начать'}</button>}
      </div>
    </div>
  );
}
