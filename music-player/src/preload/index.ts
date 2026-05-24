import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanMusicFiles: (dir: string) => ipcRenderer.invoke('scan-music', dir),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  getAppVersion: () => ipcRenderer.invoke('get-version'),
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action))
  },
  onGlobalShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on('shortcut', (_event, action) => callback(action))
  },
  setStore: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
  getStore: (key: string) => ipcRenderer.invoke('store-get', key),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
})
