import { LocalNotifications } from '@capacitor/local-notifications';
import { isCapacitor, isElectron } from './config';
import type { Reminder } from './store';
import { pickDaily, todayKey } from './util';

export const REMINDER_KINDS: Record<string, { label: string; emoji: string; title: string; bodies: string[]; route: string }> = {
  workout: {
    label: 'Тренировка', emoji: '💪', title: 'Время тренировки', route: '/workouts',
    bodies: ['Тело скажет спасибо — 20 минут, и вы молодец!', 'Пора размяться: тренировка ждёт.', 'Маленький шаг сегодня — большой результат завтра.'],
  },
  growth: {
    label: 'Задание развития', emoji: '🚀', title: 'Задание дня готово', route: '/growth',
    bodies: ['Загляните в задание дня — оно займёт пару минут.', 'Сегодняшний шаг к лучшей версии себя ждёт вас.'],
  },
  journal: {
    label: 'Дневник', emoji: '📔', title: 'Как прошёл день?', route: '/journal',
    bodies: ['Запишите пару мыслей и отметьте настроение.', 'Три минуты на дневник — и голова яснее.'],
  },
  relax: {
    label: 'Релакс перед сном', emoji: '🌙', title: 'Пора расслабиться', route: '/relax',
    bodies: ['Дыхание 4-7-8 поможет уснуть быстрее.', 'Отложите телефон после короткой медитации.'],
  },
  habits: {
    label: 'Привычки', emoji: '✅', title: 'Отметьте привычки', route: '/habits',
    bodies: ['Не забудьте отметить сегодняшние привычки.', 'Серия не должна прерваться!'],
  },
};

export async function requestNotifyPermission(): Promise<boolean> {
  try {
    if (isCapacitor) {
      const r = await LocalNotifications.requestPermissions();
      return r.display === 'granted';
    }
    if (isElectron) return true;
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export async function applyReminders(list: Reminder[]) {
  const active = list.filter((r) => r.enabled && r.weekdays.length);
  if (isCapacitor) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      const notifications = [];
      let idx = 0;
      for (const r of active) {
        idx++;
        const [hour, minute] = r.time.split(':').map(Number);
        const k = REMINDER_KINDS[r.kind];
        for (const wd of r.weekdays) {
          notifications.push({
            id: idx * 10 + wd,
            title: `${k?.emoji ?? ''} ${k?.title ?? 'Напоминание'}`,
            body: k?.bodies[wd % k.bodies.length] ?? '',
            schedule: { on: { weekday: wd + 1, hour, minute }, allowWhileIdle: true },
            extra: { route: k?.route },
          });
        }
      }
      if (notifications.length) await LocalNotifications.schedule({ notifications });
    } catch (e) { console.warn(e); }
    return;
  }
  if (isElectron) {
    (window as any).electronAPI?.setReminders(active.map((r) => ({
      ...r,
      title: `${REMINDER_KINDS[r.kind]?.emoji ?? ''} ${REMINDER_KINDS[r.kind]?.title ?? ''}`,
      body: REMINDER_KINDS[r.kind]?.bodies[0] ?? '',
    })));
    return;
  }
  webReminders = active;
  startWebTicker();
}

// ---------- Браузер: напоминания работают, пока вкладка открыта ----------
let webReminders: Reminder[] = [];
let ticker: number | undefined;
function startWebTicker() {
  if (ticker) return;
  ticker = window.setInterval(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const r of webReminders) {
      if (r.time !== hm || !r.weekdays.includes(now.getDay())) continue;
      const key = `tl_fired_${r.id}`;
      if (localStorage.getItem(key) === todayKey()) continue;
      localStorage.setItem(key, todayKey());
      const k = REMINDER_KINDS[r.kind];
      const n = new Notification(k?.title ?? 'Напоминание', { body: k ? pickDaily(k.bodies, r.id) : '', icon: './icon-512.png' });
      n.onclick = () => { window.focus(); if (k) location.hash = '#' + k.route; };
    }
  }, 20000);
}

export function initNotificationRouting(navigate: (to: string) => void) {
  if (isCapacitor) {
    LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
      const route = e.notification.extra?.route;
      if (route) navigate(route);
    }).catch(() => {});
  }
  (window as any).electronAPI?.onNavigate?.((route: string) => navigate(route));
}
