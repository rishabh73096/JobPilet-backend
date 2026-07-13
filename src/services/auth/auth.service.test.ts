import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/auth/auth.service'
import { UserModel } from '@/models/user.model'
import { EmailAlreadyExistsError } from '@/services/user/user.errors'
import { AppError } from '@/middleware/error.middleware'

describe('authService — Unit Tests', () => {
  const validRegisterPayload = {
    name: 'Test User',
    email: 'unit@example.com',
    password: 'Password123!',
  }

  // ─── register() ──────────────────────────────────────────────────────────
  describe('register()', () => {
    it('creates user and returns PublicUser + token', async () => {
      const result = await authService.register(validRegisterPayload)

      expect(result.token).toBeDefined()
      expect(result.user.email).toBe('unit@example.com')
      expect(result.user.name).toBe('Test User')
      // Password must never be exposed
      expect((result.user as any).password).toBeUndefined()
    })

    it('password is stored as bcrypt hash (not plaintext)', async () => {
      await authService.register(validRegisterPayload)
      const stored = await UserModel.findOne({ email: 'unit@example.com' }).select('+password')
      expect(stored?.password).not.toBe('Password123!')
      expect(stored?.password).toMatch(/^\$2[ab]\$/)
    })

    it('throws EmailAlreadyExistsError for duplicate email', async () => {
      await authService.register(validRegisterPayload)
      await expect(authService.register(validRegisterPayload)).rejects.toThrow(
        EmailAlreadyExistsError
      )
    })
  })

  // ─── login() ─────────────────────────────────────────────────────────────
  describe('login()', () => {
    beforeEach(async () => {
      await authService.register(validRegisterPayload)
    })

    it('returns token + user on valid credentials', async () => {
      const result = await authService.login({
        email: 'unit@example.com',
        password: 'Password123!',
      })

      expect(result.token).toBeDefined()
      expect((result as any).user.email).toBe('unit@example.com')
    })

    it('throws AppError 401 on wrong password', async () => {
      await expect(
        authService.login({ email: 'unit@example.com', password: 'WrongPass' })
      ).rejects.toThrow(AppError)
    })

    it('throws AppError 401 for non-existent email', async () => {
      await expect(
        authService.login({ email: 'nobody@example.com', password: 'Password123!' })
      ).rejects.toThrow(AppError)
    })

    it('returns mfaRequired:true when MFA is enabled', async () => {
      // Enable MFA on user
      await UserModel.findOneAndUpdate(
        { email: 'unit@example.com' },
        { mfaEnabled: true, mfaSecret: 'TESTSECRET' }
      )

      const result = await authService.login({
        email: 'unit@example.com',
        password: 'Password123!',
      })

      expect((result as any).mfaRequired).toBe(true)
      expect((result as any).tempToken).toBeDefined()
      expect((result as any).user).toBeUndefined() // no user in MFA response
    })
  })

  // ─── me() ─────────────────────────────────────────────────────────────────
  describe('me()', () => {
    it('returns PublicUser for valid user ID', async () => {
      const { user } = await authService.register({
        name: 'Me User',
        email: 'meunit@example.com',
        password: 'Password123!',
      })

      const result = await authService.me(user.id)
      expect(result.email).toBe('meunit@example.com')
    })

    it('throws UserNotFoundError for invalid ID', async () => {
      const { UserNotFoundError } = await import('@/services/user/user.errors')
      await expect(
        authService.me('507f1f77bcf86cd799439011')
      ).rejects.toThrow(UserNotFoundError)
    })
  })

  // ─── mfaSetup() ───────────────────────────────────────────────────────────
  describe('mfaSetup()', () => {
    it('returns TOTP secret and QR code data URL', async () => {
      const { user } = await authService.register({
        name: 'MFA Test',
        email: 'mfaunit@example.com',
        password: 'Password123!',
      })

      const result = await authService.mfaSetup(user.id)

      expect(result.secret).toBeDefined()
      expect(result.secret.length).toBeGreaterThan(10)
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/)
    })
  })

  // ─── mfaDisable() ─────────────────────────────────────────────────────────
  describe('mfaDisable()', () => {
    it('disables MFA and clears secret', async () => {
      const { user } = await authService.register({
        name: 'MFA Disable',
        email: 'mfadisable@example.com',
        password: 'Password123!',
      })
      await UserModel.findByIdAndUpdate(user.id, { mfaEnabled: true, mfaSecret: 'secret' })

      const result = await authService.mfaDisable(user.id)
      expect(result.success).toBe(true)

      const stored = await UserModel.findById(user.id).select('+mfaSecret')
      expect(stored?.mfaEnabled).toBe(false)
      expect(stored?.mfaSecret).toBeUndefined()
    })
  })
})
