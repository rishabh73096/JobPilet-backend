import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '@/app'

describe('Auth API — Integration Tests', () => {
  // ─── POST /api/auth/register ─────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('201 — creates user and returns token + user data', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.user.email).toBe('test@example.com')
      expect(res.body.data.user.password).toBeUndefined() // never exposed
    })

    it('409 — duplicate email returns conflict error', async () => {
      const payload = { name: 'User', email: 'dup@example.com', password: 'Password123!' }
      await request(app).post('/api/auth/register').send(payload)

      const res = await request(app).post('/api/auth/register').send(payload)
      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })

    it('400 — missing name returns validation error', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'noname@example.com',
        password: 'Password123!',
      })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('400 — invalid email format returns validation error', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'not-an-email',
        password: 'Password123!',
      })
      expect(res.status).toBe(400)
    })

    it('400 — short password returns validation error', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test2@example.com',
        password: '123',
      })
      expect(res.status).toBe(400)
    })
  })

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'Password123!',
      })
    })

    it('200 — valid credentials return token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Password123!',
      })
      expect(res.status).toBe(200)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.user).toBeDefined()
    })

    it('401 — wrong password returns unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'WrongPassword!',
      })
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('401 — non-existent email returns unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123!',
      })
      expect(res.status).toBe(401)
    })

    it('400 — missing email returns validation error', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'Password123!',
      })
      expect(res.status).toBe(400)
    })
  })

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    let token: string

    beforeAll(async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Me User',
        email: 'me@example.com',
        password: 'Password123!',
      })
      token = res.body.data.token
    })

    it('200 — returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.email).toBe('me@example.com')
    })

    it('401 — missing token returns unauthorized', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('401 — invalid token returns unauthorized', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
      expect(res.status).toBe(401)
    })
  })

  // ─── MFA Flow ─────────────────────────────────────────────────────────────
  describe('MFA Flow', () => {
    let token: string

    beforeAll(async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'MFA User',
        email: 'mfa@example.com',
        password: 'Password123!',
      })
      token = res.body.data.token
    })

    it('200 — POST /api/auth/mfa/setup returns secret and QR code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.secret).toBeDefined()
      expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/)
    })

    it('400 — POST /api/auth/mfa/enable with wrong code returns error', async () => {
      // Setup first
      await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${token}`)

      const res = await request(app)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '000000' }) // invalid code

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })
})
