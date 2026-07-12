import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    resumeKey: { type: String },
    resumeName: { type: String },
    mfaSecret: { type: String, select: false },
    mfaEnabled: { type: Boolean, default: false },
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String },
    googleEmail: { type: String },
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
  resumeKey?: string
  resumeName?: string
  googleEmail?: string
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
    resumeKey: user.resumeKey ?? undefined,
    resumeName: user.resumeName ?? undefined,
    googleEmail: user.googleEmail ?? undefined,
    createdAt: user.createdAt as unknown as Date,
    updatedAt: user.updatedAt as unknown as Date,
  }
}
