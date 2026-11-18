// Все звуки синтезируются в браузере (Web Audio API) — файлы не нужны, работает офлайн.
let ctx: AudioContext | null = null;
export function audioCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function beep(freq = 880, dur = 0.15, vol = 0.25) {
  try {
    const c = audioCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  } catch { /* звук недоступен */ }
}
export const chime = () => { beep(660, 0.5, 0.18); setTimeout(() => beep(990, 0.8, 0.12), 180); };

// ---------- Генераторы шума ----------
function noiseBuffer(c: AudioContext, color: 'white' | 'pink' | 'brown', seconds = 4): AudioBuffer {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'white') d[i] = w * 0.5;
      else if (color === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  return buf;
}

export interface SoundDef { id: string; name: string; emoji: string }
export const SOUNDS: SoundDef[] = [
  { id: 'rain', name: 'Дождь', emoji: '🌧️' },
  { id: 'ocean', name: 'Океан', emoji: '🌊' },
  { id: 'wind', name: 'Ветер в лесу', emoji: '🌲' },
  { id: 'fire', name: 'Костёр', emoji: '🔥' },
  { id: 'stream', name: 'Ручей', emoji: '💧' },
  { id: 'night', name: 'Летняя ночь', emoji: '🦗' },
  { id: 'white', name: 'Белый шум', emoji: '⚪' },
  { id: 'pink', name: 'Розовый шум', emoji: '🌸' },
  { id: 'brown', name: 'Коричневый шум', emoji: '🟤' },
];

interface Running { gain: GainNode; stop: () => void }
const running = new Map<string, Running>();

function loopSource(c: AudioContext, buf: AudioBuffer) {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  return s;
}
function lfo(c: AudioContext, target: AudioParam, freq: number, depth: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

function build(id: string, out: GainNode): () => void {
  const c = audioCtx();
  const nodes: (AudioScheduledSourceNode)[] = [];
  const timers: number[] = [];
  const add = <T extends AudioScheduledSourceNode>(n: T) => { nodes.push(n); return n; };

  if (id === 'white' || id === 'pink' || id === 'brown') {
    const s = add(loopSource(c, noiseBuffer(c, id)));
    s.connect(out); s.start();
  } else if (id === 'rain') {
    const s = add(loopSource(c, noiseBuffer(c, 'pink')));
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    s.connect(hp).connect(lp).connect(out); s.start();
    // отдельные капли
    const drop = () => {
      const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = 1800 + Math.random() * 2500;
      g.gain.setValueAtTime(0.04 * Math.random(), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
      o.connect(g).connect(out); o.start(); o.stop(c.currentTime + 0.06);
      timers.push(window.setTimeout(drop, 30 + Math.random() * 160));
    };
    drop();
  } else if (id === 'ocean') {
    const s = add(loopSource(c, noiseBuffer(c, 'brown', 6)));
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = c.createGain(); g.gain.value = 0.5;
    add(lfo(c, g.gain, 0.09, 0.45));
    add(lfo(c, lp.frequency, 0.09, 400));
    s.connect(lp).connect(g).connect(out); s.start();
  } else if (id === 'wind') {
    const s = add(loopSource(c, noiseBuffer(c, 'pink', 6)));
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8;
    add(lfo(c, bp.frequency, 0.05, 300));
    const g = c.createGain(); g.gain.value = 0.7;
    add(lfo(c, g.gain, 0.13, 0.3));
    s.connect(bp).connect(g).connect(out); s.start();
    const bird = () => {
      const o = c.createOscillator(); const gg = c.createGain();
      const t = c.currentTime; const f = 2500 + Math.random() * 1500;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.08);
      gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.03, t + 0.02);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(gg).connect(out); o.start(); o.stop(t + 0.15);
      timers.push(window.setTimeout(bird, Math.random() < 0.3 ? 150 : 2000 + Math.random() * 6000));
    };
    timers.push(window.setTimeout(bird, 2000));
  } else if (id === 'fire') {
    const s = add(loopSource(c, noiseBuffer(c, 'brown')));
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    s.connect(lp).connect(out); s.start();
    const crack = () => {
      const len = Math.floor(c.sampleRate * 0.02);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = b;
      const g = c.createGain(); g.gain.value = 0.2 + Math.random() * 0.5;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      src.connect(hp).connect(g).connect(out); src.start();
      timers.push(window.setTimeout(crack, 40 + Math.random() * 500));
    };
    crack();
  } else if (id === 'stream') {
    const s = add(loopSource(c, noiseBuffer(c, 'white')));
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.5;
    add(lfo(c, bp.frequency, 0.7, 500));
    const g = c.createGain(); g.gain.value = 0.6;
    s.connect(bp).connect(g).connect(out); s.start();
  } else if (id === 'night') {
    const s = add(loopSource(c, noiseBuffer(c, 'brown')));
    const g0 = c.createGain(); g0.gain.value = 0.25;
    s.connect(g0).connect(out); s.start();
    const cricket = () => {
      const t = c.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = c.createOscillator(); const g = c.createGain();
        o.frequency.value = 4400; const st = t + i * 0.07;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.025, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
        o.connect(g).connect(out); o.start(st); o.stop(st + 0.06);
      }
      timers.push(window.setTimeout(cricket, 600 + Math.random() * 900));
    };
    cricket();
  }
  return () => {
    nodes.forEach((n) => { try { n.stop(); } catch { /* */ } });
    timers.forEach((t) => clearTimeout(t));
  };
}

export const mixer = {
  isPlaying: (id: string) => running.has(id),
  playing: () => [...running.keys()],
  play(id: string, volume = 0.6) {
    if (running.has(id)) return;
    const c = audioCtx();
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), c.currentTime + 1.5);
    gain.connect(c.destination);
    const stop = build(id, gain);
    running.set(id, { gain, stop });
  },
  setVolume(id: string, v: number) {
    const r = running.get(id);
    if (r) r.gain.gain.setTargetAtTime(Math.max(0.0001, v), audioCtx().currentTime, 0.1);
  },
  stop(id: string) {
    const r = running.get(id);
    if (!r) return;
    running.delete(id);
    const c = audioCtx();
    r.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4);
    setTimeout(() => { r.stop(); r.gain.disconnect(); }, 2000);
  },
  stopAll() { [...running.keys()].forEach((id) => mixer.stop(id)); },
};
