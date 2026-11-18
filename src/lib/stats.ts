import { Data, items } from './store';
import { addDays, parseKey, todayKey } from './util';

export const XP = {
  workout: 50, relax: 20, journal: 15, mood: 5, habit: 5, traitDay: 30, assessment: 40, goalStep: 10, goal: 100,
};

export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const cur = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, cur, next, progress: (xp - cur) / (next - cur) };
}

export const RANKS = [
  'Новичок', 'Искатель', 'Ученик', 'Практик', 'Упорный', 'Целеустремлённый',
  'Мастер привычек', 'Наставник себе', 'Мудрец', 'Гармония', 'Легенда',
];
export const rankName = (level: number) => RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))];

export interface Stats {
  xp: number; level: number; levelCur: number; levelNext: number; levelProgress: number;
  streak: number; bestStreak: number; activeDates: Set<string>;
  workouts: number; workoutMinutes: number; relaxSessions: number; relaxMinutes: number;
  journal: number; moods: number; traitDays: number; traitsCompleted: number; assessments: number;
  goalsDone: number; stepsDone: number; habitChecks: number; bestHabitStreak: number;
  achievements: string[];
}

export function habitStreak(d: Data, habitId: string, weekdays: number[]): number {
  const done = new Set(items(d, 'habitChecks').filter((c) => c.habitId === habitId && c.done).map((c) => c.date));
  let k = todayKey();
  if (!done.has(k)) k = addDays(k, -1);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const scheduled = weekdays.length === 0 || weekdays.includes(parseKey(k).getDay());
    if (done.has(k)) n++;
    else if (scheduled) break;
    k = addDays(k, -1);
  }
  return n;
}

export function computeStats(d: Data): Stats {
  const workouts = items(d, 'workoutLog');
  const relax = items(d, 'relaxLog');
  const journal = items(d, 'journal');
  const moods = items(d, 'moods');
  const checks = items(d, 'habitChecks').filter((c) => c.done);
  const traitDays = items(d, 'traitDays');
  const assessments = items(d, 'assessments');
  const goals = items(d, 'goals');

  const stepsDone = goals.reduce((s, g) => s + g.steps.filter((x) => x.done).length, 0);
  const goalsDone = goals.filter((g) => g.done).length;

  const xp =
    workouts.length * XP.workout + relax.length * XP.relax + journal.length * XP.journal +
    moods.length * XP.mood + checks.length * XP.habit + traitDays.length * XP.traitDay +
    assessments.length * XP.assessment + stepsDone * XP.goalStep + goalsDone * XP.goal;

  const activeDates = new Set<string>();
  [...workouts, ...relax, ...journal, ...moods, ...checks, ...traitDays, ...assessments].forEach((x: any) => x.date && activeDates.add(x.date));

  let k = todayKey();
  if (!activeDates.has(k)) k = addDays(k, -1);
  let streak = 0;
  while (activeDates.has(k)) { streak++; k = addDays(k, -1); }

  const sorted = [...activeDates].sort();
  let best = 0, run = 0, prev = '';
  for (const s of sorted) {
    run = prev && addDays(prev, 1) === s ? run + 1 : 1;
    best = Math.max(best, run);
    prev = s;
  }

  const byTrait: Record<string, number> = {};
  traitDays.forEach((t) => { byTrait[t.trait] = (byTrait[t.trait] || 0) + 1; });
  const traitsCompleted = Object.values(byTrait).filter((n) => n >= 21).length;

  let bestHabitStreak = 0;
  items(d, 'habits').forEach((h) => { bestHabitStreak = Math.max(bestHabitStreak, habitStreak(d, h.id, h.weekdays)); });

  const lv = levelFromXp(xp);
  const st: Stats = {
    xp, level: lv.level, levelCur: lv.cur, levelNext: lv.next, levelProgress: lv.progress,
    streak, bestStreak: Math.max(best, streak), activeDates,
    workouts: workouts.length,
    workoutMinutes: Math.round(workouts.reduce((s, w) => s + w.durationSec, 0) / 60),
    relaxSessions: relax.length,
    relaxMinutes: Math.round(relax.reduce((s, r) => s + r.minutes, 0)),
    journal: journal.length, moods: moods.length, traitDays: traitDays.length, traitsCompleted,
    assessments: assessments.length, goalsDone, stepsDone, habitChecks: checks.length, bestHabitStreak,
    achievements: [],
  };
  st.achievements = ACHIEVEMENTS.filter((a) => a.test(st)).map((a) => a.id);
  return st;
}

export interface Achievement { id: string; emoji: string; title: string; desc: string; test: (s: Stats) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'w1', emoji: '👟', title: 'Первый шаг', desc: 'Завершите первую тренировку', test: (s) => s.workouts >= 1 },
  { id: 'w10', emoji: '💪', title: 'Втянулся', desc: '10 тренировок', test: (s) => s.workouts >= 10 },
  { id: 'w50', emoji: '🏋️', title: 'Железная воля', desc: '50 тренировок', test: (s) => s.workouts >= 50 },
  { id: 'w100', emoji: '🏆', title: 'Сотня', desc: '100 тренировок', test: (s) => s.workouts >= 100 },
  { id: 'wm300', emoji: '⏱️', title: '5 часов движения', desc: '300 минут тренировок', test: (s) => s.workoutMinutes >= 300 },
  { id: 'r1', emoji: '🌿', title: 'Первый вдох', desc: 'Первая практика релаксации', test: (s) => s.relaxSessions >= 1 },
  { id: 'r60', emoji: '🧘', title: 'Час тишины', desc: '60 минут релаксации', test: (s) => s.relaxMinutes >= 60 },
  { id: 'r300', emoji: '🕊️', title: 'Внутренний покой', desc: '300 минут релаксации', test: (s) => s.relaxMinutes >= 300 },
  { id: 'j1', emoji: '✍️', title: 'Дорогой дневник', desc: 'Первая запись в дневнике', test: (s) => s.journal >= 1 },
  { id: 'j30', emoji: '📚', title: 'Летописец', desc: '30 записей в дневнике', test: (s) => s.journal >= 30 },
  { id: 'm14', emoji: '🌈', title: 'Знаю себя', desc: 'Отметьте настроение 14 раз', test: (s) => s.moods >= 14 },
  { id: 'a1', emoji: '🧭', title: 'Точка отсчёта', desc: 'Пройдите тест черт личности', test: (s) => s.assessments >= 1 },
  { id: 'a3', emoji: '📈', title: 'Взгляд в динамике', desc: 'Пройдите тест 3 раза', test: (s) => s.assessments >= 3 },
  { id: 't1', emoji: '🌱', title: 'Росток', desc: 'Выполните первое задание развития', test: (s) => s.traitDays >= 1 },
  { id: 't21', emoji: '🌳', title: 'Новая черта', desc: 'Пройдите курс развития целиком', test: (s) => s.traitsCompleted >= 1 },
  { id: 't3', emoji: '🌟', title: 'Многогранность', desc: 'Пройдите 3 курса развития', test: (s) => s.traitsCompleted >= 3 },
  { id: 's3', emoji: '🔥', title: 'Разгон', desc: 'Серия 3 дня подряд', test: (s) => s.bestStreak >= 3 },
  { id: 's7', emoji: '⚡', title: 'Неделя силы', desc: 'Серия 7 дней подряд', test: (s) => s.bestStreak >= 7 },
  { id: 's30', emoji: '☄️', title: 'Месяц без пропусков', desc: 'Серия 30 дней подряд', test: (s) => s.bestStreak >= 30 },
  { id: 'h7', emoji: '✅', title: 'Привычка формируется', desc: 'Серия привычки 7 дней', test: (s) => s.bestHabitStreak >= 7 },
  { id: 'h21', emoji: '🔗', title: 'Привычка закреплена', desc: 'Серия привычки 21 день', test: (s) => s.bestHabitStreak >= 21 },
  { id: 'g1', emoji: '🎯', title: 'В яблочко', desc: 'Достигните первой цели', test: (s) => s.goalsDone >= 1 },
  { id: 'g5', emoji: '🚀', title: 'Покоритель целей', desc: 'Достигните 5 целей', test: (s) => s.goalsDone >= 5 },
  { id: 'l5', emoji: '🥉', title: 'Уровень 5', desc: 'Достигните 5 уровня', test: (s) => s.level >= 5 },
  { id: 'l10', emoji: '🥈', title: 'Уровень 10', desc: 'Достигните 10 уровня', test: (s) => s.level >= 10 },
  { id: 'l20', emoji: '🥇', title: 'Уровень 20', desc: 'Достигните 20 уровня', test: (s) => s.level >= 20 },
];
