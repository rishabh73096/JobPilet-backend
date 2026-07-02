import mongoose from 'mongoose'
import { env } from '@/config/env'
import { logger } from '@/monitoring/logger'

mongoose.connection.on('connected', () => logger.info('MongoDB connected'))
mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err))

export async function connectMongo() {
  await mongoose.connect(env.MONGODB_URI)
}

export async function disconnectMongo() {
  await mongoose.disconnect()
}
