import { SchemaType } from '@google/generative-ai'
import { geminiModel } from './gemini'

export type EmailTone = 'formal' | 'casual' | 'aggressive'

interface GenerateEmailParams {
  applicantName: string
  role: string
  companyName: string
  jobDescription?: string
  tone: EmailTone
}

const TONE_INSTRUCTIONS: Record<EmailTone, string> = {
  formal: 'Professional and formal — traditional cold-email etiquette, respectful and measured.',
  casual: 'Friendly and conversational, like messaging a peer, while staying professional.',
  aggressive: 'Confident and direct, emphasizing urgency and standout value without being rude.',
}

export async function generateApplicationEmail(
  params: GenerateEmailParams
): Promise<{ subject: string; body: string }> {
  const { applicantName, role, companyName, jobDescription, tone } = params

  const prompt = `You are writing a cold outreach email from a job applicant to a hiring manager.

Applicant name: ${applicantName}
Role applying for: ${role}
Company: ${companyName}
Tone: ${TONE_INSTRUCTIONS[tone]}
${jobDescription ? `Job description:\n${jobDescription.slice(0, 4000)}` : ''}

Write a short, personalized cold email (under 150 words) referencing specific details
from the job description where possible. Sign off with the applicant's name. Return
only the email content, no commentary.`

  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          subject: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
        },
        required: ['subject', 'body'],
      },
    },
  })

  const text = result.response.text()
  return JSON.parse(text) as { subject: string; body: string }
}
