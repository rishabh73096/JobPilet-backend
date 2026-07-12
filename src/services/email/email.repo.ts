import { Types } from 'mongoose'
import { EmailModel, type EmailDoc, type EmailTone, type EmailStatus } from '@/models/email.model'

export const emailRepo = {
  create: (data: {
    owner: string
    application: string
    subject: string
    body: string
    tone: EmailTone
  }) => EmailModel.create(data),

  findById: (id: string, owner: string) => EmailModel.findOne({ _id: id, owner }),

  findAllByApplication: (applicationId: string, owner: string) =>
    EmailModel.find({ application: applicationId, owner })
      .sort({ createdAt: -1 })
      .lean<EmailDoc[]>(),

  findAllByOwner: (owner: string, status?: EmailStatus) =>
    EmailModel.find({ owner, ...(status ? { status } : {}) })
      .sort({ createdAt: -1 })
      .lean<EmailDoc[]>(),

  countsByStatus: async (owner: string) => {
    const results = await EmailModel.aggregate<{ _id: EmailStatus; count: number }>([
      { $match: { owner: new Types.ObjectId(owner) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const counts: Record<EmailStatus, number> = { draft: 0, scheduled: 0, sent: 0, failed: 0 }
    for (const r of results) counts[r._id] = r.count
    return counts
  },

  countOpened: (owner: string) =>
    EmailModel.countDocuments({
      owner: new Types.ObjectId(owner),
      status: 'sent',
      openCount: { $gt: 0 },
    }),

  trackOpen: async (trackingId: string) => {
    const email = await EmailModel.findOne({ trackingId })
    if (!email) return null
    email.openCount += 1
    if (!email.openedAt) email.openedAt = new Date()
    await email.save()
    return email
  },

  sendsOverTime: async (owner: string, days = 30) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return EmailModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          owner: new Types.ObjectId(owner),
          status: 'sent',
          sentAt: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
  },

  openRateByTone: async (owner: string) => {
    return EmailModel.aggregate<{
      _id: EmailTone
      sent: number
      opened: number
    }>([
      {
        $match: {
          owner: new Types.ObjectId(owner),
          status: 'sent',
        },
      },
      {
        $group: {
          _id: '$tone',
          sent: { $sum: 1 },
          opened: {
            $sum: {
              $cond: [{ $gt: ['$openCount', 0] }, 1, 0],
            },
          },
        },
      },
    ])
  },

  findRecent: (owner: string, limit = 5) =>
    EmailModel.find({ owner, status: { $ne: 'draft' } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean<EmailDoc[]>(),
}
