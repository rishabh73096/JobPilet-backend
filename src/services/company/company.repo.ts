import { CompanyModel, type Company } from '@/models/company.model'
import type { CreateCompanyDto, UpdateCompanyDto } from '@/validators/company.validator'

export const companyRepo = {
  create: (owner: string, data: CreateCompanyDto) =>
    CompanyModel.create({ ...data, owner }),

  findById: (id: string, owner: string) =>
    CompanyModel.findOne({ _id: id, owner }).lean<Company>(),

  findAllByOwner: (owner: string) =>
    CompanyModel.find({ owner }).sort({ createdAt: -1 }).lean<Company[]>(),

  update: (id: string, owner: string, data: UpdateCompanyDto) =>
    CompanyModel.findOneAndUpdate({ _id: id, owner }, data, { new: true }).lean<Company>(),

  delete: (id: string, owner: string) =>
    CompanyModel.findOneAndDelete({ _id: id, owner }),
}
