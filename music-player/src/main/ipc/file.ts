import { ipcMain, dialog } from 'electron'
import { readFileSync, readdirSync, statSync } from 'fs'
import { extname, join } from 'path'

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma'])

export function registerFileIpc(): void {
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('scan-music', async (_event, dir: string) => {
    const files: string[] = []
    function walk(d: string): void {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry)
        const st = statSync(full)
        if (st.isDirectory()) {
          walk(full)
        } else if (AUDIO_EXTS.has(extname(entry).toLowerCase())) {
          files.push(full)
        }
      }
    }
    walk(dir)
    return files
  })

  ipcMain.handle('read-file', async (_event, path: string) => {
    return readFileSync(path, 'utf-8')
  })
}
