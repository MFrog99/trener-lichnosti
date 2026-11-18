import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { store, useData } from './lib/store';
import { clearRecovery, updatePassword, useCloud } from './lib/cloud';
import { cloudEnabled } from './lib/config';
import { applyReminders, initNotificationRouting } from './lib/notify';
import { computeStats, rankName } from './lib/stats';
import { Modal, ToastHost, toast } from './components/ui';
import Home from './pages/Home';
import Workouts from './pages/Workouts';
import ProgramPage from './pages/ProgramPage';
import Player from './pages/Player';
import Builder from './pages/Builder';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Relax from './pages/Relax';
import BreathPage from './pages/BreathPage';
import MeditationPage from './pages/MeditationPage';
import Growth from './pages/Growth';
import TraitTest from './pages/TraitTest';
import TraitPage from './pages/TraitPage';
import Journal from './pages/Journal';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import Social from './pages/Social';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Legal from './pages/Legal';
import More from './pages/More';

const NAV = [
  { to: '/', ico: '🏠', label: 'Главная' },
  { to: '/workouts', ico: '💪', label: 'Тренировки' },
  { to: '/relax', ico: '🧘', label: 'Релакс' },
  { to: '/growth', ico: '🚀', label: 'Развитие' },
  { to: '/journal', ico: '📔', label: 'Дневник' },
  { to: '/habits', ico: '✅', label: 'Привычки' },
  { to: '/goals', ico: '🎯', label: 'Цели' },
  { to: '/social', ico: '👥', label: 'Друзья' },
  { to: '/achievements', ico: '🏆', label: 'Достижения' },
  { to: '/profile', ico: '⚙️', label: 'Профиль' },
];
const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3], { to: '/more', ico: '☰', label: 'Ещё' }];

function useTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#12131c' : '#f5f6fb');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const data = useData();
  const cloud = useCloud();
  const loc = useLocation();
  const nav = useNavigate();
  const stats = computeStats(data);
  useTheme(data.settings.theme);

  useEffect(() => { initNotificationRouting((r) => nav(r)); }, []); // eslint-disable-line
  useEffect(() => { void applyReminders(data.settings.reminders); }, [JSON.stringify(data.settings.reminders)]); // eslint-disable-line
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const fullscreen = loc.pathname.startsWith('/play');
  const name = cloud.profile?.nickname || data.settings.name;

  return (
    <div className="app">
      {!fullscreen && (
        <aside className="sidebar">
          <div className="logo"><img src="./icon.svg" alt="" /> Тренер личности</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="ico">{n.ico}</span>{n.label}
            </NavLink>
          ))}
          <div className="spacer" />
          <div className="side-user">
            <div style={{ fontWeight: 700 }}>{cloud.profile?.avatar ?? '🙂'} {name || 'Гость'}</div>
            <div className="muted">Уровень {stats.level} · {rankName(stats.level)}</div>
            <div className="muted">{stats.streak > 0 ? `🔥 Серия ${stats.streak} дн.` : 'Начните серию сегодня'}</div>
            {cloudEnabled && !cloud.session && <NavLink to="/auth" className="small">Войти, чтобы синхронизировать →</NavLink>}
          </div>
        </aside>
      )}
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/program/:id" element={<ProgramPage />} />
          <Route path="/workouts/builder" element={<Builder />} />
          <Route path="/workouts/builder/:id" element={<Builder />} />
          <Route path="/workouts/exercises" element={<ExerciseLibrary />} />
          <Route path="/play/:kind/:id" element={<Player />} />
          <Route path="/relax" element={<Relax />} />
          <Route path="/relax/breath/:id" element={<BreathPage />} />
          <Route path="/relax/meditation/:id" element={<MeditationPage />} />
          <Route path="/growth" element={<Growth />} />
          <Route path="/growth/test" element={<TraitTest />} />
          <Route path="/growth/trait/:id" element={<TraitPage />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/social" element={<Social />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!fullscreen && (
        <nav className="bottom-nav">
          {BOTTOM.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico">{n.ico}</span>{n.label}
            </NavLink>
          ))}
        </nav>
      )}
      {!data.settings.disclaimerAccepted && <Welcome />}
      {cloud.recovery && <NewPassword />}
      <ToastHost />
    </div>
  );
}

function Welcome() {
  return (
    <Modal title="Добро пожаловать! 🌱" onClose={() => {}}
      actions={<button className="btn" onClick={() => store.setSettings({ disclaimerAccepted: true, onboarded: true })}>Понятно, начнём</button>}>
      <p>«Тренер личности» поможет выстроить привычку к тренировкам, научиться расслабляться и развивать важные черты характера.</p>
      <div className="card flat" style={{ background: 'var(--card2)', marginTop: 12 }}>
        <p className="small" style={{ margin: 0 }}>
          ⚠️ <b>Важно:</b> приложение не является медицинской или психологической консультацией.
          Перед началом тренировок при наличии заболеваний, травм, беременности проконсультируйтесь с врачом.
          Прекратите упражнение при боли, головокружении или плохом самочувствии.
          Если вы испытываете сильную тревогу или депрессию — обратитесь к специалисту.
        </p>
      </div>
    </Modal>
  );
}

function NewPassword() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr('');
    try { await updatePassword(pw); toast('Пароль изменён'); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Modal title="Новый пароль" onClose={clearRecovery}
      actions={<><button className="btn secondary" onClick={clearRecovery}>Отмена</button>
        <button className="btn" disabled={busy || pw.length < 6} onClick={save}>Сохранить</button></>}>
      <label className="field"><span>Придумайте новый пароль (минимум 6 символов)</span>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
      {err && <div className="error">{err}</div>}
    </Modal>
  );
}
