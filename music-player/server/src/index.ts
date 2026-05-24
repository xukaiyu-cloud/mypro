import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { execSync } from 'child_process'
import { initDatabase } from './db'
import { initCache } from './cache'
import { initSocket } from './ws'
import authRoutes from './routes/auth'
import playlistRoutes from './routes/playlist'
import syncRoutes from './routes/sync'
import importRoutes from './routes/import'
import playRoutes from './routes/play'
import friendRoutes from './routes/friends'
import listenRoutes from './routes/listen'
import searchRoutes from './routes/search'
import localRoutes from './routes/local'
import proxyRoutes from './routes/proxy'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'file://'], credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', authRoutes)
app.use('/api/playlists', playlistRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/import', importRoutes)
app.use('/api/play', playRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/listen', listenRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/local', localRoutes)
app.use('/api/proxy', proxyRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null })
})

const server = createServer(app)
initSocket(server)

function killPort(port: number): boolean {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti:${port}`
    const out = execSync(cmd, { encoding: 'utf8', timeout: 3000 })
    if (!out.trim()) return false

    if (process.platform === 'win32') {
      const lines = out.split(/\r?\n/)
      for (const line of lines) {
        const m = line.match(/LISTENING\s+(\d+)/)
        if (m) {
          execSync(`taskkill /F /PID ${m[1]}`, { timeout: 3000 })
          return true
        }
      }
    } else {
      execSync(`kill -9 ${out.trim().split(/\n/)[0]}`, { timeout: 3000 })
      return true
    }
  } catch { /* port is free or kill failed */ }
  return false
}

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
      resolve()
    })
    server.on('error', (err: NodeJS.ErrnoException) => {
      server.close(() => reject(err))
    })
  })
}

async function start() {
  await initDatabase()
  initCache()
  try {
    await listen()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is in use, killing existing process...`)
      killPort(PORT)
      await new Promise(r => setTimeout(r, 500))
      await listen()
    } else {
      throw err
    }
  }
}

start().catch(console.error)
