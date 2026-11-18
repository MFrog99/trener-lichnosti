// Публичные настройки. Значения подставляются из файла .env (его заполняет scripts/setup-supabase.mjs).
// anon-ключ Supabase публичный по своей природе: данные защищены политиками Row Level Security.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || '';

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);
export const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

/** Адрес, на который ведут ссылки из писем (подтверждение, сброс пароля) */
export function authRedirectUrl(): string {
  if (SITE_URL) return SITE_URL;
  if (location.protocol.startsWith('http')) return location.origin + location.pathname;
  return '';
}
