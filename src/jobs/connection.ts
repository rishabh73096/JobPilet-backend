import type { RedisOptions } from 'ioredis'
import { env } from '@/config/env'

const parsed = new URL(env.REDIS_URL)

// BullMQ requires a plain connection-options object (not a shared ioredis instance —
// its bundled ioredis version has incompatible types with the top-level one, and it
// also requires maxRetriesPerRequest: null, which the app-wide client in db/redis.ts
// doesn't set).
export const queueConnection: RedisOptions = {
  host: parsed.hostname,
  port: Number(parsed.port) || 6379,
  username: parsed.username || undefined,
  password: parsed.password || undefined,
  tls: parsed.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
}
