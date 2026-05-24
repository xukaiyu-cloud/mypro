const STORAGE_KEY = 'apiServerUrl'
const DEFAULT_SERVER = 'http://localhost:3000'

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SERVER
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ''))
}
