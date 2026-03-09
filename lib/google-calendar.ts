import { google } from 'googleapis'
import { decryptCalendarToken } from './calendar-crypto'

export interface CalendarEventInput {
  title: string
  description?: string | null
  location?: string | null
  start_time: string // ISO
  end_time?: string | null // ISO
  event_page_url?: string
}

/**
 * Add an event to the user's primary Google Calendar using their stored OAuth refresh token.
 * Requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (same as Supabase Google provider),
 * and GOOGLE_CALENDAR_ENCRYPTION_KEY for decrypting the stored token.
 */
export async function addEventToUserCalendar(
  refreshTokenEncrypted: string,
  event: CalendarEventInput
): Promise<{ success: boolean; error?: string }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const encryptionKey = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY

  if (!clientId || !clientSecret || !encryptionKey) {
    return { success: false, error: 'Google Calendar not configured' }
  }

  let refreshToken: string
  try {
    refreshToken = decryptCalendarToken(refreshTokenEncrypted, encryptionKey)
  } catch (err) {
    console.error('Failed to decrypt calendar token:', err)
    return { success: false, error: 'Invalid token' }
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const start = new Date(event.start_time)
    const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 60 * 60 * 1000) // default 1 hour

    const body: Record<string, unknown> = {
      summary: event.title,
      description: event.description
        ? (event.event_page_url
            ? `${event.description}\n\nEvent page: ${event.event_page_url}`
            : event.description)
        : event.event_page_url
          ? `Event page: ${event.event_page_url}`
          : undefined,
      location: event.location || undefined,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'America/Toronto',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'America/Toronto',
      },
    }

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: body,
    })

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Google Calendar insert failed:', message)
    return { success: false, error: message }
  }
}
