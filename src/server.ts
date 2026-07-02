import { app } from './app'
import { env } from './config/env'
import { logger } from './monitoring/logger'
import { connectMongo, disconnectMongo } from './db/mongo'

async function start() {
  try {
    await connectMongo()

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`)
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`)
      server.close(async () => {
        await disconnectMongo()
        logger.info('Server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}

start()
