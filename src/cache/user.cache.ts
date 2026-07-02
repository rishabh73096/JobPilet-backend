import { redis } from '@/db/redis'
import type { PublicUser } from '@/models/user.model'

const TTL = 60 * 5  // 5 minutes

export const userCache = {
  get: async (id: string): Promise<PublicUser | null> => {
    const cached = await redis.get(`user:${id}`)
    return cached ? JSON.parse(cached) : null
  },

  set: async (user: PublicUser): Promise<void> => {
    await redis.setex(`user:${user.id}`, TTL, JSON.stringify(user))
  },

  invalidate: async (id: string): Promise<void> => {
    await redis.del(`user:${id}`)
  },

  invalidateAll: async (): Promise<void> => {
    const keys = await redis.keys('user:*')
    if (keys.length > 0) await redis.del(...keys)
  },
}
