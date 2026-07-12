import { Schema, model, Types, type InferSchemaType } from 'mongoose'

export const APPLICATION_STATUSES = ['applied', 'interviewing', 'offer', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

const applicationSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    role: { type: String, required: true, trim: true, maxlength: 100 },
    jobUrl: { type: String },
    jobDescription: { type: String, maxlength: 10000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied', index: true },
    appliedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 2000 },
    emailsSentCount: { type: Number, default: 0 },
    lastEmailSentAt: { type: Date },
    resumeKey: { type: String },
    resumeName: { type: String },
  },
  { timestamps: true }
)

export type Application = InferSchemaType<typeof applicationSchema> & { _id: Types.ObjectId }

export const ApplicationModel = model('Application', applicationSchema, 'applications')

export interface PublicApplication {
  id: string
  company: { id: string; name: string }
  role: string
  jobUrl?: string
  jobDescription?: string
  status: ApplicationStatus
  appliedAt: Date
  notes?: string
  emailsSentCount: number
  lastEmailSentAt?: Date
  resumeKey?: string
  resumeName?: string
  createdAt: Date
  updatedAt: Date
}

type PopulatedCompany = { _id: Types.ObjectId; name: string }

export function toPublicApplication(
  app: Omit<Application, 'company'> & { company: Types.ObjectId | PopulatedCompany }
): PublicApplication {
  const company = app.company as PopulatedCompany
  return {
    id: app._id.toString(),
    company: { id: company._id.toString(), name: company.name },
    role: app.role,
    jobUrl: app.jobUrl ?? undefined,
    jobDescription: app.jobDescription ?? undefined,
    status: app.status as ApplicationStatus,
    appliedAt: app.appliedAt as unknown as Date,
    notes: app.notes ?? undefined,
    emailsSentCount: app.emailsSentCount,
    lastEmailSentAt: app.lastEmailSentAt as unknown as Date | undefined,
    resumeKey: app.resumeKey ?? undefined,
    resumeName: app.resumeName ?? undefined,
    createdAt: app.createdAt as unknown as Date,
    updatedAt: app.updatedAt as unknown as Date,
  }
}
