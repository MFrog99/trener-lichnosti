import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store } from '../lib/store';
import { PROGRAM, Session, YOGA_BY_ID, customSession, programSession, yogaSession } from '../data/programs';
import { EX } from '../data/exercises';
import { programDone, programTotal } from '../lib/progress';
import { beep, chime } from '../lib/audio';
import { speak, stopSpeech } from '../lib/speech';
import { XP } from '../lib/stats';
import { fmtSec, todayKey, uid } from '../lib/util';
import { Figure } from '../components/Figure';
import { Empty, Ring, useTitle } from '../components/ui';
import { ExerciseModal } from './ProgramPage';

function buildSession(kind: string, id: string): Session | null {
  const d = store.get();
  if (kind === 'program') {
    const p = PROGRAM[id];
    if (!p) return null;
    const done = programDone(d, id);
    const idx = p.endless ? done : Math.min(done, programTotal(id) - 1);
    return programSession(p, idx);
  }
  if (kind === 'custom') {
    const w = d.customWorkouts[id];
    return w && !w.deleted ? customSession(w) : null;
  }
  if (kind === 'yoga') {
    const y = YOGA_BY_ID[id];
    return y ? yogaSession(y) : null;
  }
  return null;
}

export default function Player() {
  const { kind = '', id = '' } = useParams();
  const nav = useNavigate();
  const session = useMemo(() => buildSession(kind, id), [kind, id]);
  useTitle(session?.title ?? 'Тренировка');
  if (!session) return <Empty emoji="🤷" text="Тренировка не найдена" />;
  return <Run session={session} onExit={() => nav(-1)} />;
}

function Run({ session, onExit }: { session: Session; onExit: () => void }) {
  const nav = useNavigate();
  const settings = store.get().settings;
  const steps = session.steps;
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(steps[0].sec ?? 0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState<null | { sec: number }>(null);
  const [info, setInfo] = useState<string | null>(null);
  const start = useRef(Date.now());
  const logged = useRef(false);
  const step = steps[i];
  const nextWork = steps.slice(i + 1).find((s) => s.kind === 'work');

  // Не даём экрану погаснуть
  useEffect(() => {
    let lock: any;
    (navigator as any).wakeLock?.request('screen').then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.(); stopSpeech(); };
  }, []);

  const announce = (idx: number) => {
    const s = steps[idx];
    if (!s) return;
    if (s.kind === 'work') {
      if (settings.beeps) beep(1046, 0.25, 0.3);
      if (settings.voice) speak(s.reps ? `${s.label}. ${s.reps} повторений` : s.label);
    } else if (s.kind === 'rest') {
      const n = steps.slice(idx + 1).find((x) => x.kind === 'work');
      if (settings.voice) speak(n ? `${s.label}. Далее: ${n.label}` : s.label);
    } else if (settings.voice) {
      speak(`${session.title}. ${s.label}`);
    }
  };

  useEffect(() => { announce(0); }, []); // eslint-disable-line

  const finish = () => {
    if (logged.current) return;
    logged.current = true;
    const sec = Math.round((Date.now() - start.current) / 1000);
    const exercises = new Set(steps.filter((s) => s.kind === 'work').map((s) => s.ex)).size;
    if (session.relax) {
      store.put('relaxLog', { id: uid(), date: todayKey(), kind: 'yoga', refId: session.refId, title: session.title, minutes: Math.max(1, Math.round(sec / 60)) });
    } else {
      store.put('workoutLog', { id: uid(), date: todayKey(), title: session.title, kind: session.kind as any, refId: session.refId, index: session.index, durationSec: sec, exercises });
      if (session.kind === 'program' && !store.get().settings.activeProgram) store.setSettings({ activeProgram: session.refId });
    }
    chime();
    if (settings.voice) speak(session.relax ? 'Практика завершена. Отличная работа.' : 'Тренировка завершена! Вы молодец!');
    setDone({ sec });
  };

  const goTo = (n: number) => {
    if (n >= steps.length) { finish(); return; }
    const k = Math.max(0, n);
    setI(k);
    setLeft(steps[k].sec ?? 0);
    announce(k);
  };

  useEffect(() => {
    if (paused || done || step.sec == null) return;
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [i, paused, done, step.sec]);

  useEffect(() => {
    if (step.sec == null || done) return;
    if (left <= 0) goTo(i + 1);
    else if (left <= 3 && settings.beeps) beep(660, 0.12, 0.2);
    else if (step.kind === 'work' && step.sec >= 20 && left === Math.floor(step.sec / 2) && settings.voice && !session.relax) speak('Половина');
  }, [left]); // eslint-disable-line

  if (done) {
    return (
      <div className="player" style={{ paddingTop: 40 }}>
        <div style={{ fontSize: 70 }}>{session.relax ? '🌿' : '🏆'}</div>
        <h1>{session.relax ? 'Практика завершена' : 'Тренировка завершена!'}</h1>
        <p className="muted">{session.title}</p>
        <div className="grid g3" style={{ margin: '20px 0' }}>
          <div className="card stat"><div className="v">{fmtSec(done.sec)}</div><div className="l">время</div></div>
          <div className="card stat"><div className="v">+{session.relax ? XP.relax : XP.workout}</div><div className="l">опыта</div></div>
        </div>
        <div className="player-controls">
          <button className="btn lg" onClick={() => nav('/')}>На главную</button>
          <button className="btn secondary lg" onClick={() => nav('/journal')}>Записать впечатления</button>
        </div>
      </div>
    );
  }

  const total = step.sec ?? 1;
  const isRest = step.kind !== 'work';
  const showEx = step.kind === 'work' ? step.ex : nextWork?.ex;

  return (
    <div className={'player' + (isRest ? ' rest' : '')}>
      <div className="row between">
        <button className="icon-btn" onClick={() => (confirm('Завершить тренировку досрочно? Прогресс не сохранится.') ? onExit() : null)}>✕</button>
        <div className="muted small">{session.title}</div>
        <div className="muted small">{i + 1}/{steps.length}</div>
      </div>
      <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${(i / steps.length) * 100}%` }} /></div>

      <div style={{ marginTop: 18 }}>
        <div className="chip accent">{step.kind === 'work' ? (session.relax ? 'Поза' : 'Работа') : step.kind === 'rest' ? 'Отдых' : 'Подготовка'}
          {step.rounds > 1 ? ` · круг ${step.round}/${step.rounds}` : ''}</div>
        <h1 style={{ marginTop: 10 }}>{step.kind === 'work' ? step.label : step.label}</h1>
        {isRest && nextWork && <p className="muted">Далее: <b>{nextWork.label}</b></p>}
      </div>

      {showEx && (
        <div className="fig-box" onClick={() => setInfo(showEx)} style={{ cursor: 'pointer', opacity: isRest ? 0.6 : 1 }}>
          <Figure key={showEx + isRest} exId={showEx} playing={!paused && !isRest} />
        </div>
      )}

      {step.sec != null ? (
        <Ring value={left / total} size={150} color={isRest ? 'var(--accent2)' : undefined}>
          <div className="timer-big" style={{ fontSize: 46, margin: 0 }}>{fmtSec(left)}</div>
        </Ring>
      ) : (
        <div>
          <div className="timer-big">× {step.reps}</div>
          <button className="btn lg ok" onClick={() => goTo(i + 1)}>✓ Готово</button>
        </div>
      )}

      {showEx && <p className="muted small" style={{ marginTop: 10 }}>💡 {EX[showEx]?.tip} <a href="#" onClick={(e) => { e.preventDefault(); setInfo(showEx); }}>Техника</a></p>}

      <div className="player-controls">
        <button className="btn secondary" onClick={() => goTo(i - 1)} disabled={i === 0}>⏮</button>
        {step.sec != null && <button className="btn lg" onClick={() => setPaused((p) => !p)}>{paused ? '▶ Продолжить' : '⏸ Пауза'}</button>}
        <button className="btn secondary" onClick={() => goTo(i + 1)}>⏭</button>
      </div>
      {info && <ExerciseModal id={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
