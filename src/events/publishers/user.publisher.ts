import { inngest } from '@/db/inngest'

export const userPublisher = {
  signedUp: (data: { userId: string; email: string; name: string }) =>
    inngest.send({ name: 'user/signed.up', data }),

  deleted: (data: { userId: string; email: string }) =>
    inngest.send({ name: 'user/deleted', data }),

  passwordReset: (data: { userId: string; email: string; resetToken: string }) =>
    inngest.send({ name: 'user/password.reset.requested', data }),
}
