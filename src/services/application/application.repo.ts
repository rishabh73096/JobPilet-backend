import { Types } from 'mongoose'
import { ApplicationModel, type Application } from '@/models/application.model'
import type { CreateApplicationDto, UpdateApplicationDto } from '@/validators/application.validator'

type WithPopulatedCompany<T> = Omit<T, 'company'> & {
  company: Types.ObjectId | { _id: Types.ObjectId; name: string }
}

export const applicationRepo = {
  create: (owner: string, data: CreateApplicationDto) =>
    ApplicationModel.create({ ...data, owner }),

  findById: (id: string, owner: string) =>
    ApplicationModel.findOne({ _id: id, owner })
      .populate('company', 'name')
      .lean<WithPopulatedCompany<Application>>(),

  findAllByOwner: (owner: string) =>
    ApplicationModel.find({ owner })
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .lean<WithPopulatedCompany<Application>[]>(),

  update: (id: string, owner: string, data: UpdateApplicationDto) =>
    ApplicationModel.findOneAndUpdate({ _id: id, owner }, data, { new: true })
      .populate('company', 'name')
      .lean<WithPopulatedCompany<Application>>(),

  delete: (id: string, owner: string) =>
    ApplicationModel.findOneAndDelete({ _id: id, owner }),

  recordEmailSent: (id: string, owner: string) =>
    ApplicationModel.findOneAndUpdate(
      { _id: id, owner },
      { $inc: { emailsSentCount: 1 }, $set: { lastEmailSentAt: new Date() } }
    ),
}
