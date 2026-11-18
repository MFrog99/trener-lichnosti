import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reminder, store, useData } from '../lib/store';
import { deleteAccount, signOut, syncNow, updateProfile, useCloud } from '../lib/cloud';
import { cloudEnabled, isCapacitor, isElectron } from '../lib/config';
import { REMINDER_KINDS, requestNotifyPermission } from '../lib/notify';
import { AVATARS } from '../data/misc';
import { downloadFile, todayKey, WEEK_ORDER, WEEKDAYS_SHORT } from '../lib/util';
import { Modal, PageHead, toast, useTitle } from '../components/ui';

const STATUS: Record<string, string> = {
  disabled: 'Локальный режим', guest: 'Не выполнен вход', syncing: 'Синхронизация…', synced: 'Синхронизировано ✓', offline: 'Нет сети — синхронизируем позже', error: 'Ошибка синхронизации',
};

export default function Profile() {
  useTitle('Профиль');
  const d = useData();
  const cloud = useCloud();
  const s = d.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [nick, setNick] = useState(cloud.profile?.nickname ?? '');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [autostart, setAutostart] = useState<boolean | null>(null);
  useEffect(() => { setNick(cloud.profile?.nickname ?? ''); }, [cloud.profile?.nickname]);
  useEffect(() => { (window as any).electronAPI?.getAutostart?.().then((v: boolean) => setAutostart(v)); }, []);

  const setReminder = async (r: Reminder, patch: Partial<Reminder>) => {
    if (patch.enabled) {
      const ok = await requestNotifyPermission();
      if (!ok) { toast('Разрешите уведомления в настройках системы'); return; }
    }
    store.setSettings({ reminders: s.reminders.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) });
  };

  const exportData = () => downloadFile(`trener-lichnosti-${todayKey()}.json`, JSON.stringify(store.get(), null, 2));
  const importData = async (f: File) => {
    try { store.importData(JSON.parse(await f.text())); toast('Данные импортированы'); } catch { toast('Не удалось прочитать файл'); }
  };

  return (
    <div>
      <PageHead title="Профиль и настройки" />
      <div className="grid g2">
        <div className="card">
          <h3>Аккаунт</h3>
          {!cloudEnabled ? (
            <>
              <p className="muted">Облако не подключено: данные хранятся только на этом устройстве.</p>
              <label className="field"><span>Как к вам обращаться?</span>
                <input type="text" value={s.name ?? ''} onChange={(e) => store.setSettings({ name: e.target.value })} maxLength={30} /></label>
            </>
          ) : !cloud.session ? (
            <>
              <p className="muted">Войдите, чтобы синхронизировать прогресс между устройствами и соревноваться с друзьями.</p>
              <label className="field"><span>Как к вам обращаться?</span>
                <input type="text" value={s.name ?? ''} onChange={(e) => store.setSettings({ name: e.target.value })} maxLength={30} /></label>
              <Link to="/auth" className="btn">Войти / Зарегистрироваться</Link>
            </>
          ) : (
            <>
              <div className="row" style={{ marginBottom: 12 }}>
                <button className="emoji-box" style={{ width: 56, height: 56, fontSize: 30, border: 0, cursor: 'pointer' }} onClick={() => setAvatarOpen(true)} title="Сменить аватар">{cloud.profile?.avatar ?? '🙂'}</button>
                <div className="grow"><b>{cloud.profile?.nickname}</b><div className="muted small">{cloud.session.user.email}</div></div>
              </div>
              <label className="field"><span>Ник</span>
                <div className="row"><input type="text" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} />
                  <button className="btn secondary" disabled={!nick.trim() || nick === cloud.profile?.nickname}
                    onClick={async () => { try { await updateProfile({ nickname: nick.trim() }); toast('Ник обновлён'); } catch (e: any) { toast(e.message); } }}>Сохранить</button></div></label>
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="small">{STATUS[cloud.status]}{cloud.lastSync ? ` · ${new Date(cloud.lastSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                <button className="btn sm secondary" onClick={() => syncNow()}>🔄 Синхронизировать</button>
              </div>
              <div className="row wrap">
                <button className="btn ghost" onClick={() => confirm('Выйти из аккаунта? Данные сохранены в облаке.') && signOut()}>Выйти</button>
                <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={async () => {
                  if (!confirm('Удалить аккаунт и ВСЕ данные без возможности восстановления?')) return;
                  if (prompt('Для подтверждения введите УДАЛИТЬ') !== 'УДАЛИТЬ') return;
                  try { await deleteAccount(); toast('Аккаунт удалён'); } catch (e: any) { toast(e.message); }
                }}>Удалить аккаунт</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3>Оформление и звук</h3>
          <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Тема</span>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {([['system', '🖥 Как в системе'], ['light', '☀️ Светлая'], ['dark', '🌙 Тёмная']] as const).map(([v, l]) => (
                <button key={v} className={s.theme === v ? 'active' : ''} onClick={() => store.setSettings({ theme: v })}>{l}</button>
              ))}
            </div></div>
          <label className="check" style={{ marginBottom: 8 }}><input type="checkbox" checked={s.voice} onChange={(e) => store.setSettings({ voice: e.target.checked })} /> Голосовые подсказки в тренировках</label>
          <label className="check" style={{ marginBottom: 8 }}><input type="checkbox" checked={s.beeps} onChange={(e) => store.setSettings({ beeps: e.target.checked })} /> Звуковые сигналы таймера</label>
          {isElectron && autostart !== null && (
            <label className="check"><input type="checkbox" checked={autostart} onChange={async (e) => { await (window as any).electronAPI.setAutostart(e.target.checked); setAutostart(e.target.checked); }} /> Запускать вместе с Windows (для напоминаний)</label>
          )}
        </div>
      </div>

      <div className="card section">
        <h3>Напоминания</h3>
        <p className="muted small">
          {isCapacitor ? 'Уведомления приходят, даже когда приложение закрыто.'
            : isElectron ? 'Уведомления Windows работают, пока программа запущена (она сворачивается в трей).'
            : 'В браузере напоминания приходят, пока вкладка открыта. Для надёжных уведомлений установите приложение на телефон или компьютер.'}
        </p>
        {s.reminders.map((r) => {
          const k = REMINDER_KINDS[r.kind];
          return (
            <div key={r.id} className="list-item" style={{ flexWrap: 'wrap' }}>
              <label className="check" style={{ minWidth: 190 }}><input type="checkbox" checked={r.enabled} onChange={(e) => setReminder(r, { enabled: e.target.checked })} /> {k?.emoji} {k?.label}</label>
              <input type="time" value={r.time} onChange={(e) => setReminder(r, { time: e.target.value })} style={{ width: 110 }} />
              <div className="row wrap" style={{ gap: 4 }}>
                {WEEK_ORDER.map((w) => (
                  <button key={w} className={'btn sm ' + (r.weekdays.includes(w) ? '' : 'ghost')} style={{ padding: '4px 8px' }}
                    onClick={() => setReminder(r, { weekdays: r.weekdays.includes(w) ? r.weekdays.filter((x) => x !== w) : [...r.weekdays, w] })}>{WEEKDAYS_SHORT[w]}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid g2 section">
        <div className="card">
          <h3>Данные</h3>
          <p className="muted small">Резервная копия всех ваших записей в файле JSON.</p>
          <div className="row wrap">
            <button className="btn secondary" onClick={exportData}>⬇ Экспорт</button>
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>⬆ Импорт</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => confirm('Удалить весь прогресс? Это действие нельзя отменить.') && (store.resetAll(), toast('Прогресс сброшен'))}>Сбросить прогресс</button>
          </div>
        </div>
        <div className="card">
          <h3>О приложении</h3>
          <p className="small">Тренер личности · версия 1.0.0</p>
          <div className="col small" style={{ gap: 4 }}>
            <Link to="/legal/privacy">Политика конфиденциальности</Link>
            <Link to="/legal/terms">Пользовательское соглашение</Link>
            <Link to="/legal/health">Отказ от ответственности (здоровье)</Link>
          </div>
        </div>
      </div>

      {avatarOpen && (
        <Modal title="Аватар" onClose={() => setAvatarOpen(false)}>
          <div className="grid g4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
            {AVATARS.map((a) => <button key={a} className="emoji-box" style={{ width: '100%', height: 56, fontSize: 30, border: 0, cursor: 'pointer' }}
              onClick={async () => { await updateProfile({ avatar: a }); setAvatarOpen(false); }}>{a}</button>)}
          </div>
        </Modal>
      )}
    </div>
  );
}
