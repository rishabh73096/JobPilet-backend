import { Router } from 'express'
import { applicationController } from '@/controllers/application.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { validate } from '@/middleware/validate.middleware'
import { createApplicationSchema, updateApplicationSchema } from '@/validators/application.validator'

export const applicationRouter = Router()

applicationRouter.use(authenticate)

applicationRouter.post('/', validate(createApplicationSchema), applicationController.create)
applicationRouter.get('/', applicationController.getAll)
applicationRouter.get('/:id', applicationController.getById)
applicationRouter.patch('/:id', validate(updateApplicationSchema), applicationController.update)
applicationRouter.delete('/:id', applicationController.delete)
