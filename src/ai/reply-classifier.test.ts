import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the gemini singleton BEFORE importing reply-classifier
const mockGenerateContent = vi.fn()

vi.mock('@/ai/gemini', () => ({
  geminiModel: {
    generateContent: mockGenerateContent,
  },
}))

// Must be imported AFTER the mock is set up
const { classifyRecruiterReply } = await import('@/ai/reply-classifier')

describe('classifyRecruiterReply — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('classifies interview invitation correctly', async () => {
    mockGenerateContent.mockResolvedValueOnce({
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
    mockGenerateContent.mockResolvedValueOnce({
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
    mockGenerateContent.mockResolvedValueOnce({
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
    mockGenerateContent.mockResolvedValueOnce({
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
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API quota exceeded'))

    await expect(classifyRecruiterReply('Some text')).rejects.toThrow()
  })
})
