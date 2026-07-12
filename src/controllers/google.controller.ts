import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '@/middleware/auth.middleware'
import { getAuthUrl, getOAuth2Client } from '@/lib/google'
import { UserModel } from '@/models/user.model'
import { google } from 'googleapis'
import { env } from '@/config/env'

export const googleController = {
  getAuthUrl: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const url = getAuthUrl(req.userId!)
      res.json({ success: true, data: { url } })
    } catch (err) { next(err) }
  },

  callback: async (req: any, res: Response, next: NextFunction) => {
    try {
      const { code, state: userId } = req.query
      if (!code || !userId) {
        return res.redirect(`${env.FRONTEND_URL}/dashboard/settings?error=missing_code_or_user`)
      }

      const oauth2Client = getOAuth2Client()
      const { tokens } = await oauth2Client.getToken(code as string)
      oauth2Client.setCredentials(tokens)

      // Fetch user email using oauth2 client
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      const googleEmail = userInfo.data.email

      if (!googleEmail) {
        return res.redirect(`${env.FRONTEND_URL}/dashboard/settings?error=email_not_retrieved`)
      }

      // Update user database
      await UserModel.findByIdAndUpdate(userId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleEmail,
      })

      // Redirect user back to frontend settings page
      res.redirect(`${env.FRONTEND_URL}/dashboard/settings?google_connected=true`)
    } catch (err) {
      console.error('[Google OAuth Callback Error]', err)
      res.redirect(`${env.FRONTEND_URL}/dashboard/settings?error=oauth_failed`)
    }
  },

  disconnect: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await UserModel.findByIdAndUpdate(req.userId!, {
        $unset: {
          googleAccessToken: '',
          googleRefreshToken: '',
          googleEmail: '',
        }
      })
      res.json({ success: true, message: 'Google account disconnected successfully' })
    } catch (err) { next(err) }
  }
}
