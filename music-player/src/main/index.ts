import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

let serverProcess: ChildProcess | null = null

function startServer(): void {
  const isDev = !!process.env.ELECTRON_RENDERER_URL
  if (isDev) return // Server runs separately in dev mode

  const serverDir = join(__dirname, '../../server')
  const serverEntry = join(serverDir, 'src/index.ts')
  
  try {
    serverProcess = spawn('node', [
      '--import', 'tsx',
      serverEntry
    ], {
      cwd: serverDir,
      env: { ...process.env, PORT: '3000' },
      stdio: 'pipe',
    })
    serverProcess.stdout?.on('data', (d) => console.log('[server]', d.toString().trim()))
    serverProcess.stderr?.on('data', (d) => console.error('[server]', d.toString().trim()))
    serverProcess.on('exit', (code) => console.log('[server] exited with code', code))
  } catch (e) {
    console.error('Failed to start server:', e)
  }
}
import { registerFileIpc } from './ipc/file'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '文凯音乐',
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  startServer()
  Menu.setApplicationMenu(null)
  registerFileIpc()
  ipcMain.handle('get-version', () => app.getVersion())

  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  createWindow()
})

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
