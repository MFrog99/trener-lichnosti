import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { emptyData, mergeData, store } from './store';
import { computeStats } from './stats';
import { authRedirectUrl } from './config';

export interface Profile {
  id: string; nickname: string; friend_code: string; xp: number; level: number; streak: number; avatar: string;
}
export type SyncStatus = 'disabled' | 'guest' | 'syncing' | 'synced' | 'offline' | 'error';

interface CloudState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  status: SyncStatus;
  lastSync: number;
  recovery: boolean;
}

let state: CloudState = {
  ready: !supabase,
  session: null,
  profile: null,
  status: supabase ? 'guest' : 'disabled',
  lastSync: 0,
  recovery: false,
};
const listeners = new Set<() => void>();
function set(patch: Partial<CloudState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => state,
    () => state,
  );
}
export const cloud = { get: () => state };

// ---------- Стабильное сравнение ----------
function stable(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}

// ---------- Синхронизация ----------
let running = false;
let again = false;
let timer: number | undefined;

export async function syncNow(): Promise<void> {
  if (!supabase || !state.session) return;
  if (!navigator.onLine) { set({ status: 'offline' }); return; }
  if (running) { again = true; return; }
  running = true;
  set({ status: 'syncing' });
  try {
    const uid = state.session.user.id;
    const { data: row, error } = await supabase.from('user_data').select('data').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    const local = store.get();
    const remote = row?.data ? mergeData(emptyData(), row.data) : null;
    const merged = remote ? mergeData(local, remote) : local;
    if (stable(merged) !== stable(local)) store.setFromRemote(merged);
    if (!remote || stable(merged) !== stable(remote)) {
      const { error: e2 } = await supabase.from('user_data').upsert({ user_id: uid, data: merged, updated_at: new Date().toISOString() });
      if (e2) throw e2;
    }
    await pushStats();
    set({ status: 'synced', lastSync: Date.now() });
  } catch (e) {
    console.warn('sync error', e);
    set({ status: navigator.onLine ? 'error' : 'offline' });
  } finally {
    running = false;
    if (again) { again = false; void syncNow(); }
  }
}

function scheduleSync(delay = 2500) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delay);
}

async function pushStats() {
  if (!supabase || !state.session) return;
  const s = computeStats(store.get());
  const p = state.profile;
  if (p && p.xp === s.xp && p.level === s.level && p.streak === s.streak) return;
  const { data, error } = await supabase
    .from('profiles')
    .update({ xp: s.xp, level: s.level, streak: s.streak, updated_at: new Date().toISOString() })
    .eq('id', state.session.user.id)
    .select()
    .maybeSingle();
  if (!error && data) set({ profile: data as Profile });
}

export async function loadProfile() {
  if (!supabase || !state.session) return;
  const { data } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  if (data) set({ profile: data as Profile });
}

function applySession(session: Session | null) {
  const prevUid = state.session?.user.id;
  set({ session, ready: true, status: session ? state.status === 'guest' ? 'syncing' : state.status : 'guest' });
  const uid = session?.user.id ?? null;
  if (uid !== (prevUid ?? null)) {
    store.switchOwner(uid);
    if (uid) {
      void loadProfile();
      void syncNow();
    } else {
      set({ profile: null });
    }
  }
}

export function initCloud() {
  if (!supabase) return;
  supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
    applySession(session);
  });
  store.onLocalChange(() => { if (state.session) scheduleSync(); });
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => set({ status: state.session ? 'offline' : state.status }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncNow(); });
  window.setInterval(() => void syncNow(), 120000);
}

// ---------- Аутентификация ----------
function ruError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Неверный email или пароль';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Этот email уже зарегистрирован';
  if (m.includes('email not confirmed')) return 'Email не подтверждён — проверьте почту';
  if (m.includes('password should be')) return 'Пароль слишком короткий (минимум 6 символов)';
  if (m.includes('rate limit') || m.includes('too many')) return 'Слишком много попыток, попробуйте через несколько минут';
  if (m.includes('nickname')) return 'Этот ник уже занят';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Нет соединения с сервером';
  return msg;
}

export async function signUp(email: string, password: string, nickname: string) {
  if (!supabase) throw new Error('Облако не настроено');
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: authRedirectUrl() || undefined,
      data: { nickname, consent_at: new Date().toISOString() },
    },
  });
  if (error) throw new Error(ruError(error.message));
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Облако не настроено');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(ruError(error.message));
}

export async function resetPassword(email: string) {
  if (!supabase) throw new Error('Облако не настроено');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() || undefined });
  if (error) throw new Error(ruError(error.message));
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Облако не настроено');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(ruError(error.message));
  set({ recovery: false });
}

export async function signOut() {
  if (!supabase) return;
  await syncNow();
  const uid = state.session?.user.id;
  await supabase.auth.signOut();
  if (uid) localStorage.removeItem(`tl_data_${uid}`);
}

export async function deleteAccount() {
  if (!supabase || !state.session) return;
  const uid = state.session.user.id;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(ruError(error.message));
  await supabase.auth.signOut();
  localStorage.removeItem(`tl_data_${uid}`);
}

export async function updateProfile(patch: Partial<Pick<Profile, 'nickname' | 'avatar'>>) {
  if (!supabase || !state.session) return;
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', state.session.user.id).select().maybeSingle();
  if (error) throw new Error(error.code === '23505' ? 'Этот ник уже занят' : ruError(error.message));
  if (data) set({ profile: data as Profile });
}

export function clearRecovery() { set({ recovery: false }); }
