export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  scanMusicFiles: (dir: string) => Promise<string[]>
  readFile: (path: string) => Promise<string>
  getAppVersion: () => Promise<string>
  onMenuAction: (callback: (action: string) => void) => void
  onGlobalShortcut: (callback: (action: string) => void) => void
  setStore: (key: string, value: unknown) => Promise<void>
  getStore: (key: string) => Promise<unknown>
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  getDesktopSources: () => Promise<Electron.DesktopCapturerSource[]>
  getMediaStreamId: (sourceId: string) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}