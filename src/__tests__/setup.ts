import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { vi, beforeAll, afterAll, afterEach } from 'vitest'

// ─── Set test environment variables BEFORE any module imports ──────────────
process.env.NODE_ENV = 'test'
process.env.PORT = '4001'
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long-test'
process.env.JWT_EXPIRES_IN = '1h'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_tests'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder'
process.env.RESEND_API_KEY = 're_test_placeholder'
process.env.EMAIL_FROM = 'test@example.com'
process.env.GEMINI_API_KEY = 'gemini-test-key'
process.env.FRONTEND_URL = 'http://localhost:3000'
process.env.API_URL = 'http://localhost:4001'
process.env.REDIS_URL = 'redis://localhost:6379'

// ─── Global mocks for external services ────────────────────────────────────
vi.mock('@/email/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-resend-id' }, error: null }),
    },
  },
}))

vi.mock('@/monitoring/sentry', () => ({
  initSentry: vi.fn(),
  Sentry: {
    Handlers: {
      requestHandler: () => (_req: any, _res: any, next: any) => next(),
      tracingHandler: () => (_req: any, _res: any, next: any) => next(),
      errorHandler: () => (_err: any, _req: any, _res: any, next: any) => next(_err),
    },
    captureException: vi.fn(),
  },
}))

vi.mock('@/events/publishers/user.publisher', () => ({
  userPublisher: {
    signedUp: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/db/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
  },
}))

// ─── In-memory MongoDB setup ────────────────────────────────────────────────
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  process.env.MONGODB_URI = uri
  await mongoose.connect(uri)
})

afterEach(async () => {
  // Clear all collections after each test to isolate tests
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})
