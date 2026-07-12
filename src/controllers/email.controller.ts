import type { Request, Response, NextFunction } from 'express'
import { emailService } from '@/services/email/email.service'
import { EMAIL_STATUSES, type EmailStatus } from '@/models/email.model'
import type { AuthRequest } from '@/middleware/auth.middleware'

// 1x1 transparent GIF, served regardless of whether the tracking id is valid
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64'
)

function parseStatus(value: unknown): EmailStatus | undefined {
  return typeof value === 'string' && (EMAIL_STATUSES as readonly string[]).includes(value)
    ? (value as EmailStatus)
    : undefined
}

export const emailController = {
  generate: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.generate(req.userId!, req.body)
      res.status(201).json({ success: true, data: email, message: 'Email draft generated' })
    } catch (err) { next(err) }
  },

  getAll: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const emails = await emailService.getAll(req.userId!, parseStatus(req.query.status))
      res.json({ success: true, data: emails, message: 'OK' })
    } catch (err) { next(err) }
  },

  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await emailService.getStats(req.userId!)
      res.json({ success: true, data: stats, message: 'OK' })
    } catch (err) { next(err) }
  },

  getAllForApplication: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const emails = await emailService.getAllForApplication(req.params.applicationId, req.userId!)
      res.json({ success: true, data: emails, message: 'OK' })
    } catch (err) { next(err) }
  },

  getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.getById(req.params.id, req.userId!)
      res.json({ success: true, data: email, message: 'OK' })
    } catch (err) { next(err) }
  },

  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.update(req.params.id, req.userId!, req.body)
      res.json({ success: true, data: email, message: 'Updated successfully' })
    } catch (err) { next(err) }
  },

  send: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.send(req.params.id, req.userId!, req.body)
      res.json({ success: true, data: email, message: 'Email sent' })
    } catch (err) { next(err) }
  },

  schedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.schedule(req.params.id, req.userId!, req.body)
      res.json({ success: true, data: email, message: 'Email scheduled' })
    } catch (err) { next(err) }
  },

  cancelSchedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = await emailService.cancelSchedule(req.params.id, req.userId!)
      res.json({ success: true, data: email, message: 'Schedule cancelled' })
    } catch (err) { next(err) }
  },

  bulkSchedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const results = await emailService.bulkSchedule(req.userId!, req.body)
      res.json({ success: true, data: results, message: 'Bulk schedule processed' })
    } catch (err) { next(err) }
  },

  track: async (req: Request, res: Response) => {
    await emailService.trackOpen(req.params.trackingId)
    res.set('Content-Type', 'image/gif')
    res.set('Cache-Control', 'no-store')
    res.send(TRACKING_PIXEL)
  },

  getAnalytics: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await emailService.getAnalytics(req.userId!)
      res.json({ success: true, data: stats, message: 'OK' })
    } catch (err) { next(err) }
  },
}
