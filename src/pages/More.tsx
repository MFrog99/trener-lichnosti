import { Link } from 'react-router-dom';
import { useTitle } from '../components/ui';

const ITEMS = [
  { to: '/journal', ico: '📔', label: 'Дневник и настроение' },
  { to: '/habits', ico: '✅', label: 'Привычки' },
  { to: '/goals', ico: '🎯', label: 'Цели и планы' },
  { to: '/social', ico: '👥', label: 'Друзья, рейтинг, челленджи' },
  { to: '/achievements', ico: '🏆', label: 'Достижения' },
  { to: '/profile', ico: '⚙️', label: 'Профиль и настройки' },
];

export default function More() {
  useTitle('Ещё');
  return (
    <div>
      <h1>Ещё</h1>
      {ITEMS.map((i) => (
        <Link key={i.to} to={i.to} className="list-item" style={{ color: 'var(--text)' }}>
          <div className="emoji-box">{i.ico}</div><div className="grow" style={{ fontWeight: 600 }}>{i.label}</div><span className="muted">›</span>
        </Link>
      ))}
    </div>
  );
}
