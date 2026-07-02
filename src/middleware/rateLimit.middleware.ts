import rateLimit from 'express-rate-limit'
import type { AuthRequest } from './auth.middleware'

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,  // strict limit on login/register
  message: { success: false, message: 'Too many auth attempts, please try again later' },
})

// Applied after `authenticate`, so req.userId is set — keys by user rather than IP
// so one user can't burn through Gemini/Resend quota, and users behind the same
// NAT/proxy don't share a limit.
export const emailSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: { success: false, message: 'Too many email actions, please try again later' },
})
