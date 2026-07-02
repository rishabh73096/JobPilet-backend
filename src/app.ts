import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import mongoSanitize from 'express-mongo-sanitize'
import { corsOptions } from './config/cors'
import { router } from './routes'
import { errorHandler } from './middleware/error.middleware'
import { logger } from './monitoring/logger'
import { initSentry, Sentry } from './monitoring/sentry'

// Must run before the app is built — no-ops if SENTRY_DSN isn't set
initSentry()

export const app = express()

// Sentry request tracking — first middleware so it wraps everything below
app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.tracingHandler())

// Security headers
app.use(helmet())

// CORS
app.use(cors(corsOptions))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Strip Mongo operators ($gt, $ne, etc.) from user input to prevent NoSQL injection
app.use(mongoSanitize())

// Compression
app.use(compression())

// Request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}))

// Health check (no auth needed)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', router)

// Sentry must see errors before our own handler formats/swallows them
app.use(Sentry.Handlers.errorHandler())

// Global error handler (must be last)
app.use(errorHandler)
