import { logger } from './monitoring/logger'
import { connectMongo, disconnectMongo } from './db/mongo'
import { startEmailWorker } from './jobs/email.worker'
import { replyPollingService } from './services/email/reply-polling.service'

async function start() {
  try {
    await connectMongo()

    const emailWorker = startEmailWorker()
    logger.info('Email worker started')

    // Run reply polling immediately on startup
    replyPollingService.pollAllConnectedUsers().catch((err) => {
      logger.error({ err }, 'Initial reply polling run failed')
    })

    // Setup periodic polling interval (every 5 minutes)
    const pollingInterval = setInterval(() => {
      replyPollingService.pollAllConnectedUsers().catch((err) => {
        logger.error({ err }, 'Periodic reply polling run failed')
      })
    }, 5 * 60 * 1000)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`)
      clearInterval(pollingInterval)
      await emailWorker.close()
      await disconnectMongo()
      logger.info('Worker closed')
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

  } catch (error) {
    logger.error({ err: error }, 'Failed to start worker')
    process.exit(1)
  }
}

start()
