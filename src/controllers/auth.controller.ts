import type { Request, Response, NextFunction } from 'express'
import { authService } from '@/services/auth/auth.service'
import type { AuthRequest } from '@/middleware/auth.middleware'

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body)
      res.status(201).json({ success: true, data: result, message: 'Registered successfully' })
    } catch (err) { next(err) }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body)
      res.json({ success: true, data: result, message: 'Logged in successfully' })
    } catch (err) { next(err) }
  },

  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.me(req.userId!)
      res.json({ success: true, data: user, message: 'OK' })
    } catch (err) { next(err) }
  },

  logout: (_req: Request, res: Response) => {
    // JWT is stateless — client deletes token
    // If using refresh tokens, invalidate here via Redis
    res.json({ success: true, data: null, message: 'Logged out successfully' })
  },

  mfaSetup: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.mfaSetup(req.userId!)
      res.json({ success: true, data: result, message: 'MFA setup initiated' })
    } catch (err) { next(err) }
  },

  mfaEnable: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body
      const result = await authService.mfaEnable(req.userId!, code)
      res.json(result)
    } catch (err) { next(err) }
  },

  mfaDisable: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.mfaDisable(req.userId!)
      res.json(result)
    } catch (err) { next(err) }
  },

  mfaVerify: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tempToken, code } = req.body
      const result = await authService.mfaVerify(tempToken, code)
      res.json({ success: true, data: result, message: 'MFA verification successful' })
    } catch (err) { next(err) }
  },
}
