import { randomUUID } from 'crypto'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '@/lib/s3'
import { env } from '@/config/env'
import { AppError } from '@/middleware/error.middleware'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME = ['application/pdf']

function requireConfigured() {
  if (!s3Client || !env.S3_BUCKET_NAME) {
    throw new AppError(503, 'File uploads are not configured on this server')
  }
}

export const uploadService = {
  uploadResume: async (
    owner: string,
    file: { buffer: Buffer; mimetype: string; size: number }
  ) => {
    requireConfigured()
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new AppError(400, 'Only PDF files are allowed')
    }
    if (file.size > MAX_SIZE) {
      throw new AppError(400, 'File must be under 5MB')
    }

    const id = randomUUID()
    await s3Client!.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: `resumes/${owner}/${id}.pdf`,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    return { id }
  },

  getResumeUrl: async (owner: string, id: string) => {
    requireConfigured()
    const key = `resumes/${owner}/${id}.pdf`

    // RESUME_CDN_URL assumes the CloudFront distribution (or bucket) it points at
    // is itself publicly readable. If you put CloudFront in front of a private
    // bucket, this needs signed CloudFront URLs/cookies instead — plain path
    // concatenation won't be enough.
    if (env.RESUME_CDN_URL) {
      return { url: `${env.RESUME_CDN_URL}/${key}` }
    }

    const url = await getSignedUrl(
      s3Client!,
      new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
      { expiresIn: 3600 }
    )
    return { url }
  },
}
