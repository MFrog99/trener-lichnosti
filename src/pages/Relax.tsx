import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { BREATHING, MEDITATIONS } from '../data/relax';
import { YOGA, yogaSession, sessionMinutes } from '../data/programs';
import { mixer, SOUNDS } from '../lib/audio';
import { fmtSec, todayKey, uid } from '../lib/util';
import { PageHead, Tabs, toast, useTitle } from '../components/ui';

type Tab = 'breath' | 'sounds' | 'meditation' | 'yoga';

// Состояние звукового микшера живёт вне компонента, чтобы звуки играли при переходах между экранами
const volumes: Record<string, number> = {};
let soundStart = 0;
let sleepEnd = 0;
let sleepTimer: number | undefined;

function logSounds() {
  if (!soundStart) return;
  const min = Math.round((Date.now() - soundStart) / 60000);
  soundStart = 0;
  if (min >= 1) store.put('relaxLog', { id: uid(), date: todayKey(), kind: 'sound', refId: 'mixer', title: 'Звуки природы', minutes: min });
}
export function stopAllSounds() {
  mixer.stopAll();
  logSounds();
  sleepEnd = 0;
  window.clearTimeout(sleepTimer);
}

export default function Relax() {
  useTitle('Релакс');
  const [tab, setTab] = useState<Tab>('breath');
  const nav = useNavigate();
  return (
    <div>
      <PageHead title="Уголок релаксации" sub="Дыхание, звуки, медитации и мягкая растяжка" />
      <Tabs value={tab} onChange={setTab} items={[['breath', '🌬️ Дыхание'], ['sounds', '🎧 Звуки'], ['meditation', '🧘 Медитации'], ['yoga', '🤸 Растяжка']]} />

      {tab === 'breath' && (
        <div className="grid g2">
          {BREATHING.map((b) => (
            <div key={b.id} className="card click" onClick={() => nav(`/relax/breath/${b.id}`)}>
              <div className="row"><div className="emoji-box">{b.emoji}</div>
                <div className="grow"><h3 style={{ margin: 0 }}>{b.name}</h3><div className="muted small">{b.effect}</div></div></div>
              <p className="muted small" style={{ marginTop: 8 }}>{b.description}</p>
              <div className="chips"><span className="chip accent">{b.phases.map((p) => p.sec).join('-')}</span>
                <span className="chip">~{Math.round((b.phases.reduce((s, p) => s + p.sec, 0) * b.cycles) / 60)} мин</span></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sounds' && <Sounds />}

      {tab === 'meditation' && (
        <div className="grid g2">
          {MEDITATIONS.map((m) => (
            <div key={m.id} className="card click" onClick={() => nav(`/relax/meditation/${m.id}`)}>
              <div className="row"><div className="emoji-box">{m.emoji}</div>
                <div className="grow"><h3 style={{ margin: 0 }}>{m.name}</h3><div className="muted small">~{m.minutes} мин · с озвучкой</div></div></div>
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>{m.description}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'yoga' && (
        <div className="grid g2">
          {YOGA.map((y) => (
            <div key={y.id} className="card click" onClick={() => nav(`/play/yoga/${y.id}`)}>
              <div className="row"><div className="emoji-box">{y.emoji}</div>
                <div className="grow"><h3 style={{ margin: 0 }}>{y.name}</h3><div className="muted small">~{sessionMinutes(yogaSession(y))} мин · {y.items.length} поз</div></div></div>
              <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>{y.description}</p>
            </div>
          ))}
        </div>
      )}
      <p className="muted small section">⚠️ Практики не заменяют помощь специалиста. Если тревога или бессонница мешают жить — обратитесь к врачу или психологу.</p>
    </div>
  );
}

function Sounds() {
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  useEffect(() => {
    const t = window.setInterval(refresh, 1000);
    return () => window.clearInterval(t);
  }, []);
  const playing = mixer.playing();

  const toggle = (id: string) => {
    if (mixer.isPlaying(id)) {
      mixer.stop(id);
      if (mixer.playing().length === 0) logSounds();
    } else {
      if (!soundStart) soundStart = Date.now();
      mixer.play(id, volumes[id] ?? 0.6);
    }
    refresh();
  };
  const setSleep = (min: number) => {
    window.clearTimeout(sleepTimer);
    if (!min) { sleepEnd = 0; refresh(); return; }
    sleepEnd = Date.now() + min * 60000;
    sleepTimer = window.setTimeout(() => { stopAllSounds(); }, min * 60000);
    toast(`Звуки выключатся через ${min} мин`);
    refresh();
  };

  return (
    <div>
      <div className="grid g4">
        {SOUNDS.map((s) => {
          const on = playing.includes(s.id);
          return (
            <div key={s.id} className={'sound-tile' + (on ? ' on' : '')} onClick={() => toggle(s.id)}>
              <div className="e">{s.emoji}</div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              {on && (
                <input type="range" min={0.05} max={1} step={0.05} defaultValue={volumes[s.id] ?? 0.6}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { volumes[s.id] = +e.target.value; mixer.setVolume(s.id, +e.target.value); }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="card section">
        <div className="row between wrap">
          <div>
            <h3 style={{ margin: 0 }}>Таймер сна</h3>
            <div className="muted small">{sleepEnd ? `Выключение через ${fmtSec((sleepEnd - Date.now()) / 1000)}` : 'Звуки плавно выключатся по таймеру'}</div>
          </div>
          <div className="row wrap">
            {[15, 30, 45, 60].map((m) => <button key={m} className="btn secondary sm" onClick={() => setSleep(m)}>{m} мин</button>)}
            {sleepEnd > 0 && <button className="btn ghost sm" onClick={() => setSleep(0)}>Отменить</button>}
          </div>
        </div>
        {playing.length > 0 && <button className="btn danger block" style={{ marginTop: 14 }} onClick={() => { stopAllSounds(); refresh(); }}>⏹ Остановить всё</button>}
      </div>
      <p className="muted small">Смешивайте несколько звуков: например, дождь + костёр. Звуки продолжают играть, пока вы пользуетесь другими разделами.</p>
    </div>
  );
}
