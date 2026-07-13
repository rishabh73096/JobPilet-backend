import { describe, it, expect, vi, beforeEach } from 'vitest'
import { replyPollingService } from '@/services/email/reply-polling.service'
import { UserModel } from '@/models/user.model'
import { ApplicationModel } from '@/models/application.model'
import { EmailModel } from '@/models/email.model'
import { classifyRecruiterReply } from '@/ai/reply-classifier'

// Mock Gmail API and classifier
vi.mock('@/lib/google', () => ({
  getGmailClient: vi.fn(),
}))

vi.mock('@/ai/reply-classifier', () => ({
  classifyRecruiterReply: vi.fn(),
}))

const buildUser = async (extra = {}) => {
  return await UserModel.create({
    name: 'Poll User',
    email: `poll-${Date.now()}@example.com`,
    password: 'hashedpassword',
    googleRefreshToken: 'mock-refresh-token',
    googleEmail: 'polluser@gmail.com',
    ...extra,
  })
}

const buildApplication = async (userId: string, status = 'applied') => {
  return await ApplicationModel.create({
    owner: userId,
    jobTitle: 'Engineer',
    company: { name: 'ACME' },
    status,
  })
}

const buildEmail = async (userId: string, appId: string, threadId?: string) => {
  return await EmailModel.create({
    owner: userId,
    application: appId,
    to: 'recruiter@company.com',
    subject: 'Hello',
    body: 'Cold email',
    status: 'sent',
    gmailThreadId: threadId || 'thread-123',
    processedMessageIds: [],
  })
}

describe('replyPollingService — Unit Tests', () => {
  const mockGetGmailClient = async () => {
    const { getGmailClient } = await import('@/lib/google')
    return getGmailClient as ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips users with no connected Google account', async () => {
    await UserModel.create({
      name: 'No Google',
      email: 'nogoogle@example.com',
      password: 'hash',
    })

    const { getGmailClient } = await import('@/lib/google')
    await replyPollingService.pollAllConnectedUsers()
    expect(getGmailClient).not.toHaveBeenCalled()
  })

  it('skips polling when user has no active applications', async () => {
    const user = await buildUser()
    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({ users: { threads: { get: vi.fn() } } } as any)

    await replyPollingService.pollUserReplies(user)
    expect(getGmailClient).not.toHaveBeenCalled()
  })

  it('skips polling when sent emails have no gmailThreadId', async () => {
    const user = await buildUser()
    const app = await buildApplication(user._id.toString())

    await EmailModel.create({
      owner: user._id,
      application: app._id,
      to: 'r@c.com',
      subject: 'Hi',
      body: 'Body',
      status: 'sent',
      processedMessageIds: [],
      // No gmailThreadId!
    })

    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({ users: { threads: { get: vi.fn() } } } as any)

    await replyPollingService.pollUserReplies(user)
    expect(getGmailClient).not.toHaveBeenCalled()
  })

  it('updates application status to "interview" on interview classification', async () => {
    const user = await buildUser()
    const app = await buildApplication(user._id.toString())
    const email = await buildEmail(user._id.toString(), app._id.toString(), 'thread-xyz')

    const mockThreadGet = vi.fn().mockResolvedValue({
      data: {
        messages: [
          {
            id: 'sent-msg-1',
            payload: { headers: [{ name: 'From', value: 'polluser@gmail.com' }] },
            snippet: 'I sent this',
          },
          {
            id: 'recruiter-msg-1',
            payload: {
              headers: [{ name: 'From', value: 'recruiter@company.com' }],
              mimeType: 'text/plain',
              body: { data: Buffer.from('We would like to invite you for an interview!').toString('base64') },
            },
            snippet: 'We would like to invite you for an interview!',
          },
        ],
      },
    })

    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({
      users: { threads: { get: mockThreadGet } },
    } as any)

    vi.mocked(classifyRecruiterReply).mockResolvedValue({
      classification: 'interview',
      summary: 'Interview invitation',
      confidence: 0.95,
    })

    await replyPollingService.pollUserReplies(user)

    const updatedApp = await ApplicationModel.findById(app._id)
    expect(updatedApp?.status).toBe('interview')

    const updatedEmail = await EmailModel.findById(email._id)
    expect(updatedEmail?.processedMessageIds).toContain('recruiter-msg-1')
  })

  it('updates application status to "rejected" on rejection classification', async () => {
    const user = await buildUser()
    const app = await buildApplication(user._id.toString())
    await buildEmail(user._id.toString(), app._id.toString(), 'thread-reject')

    const mockThreadGet = vi.fn().mockResolvedValue({
      data: {
        messages: [
          {
            id: 'recruiter-reject-1',
            payload: {
              headers: [{ name: 'From', value: 'recruiter@company.com' }],
              mimeType: 'text/plain',
              body: { data: Buffer.from('We have decided to move forward with other candidates').toString('base64') },
            },
            snippet: 'We have decided to move forward with other candidates',
          },
        ],
      },
    })

    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({
      users: { threads: { get: mockThreadGet } },
    } as any)

    vi.mocked(classifyRecruiterReply).mockResolvedValue({
      classification: 'rejection',
      summary: 'Rejected',
      confidence: 0.93,
    })

    await replyPollingService.pollUserReplies(user)

    const updatedApp = await ApplicationModel.findById(app._id)
    expect(updatedApp?.status).toBe('rejected')
  })

  it('does NOT update status for follow_up classification', async () => {
    const user = await buildUser()
    const app = await buildApplication(user._id.toString())
    await buildEmail(user._id.toString(), app._id.toString(), 'thread-followup')

    const mockThreadGet = vi.fn().mockResolvedValue({
      data: {
        messages: [
          {
            id: 'recruiter-followup-1',
            payload: {
              headers: [{ name: 'From', value: 'recruiter@company.com' }],
              mimeType: 'text/plain',
              body: { data: Buffer.from('Could you please send us your portfolio?').toString('base64') },
            },
            snippet: 'Could you please send us your portfolio?',
          },
        ],
      },
    })

    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({
      users: { threads: { get: mockThreadGet } },
    } as any)

    vi.mocked(classifyRecruiterReply).mockResolvedValue({
      classification: 'follow_up',
      summary: 'Requesting portfolio',
      confidence: 0.85,
    })

    await replyPollingService.pollUserReplies(user)

    const updatedApp = await ApplicationModel.findById(app._id)
    expect(updatedApp?.status).toBe('applied') // unchanged
  })

  it('skips already processed message IDs', async () => {
    const user = await buildUser()
    const app = await buildApplication(user._id.toString())

    await EmailModel.create({
      owner: user._id,
      application: app._id,
      to: 'r@c.com',
      subject: 'Hi',
      body: 'Body',
      status: 'sent',
      gmailThreadId: 'thread-processed',
      processedMessageIds: ['already-processed-1'], // already processed!
    })

    const mockThreadGet = vi.fn().mockResolvedValue({
      data: {
        messages: [
          {
            id: 'already-processed-1',
            payload: { headers: [{ name: 'From', value: 'recruiter@c.com' }] },
            snippet: 'This was already processed',
          },
        ],
      },
    })

    const { getGmailClient } = await import('@/lib/google')
    vi.mocked(getGmailClient).mockResolvedValue({
      users: { threads: { get: mockThreadGet } },
    } as any)

    await replyPollingService.pollUserReplies(user)

    expect(classifyRecruiterReply).not.toHaveBeenCalled()
  })
})
