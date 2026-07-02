import { companyRepo } from './company.repo'
import { CompanyNotFoundError } from './company.errors'
import { toPublicCompany } from '@/models/company.model'
import type { CreateCompanyDto, UpdateCompanyDto } from '@/validators/company.validator'

export const companyService = {
  create: async (owner: string, data: CreateCompanyDto) =>
    toPublicCompany(await companyRepo.create(owner, data)),

  getAll: async (owner: string) => (await companyRepo.findAllByOwner(owner)).map(toPublicCompany),

  getById: async (id: string, owner: string) => {
    const company = await companyRepo.findById(id, owner)
    if (!company) throw new CompanyNotFoundError(id)
    return toPublicCompany(company)
  },

  update: async (id: string, owner: string, data: UpdateCompanyDto) => {
    const updated = await companyRepo.update(id, owner, data)
    if (!updated) throw new CompanyNotFoundError(id)
    return toPublicCompany(updated)
  },

  delete: async (id: string, owner: string) => {
    const deleted = await companyRepo.delete(id, owner)
    if (!deleted) throw new CompanyNotFoundError(id)
  },
}
