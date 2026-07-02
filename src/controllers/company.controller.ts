import type { Response, NextFunction } from 'express'
import { companyService } from '@/services/company/company.service'
import type { AuthRequest } from '@/middleware/auth.middleware'

export const companyController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const company = await companyService.create(req.userId!, req.body)
      res.status(201).json({ success: true, data: company, message: 'Company created' })
    } catch (err) { next(err) }
  },

  getAll: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const companies = await companyService.getAll(req.userId!)
      res.json({ success: true, data: companies, message: 'OK' })
    } catch (err) { next(err) }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const company = await companyService.getById(req.params.id, req.userId!)
      res.json({ success: true, data: company, message: 'OK' })
    } catch (err) { next(err) }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const company = await companyService.update(req.params.id, req.userId!, req.body)
      res.json({ success: true, data: company, message: 'Updated successfully' })
    } catch (err) { next(err) }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await companyService.delete(req.params.id, req.userId!)
      res.json({ success: true, data: null, message: 'Deleted successfully' })
    } catch (err) { next(err) }
  },
}
