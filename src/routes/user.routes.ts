import { Router } from 'express'
import { userController } from '@/controllers/user.controller'
import { authenticate, authorize } from '@/middleware/auth.middleware'
import { validate } from '@/middleware/validate.middleware'
import { updateUserSchema } from '@/validators/user.validator'

export const userRouter = Router()

// All user routes require authentication
userRouter.use(authenticate)

userRouter.get('/', authorize('admin'), userController.getAll)
userRouter.get('/:id', userController.getById)
userRouter.patch('/:id', validate(updateUserSchema), userController.update)
userRouter.delete('/:id', authorize('admin'), userController.delete)
