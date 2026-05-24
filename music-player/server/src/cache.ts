import Redis from 'ioredis'

let redis: Redis | null = null

export function initCache(): Redis | null {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
    redis.on('error', () => { redis = null })
    console.log('[Cache] Redis client created')
    return redis
  } catch {
    console.log('[Cache] Redis unavailable, skipping')
    return null
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const val = await redis.get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch { /* ignored */ }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(key)
  } catch { /* ignored */ }
}

export async function cacheFlush(pattern: string): Promise<void> {
  if (!redis) return
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch { /* ignored */ }
}
