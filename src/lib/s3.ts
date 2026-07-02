import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@/config/env'

// Falls back to null when no region is configured (feature stays off until AWS is
// set up) — when configured without static keys, the SDK's default credential chain
// picks up the EC2 instance's IAM role automatically.
export const s3Client = env.AWS_REGION
  ? new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    })
  : null
