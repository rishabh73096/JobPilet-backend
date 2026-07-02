import type { Response, NextFunction } from 'express'
import { userService } from '@/services/user/user.service'
import { paginationSchema } from '@/validators/user.validator'
import type { AuthRequest } from '@/middleware/auth.middleware'

export const userController = {
  getAll: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const params = paginationSchema.parse(req.query)
      const result = await userService.getAll(params)
      res.json({ success: true, ...result, message: 'OK' })
    } catch (err) { next(err) }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.params.id)
      res.json({ success: true, data: user, message: 'OK' })
    } catch (err) { next(err) }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.update(req.params.id, req.body)
      res.json({ success: true, data: user, message: 'Updated successfully' })
    } catch (err) { next(err) }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.delete(req.params.id)
      res.json({ success: true, data: null, message: 'Deleted successfully' })
    } catch (err) { next(err) }
  },
}
