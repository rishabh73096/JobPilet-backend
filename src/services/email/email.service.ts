import { emailRepo } from './email.repo'
import { applicationRepo } from '@/services/application/application.repo'
import { userRepo } from '@/services/user/user.repo'
import { generateApplicationEmail } from '@/ai/email-generator'
import { resend } from '@/email/resend'
import { emailQueue } from '@/jobs/email.queue'
import { interpolateTemplate } from '@/utils/template'
import { EmailNotFoundError } from './email.errors'
import { UserNotFoundError } from '@/services/user/user.errors'
import { AppError } from '@/middleware/error.middleware'
import { toPublicEmail, type EmailStatus } from '@/models/email.model'
import { UserModel } from '@/models/user.model'
import { getGmailClient } from '@/lib/google'
import { env } from '@/config/env'
import type {
  GenerateEmailDto,
  UpdateEmailDto,
  SendEmailDto,
  ScheduleEmailDto,
  BulkScheduleDto,
} from '@/validators/email.validator'

function isPopulatedCompany(company: unknown): company is { name: string } {
  return typeof company === 'object' && company !== null && 'name' in company
}

export const emailService = {
  generate: async (owner: string, data: GenerateEmailDto) => {
    const [application, user] = await Promise.all([
      applicationRepo.findById(data.applicationId, owner),
      userRepo.findById(owner),
    ])
    if (!application) throw new AppError(400, 'Invalid application')
    if (!user) throw new AppError(401, 'User not found')
    if (!isPopulatedCompany(application.company)) {
      throw new AppError(500, 'Company failed to populate')
    }

    const { subject, body } = await generateApplicationEmail({
      applicantName: user.name,
      role: application.role,
      companyName: application.company.name,
      jobDescription: application.jobDescription ?? undefined,
      tone: data.tone,
    })

    const email = await emailRepo.create({
      owner,
      application: data.applicationId,
      subject,
      body,
      tone: data.tone,
    })
    return toPublicEmail(email)
  },

  getAllForApplication: async (applicationId: string, owner: string) =>
    (await emailRepo.findAllByApplication(applicationId, owner)).map(toPublicEmail),

  getAll: async (owner: string, status?: EmailStatus) =>
    (await emailRepo.findAllByOwner(owner, status)).map(toPublicEmail),

  getStats: async (owner: string) => {
    const [counts, opened] = await Promise.all([
      emailRepo.countsByStatus(owner),
      emailRepo.countOpened(owner),
    ])
    return { ...counts, opened }
  },

  getById: async (id: string, owner: string) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)
    return toPublicEmail(email)
  },

  update: async (id: string, owner: string, data: UpdateEmailDto) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)
    if (email.status !== 'draft') {
      throw new AppError(400, `Cannot edit an email with status "${email.status}"`)
    }

    Object.assign(email, data)
    await email.save()
    return toPublicEmail(email)
  },

  // Core delivery logic — shared by the immediate "send now" endpoint and the
  // BullMQ worker processing scheduled sends.
  deliverEmail: async (id: string, owner: string) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)

    if (!email.to) {
      email.status = 'failed'
      email.errorMessage = 'No recipient email set'
      await email.save()
      throw new AppError(400, 'Recipient email is required')
    }

    const user = await UserModel.findById(owner)
    if (!user) throw new UserNotFoundError(owner)

    const application = await applicationRepo.findById(email.application.toString(), owner)
    const companyName =
      application && isPopulatedCompany(application.company) ? application.company.name : ''

    const vars = { company_name: companyName, recruiter_name: email.recruiterName ?? '' }
    const subject = interpolateTemplate(email.subject, vars)
    const bodyText = interpolateTemplate(email.body, vars)

    const trackingPixel =
      `<img src="${env.API_URL}/api/emails/track/${email.trackingId}" ` +
      `width="1" height="1" alt="" style="display:none" />`
    const htmlBody = `${bodyText.replace(/\n/g, '<br/>')}${trackingPixel}`

    try {
      if (user.googleRefreshToken) {
        // Send via Gmail API!
        const rawMessage = [
          `From: "${user.name}" <${user.googleEmail}>`,
          `To: ${email.to}`,
          `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          htmlBody,
        ].join('\r\n')

        const encodedMessage = Buffer.from(rawMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const gmail = await getGmailClient(user)
        const sendResult = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        })

        email.status = 'sent'
        email.sentAt = new Date()
        email.gmailMessageId = sendResult.data.id ?? undefined
        email.gmailThreadId = sendResult.data.threadId ?? undefined
        email.jobId = undefined
        await email.save()
      } else {
        // Fallback to Resend API
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: email.to,
          subject,
          html: htmlBody,
        })
        if (result.error) throw new Error(result.error.message)

        email.status = 'sent'
        email.sentAt = new Date()
        email.resendId = result.data?.id
        email.jobId = undefined
        await email.save()
      }

      await applicationRepo.recordEmailSent(email.application.toString(), owner)
    } catch (err) {
      console.error('[deliverEmail Error]', err)
      email.status = 'failed'
      email.errorMessage = err instanceof Error ? err.message : 'Unknown error'
      await email.save()
      throw new AppError(502, 'Failed to send email')
    }

    return toPublicEmail(email)
  },

  send: async (id: string, owner: string, data: SendEmailDto) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)
    if (email.status === 'sent') throw new AppError(400, 'Email has already been sent')
    if (email.status === 'scheduled') {
      throw new AppError(400, 'Email is already scheduled — cancel the schedule first')
    }

    if (data.to) email.to = data.to
    if (data.recruiterName !== undefined) email.recruiterName = data.recruiterName
    await email.save()

    return emailService.deliverEmail(id, owner)
  },

  schedule: async (id: string, owner: string, data: ScheduleEmailDto) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)
    if (email.status !== 'draft') {
      throw new AppError(400, `Cannot schedule an email with status "${email.status}"`)
    }

    if (data.to) email.to = data.to
    if (data.recruiterName !== undefined) email.recruiterName = data.recruiterName
    if (!email.to) throw new AppError(400, 'Recipient email is required to schedule')

    const delay = Math.max(0, data.sendAt.getTime() - Date.now())
    const job = await emailQueue.add('send', { emailId: id, owner }, { delay })

    email.status = 'scheduled'
    email.scheduledAt = data.sendAt
    email.jobId = job.id
    await email.save()

    return toPublicEmail(email)
  },

  cancelSchedule: async (id: string, owner: string) => {
    const email = await emailRepo.findById(id, owner)
    if (!email) throw new EmailNotFoundError(id)
    if (email.status !== 'scheduled') throw new AppError(400, 'Email is not scheduled')

    if (email.jobId) {
      const job = await emailQueue.getJob(email.jobId)
      if (job) await job.remove()
    }

    email.status = 'draft'
    email.scheduledAt = undefined
    email.jobId = undefined
    await email.save()

    return toPublicEmail(email)
  },

  bulkSchedule: async (owner: string, data: BulkScheduleDto) => {
    const results: { id: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < data.emailIds.length; i++) {
      const id = data.emailIds[i]
      try {
        const email = await emailRepo.findById(id, owner)
        if (!email) throw new Error('Not found')
        if (email.status !== 'draft') {
          throw new Error(`Cannot schedule an email with status "${email.status}"`)
        }
        if (!email.to) throw new Error('Recipient email is required')

        const sendAt = new Date(data.sendAt.getTime() + i * data.staggerSeconds * 1000)
        const delay = Math.max(0, sendAt.getTime() - Date.now())
        const job = await emailQueue.add('send', { emailId: id, owner }, { delay })

        email.status = 'scheduled'
        email.scheduledAt = sendAt
        email.jobId = job.id
        await email.save()

        results.push({ id, success: true })
      } catch (err) {
        results.push({
          id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return results
  },

  trackOpen: async (trackingId: string) => {
    await emailRepo.trackOpen(trackingId)
  },

  getAnalytics: async (owner: string) => {
    const [statusCounts, sendsOverTime, openRateByTone, recentApps, recentEmails] =
      await Promise.all([
        applicationRepo.countsByStatus(owner),
        emailRepo.sendsOverTime(owner),
        emailRepo.openRateByTone(owner),
        applicationRepo.findRecent(owner),
        emailRepo.findRecent(owner),
      ])

    // Format sendsOverTime to include all dates in the past 30 days even if count was 0
    const sendsMap = new Map(sendsOverTime.map((d) => [d._id, d.count]))
    const history: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      history.push({ date: dateStr, count: sendsMap.get(dateStr) || 0 })
    }

    // Format tone stats
    const tones: Record<string, { sent: number; opened: number }> = {
      formal: { sent: 0, opened: 0 },
      casual: { sent: 0, opened: 0 },
      aggressive: { sent: 0, opened: 0 },
    }
    for (const r of openRateByTone) {
      if (r._id in tones) {
        tones[r._id] = { sent: r.sent, opened: r.opened }
      }
    }

    // Build timeline activities
    const activities: { id: string; type: 'application_added' | 'email_sent' | 'email_opened'; timestamp: Date; details: string }[] = []

    for (const app of recentApps) {
      const companyName =
        app.company && typeof app.company === 'object' && 'name' in app.company
          ? (app.company as { name: string }).name
          : 'Unknown Company'
      activities.push({
        id: `app-${app._id.toString()}`,
        type: 'application_added',
        timestamp: app.createdAt as unknown as Date,
        details: `Applied for ${app.role} at ${companyName}`,
      })
    }

    for (const email of recentEmails) {
      if (email.sentAt) {
        activities.push({
          id: `sent-${email._id.toString()}`,
          type: 'email_sent',
          timestamp: email.sentAt as unknown as Date,
          details: `Sent "${email.subject}" to ${email.to || 'Unknown'}`,
        })
      }
      if (email.openedAt && email.openCount > 0) {
        activities.push({
          id: `open-${email._id.toString()}`,
          type: 'email_opened',
          timestamp: email.openedAt as unknown as Date,
          details: `Email "${email.subject}" was opened`,
        })
      }
    }

    // Sort activities by timestamp desc and take top 8
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return {
      applicationsByStatus: statusCounts,
      emailsSentOverTime: history,
      openRateByTone: tones,
      recentActivities: activities.slice(0, 8),
    }
  },
}
