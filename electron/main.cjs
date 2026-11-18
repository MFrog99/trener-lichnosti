// Windows-версия «Тренера личности» (Electron)
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_ID = 'ru.trener.lichnosti';
app.setAppUserModelId(APP_ID); // нужно для уведомлений Windows

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win = null;
let tray = null;
let quitting = false;
let reminders = [];
const fired = {};
const remindersFile = () => path.join(app.getPath('userData'), 'reminders.json');
const iconPath = path.join(__dirname, '..', 'dist', 'icon-512.png');

function loadReminders() {
  try { reminders = JSON.parse(fs.readFileSync(remindersFile(), 'utf8')); } catch { reminders = []; }
}

function createWindow(show = true) {
  win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'Тренер личности',
    icon: iconPath,
    backgroundColor: '#12131c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => { if (show) win.show(); });

  // внешние ссылки — в браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // закрытие — сворачивание в трей, чтобы работали напоминания
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
      if (!fired.__trayHint && Notification.isSupported()) {
        fired.__trayHint = true;
        new Notification({ title: 'Тренер личности работает в фоне', body: 'Напоминания продолжат приходить. Выйти можно через значок в трее.', icon: iconPath }).show();
      }
    }
  });
}

function showWindow(route) {
  if (!win) createWindow();
  win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
  if (route) win.webContents.send('navigate', route);
}

function createTray() {
  const img = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Тренер личности');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть', click: () => showWindow() },
    { label: 'Тренировки', click: () => showWindow('/workouts') },
    { label: 'Релакс', click: () => showWindow('/relax') },
    { type: 'separator' },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => showWindow());
}

const ROUTES = { workout: '/workouts', growth: '/growth', journal: '/journal', relax: '/relax', habits: '/habits' };

function tick() {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const day = now.toDateString();
  for (const r of reminders) {
    if (!r.enabled || r.time !== hm || !r.weekdays.includes(now.getDay())) continue;
    if (fired[r.id] === day) continue;
    fired[r.id] = day;
    if (!Notification.isSupported()) continue;
    const n = new Notification({ title: r.title || 'Тренер личности', body: r.body || '', icon: iconPath });
    n.on('click', () => showWindow(ROUTES[r.kind]));
    n.show();
  }
}

ipcMain.on('set-reminders', (_e, list) => {
  reminders = Array.isArray(list) ? list : [];
  try { fs.writeFileSync(remindersFile(), JSON.stringify(reminders)); } catch { /* */ }
});
ipcMain.handle('get-autostart', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('set-autostart', (_e, on) => {
  app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] });
  return !!on;
});

app.on('second-instance', () => showWindow());
app.on('before-quit', () => { quitting = true; });

app.whenReady().then(() => {
  loadReminders();
  const hidden = process.argv.includes('--hidden');
  createWindow(!hidden);
  createTray();
  setInterval(tick, 20000);
  tick();
});

app.on('window-all-closed', (e) => { e.preventDefault(); });
