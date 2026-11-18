import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { resetPassword, signIn, signUp, useCloud } from '../lib/cloud';
import { cloudEnabled } from '../lib/config';
import { Empty, Tabs, toast, useTitle } from '../components/ui';

export default function Auth() {
  useTitle('Вход');
  const cloud = useCloud();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) return <Empty emoji="☁️" text="Облачная синхронизация ещё не настроена. Приложение работает в локальном режиме." />;
  if (cloud.session) return <Navigate to="/profile" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setInfo('');
    if (mode === 'register') {
      if (nickname.trim().length < 3) { setErr('Ник — минимум 3 символа'); return; }
      if (!/^[\p{L}\p{N}_.-]+$/u.test(nickname.trim())) { setErr('Ник: только буквы, цифры, «_», «.», «-»'); return; }
      if (!consent) { setErr('Необходимо согласие с условиями'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'login') { await signIn(email.trim(), password); toast('С возвращением!'); nav('/'); }
      else if (mode === 'register') {
        const r = await signUp(email.trim(), password, nickname.trim());
        if (r.needsConfirm) setInfo('Мы отправили письмо для подтверждения. Перейдите по ссылке из письма, затем войдите.');
        else { toast('Аккаунт создан!'); nav('/'); }
      } else {
        await resetPassword(email.trim());
        setInfo('Если такой email зарегистрирован, на него придёт ссылка для сброса пароля.');
      }
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 440, margin: '20px auto' }}>
      <div className="center" style={{ marginBottom: 16 }}>
        <img src="./icon.svg" alt="" width={64} height={64} />
        <h1>Тренер личности</h1>
        <p className="muted">Аккаунт синхронизирует прогресс между телефоном, компьютером и сайтом</p>
      </div>
      <div className="card">
        <Tabs value={mode} onChange={(m) => { setMode(m); setErr(''); setInfo(''); }} items={[['login', 'Вход'], ['register', 'Регистрация']]} />
        <form onSubmit={submit}>
          {mode === 'reset' && <p className="muted small">Введите email — пришлём ссылку для сброса пароля.</p>}
          {mode === 'register' && <label className="field"><span>Ник (виден друзьям)</span>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} autoComplete="nickname" required /></label>}
          <label className="field"><span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          {mode !== 'reset' && <label className="field"><span>Пароль</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>}
          {mode === 'register' && (
            <label className="check" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="small">Мне есть 14 лет. Я принимаю <Link to="/legal/terms" target="_blank">пользовательское соглашение</Link> и даю согласие на обработку персональных данных в соответствии с <Link to="/legal/privacy" target="_blank">политикой конфиденциальности</Link>.</span>
            </label>
          )}
          {err && <div className="error">{err}</div>}
          {info && <div className="success">{info}</div>}
          <button className="btn block lg" disabled={busy}>{busy ? <span className="spin" /> : mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : 'Отправить ссылку'}</button>
        </form>
        <div className="center" style={{ marginTop: 12 }}>
          {mode === 'login' && <a href="#" onClick={(e) => { e.preventDefault(); setMode('reset'); }} className="small">Забыли пароль?</a>}
          {mode === 'reset' && <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }} className="small">← Вернуться ко входу</a>}
        </div>
      </div>
      <p className="muted small center" style={{ marginTop: 12 }}>Без аккаунта приложение тоже работает — данные хранятся на этом устройстве. При входе они перенесутся в аккаунт.</p>
    </div>
  );
}
