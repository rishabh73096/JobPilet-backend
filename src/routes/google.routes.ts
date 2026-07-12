import { Router } from 'express'
import { googleController } from '@/controllers/google.controller'
import { authenticate } from '@/middleware/auth.middleware'

export const googleRouter = Router()

googleRouter.get('/auth-url', authenticate, googleController.getAuthUrl)
googleRouter.get('/callback', googleController.callback)
googleRouter.post('/disconnect', authenticate, googleController.disconnect)
