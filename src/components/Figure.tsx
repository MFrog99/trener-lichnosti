import { POSES, Pose } from '../data/poses';
import { EX } from '../data/exercises';

const ptsStr = (pose: Pose, idx: number[]) => idx.map((i) => pose[i].join(',')).join(' ');
const PARTS = {
  torso: [1, 2],
  armL: [1, 3, 4],
  armR: [1, 5, 6],
  legL: [2, 7, 8],
  legR: [2, 9, 10],
};

/** Анимированная схема упражнения */
export function Figure({ exId, playing = true, size }: { exId: string; playing?: boolean; size?: number }) {
  const ex = EX[exId];
  if (!ex) return null;
  const poses = ex.poses.map((p) => POSES[p]).filter(Boolean);
  const seq = [...poses, poses[0]];
  const dur = `${ex.tempo}s`;
  const anim = playing && poses.length > 1;
  const first = poses[0];
  const val = (f: (p: Pose) => string) => seq.map(f).join(';');

  return (
    <svg className="figure" viewBox="-2 -4 104 100" style={size ? { width: size, height: size } : undefined} aria-label={ex.name}>
      <line className="floor" x1="0" y1="92" x2="100" y2="92" />
      {Object.entries(PARTS).map(([k, idx]) => (
        <polyline key={k} points={ptsStr(first, idx)}>
          {anim && <animate attributeName="points" dur={dur} repeatCount="indefinite" values={val((p) => ptsStr(p, idx))} calcMode="spline"
            keySplines={seq.slice(1).map(() => '0.45 0 0.55 1').join(';')} />}
        </polyline>
      ))}
      <circle className="head" cx={first[0][0]} cy={first[0][1]} r="6">
        {anim && <>
          <animate attributeName="cx" dur={dur} repeatCount="indefinite" values={val((p) => String(p[0][0]))} />
          <animate attributeName="cy" dur={dur} repeatCount="indefinite" values={val((p) => String(p[0][1]))} />
        </>}
      </circle>
      {ex.equip === 'dumbbells' && [4, 6].map((i) => (
        <circle key={i} className="weight" cx={first[i][0]} cy={first[i][1]} r="3.2">
          {anim && <>
            <animate attributeName="cx" dur={dur} repeatCount="indefinite" values={val((p) => String(p[i][0]))} />
            <animate attributeName="cy" dur={dur} repeatCount="indefinite" values={val((p) => String(p[i][1]))} />
          </>}
        </circle>
      ))}
      {ex.equip === 'band' && (exId === 'bandPullApart'
        ? <polyline className="band" points={ptsStr(first, [4, 6])}>
            {anim && <animate attributeName="points" dur={dur} repeatCount="indefinite" values={val((p) => ptsStr(p, [4, 6]))} />}
          </polyline>
        : <polyline className="band" points={ptsStr(first, exId === 'bandSquat' || exId === 'bandBridge' ? [7, 9] : [8, 4])}>
            {anim && <animate attributeName="points" dur={dur} repeatCount="indefinite"
              values={val((p) => ptsStr(p, exId === 'bandSquat' || exId === 'bandBridge' ? [7, 9] : [8, 4]))} />}
          </polyline>)}
    </svg>
  );
}
