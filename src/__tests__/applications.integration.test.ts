import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '@/app'

const registerAndLogin = async (name: string, email: string) => {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'Password123!',
  })
  return res.body.data.token as string
}

describe('Applications API — Integration Tests', () => {
  let token: string
  let otherToken: string
  let appId: string

  beforeAll(async () => {
    token = await registerAndLogin('App User', 'appuser@example.com')
    otherToken = await registerAndLogin('Other User', 'other@example.com')
  })

  // ─── POST /api/applications ───────────────────────────────────────────────
  describe('POST /api/applications', () => {
    it('201 — creates application with required fields', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobTitle: 'Software Engineer',
          company: { name: 'Acme Corp' },
          jobDescription: 'Build cool stuff',
          status: 'applied',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.jobTitle).toBe('Software Engineer')
      expect(res.body.data.status).toBe('applied')
      appId = res.body.data.id
    })

    it('400 — missing jobTitle returns validation error', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: { name: 'Test Corp' } })

      expect(res.status).toBe(400)
    })

    it('401 — unauthenticated request rejected', async () => {
      const res = await request(app).post('/api/applications').send({
        jobTitle: 'Engineer',
      })
      expect(res.status).toBe(401)
    })
  })

  // ─── GET /api/applications ────────────────────────────────────────────────
  describe('GET /api/applications', () => {
    it('200 — returns only the requesting user\'s applications', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      // All returned apps must belong to token owner
      res.body.data.forEach((a: any) => {
        expect(a.id).toBeDefined()
      })
    })

    it('200 — other user sees empty list (isolation)', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(0)
    })
  })

  // ─── GET /api/applications/:id ────────────────────────────────────────────
  describe('GET /api/applications/:id', () => {
    it('200 — owner can fetch their own application', async () => {
      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(appId)
    })

    it('404 — another user cannot access the application', async () => {
      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ─── PATCH /api/applications/:id ──────────────────────────────────────────
  describe('PATCH /api/applications/:id', () => {
    it('200 — owner can update application status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'interview' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('interview')
    })

    it('404 — other user cannot update the application', async () => {
      const res = await request(app)
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'rejected' })

      expect(res.status).toBe(404)
    })
  })

  // ─── DELETE /api/applications/:id ────────────────────────────────────────
  describe('DELETE /api/applications/:id', () => {
    it('404 — other user cannot delete the application', async () => {
      const res = await request(app)
        .delete(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect(res.status).toBe(404)
    })

    it('200 — owner can delete their application', async () => {
      const res = await request(app)
        .delete(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
    })

    it('404 — deleted application is no longer found', async () => {
      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })
})
