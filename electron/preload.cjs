const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setReminders: (list) => ipcRenderer.send('set-reminders', list),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (on) => ipcRenderer.invoke('set-autostart', on),
  onNavigate: (cb) => ipcRenderer.on('navigate', (_e, route) => cb(route)),
});
