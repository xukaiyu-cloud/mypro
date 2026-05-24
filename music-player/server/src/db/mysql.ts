import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'

let pool: Pool

export async function initMySQL(): Promise<void> {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'music_player',
    waitForConnections: true,
    connectionLimit: 10,
  })

  // Test connection
  const conn = await pool.getConnection()
  await conn.ping()
  conn.release()

  await runMigrations()
  console.log('[DB] MySQL initialized')
}

async function runMigrations(): Promise<void> {
  await pool.execute(`CREATE TABLE IF NOT EXISTS user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(120) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await pool.execute(`CREATE TABLE IF NOT EXISTS song (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(100) DEFAULT '',
    album VARCHAR(100) DEFAULT '',
    duration INT DEFAULT 0,
    file_path VARCHAR(500) DEFAULT '',
    cover_url VARCHAR(500) DEFAULT '',
    source_platform VARCHAR(30) DEFAULT '',
    external_link VARCHAR(500) DEFAULT ''
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await pool.execute(`CREATE TABLE IF NOT EXISTS playlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT '',
    source_type VARCHAR(20) DEFAULT 'local',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_playlist_user (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await pool.execute(`CREATE TABLE IF NOT EXISTS playlist_song (
    id INT PRIMARY KEY AUTO_INCREMENT,
    playlist_id INT NOT NULL,
    song_id INT NOT NULL,
    sort_order INT DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ps_playlist (playlist_id),
    INDEX idx_ps_song (song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlist(id),
    FOREIGN KEY (song_id) REFERENCES song(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await pool.execute(`CREATE TABLE IF NOT EXISTS play_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    play_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ph_user (user_id),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (song_id) REFERENCES song(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  await pool.execute(`CREATE TABLE IF NOT EXISTS friends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fr_user (user_id),
    INDEX idx_fr_friend (friend_id),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (friend_id) REFERENCES user(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
}

export async function queryAll<T = Record<string, unknown>>(sql: string, params?: ParamValue[]): Promise<T[]> {
  const adjusted = sql.replace(/\$(\d+)/g, '?')
  const [rows] = await pool.query(adjusted, params as ParamValue[])
  return rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params?: ParamValue[]): Promise<T | null> {
  const rows = await queryAll<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

type ParamValue = string | number | boolean | null

export async function execute(sql: string, params?: ParamValue[]): Promise<number> {
  const adjusted = sql.replace(/\$(\d+)/g, '?')
  const [result] = await pool.execute<ResultSetHeader>(adjusted, params as ParamValue[])
  return result.insertId
}

export async function run(sql: string, params?: ParamValue[]): Promise<void> {
  const adjusted = sql.replace(/\$(\d+)/g, '?')
  await pool.execute(adjusted, params as ParamValue[])
}

export async function closeMySQL(): Promise<void> {
  if (pool) await pool.end()
}
