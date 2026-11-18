import { Data, items } from './store';
import { todayKey } from './util';
import { COURSE_DAYS } from '../data/traits';
import { PROGRAM } from '../data/programs';

export function programDone(d: Data, programId: string): number {
  return items(d, 'workoutLog').filter((w) => (w.kind === 'program' || w.kind === 'quick') && w.refId === programId).length;
}
export function programTotal(programId: string): number {
  const p = PROGRAM[programId];
  return p ? (p.endless ? Infinity : p.weeks * p.perWeek) : 0;
}

export function traitProgress(d: Data, traitId: string) {
  const days = items(d, 'traitDays').filter((t) => t.trait === traitId);
  const doneSet = new Set(days.map((t) => t.day));
  const doneToday = days.some((t) => t.date === todayKey());
  let next = 1;
  while (doneSet.has(next)) next++;
  const completed = next > COURSE_DAYS;
  return { done: doneSet.size, doneSet, doneToday, next: Math.min(next, COURSE_DAYS), completed };
}

export function workoutToday(d: Data) {
  return items(d, 'workoutLog').some((w) => w.date === todayKey());
}
export function relaxToday(d: Data) {
  return items(d, 'relaxLog').some((w) => w.date === todayKey());
}
export function journalToday(d: Data) {
  return items(d, 'journal').some((w) => w.date === todayKey());
}
export function todayMood(d: Data) {
  const m = d.moods[todayKey()];
  return m && !m.deleted ? m.value : undefined;
}
export function lastAssessment(d: Data) {
  return items(d, 'assessments').sort((a, b) => b.date.localeCompare(a.date))[0];
}
