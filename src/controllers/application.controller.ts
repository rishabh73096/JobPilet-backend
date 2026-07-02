import type { Response, NextFunction } from 'express'
import { applicationService } from '@/services/application/application.service'
import type { AuthRequest } from '@/middleware/auth.middleware'

export const applicationController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.create(req.userId!, req.body)
      res.status(201).json({ success: true, data: application, message: 'Application created' })
    } catch (err) { next(err) }
  },

  getAll: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const applications = await applicationService.getAll(req.userId!)
      res.json({ success: true, data: applications, message: 'OK' })
    } catch (err) { next(err) }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.getById(req.params.id, req.userId!)
      res.json({ success: true, data: application, message: 'OK' })
    } catch (err) { next(err) }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.update(req.params.id, req.userId!, req.body)
      res.json({ success: true, data: application, message: 'Updated successfully' })
    } catch (err) { next(err) }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await applicationService.delete(req.params.id, req.userId!)
      res.json({ success: true, data: null, message: 'Deleted successfully' })
    } catch (err) { next(err) }
  },
}
