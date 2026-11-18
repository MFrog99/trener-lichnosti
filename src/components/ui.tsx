import { ReactNode, useEffect, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------- Toast ----------
let toastMsg: string | null = null;
let toastTimer: number | undefined;
const toastListeners = new Set<() => void>();
export function toast(msg: string) {
  toastMsg = msg;
  toastListeners.forEach((l) => l());
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastMsg = null; toastListeners.forEach((l) => l()); }, 2600);
}
export function ToastHost() {
  const msg = useSyncExternalStore((l) => { toastListeners.add(l); return () => { toastListeners.delete(l); }; }, () => toastMsg);
  return msg ? <div className="toast">{msg}</div> : null;
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, actions }: { title?: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        {title && <h2>{title}</h2>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="progress"><div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}

export function Ring({ value, size = 120, stroke = 8, children, color }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg className="ring" width={size} height={size}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={color ? { stroke: color } : undefined} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

export function Back({ to, label = 'Назад' }: { to?: string; label?: string }) {
  const nav = useNavigate();
  return <button className="back" onClick={() => (to ? nav(to) : nav(-1))}>← {label}</button>;
}

export function PageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {right}
    </div>
  );
}

export function Empty({ emoji, text, children }: { emoji: string; text: string; children?: ReactNode }) {
  return <div className="empty"><div className="big">{emoji}</div><p>{text}</p>{children}</div>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="tabs">
      {items.map(([v, l]) => <button key={v} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function useTitle(t: string) {
  useEffect(() => { document.title = `${t} · Тренер личности`; }, [t]);
}
