import { Router } from 'express'
import { authController } from '@/controllers/auth.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { validate } from '@/middleware/validate.middleware'
import { authLimiter } from '@/middleware/rateLimit.middleware'
import { loginSchema, registerSchema } from '@/validators/auth.validator'

export const authRouter = Router()

authRouter.post('/register', authLimiter, validate(registerSchema), authController.register)
authRouter.post('/login', authLimiter, validate(loginSchema), authController.login)
authRouter.post('/logout', authenticate, authController.logout)
authRouter.get('/me', authenticate, authController.me)
