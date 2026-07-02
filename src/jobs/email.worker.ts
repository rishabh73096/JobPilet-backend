import { Worker, type Job } from 'bullmq'
import { queueConnection } from './connection'
import { emailService } from '@/services/email/email.service'
import { logger } from '@/monitoring/logger'
import type { EmailSendJobData } from './email.queue'

let worker: Worker<EmailSendJobData, void, 'send'> | undefined

export function startEmailWorker() {
  if (worker) return worker

  worker = new Worker<EmailSendJobData, void, 'send'>(
    'email-send',
    async (job: Job<EmailSendJobData, void, 'send'>) => {
      await emailService.deliverEmail(job.data.emailId, job.data.owner)
    },
    { connection: queueConnection, concurrency: 5 }
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, emailId: job.data.emailId }, 'Scheduled email sent')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, emailId: job?.data.emailId, err }, 'Scheduled email failed')
  })

  return worker
}
