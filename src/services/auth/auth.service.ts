import bcrypt from 'bcryptjs'
import { UserModel, toPublicUser } from '@/models/user.model'
import { userRepo } from '@/services/user/user.repo'
import { tokenService } from './token.service'
import { userPublisher } from '@/events/publishers/user.publisher'
import { EmailAlreadyExistsError, UserNotFoundError } from '@/services/user/user.errors'
import { AppError } from '@/middleware/error.middleware'
import type { LoginDto, RegisterDto } from '@/validators/auth.validator'

export const authService = {
  register: async (data: RegisterDto) => {
    const existing = await userRepo.findByEmail(data.email)
    if (existing) throw new EmailAlreadyExistsError(data.email)

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const user = await UserModel.create({ ...data, password: hashedPassword })

    const token = tokenService.sign({ userId: user._id.toString(), role: user.role })
    await userPublisher.signedUp({ userId: user._id.toString(), email: user.email, name: user.name })
    return { user: toPublicUser(user), token }
  },

  login: async (data: LoginDto) => {
    const user = await userRepo.findByEmail(data.email)
    if (!user) throw new AppError(401, 'Invalid credentials')

    const isValid = await bcrypt.compare(data.password, user.password)
    if (!isValid) throw new AppError(401, 'Invalid credentials')

    const token = tokenService.sign({ userId: user._id.toString(), role: user.role })
    return { user: toPublicUser(user), token }
  },

  me: async (userId: string) => {
    const user = await userRepo.findById(userId)
    if (!user) throw new UserNotFoundError(userId)
    return toPublicUser(user)
  },
}
