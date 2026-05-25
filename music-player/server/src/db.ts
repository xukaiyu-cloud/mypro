import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

type Db = SqlJsDatabase

const DB_PATH = join(__dirname, '..', 'data')
const DB_FILE = join(DB_PATH, 'music.db')

let db: Db
let dbReady = false

function persist() {
  if (!existsSync(DB_PATH)) mkdirSync(DB_PATH, { recursive: true })
  writeFileSync(DB_FILE, db.export())
}

function loadOrCreate(SQL: SqlJsDatabase): SqlJsDatabase {
  try {
    if (existsSync(DB_FILE)) {
      const buffer = readFileSync(DB_FILE)
      return new SQL.Database(buffer)
    }
  } catch { /* corrupt file, create new */ }
  return new SQL.Database()
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  db = loadOrCreate(SQL)

  db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS song (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    album TEXT NOT NULL DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL DEFAULT '',
    cover_url TEXT NOT NULL DEFAULT '',
    source_platform TEXT DEFAULT '',
    external_link TEXT DEFAULT ''
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS playlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    source_type TEXT DEFAULT 'local',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS playlist_song (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (playlist_id) REFERENCES playlist(id),
    FOREIGN KEY (song_id) REFERENCES song(id)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    play_time TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (song_id) REFERENCES song(id)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (friend_id) REFERENCES user(id)
  )`)

  // Add indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_playlist_user ON playlist(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_ps_playlist ON playlist_song(playlist_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_ps_song ON playlist_song(song_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_ph_user ON play_history(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_fr_user ON friends(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_fr_friend ON friends(friend_id)')

  persist()

  // Migrations for existing databases
  try { db.run(`ALTER TABLE user ADD COLUMN avatar TEXT DEFAULT ''`) } catch {}

  persist()
  dbReady = true
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function queryAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const stmt = getDb().prepare(sql)
  if (params) stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T)
  }
  stmt.free()
  return rows
}

export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null {
  const rows = queryAll<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function execute(sql: string, params?: unknown[]): number {
  const stmt = getDb().prepare(sql)
  if (params) stmt.bind(params)
  stmt.step()
  stmt.free()
  const rows = queryAll<{ id: number }>('SELECT last_insert_rowid() as id')
  persist()
  return rows[0]?.id ?? 0
}

export function run(sql: string, params?: unknown[]): void {
  getDb().run(sql, params)
  persist()
}
