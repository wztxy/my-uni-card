const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveImage: (dataUrl, defaultName) =>
    ipcRenderer.invoke('save-image', { dataUrl, defaultName }),

  ssoLogin: (stuNo, password) =>
    ipcRenderer.invoke('sso-login', { stuNo, password }),

  fetchCardData: (minDate, maxDate, stuNo, sessionId) =>
    ipcRenderer.invoke('fetch-card-data', { minDate, maxDate, stuNo, sessionId }),

  fetchUserInfo: (sessionId) =>
    ipcRenderer.invoke('fetch-user-info', { sessionId }),

  saveJSON: (data, defaultName) =>
    ipcRenderer.invoke('save-json', { data, defaultName }),

  onLogMessage: (callback) => ipcRenderer.on('log-message', (_event, message) => callback(message)),

  onLanguageChange: (callback) => ipcRenderer.on('language-change', (_event, lang) => callback(lang)),

  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  isElectron: true,

  platform: process.platform
});
