import { Router } from 'express'
import { authRouter } from './auth.routes'
import { userRouter } from './user.routes'
import { companyRouter } from './company.routes'
import { applicationRouter } from './application.routes'
import { emailRouter } from './email.routes'
import { uploadRouter } from './upload.routes'
import { googleRouter } from './google.routes'
import { apiLimiter } from '@/middleware/rateLimit.middleware'

export const router = Router()

// Apply rate limiting to all API routes
router.use(apiLimiter)

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/companies', companyRouter)
router.use('/applications', applicationRouter)
router.use('/emails', emailRouter)
router.use('/uploads', uploadRouter)
router.use('/google', googleRouter)

// 404 handler for unknown routes
router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})
