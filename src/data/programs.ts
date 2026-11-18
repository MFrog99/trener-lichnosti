import { EX, Equip } from './exercises';
import type { CustomWorkout } from '../lib/store';

export interface Step {
  kind: 'prep' | 'work' | 'rest';
  ex?: string;
  sec?: number;
  reps?: number;
  round: number;
  rounds: number;
  label: string;
}
export interface Session {
  title: string;
  steps: Step[];
  kind: 'program' | 'custom' | 'quick' | 'yoga';
  refId: string;
  index?: number;
  relax?: boolean;
}

interface WeekScheme { rounds: number; work: number; rest: number; roundRest: number }
export interface Program {
  id: string; name: string; emoji: string;
  level: 'Новичок' | 'Средний' | 'Продвинутый' | 'Любой';
  equip: Equip; weeks: number; perWeek: number; minutes: string;
  goal: string; description: string;
  workouts: { name: string; items: string[] }[];
  scheme: WeekScheme[];
  endless?: boolean;
}

const S = (rounds: number, work: number, rest: number, roundRest = 60): WeekScheme => ({ rounds, work, rest, roundRest });

export const PROGRAMS: Program[] = [
  {
    id: 'morning', name: 'Утренняя зарядка', emoji: '☀️', level: 'Любой', equip: 'none', weeks: 1, perWeek: 7, minutes: '7',
    goal: 'Бодрость', endless: true,
    description: 'Короткий комплекс на каждый день: разбудить тело, разогнать кровь и настроиться на день.',
    workouts: [{ name: 'Зарядка', items: ['neck', 'shoulderRoll', 'jack', 'squat', 'sideBend', 'kneePushup', 'forwardFold'] }],
    scheme: [S(1, 40, 10)],
  },
  {
    id: 'start', name: 'Старт с нуля', emoji: '🌱', level: 'Новичок', equip: 'none', weeks: 4, perWeek: 3, minutes: '15–25',
    goal: 'Общая форма',
    description: 'Мягкий вход в регулярные тренировки. Базовые движения, постепенный рост нагрузки за 4 недели.',
    workouts: [
      { name: 'Тренировка А', items: ['squat', 'kneePushup', 'bridge', 'plank', 'superman', 'calf'] },
      { name: 'Тренировка Б', items: ['lunge', 'kneePushup', 'kickback', 'crunch', 'jack', 'plank'] },
    ],
    scheme: [S(2, 30, 30), S(2, 35, 25), S(3, 35, 25), S(3, 40, 20)],
  },
  {
    id: 'band', name: 'Резинка: всё тело', emoji: '🎗️', level: 'Новичок', equip: 'band', weeks: 4, perWeek: 3, minutes: '20–30',
    goal: 'Тонус мышц',
    description: 'Фитнес-резинка заменяет зал: безопасная нагрузка на все группы мышц и работа над осанкой.',
    workouts: [
      { name: 'Низ + спина', items: ['bandSquat', 'bandRow', 'bandBridge', 'bandPullApart', 'calf'] },
      { name: 'Верх + кор', items: ['bandPress', 'bandCurl', 'bandPullApart', 'bandRow', 'plank'] },
    ],
    scheme: [S(2, 35, 25), S(3, 35, 25), S(3, 40, 20), S(3, 45, 20)],
  },
  {
    id: 'core', name: 'Кор и осанка', emoji: '🧍', level: 'Любой', equip: 'none', weeks: 4, perWeek: 3, minutes: '12–20',
    goal: 'Здоровая спина',
    description: 'Крепкий пресс и мышцы спины — ровная осанка и меньше болей от сидячей работы.',
    workouts: [
      { name: 'Кор', items: ['plank', 'crunch', 'superman', 'bridge', 'legRaise'] },
      { name: 'Осанка', items: ['superman', 'catCow', 'plank', 'cobra', 'kickback', 'bridge'] },
    ],
    scheme: [S(2, 30, 20), S(3, 30, 20), S(3, 40, 20), S(3, 45, 15)],
  },
  {
    id: 'hiit', name: 'Жиросжигающий HIIT', emoji: '🔥', level: 'Средний', equip: 'none', weeks: 4, perWeek: 3, minutes: '20–30',
    goal: 'Похудение и выносливость',
    description: 'Интервальные тренировки высокой интенсивности: максимум пользы за минимальное время.',
    workouts: [
      { name: 'Интервалы А', items: ['jack', 'squat', 'climber', 'pushup', 'highKnees', 'plank'] },
      { name: 'Интервалы Б', items: ['burpee', 'lunge', 'climber', 'crunch', 'highKnees', 'superman'] },
    ],
    scheme: [S(3, 40, 20), S(3, 45, 15), S(4, 40, 20), S(4, 45, 15)],
  },
  {
    id: 'dumbbells', name: 'Сила с гантелями', emoji: '🏋️', level: 'Средний', equip: 'dumbbells', weeks: 6, perWeek: 3, minutes: '30–40',
    goal: 'Сила и рельеф',
    description: 'Классический сплит «низ / верх / всё тело» с гантелями дома. Растёт сила и мышечный тонус.',
    workouts: [
      { name: 'Ноги и ягодицы', items: ['gobletSquat', 'rdl', 'dbLunge', 'bridge', 'calf'] },
      { name: 'Верх тела', items: ['dbPress', 'dbRow', 'curl', 'triceps', 'lateral', 'plank'] },
      { name: 'Всё тело', items: ['gobletSquat', 'dbRow', 'dbPress', 'rdl', 'crunch'] },
    ],
    scheme: [S(3, 40, 30, 90), S(3, 45, 30, 90), S(4, 40, 30, 90), S(4, 45, 25, 90), S(4, 50, 25, 90), S(5, 45, 25, 90)],
  },
  {
    id: 'athlete', name: 'Атлет', emoji: '⚡', level: 'Продвинутый', equip: 'none', weeks: 6, perWeek: 4, minutes: '35–45',
    goal: 'Мощь и выносливость',
    description: 'Интенсивная программа с собственным весом для тех, кто уже тренируется регулярно.',
    workouts: [
      { name: 'Взрыв', items: ['burpee', 'pushup', 'lunge', 'climber', 'legRaise', 'wallSit'] },
      { name: 'Сила', items: ['squat', 'pushup', 'superman', 'kickback', 'plank', 'calf'] },
      { name: 'Кардио', items: ['highKnees', 'jack', 'burpee', 'climber', 'crunch', 'plank'] },
      { name: 'Выносливость', items: ['lunge', 'pushup', 'wallSit', 'bridge', 'legRaise', 'superman'] },
    ],
    scheme: [S(4, 45, 15), S(4, 50, 15), S(5, 45, 15), S(5, 50, 10), S(5, 50, 10), S(6, 45, 10)],
  },
  {
    id: 'dbPro', name: 'Продвинутая сила', emoji: '🦾', level: 'Продвинутый', equip: 'dumbbells', weeks: 6, perWeek: 4, minutes: '40–50',
    goal: 'Максимум силы',
    description: 'Объёмные тренировки с гантелями по системе «тяни / толкай / ноги» для опытных.',
    workouts: [
      { name: 'Толкай', items: ['dbPress', 'pushup', 'lateral', 'triceps', 'plank'] },
      { name: 'Тяни', items: ['dbRow', 'rdl', 'curl', 'superman', 'legRaise'] },
      { name: 'Ноги', items: ['gobletSquat', 'dbLunge', 'rdl', 'wallSit', 'calf'] },
      { name: 'Всё тело', items: ['burpee', 'gobletSquat', 'dbRow', 'dbPress', 'climber'] },
    ],
    scheme: [S(4, 45, 25, 90), S(4, 50, 25, 90), S(5, 45, 25, 90), S(5, 50, 20, 90), S(5, 55, 20, 90), S(6, 50, 20, 90)],
  },
];
export const PROGRAM: Record<string, Program> = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));

export interface YogaSession { id: string; name: string; emoji: string; description: string; items: [string, number][] }
export const YOGA: YogaSession[] = [
  { id: 'sleep', name: 'Перед сном', emoji: '🌙', description: 'Мягкая растяжка, которая успокаивает нервную систему и готовит ко сну.',
    items: [['catCow', 60], ['childPose', 60], ['seatedFold', 60], ['seatedTwist', 60], ['kneesChest', 60], ['legsUp', 120], ['savasana', 180]] },
  { id: 'office', name: 'После работы за компьютером', emoji: '💻', description: 'Снимает напряжение с шеи, плеч и спины.',
    items: [['neck', 60], ['shoulderRoll', 45], ['sideBend', 60], ['forwardFold', 60], ['catCow', 60], ['cobra', 45], ['childPose', 60]] },
  { id: 'morningStretch', name: 'Утренняя растяжка', emoji: '🌅', description: 'Плавно разбудить тело без резких нагрузок.',
    items: [['shoulderRoll', 30], ['sideBend', 45], ['forwardFold', 45], ['catCow', 60], ['cobra', 45], ['childPose', 45]] },
  { id: 'stress', name: 'Антистресс', emoji: '🍃', description: 'Позы восстановления для дней, когда всё навалилось.',
    items: [['childPose', 90], ['catCow', 60], ['kneesChest', 60], ['legsUp', 120], ['savasana', 180]] },
];
export const YOGA_BY_ID: Record<string, YogaSession> = Object.fromEntries(YOGA.map((y) => [y.id, y]));

// ---------- Сборка сессий ----------
export function programPosition(p: Program, index: number) {
  const week = p.endless ? 0 : Math.min(p.weeks - 1, Math.floor(index / p.perWeek));
  return { week, workout: p.workouts[index % p.workouts.length], scheme: p.scheme[Math.min(week, p.scheme.length - 1)] };
}

export function programSession(p: Program, index: number): Session {
  const { week, workout, scheme } = programPosition(p, index);
  const steps: Step[] = [{ kind: 'prep', sec: 10, round: 1, rounds: scheme.rounds, label: 'Приготовьтесь' }];
  for (let r = 1; r <= scheme.rounds; r++) {
    workout.items.forEach((ex, i) => {
      steps.push({ kind: 'work', ex, sec: scheme.work, round: r, rounds: scheme.rounds, label: EX[ex]?.name ?? ex });
      const last = i === workout.items.length - 1;
      if (last && r === scheme.rounds) return;
      const rest = last ? scheme.roundRest : scheme.rest;
      if (rest > 0) steps.push({ kind: 'rest', sec: rest, round: r, rounds: scheme.rounds, label: last ? 'Отдых между кругами' : 'Отдых' });
    });
  }
  const title = p.endless ? p.name : `${p.name} · неделя ${week + 1} · ${workout.name}`;
  return { title, steps, kind: p.id === 'morning' ? 'quick' : 'program', refId: p.id, index };
}

export function customSession(w: CustomWorkout): Session {
  const steps: Step[] = [{ kind: 'prep', sec: 10, round: 1, rounds: w.rounds, label: 'Приготовьтесь' }];
  for (let r = 1; r <= w.rounds; r++) {
    w.items.forEach((it, i) => {
      steps.push({
        kind: 'work', ex: it.ex, round: r, rounds: w.rounds, label: EX[it.ex]?.name ?? it.ex,
        ...(it.mode === 'time' ? { sec: it.value } : { reps: it.value }),
      });
      const last = i === w.items.length - 1;
      if (last && r === w.rounds) return;
      const rest = last ? Math.max(w.rest, 45) : w.rest;
      if (rest > 0) steps.push({ kind: 'rest', sec: rest, round: r, rounds: w.rounds, label: last ? 'Отдых между кругами' : 'Отдых' });
    });
  }
  return { title: w.name, steps, kind: 'custom', refId: w.id };
}

export function yogaSession(y: YogaSession): Session {
  const steps: Step[] = [{ kind: 'prep', sec: 10, round: 1, rounds: 1, label: 'Устройтесь удобно' }];
  y.items.forEach(([ex, sec], i) => {
    steps.push({ kind: 'work', ex, sec, round: 1, rounds: 1, label: EX[ex]?.name ?? ex });
    if (i < y.items.length - 1) steps.push({ kind: 'rest', sec: 8, round: 1, rounds: 1, label: 'Плавно смените позу' });
  });
  return { title: y.name, steps, kind: 'yoga', refId: y.id, relax: true };
}

export function sessionMinutes(s: Session): number {
  return Math.round(s.steps.reduce((t, st) => t + (st.sec ?? (st.reps ?? 0) * 3), 0) / 60);
}
