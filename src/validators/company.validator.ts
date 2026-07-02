import { z } from 'zod'

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  website: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
})

export const updateCompanySchema = createCompanySchema.partial()

export type CreateCompanyDto = z.infer<typeof createCompanySchema>
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>
