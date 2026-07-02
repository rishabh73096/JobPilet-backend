import { z } from 'zod'
import { EMAIL_TONES } from '@/models/email.model'

export const generateEmailSchema = z.object({
  applicationId: z.string().min(1, 'applicationId is required'),
  tone: z.enum(EMAIL_TONES).default('formal'),
})

export const updateEmailSchema = z.object({
  to: z.string().email().optional(),
  recruiterName: z.string().max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  tone: z.enum(EMAIL_TONES).optional(),
})

export const sendEmailSchema = z.object({
  to: z.string().email('A valid recipient email is required').optional(),
  recruiterName: z.string().max(100).optional(),
})

export const scheduleEmailSchema = z.object({
  to: z.string().email('A valid recipient email is required').optional(),
  recruiterName: z.string().max(100).optional(),
  sendAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), 'sendAt must be in the future'),
})

export const bulkScheduleSchema = z.object({
  emailIds: z.array(z.string().min(1)).min(1, 'At least one email is required').max(50),
  sendAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), 'sendAt must be in the future'),
  staggerSeconds: z.coerce.number().int().min(0).max(3600).default(30),
})

export type GenerateEmailDto = z.infer<typeof generateEmailSchema>
export type UpdateEmailDto = z.infer<typeof updateEmailSchema>
export type SendEmailDto = z.infer<typeof sendEmailSchema>
export type ScheduleEmailDto = z.infer<typeof scheduleEmailSchema>
export type BulkScheduleDto = z.infer<typeof bulkScheduleSchema>
