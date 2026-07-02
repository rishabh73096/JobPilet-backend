import { applicationRepo } from './application.repo'
import { companyRepo } from '@/services/company/company.repo'
import { ApplicationNotFoundError } from './application.errors'
import { AppError } from '@/middleware/error.middleware'
import { toPublicApplication } from '@/models/application.model'
import type { CreateApplicationDto, UpdateApplicationDto } from '@/validators/application.validator'

export const applicationService = {
  create: async (owner: string, data: CreateApplicationDto) => {
    const company = await companyRepo.findById(data.company, owner)
    if (!company) throw new AppError(400, 'Invalid company')
    const created = await applicationRepo.create(owner, data)
    const withCompany = await applicationRepo.findById(created._id.toString(), owner)
    return toPublicApplication(withCompany!)
  },

  getAll: async (owner: string) =>
    (await applicationRepo.findAllByOwner(owner)).map(toPublicApplication),

  getById: async (id: string, owner: string) => {
    const application = await applicationRepo.findById(id, owner)
    if (!application) throw new ApplicationNotFoundError(id)
    return toPublicApplication(application)
  },

  update: async (id: string, owner: string, data: UpdateApplicationDto) => {
    if (data.company) {
      const company = await companyRepo.findById(data.company, owner)
      if (!company) throw new AppError(400, 'Invalid company')
    }
    const updated = await applicationRepo.update(id, owner, data)
    if (!updated) throw new ApplicationNotFoundError(id)
    return toPublicApplication(updated)
  },

  delete: async (id: string, owner: string) => {
    const deleted = await applicationRepo.delete(id, owner)
    if (!deleted) throw new ApplicationNotFoundError(id)
  },
}
