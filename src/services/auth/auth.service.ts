import bcrypt from 'bcryptjs'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
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

    if (user.mfaEnabled) {
      const tempToken = tokenService.sign({ userId: user._id.toString(), temp: true }, { expiresIn: '5m' })
      return { mfaRequired: true, tempToken }
    }

    const token = tokenService.sign({ userId: user._id.toString(), role: user.role })
    return { user: toPublicUser(user), token }
  },

  me: async (userId: string) => {
    const user = await userRepo.findById(userId)
    if (!user) throw new UserNotFoundError(userId)
    return toPublicUser(user)
  },

  mfaSetup: async (userId: string) => {
    const user = await userRepo.findById(userId)
    if (!user) throw new UserNotFoundError(userId)

    const secret = generateSecret()
    
    // Save temporary secret to user model
    await UserModel.findByIdAndUpdate(userId, { mfaSecret: secret })

    const otpauthUrl = generateURI({ secret, issuer: 'JobPilot', label: user.email })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    return { secret, qrCodeDataUrl }
  },

  mfaEnable: async (userId: string, code: string) => {
    const user = await UserModel.findById(userId).select('+mfaSecret')
    if (!user) throw new UserNotFoundError(userId)
    if (!user.mfaSecret) throw new AppError(400, 'MFA setup has not been initiated')

    const isValid = verifySync({ token: code, secret: user.mfaSecret }).valid
    if (!isValid) throw new AppError(400, 'Invalid verification code')

    user.mfaEnabled = true
    await user.save()

    return { success: true, message: 'MFA enabled successfully' }
  },

  mfaDisable: async (userId: string) => {
    const user = await UserModel.findById(userId)
    if (!user) throw new UserNotFoundError(userId)

    user.mfaEnabled = false
    user.mfaSecret = undefined
    await user.save()

    return { success: true, message: 'MFA disabled successfully' }
  },

  mfaVerify: async (tempToken: string, code: string) => {
    try {
      const decoded = tokenService.verify(tempToken)
      if (!decoded.temp) throw new AppError(401, 'Invalid temporary token')

      const user = await UserModel.findById(decoded.userId).select('+mfaSecret')
      if (!user) throw new UserNotFoundError(decoded.userId)
      if (!user.mfaSecret) throw new AppError(400, 'MFA not configured')

      const isValid = verifySync({ token: code, secret: user.mfaSecret }).valid
      if (!isValid) throw new AppError(401, 'Invalid verification code')

      const token = tokenService.sign({ userId: user._id.toString(), role: user.role })
      return { user: toPublicUser(user.toObject()), token }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(401, 'Invalid or expired session')
    }
  },
}
