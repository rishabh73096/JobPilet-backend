import { Schema, model, Types, type InferSchemaType } from 'mongoose'

const companySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    website: { type: String },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
)

export type Company = InferSchemaType<typeof companySchema> & { _id: Types.ObjectId }

export const CompanyModel = model('Company', companySchema, 'companies')

export interface PublicCompany {
  id: string
  name: string
  website?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export function toPublicCompany(company: Company): PublicCompany {
  return {
    id: company._id.toString(),
    name: company.name,
    website: company.website ?? undefined,
    notes: company.notes ?? undefined,
    createdAt: company.createdAt as unknown as Date,
    updatedAt: company.updatedAt as unknown as Date,
  }
}
