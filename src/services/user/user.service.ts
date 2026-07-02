import { userRepo } from './user.repo'
import { userCache } from '@/cache/user.cache'
import { UserNotFoundError } from './user.errors'
import { toPublicUser } from '@/models/user.model'
import type { UpdateUserDto, PaginationDto } from '@/validators/user.validator'

export const userService = {
  getById: async (id: string) => {
    // Check cache first
    const cached = await userCache.get(id)
    if (cached) return cached

    const user = await userRepo.findById(id)
    if (!user) throw new UserNotFoundError(id)

    const publicUser = toPublicUser(user)
    await userCache.set(publicUser)
    return publicUser
  },

  getAll: async (params: PaginationDto) => {
    const [users, total] = await Promise.all([
      userRepo.findAll(params),
      userRepo.count(params.search),
    ])
    return {
      users: users.map(toPublicUser),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasMore: params.page * params.limit < total,
      },
    }
  },

  update: async (id: string, data: UpdateUserDto) => {
    const user = await userRepo.findById(id)
    if (!user) throw new UserNotFoundError(id)

    const updated = await userRepo.update(id, data)
    await userCache.invalidate(id)  // bust cache
    return toPublicUser(updated!)
  },

  delete: async (id: string) => {
    const user = await userRepo.findById(id)
    if (!user) throw new UserNotFoundError(id)

    await userRepo.delete(id)
    await userCache.invalidate(id)
  },
}
