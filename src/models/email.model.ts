import { randomUUID } from 'crypto'
import { Schema, model, Types, type InferSchemaType } from 'mongoose'

export const EMAIL_TONES = ['formal', 'casual', 'aggressive'] as const
export type EmailTone = (typeof EMAIL_TONES)[number]

export const EMAIL_STATUSES = ['draft', 'scheduled', 'sent', 'failed'] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]

const emailSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    to: { type: String, trim: true, lowercase: true },
    recruiterName: { type: String, trim: true, maxlength: 100 },
    subject: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
    tone: { type: String, enum: EMAIL_TONES, default: 'formal' },
    status: { type: String, enum: EMAIL_STATUSES, default: 'draft', index: true },
    trackingId: { type: String, required: true, unique: true, default: () => randomUUID() },
    openedAt: { type: Date },
    openCount: { type: Number, default: 0 },
    scheduledAt: { type: Date },
    jobId: { type: String },
    sentAt: { type: Date },
    resendId: { type: String },
    gmailMessageId: { type: String },
    gmailThreadId: { type: String },
    processedMessageIds: { type: [String], default: [] },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

export type EmailDoc = InferSchemaType<typeof emailSchema> & { _id: Types.ObjectId }

export const EmailModel = model('Email', emailSchema, 'emails')

export interface PublicEmail {
  id: string
  application: string
  to?: string
  recruiterName?: string
  subject: string
  body: string
  tone: EmailTone
  status: EmailStatus
  openedAt?: Date
  openCount: number
  scheduledAt?: Date
  sentAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export function toPublicEmail(email: EmailDoc): PublicEmail {
  return {
    id: email._id.toString(),
    application: email.application.toString(),
    to: email.to ?? undefined,
    recruiterName: email.recruiterName ?? undefined,
    subject: email.subject,
    body: email.body,
    tone: email.tone as EmailTone,
    status: email.status as EmailStatus,
    openedAt: email.openedAt as unknown as Date | undefined,
    openCount: email.openCount,
    scheduledAt: email.scheduledAt as unknown as Date | undefined,
    sentAt: email.sentAt as unknown as Date | undefined,
    errorMessage: email.errorMessage ?? undefined,
    createdAt: email.createdAt as unknown as Date,
    updatedAt: email.updatedAt as unknown as Date,
  }
}
