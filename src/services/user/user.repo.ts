import { UserModel, type User } from '@/models/user.model'
import { escapeRegex } from '@/utils/regex'
import type { UpdateUserDto, PaginationDto } from '@/validators/user.validator'

function searchFilter(search?: string) {
  if (!search) return {}
  const pattern = new RegExp(escapeRegex(search), 'i')
  return { $or: [{ name: pattern }, { email: pattern }] }
}

export const userRepo = {
  findById: (id: string) =>
    UserModel.findById(id).lean<User>(),

  findByEmail: (email: string) =>
    UserModel.findOne({ email }).select('+password').lean<User>(),

  findAll: ({ page, limit, search }: PaginationDto) =>
    UserModel.find(searchFilter(search))
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<User[]>(),

  count: (search?: string) =>
    UserModel.countDocuments(searchFilter(search)),

  update: (id: string, data: UpdateUserDto) =>
    UserModel.findByIdAndUpdate(id, data, { new: true }).lean<User>(),

  delete: (id: string) =>
    UserModel.findByIdAndDelete(id),
}
