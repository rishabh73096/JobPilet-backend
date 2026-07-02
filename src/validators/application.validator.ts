import { z } from 'zod'
import { APPLICATION_STATUSES } from '@/models/application.model'

export const createApplicationSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required').max(100),
  jobUrl: z.string().url().optional(),
  jobDescription: z.string().max(10000).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateApplicationSchema = createApplicationSchema.partial()

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>
export type UpdateApplicationDto = z.infer<typeof updateApplicationSchema>
