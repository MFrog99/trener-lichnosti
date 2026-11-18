// Рендерит public/icon.svg в PNG нужных размеров с помощью Electron.
// Запуск: npx electron scripts/make-icons.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8');
const BIG = 1024;

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  fs.mkdirSync(path.join(root, 'resources'), { recursive: true });
  const win = new BrowserWindow({ width: BIG, height: BIG, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg.replace('<svg ', `<svg width="${BIG}" height="${BIG}" `)}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: BIG, height: BIG });
  const out = [
    [1024, path.join(root, 'resources', 'icon.png')],
    [512, path.join(root, 'public', 'icon-512.png')],
    [192, path.join(root, 'public', 'icon-192.png')],
  ];
  for (const [size, file] of out) {
    fs.writeFileSync(file, img.resize({ width: size, height: size, quality: 'best' }).toPNG());
    console.log('saved', file);
  }
  win.destroy();
  app.quit();
});
