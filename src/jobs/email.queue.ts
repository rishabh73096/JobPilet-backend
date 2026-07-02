import { Queue } from 'bullmq'
import { queueConnection } from './connection'

export interface EmailSendJobData {
  emailId: string
  owner: string
}

export const emailQueue = new Queue<EmailSendJobData, void, 'send'>('email-send', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 },
    removeOnFail: { age: 60 * 60 * 24 * 30 },
  },
})
