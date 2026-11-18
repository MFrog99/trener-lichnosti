import { MOODS } from '../data/misc';
import { fmtDate, parseKey, WEEKDAYS_SHORT } from '../lib/util';

export function Radar({ labels, series, colors }: { labels: string[]; series: number[][]; colors: string[] }) {
  const n = labels.length;
  const cx = 150, cy = 140, R = 100;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  };
  return (
    <svg viewBox="-45 0 390 290" style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}>
      {[0.25, 0.5, 0.75, 1].map((lv) => (
        <polygon key={lv} points={labels.map((_, i) => pt(i, lv).join(',')).join(' ')} fill="none" stroke="var(--border)" />
      ))}
      {labels.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" />; })}
      {series.map((s, si) => (
        <polygon key={si} points={s.map((v, i) => pt(i, Math.max(0.03, v / 100)).join(',')).join(' ')}
          fill={colors[si]} fillOpacity={si === 0 ? 0.28 : 0.08} stroke={colors[si]} strokeWidth={2}
          strokeDasharray={si === 0 ? undefined : '4 3'} />
      ))}
      {labels.map((l, i) => {
        const [x, y] = pt(i, 1.2);
        return <text key={i} x={x} y={y} fontSize="11" fill="var(--muted)" textAnchor="middle" dominantBaseline="middle" fontWeight={600}>{l}</text>;
      })}
    </svg>
  );
}

export function MoodChart({ days, values }: { days: string[]; values: Record<string, number | undefined> }) {
  const w = Math.max(280, days.length * 22);
  const h = 130;
  const bw = w / days.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} style={{ width: '100%', display: 'block' }}>
      {days.map((d, i) => {
        const v = values[d];
        const bh = v ? (v / 5) * h : 4;
        const m = v ? MOODS[v - 1] : null;
        return (
          <g key={d}>
            <title>{fmtDate(d)}{m ? `: ${m.label}` : ''}</title>
            <rect x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} rx={4} fill={m ? m.color : 'var(--bg2)'} />
            {days.length <= 14 && <text x={i * bw + bw / 2} y={h + 15} fontSize="10" fill="var(--muted)" textAnchor="middle">{WEEKDAYS_SHORT[parseKey(d).getDay()]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function ActivityHeat({ days, active }: { days: string[]; active: Set<string> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(days.length, 15)}, 1fr)`, gap: 4 }}>
      {days.map((d) => (
        <div key={d} title={fmtDate(d)} style={{ aspectRatio: '1', borderRadius: 5, background: active.has(d) ? 'var(--accent)' : 'var(--bg2)' }} />
      ))}
    </div>
  );
}
