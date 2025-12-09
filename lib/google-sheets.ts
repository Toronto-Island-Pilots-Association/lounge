import { google } from 'googleapis'
import type { UserProfile } from '@/types/database'

/**
 * Appends a new member to a Google Sheet
 * 
 * Requires environment variables:
 * - GOOGLE_SHEETS_SPREADSHEET_ID: The ID of the Google Sheet
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_PRIVATE_KEY: Service account private key (with \n for newlines)
 * 
 * The service account email must have edit access to the Google Sheet
 */
export async function appendMemberToSheet(member: UserProfile): Promise<void> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
      console.error('Missing Google Sheets configuration. Skipping sheet append.')
      return
    }

    // Create JWT client for service account authentication
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Prepare the row data
    // Adjust the order and fields based on your Google Sheet columns
    const rowData = [
      member.created_at ? new Date(member.created_at).toLocaleString() : new Date().toLocaleString(),
      member.email || '',
      member.full_name || member.first_name && member.last_name 
        ? `${member.first_name} ${member.last_name}`.trim() 
        : member.first_name || member.last_name || '',
      member.first_name || '',
      member.last_name || '',
      member.phone || '',
      member.pilot_license_type || '',
      member.aircraft_type || '',
      member.call_sign || '',
      member.how_often_fly_from_ytz || '',
      member.how_did_you_hear || '',
      member.membership_level || 'basic',
      member.role || 'member',
      member.membership_expires_at 
        ? new Date(member.membership_expires_at).toLocaleString() 
        : '',
    ]

    // Append the row to the sheet
    // Defaults to Sheet1, but you can configure the sheet name via env var
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`, // Start from column A, will auto-detect columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    })

    console.log(`Successfully appended member ${member.email} to Google Sheet`)
  } catch (error) {
    // Log error but don't throw - we don't want to break the signup flow
    console.error('Error appending member to Google Sheet:', error)
    // Optionally, you could send this to an error tracking service
  }
}

