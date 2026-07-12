import { SchemaType } from '@google/generative-ai'
import { geminiModel } from './gemini'

export type RecruiterReplyClass = 'interview' | 'rejection' | 'follow_up' | 'other'

export interface ClassificationResult {
  classification: RecruiterReplyClass
  confidence: number
  summary: string
}

export async function classifyRecruiterReply(
  emailBody: string
): Promise<ClassificationResult> {
  const prompt = `You are an AI job application assistant analyzing an email response from a recruiter or hiring manager to a candidate.
  
Analyze the email content below and classify it into one of these categories:
- 'interview': The recruiter wants to schedule an interview, chat, phone call, or has sent a calendar link.
- 'rejection': The recruiter states that they are not moving forward with the candidate's application, or that the position has been filled.
- 'follow_up': The recruiter asks for more details (like a resume, portfolio, salary expectations, or availability) without explicitly rejecting or scheduling an interview yet.
- 'other': The email is an automated confirmation, out-of-office message, marketing email, or doesn't fit the above.

Email Content:
"""
${emailBody.slice(0, 5000)}
"""

Provide a single sentence summary of the email, the classification category, and your confidence score (0.0 to 1.0).`

  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          classification: { 
            type: SchemaType.STRING, 
            enum: ['interview', 'rejection', 'follow_up', 'other'] 
          },
          confidence: { type: SchemaType.NUMBER },
          summary: { type: SchemaType.STRING },
        },
        required: ['classification', 'confidence', 'summary'],
      },
    },
  })

  const text = result.response.text()
  return JSON.parse(text) as ClassificationResult
}
