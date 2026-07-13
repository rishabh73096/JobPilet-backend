import { describe, it, expect, vi } from 'vitest'
import type { Response, NextFunction } from 'express'
import { authenticate, type AuthRequest } from '@/middleware/auth.middleware'
import { tokenService } from '@/services/auth/token.service'

// Helper to build mock req/res/next
const mockReqRes = (token?: string) => {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as AuthRequest

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('authenticate middleware — Unit Tests', () => {
  const validToken = tokenService.sign({ userId: 'abc123', role: 'user' })

  it('calls next() with valid Bearer token', () => {
    const { req, res, next } = mockReqRes(validToken)
    authenticate(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.userId).toBe('abc123')
    expect(req.userRole).toBe('user')
  })

  it('returns 401 when Authorization header is missing', () => {
    const { req, res, next } = mockReqRes()
    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
  })

  it('returns 401 for invalid token signature', () => {
    const { req, res, next } = mockReqRes('bad.token.string')
    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('does not attach user info when token is missing', () => {
    const { req, res, next } = mockReqRes()
    authenticate(req, res, next)

    expect(req.userId).toBeUndefined()
    expect(req.userRole).toBeUndefined()
  })

  it('correctly attaches userId and userRole from token payload', () => {
    const adminToken = tokenService.sign({ userId: 'admin-id', role: 'admin' })
    const { req, res, next } = mockReqRes(adminToken)
    authenticate(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe('admin-id')
    expect(req.userRole).toBe('admin')
  })
})
