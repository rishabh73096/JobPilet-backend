import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
)

export type User = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId }
export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>

export const UserModel = model('User', userSchema, 'users')

export interface PublicUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar ?? undefined,
    role: user.role,
    createdAt: user.createdAt as unknown as Date,
    updatedAt: user.updatedAt as unknown as Date,
  }
}
