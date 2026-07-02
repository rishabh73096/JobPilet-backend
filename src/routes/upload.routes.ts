import { Router } from 'express'
import multer from 'multer'
import { uploadController } from '@/controllers/upload.controller'
import { authenticate } from '@/middleware/auth.middleware'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const uploadRouter = Router()

uploadRouter.use(authenticate)

uploadRouter.post('/resume', upload.single('file'), uploadController.uploadResume)
uploadRouter.get('/resume/:id/url', uploadController.getResumeUrl)
