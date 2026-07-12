import { google } from 'googleapis'
import { env } from '@/config/env'
import { UserModel } from '@/models/user.model'

const clientId = env.GOOGLE_CLIENT_ID || 'dummy_client_id'
const clientSecret = env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret'
const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.API_URL}/api/google/callback`

export const getOAuth2Client = () => {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export const getAuthUrl = (userId: string) => {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: userId, // Pass userId as state to identify user during callback
  })
}

export const getGmailClient = async (user: any) => {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  })

  try {
    const { token } = await oauth2Client.getAccessToken()
    if (token && token !== user.googleAccessToken) {
      await UserModel.findByIdAndUpdate(user._id, { googleAccessToken: token })
    }
  } catch (err) {
    console.error('Failed to refresh Google token:', err)
  }

  return google.gmail({ version: 'v1', auth: oauth2Client })
}
