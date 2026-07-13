import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { CompanyModel } from '@/models/company.model'
import mongoose from 'mongoose'

/**
 * Register a user and return their auth token + user id.
 * Using unique emails per test via a counter to avoid conflicts.
 */
let counter = 0
const registerUser = async (name: string) => {
  counter++
  const email = `${name.toLowerCase().replace(/\s/g, '')}-${counter}@example.com`
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'Password123!',
  })
  return { token: res.body.data?.token as string, userId: res.body.data?.user?.id as string }
}

const createCompany = async (ownerId: string, name = 'Acme Corp') => {
  const company = await CompanyModel.create({
    owner: new mongoose.Types.ObjectId(ownerId),
    name,
  })
  return company._id.toString()
}

const createApplication = async (token: string, companyId: string, role = 'Software Engineer') => {
  const res = await request(app)
    .post('/api/applications')
    .set('Authorization', `Bearer ${token}`)
    .send({ company: companyId, role, status: 'applied' })
  return res.body.data?.id as string
}

describe('Applications API — Integration Tests', () => {
  // ─── POST /api/applications ───────────────────────────────────────────────
  describe('POST /api/applications', () => {
    it('201 — creates application with required fields', async () => {
      const { token, userId } = await registerUser('App User')
      const companyId = await createCompany(userId)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: companyId,
          role: 'Software Engineer',
          jobDescription: 'Build cool stuff',
          status: 'applied',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.role).toBe('Software Engineer')
      expect(res.body.data.status).toBe('applied')
    })

    it('400 — missing role returns validation error', async () => {
      const { token, userId } = await registerUser('Validation User')
      const companyId = await createCompany(userId)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: companyId }) // role is missing

      expect(res.status).toBe(400)
    })

    it('401 — unauthenticated request rejected', async () => {
      const res = await request(app).post('/api/applications').send({
        company: new mongoose.Types.ObjectId().toString(),
        role: 'Engineer',
      })
      expect(res.status).toBe(401)
    })
  })

  // ─── GET /api/applications ────────────────────────────────────────────────
  describe('GET /api/applications', () => {
    it('200 — returns only the requesting user\'s applications', async () => {
      const { token, userId } = await registerUser('List User')
      const companyId = await createCompany(userId)
      await createApplication(token, companyId, 'Engineer')

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      res.body.data.forEach((a: any) => {
        expect(a.id).toBeDefined()
      })
    })

    it('200 — other user sees empty list (isolation)', async () => {
      const { token: ownerToken, userId } = await registerUser('Owner User')
      const { token: otherToken } = await registerUser('Other User')
      const companyId = await createCompany(userId)
      await createApplication(ownerToken, companyId, 'Engineer')

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
      const { token, userId } = await registerUser('Fetch User')
      const companyId = await createCompany(userId)
      const appId = await createApplication(token, companyId)

      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(appId)
    })

    it('404 — another user cannot access the application', async () => {
      const { token: ownerToken, userId } = await registerUser('App Owner')
      const { token: otherToken } = await registerUser('App Stranger')
      const companyId = await createCompany(userId)
      const appId = await createApplication(ownerToken, companyId)

      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ─── PATCH /api/applications/:id ──────────────────────────────────────────
  describe('PATCH /api/applications/:id', () => {
    it('200 — owner can update application status', async () => {
      const { token, userId } = await registerUser('Patch Owner')
      const companyId = await createCompany(userId)
      const appId = await createApplication(token, companyId)

      const res = await request(app)
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'interviewing' }) // correct enum value from APPLICATION_STATUSES

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('interviewing')
    })

    it('404 — other user cannot update the application', async () => {
      const { token: ownerToken, userId } = await registerUser('Patch Owner2')
      const { token: otherToken } = await registerUser('Patch Other2')
      const companyId = await createCompany(userId)
      const appId = await createApplication(ownerToken, companyId)

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
      const { token: ownerToken, userId } = await registerUser('Del Owner')
      const { token: otherToken } = await registerUser('Del Other')
      const companyId = await createCompany(userId)
      const appId = await createApplication(ownerToken, companyId)

      const res = await request(app)
        .delete(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${otherToken}`)

      expect(res.status).toBe(404)
    })

    it('200 — owner can delete their application', async () => {
      const { token, userId } = await registerUser('Del User')
      const companyId = await createCompany(userId)
      const appId = await createApplication(token, companyId)

      const res = await request(app)
        .delete(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
    })

    it('404 — deleted application is no longer found', async () => {
      const { token, userId } = await registerUser('Gone User')
      const companyId = await createCompany(userId)
      const appId = await createApplication(token, companyId)

      // Delete it
      await request(app)
        .delete(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      // Then fetch
      const res = await request(app)
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })
})
