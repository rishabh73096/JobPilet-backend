import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyRecruiterReply } from '@/ai/reply-classifier'

// Mock Gemini API
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn(),
      }),
    })),
    SchemaType: {
      OBJECT: 'object',
      STRING: 'string',
      NUMBER: 'number',
    },
  }
})

const getMockModel = async () => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const instance = new GoogleGenerativeAI('test-key')
  return instance.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

describe('classifyRecruiterReply — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('classifies interview invitation correctly', async () => {
    const model = await getMockModel()
    ;(model.generateContent as any).mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            classification: 'interview',
            summary: 'Recruiter invited you for a technical interview next week',
            confidence: 0.97,
          }),
      },
    })

    const result = await classifyRecruiterReply(
      'Hi! We reviewed your application and would love to schedule a technical interview for next Tuesday.'
    )

    expect(result.classification).toBe('interview')
    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.summary).toBeDefined()
  })

  it('classifies rejection correctly', async () => {
    const model = await getMockModel()
    ;(model.generateContent as any).mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            classification: 'rejection',
            summary: 'Thank you for applying but we have moved forward with other candidates',
            confidence: 0.95,
          }),
      },
    })

    const result = await classifyRecruiterReply(
      'Thank you for your interest. After careful consideration we have decided to move forward with other candidates.'
    )

    expect(result.classification).toBe('rejection')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('classifies follow-up correctly', async () => {
    const model = await getMockModel()
    ;(model.generateContent as any).mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            classification: 'follow_up',
            summary: 'Recruiter asking for additional information',
            confidence: 0.88,
          }),
      },
    })

    const result = await classifyRecruiterReply(
      'Could you please send us your portfolio and any relevant project links?'
    )

    expect(result.classification).toBe('follow_up')
  })

  it('returns valid schema shape for all classifications', async () => {
    const model = await getMockModel()
    ;(model.generateContent as any).mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            classification: 'other',
            summary: 'Generic acknowledgement',
            confidence: 0.6,
          }),
      },
    })

    const result = await classifyRecruiterReply('Got your application, will be in touch.')

    expect(result).toHaveProperty('classification')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('confidence')
    expect(['interview', 'rejection', 'follow_up', 'other']).toContain(result.classification)
    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('throws on Gemini API error', async () => {
    const model = await getMockModel()
    ;(model.generateContent as any).mockRejectedValueOnce(new Error('Gemini API quota exceeded'))

    await expect(classifyRecruiterReply('Some text')).rejects.toThrow()
  })
})
