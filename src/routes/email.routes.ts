import { Router } from 'express'
import { emailController } from '@/controllers/email.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { validate } from '@/middleware/validate.middleware'
import { emailSendLimiter } from '@/middleware/rateLimit.middleware'
import {
  generateEmailSchema,
  updateEmailSchema,
  sendEmailSchema,
  scheduleEmailSchema,
  bulkScheduleSchema,
} from '@/validators/email.validator'

export const emailRouter = Router()

// Public tracking pixel — loaded directly by email clients, no auth available
emailRouter.get('/track/:trackingId', emailController.track)

emailRouter.use(authenticate)

emailRouter.post('/generate', emailSendLimiter, validate(generateEmailSchema), emailController.generate)
emailRouter.get('/', emailController.getAll)
emailRouter.get('/stats', emailController.getStats)
emailRouter.post(
  '/bulk-schedule',
  emailSendLimiter,
  validate(bulkScheduleSchema),
  emailController.bulkSchedule
)
emailRouter.get('/application/:applicationId', emailController.getAllForApplication)
emailRouter.get('/:id', emailController.getById)
emailRouter.patch('/:id', validate(updateEmailSchema), emailController.update)
emailRouter.post('/:id/send', emailSendLimiter, validate(sendEmailSchema), emailController.send)
emailRouter.post(
  '/:id/schedule',
  emailSendLimiter,
  validate(scheduleEmailSchema),
  emailController.schedule
)
emailRouter.delete('/:id/schedule', emailController.cancelSchedule)
