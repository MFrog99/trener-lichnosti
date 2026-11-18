import { useSyncExternalStore } from 'react';

// ---------- Типы данных ----------
export interface Base { id: string; updatedAt: number; deleted?: boolean }

export interface WorkoutLog extends Base {
  date: string; title: string; kind: 'program' | 'custom' | 'quick';
  refId: string; index?: number; durationSec: number; exercises: number;
}
export interface RelaxLog extends Base {
  date: string; kind: 'breath' | 'sound' | 'meditation' | 'yoga'; refId: string; title: string; minutes: number;
}
export interface JournalEntry extends Base { date: string; createdAt: number; text: string; prompt?: string; mood?: number }
export interface Mood extends Base { date: string; value: number; note?: string }
export interface Habit extends Base { name: string; emoji: string; color: string; weekdays: number[]; createdAt: number; archived?: boolean }
export interface HabitCheck extends Base { habitId: string; date: string; done: boolean }
export interface GoalStep { id: string; text: string; done: boolean; doneAt?: number }
export interface Goal extends Base {
  title: string; description: string; category: string; deadline?: string;
  steps: GoalStep[]; done: boolean; doneAt?: number; createdAt: number;
}
export interface TraitDay extends Base { trait: string; day: number; date: string; reflection: string; rating?: number }
export interface Assessment extends Base { date: string; scores: Record<string, number> }
export interface CustomItem { ex: string; mode: 'time' | 'reps'; value: number }
export interface CustomWorkout extends Base { name: string; items: CustomItem[]; rounds: number; rest: number; createdAt: number }

export interface Reminder { id: string; kind: string; time: string; weekdays: number[]; enabled: boolean }
export interface Settings {
  updatedAt: number;
  theme: 'system' | 'light' | 'dark';
  voice: boolean;
  beeps: boolean;
  activeProgram?: string;
  activeTraits: string[];
  reminders: Reminder[];
  onboarded: boolean;
  disclaimerAccepted?: boolean;
  name?: string;
}

export const COLLECTIONS = [
  'workoutLog', 'relaxLog', 'journal', 'moods', 'habits', 'habitChecks',
  'goals', 'traitDays', 'assessments', 'customWorkouts',
] as const;
export type CollName = typeof COLLECTIONS[number];

export interface CollTypes {
  workoutLog: WorkoutLog; relaxLog: RelaxLog; journal: JournalEntry; moods: Mood;
  habits: Habit; habitChecks: HabitCheck; goals: Goal; traitDays: TraitDay;
  assessments: Assessment; customWorkouts: CustomWorkout;
}

export type Data = { v: 1; settings: Settings } & { [K in CollName]: Record<string, CollTypes[K]> };

export function defaultReminders() {
  return [
    { id: 'r-workout', kind: 'workout', time: '18:00', weekdays: [1, 3, 5], enabled: false },
    { id: 'r-growth', kind: 'growth', time: '09:00', weekdays: [0, 1, 2, 3, 4, 5, 6], enabled: false },
    { id: 'r-journal', kind: 'journal', time: '21:30', weekdays: [0, 1, 2, 3, 4, 5, 6], enabled: false },
    { id: 'r-relax', kind: 'relax', time: '22:30', weekdays: [0, 1, 2, 3, 4, 5, 6], enabled: false },
  ];
}

export function emptyData(): Data {
  const d: any = {
    v: 1,
    settings: {
      updatedAt: 0, theme: 'system', voice: true, beeps: true,
      activeTraits: [], reminders: defaultReminders(), onboarded: false,
    } as Settings,
  };
  for (const c of COLLECTIONS) d[c] = {};
  return d as Data;
}

function normalize(raw: any): Data {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const out: any = { v: 1, settings: { ...base.settings, ...(raw.settings || {}) } };
  for (const c of COLLECTIONS) out[c] = raw[c] && typeof raw[c] === 'object' ? raw[c] : {};
  return out as Data;
}

/** Слияние двух копий данных: по каждой записи побеждает более свежая (updatedAt). */
export function mergeData(a: Data, b: Data): Data {
  const out: any = { v: 1, settings: (b.settings?.updatedAt || 0) > (a.settings?.updatedAt || 0) ? b.settings : a.settings };
  for (const c of COLLECTIONS) {
    const res: Record<string, Base> = { ...(a[c] as any) };
    for (const [id, item] of Object.entries(b[c] as Record<string, Base>)) {
      const cur = res[id];
      if (!cur || (item.updatedAt || 0) > (cur.updatedAt || 0)) res[id] = item;
    }
    out[c] = res;
  }
  return out as Data;
}

export function dataEquals(a: Data, b: Data) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------- Хранилище ----------
const GUEST = 'guest';
const keyFor = (owner: string) => `tl_data_${owner}`;

function load(owner: string): Data {
  try {
    const s = localStorage.getItem(keyFor(owner));
    return s ? normalize(JSON.parse(s)) : emptyData();
  } catch {
    return emptyData();
  }
}

let owner = GUEST;
let data: Data = load(GUEST);
const listeners = new Set<() => void>();
const changeListeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(keyFor(owner), JSON.stringify(data)); } catch { /* переполнение — игнорируем */ }
}
function emit(local: boolean) {
  listeners.forEach((l) => l());
  if (local) changeListeners.forEach((l) => l());
}

export const store = {
  get: () => data,
  owner: () => owner,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** Подписка только на локальные изменения пользователя (для синхронизации) */
  onLocalChange(l: () => void) { changeListeners.add(l); return () => { changeListeners.delete(l); }; },

  /** Переключение на аккаунт. Гостевые данные переносятся в аккаунт. */
  switchOwner(next: string | null) {
    const target = next || GUEST;
    if (target === owner) return;
    if (target !== GUEST) {
      const guest = load(GUEST);
      let merged = load(target);
      const hasGuestData = COLLECTIONS.some((c) => Object.keys(guest[c]).length > 0) || guest.settings.updatedAt > 0;
      if (hasGuestData) {
        merged = mergeData(merged, guest);
        localStorage.removeItem(keyFor(GUEST));
      }
      owner = target;
      data = merged;
    } else {
      owner = GUEST;
      data = load(GUEST);
    }
    persist();
    emit(false);
  },

  /** Принять данные с сервера (уже слитые) */
  setFromRemote(next: Data) {
    data = normalize(next);
    persist();
    emit(false);
  },

  put<K extends CollName>(coll: K, item: Omit<CollTypes[K], 'updatedAt'> & { updatedAt?: number }) {
    const full = { ...item, updatedAt: Date.now() } as CollTypes[K];
    data = { ...data, [coll]: { ...data[coll], [item.id]: full } };
    persist();
    emit(true);
    return full;
  },

  remove(coll: CollName, id: string) {
    const cur = (data[coll] as any)[id];
    if (!cur) return;
    data = { ...data, [coll]: { ...data[coll], [id]: { id, updatedAt: Date.now(), deleted: true } } };
    persist();
    emit(true);
  },

  setSettings(patch: Partial<Settings>) {
    data = { ...data, settings: { ...data.settings, ...patch, updatedAt: Date.now() } };
    persist();
    emit(true);
  },

  importData(raw: any) {
    data = mergeData(data, normalize(raw));
    persist();
    emit(true);
  },

  resetAll() {
    const fresh = emptyData();
    // помечаем всё удалённым, чтобы удаление синхронизировалось
    const now = Date.now();
    for (const c of COLLECTIONS) {
      for (const id of Object.keys(data[c])) (fresh as any)[c][id] = { id, updatedAt: now, deleted: true };
    }
    fresh.settings.updatedAt = now;
    data = fresh;
    persist();
    emit(true);
  },
};

export function useData(): Data {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** Неудалённые записи коллекции */
export function items<K extends CollName>(d: Data, coll: K): CollTypes[K][] {
  return Object.values(d[coll] as Record<string, CollTypes[K]>).filter((x) => !x.deleted);
}
