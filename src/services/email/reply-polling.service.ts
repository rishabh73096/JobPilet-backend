import { UserModel } from '@/models/user.model'
import { ApplicationModel } from '@/models/application.model'
import { EmailModel } from '@/models/email.model'
import { getGmailClient } from '@/lib/google'
import { classifyRecruiterReply } from '@/ai/reply-classifier'
import { logger } from '@/monitoring/logger'

export const replyPollingService = {
  pollAllConnectedUsers: async () => {
    try {
      logger.info('[Reply Polling] Initiating polling run for connected accounts')
      const users = await UserModel.find({ googleRefreshToken: { $exists: true, $ne: null } })
      
      for (const user of users) {
        try {
          await replyPollingService.pollUserReplies(user)
        } catch (userErr) {
          logger.error({ userId: user._id, err: userErr }, '[Reply Polling] Failed for user')
        }
      }
    } catch (err) {
      logger.error({ err }, '[Reply Polling] Global run failed')
    }
  },

  pollUserReplies: async (user: any) => {
    // 1. Fetch active applications (applied or interview)
    const activeApps = await ApplicationModel.find({
      owner: user._id,
      status: { $in: ['applied', 'interviewing'] },
    })

    if (activeApps.length === 0) return

    const appIds = activeApps.map((a) => a._id)

    // 2. Find sent emails with gmailThreadId
    const sentEmails = await EmailModel.find({
      owner: user._id,
      application: { $in: appIds },
      status: 'sent',
      gmailThreadId: { $exists: true, $ne: null },
    })

    if (sentEmails.length === 0) return

    // Initialize Gmail client
    const gmail = await getGmailClient(user)

    for (const email of sentEmails) {
      try {
        const threadId = email.gmailThreadId!
        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
        })

        const messages = threadRes.data.messages || []
        if (messages.length <= 1) continue // No replies yet

        // Find incoming recruiter messages (sender != user's google email)
        const incomingMessages = messages.filter((msg) => {
          const headers = msg.payload?.headers || []
          const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || ''
          const isFromMe = fromHeader.includes(user.googleEmail)
          const isAlreadyProcessed = email.processedMessageIds.includes(msg.id!)
          return !isFromMe && !isAlreadyProcessed
        })

        for (const msg of incomingMessages) {
          // Extract message body text
          let bodyText = ''
          const parts = msg.payload?.parts || []
          
          const extractText = (partsList: any[]): string => {
            for (const p of partsList) {
              if (p.mimeType === 'text/plain' && p.body?.data) {
                return Buffer.from(p.body.data, 'base64').toString('utf8')
              }
              if (p.parts) {
                const nested = extractText(p.parts)
                if (nested) return nested
              }
            }
            return ''
          }

          if (msg.payload?.body?.data && msg.payload.mimeType === 'text/plain') {
            bodyText = Buffer.from(msg.payload.body.data, 'base64').toString('utf8')
          } else {
            bodyText = extractText(parts)
          }

          if (!bodyText) {
            // Try snippet as fallback
            bodyText = msg.snippet || ''
          }

          if (!bodyText) continue

          // Classify the recruiter message using Gemini
          logger.info(`[Reply Polling] Classifying message ${msg.id} for email ${email._id}`)
          const classificationResult = await classifyRecruiterReply(bodyText)

          logger.info(
            { emailId: email._id, msgId: msg.id, result: classificationResult },
            '[Reply Polling] Classification result received'
          )

          // Update Application status if classification matches
          const app = await ApplicationModel.findById(email.application)
          if (app) {
            let nextStatus: string | null = null
            if (classificationResult.classification === 'interview') {
              nextStatus = 'interviewing' // maps to correct APPLICATION_STATUSES enum value
            } else if (classificationResult.classification === 'rejection') {
              nextStatus = 'rejected'
            }

            if (nextStatus && app.status !== nextStatus) {
              app.status = nextStatus as any
              await app.save()
              logger.info(
                `[Reply Polling] Updated Application ${app._id} status to "${nextStatus}"`
              )
            }
          }

          // Mark message ID as processed
          email.processedMessageIds.push(msg.id!)
          await email.save()
        }
      } catch (emailErr) {
        logger.error({ emailId: email._id, err: emailErr }, '[Reply Polling] Failed for email thread')
      }
    }
  },
}
