/**
 * Simple in-memory cache pour éviter les re-fetch à chaque navigation.
 * TTL de 60s par défaut. Les mutations invalident le cache concerné.
 */

interface CacheEntry<T> {
  data: T
  ts: number
}

const store = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL = 60_000 // 60s

export function cacheGet<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > ttl) { store.delete(key); return null }
  return entry.data
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() })
}

export function cacheInvalidate(...keys: string[]): void {
  keys.forEach(k => store.delete(k))
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
