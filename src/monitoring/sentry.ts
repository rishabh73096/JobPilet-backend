import * as Sentry from '@sentry/node'
import { env } from '@/config/env'

export function initSentry() {
  if (!env.SENTRY_DSN || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') return
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}

export { Sentry }
