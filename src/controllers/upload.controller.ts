import type { Response, NextFunction } from 'express'
import { uploadService } from '@/services/upload/upload.service'
import { AppError } from '@/middleware/error.middleware'
import type { AuthRequest } from '@/middleware/auth.middleware'

export const uploadController = {
  uploadResume: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'No file uploaded')
      const result = await uploadService.uploadResume(req.userId!, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
      })
      res.status(201).json({ success: true, data: result, message: 'Resume uploaded' })
    } catch (err) { next(err) }
  },

  getResumeUrl: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await uploadService.getResumeUrl(req.userId!, req.params.id)
      res.json({ success: true, data: result, message: 'OK' })
    } catch (err) { next(err) }
  },
}
