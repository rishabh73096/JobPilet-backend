import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '@/config/env'

export const tokenService = {
  sign: (payload: { userId: string; role?: string; temp?: boolean }, options?: SignOptions) =>
    jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: (options?.expiresIn || env.JWT_EXPIRES_IN) as SignOptions['expiresIn'],
    }),

  verify: (token: string) =>
    jwt.verify(token, env.JWT_SECRET) as { userId: string; role?: string; temp?: boolean },
}
