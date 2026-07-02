import { Router } from 'express'
import { companyController } from '@/controllers/company.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { validate } from '@/middleware/validate.middleware'
import { createCompanySchema, updateCompanySchema } from '@/validators/company.validator'

export const companyRouter = Router()

companyRouter.use(authenticate)

companyRouter.post('/', validate(createCompanySchema), companyController.create)
companyRouter.get('/', companyController.getAll)
companyRouter.get('/:id', companyController.getById)
companyRouter.patch('/:id', validate(updateCompanySchema), companyController.update)
companyRouter.delete('/:id', companyController.delete)
