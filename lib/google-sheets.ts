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
  const startTime = Date.now()
  const memberEmail = member.email || 'unknown'
  const memberId = member.id || 'unknown'
  
  console.log('[Google Sheets] Starting append operation', {
    memberId,
    memberEmail,
    timestamp: new Date().toISOString(),
  })

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  // Check environment variables
  if (!spreadsheetId) {
    console.error('[Google Sheets] Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable', {
      memberId,
      memberEmail,
    })
    return
  }

  if (!serviceAccountEmail) {
    console.error('[Google Sheets] Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable', {
      memberId,
      memberEmail,
    })
    return
  }

  if (!privateKey) {
    console.error('[Google Sheets] Missing GOOGLE_PRIVATE_KEY environment variable', {
      memberId,
      memberEmail,
    })
    return
  }

  console.log('[Google Sheets] Environment variables configured', {
    memberId,
    memberEmail,
    spreadsheetId: spreadsheetId.substring(0, 10) + '...',
    serviceAccountEmail,
    hasPrivateKey: !!privateKey,
  })

  try {
    // Create JWT client for service account authentication
    console.log('[Google Sheets] Creating JWT client', { memberId, memberEmail })
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

    console.log('[Google Sheets] Prepared row data', {
      memberId,
      memberEmail,
      rowDataLength: rowData.length,
      rowData: rowData.map((val, idx) => ({ column: idx, value: String(val).substring(0, 50) })),
    })

    // Append the row to the sheet
    // Defaults to Sheet1, but you can configure the sheet name via env var
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1'
    
    console.log('[Google Sheets] Verifying spreadsheet access', {
      memberId,
      memberEmail,
      spreadsheetId: spreadsheetId.substring(0, 10) + '...',
      sheetName,
    })
    
    // First, verify we can access the spreadsheet
    try {
      const spreadsheetInfo = await sheets.spreadsheets.get({
        spreadsheetId,
      })
      
      console.log('[Google Sheets] Spreadsheet accessed successfully', {
        memberId,
        memberEmail,
        spreadsheetTitle: spreadsheetInfo.data.properties?.title,
        availableSheets: spreadsheetInfo.data.sheets?.map(s => s.properties?.title),
      })
      
      // Verify the sheet exists
      const sheet = spreadsheetInfo.data.sheets?.find(s => s.properties?.title === sheetName)
      if (!sheet) {
        console.error('[Google Sheets] Sheet not found', {
          memberId,
          memberEmail,
          sheetName,
          availableSheets: spreadsheetInfo.data.sheets?.map(s => s.properties?.title),
        })
        return
      }

      console.log('[Google Sheets] Sheet verified', {
        memberId,
        memberEmail,
        sheetName,
        sheetId: sheet.properties?.sheetId,
      })
    } catch (accessError: any) {
      console.error('[Google Sheets] Failed to access spreadsheet', {
        memberId,
        memberEmail,
        spreadsheetId: spreadsheetId.substring(0, 10) + '...',
        error: accessError?.message,
        errorCode: accessError?.code,
        errorDetails: accessError?.response?.data,
      })
      return
    }

    // Use the sheet name only (without range) to append to the next available row
    // This works regardless of headers and will append after the last row
    console.log('[Google Sheets] Appending row to sheet', {
      memberId,
      memberEmail,
      sheetName,
      range: sheetName,
    })

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName, // Just the sheet name - will append to next available row
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    })

    const duration = Date.now() - startTime
    console.log('[Google Sheets] Successfully appended row', {
      memberId,
      memberEmail,
      sheetName,
      updatedRange: appendResponse.data.updates?.updatedRange,
      updatedRows: appendResponse.data.updates?.updatedRows,
      updatedColumns: appendResponse.data.updates?.updatedColumns,
      updatedCells: appendResponse.data.updates?.updatedCells,
      duration: `${duration}ms`,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Google Sheets] Failed to append row', {
      memberId,
      memberEmail,
      error: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
      errorResponse: error?.response?.data,
      duration: `${duration}ms`,
    })
    // Re-throw to allow callers to handle the error
    throw error
  }
}

