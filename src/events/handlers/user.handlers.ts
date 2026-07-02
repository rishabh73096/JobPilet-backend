import { inngest } from '@/db/inngest'
import { logger } from '@/monitoring/logger'

export const onUserSignedUp = inngest.createFunction(
  { id: 'user-signed-up', retries: 3 },
  { event: 'user/signed.up' },
  async ({ event, step }) => {
    const { userId, email, name } = event.data

    await step.run('send-welcome-email', async () => {
      // await emailService.sendWelcome({ email, name })
      logger.info({ userId }, 'Welcome email sent')
    })

    await step.run('create-free-trial', async () => {
      // await billingService.createTrial(userId)
      logger.info({ userId }, 'Free trial created')
    })

    await step.run('track-signup', async () => {
      // await analytics.track('user_signed_up', { userId, email })
      logger.info({ userId }, 'Signup tracked')
    })
  }
)
