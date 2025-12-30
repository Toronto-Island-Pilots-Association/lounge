import { appendMemberToSheet } from '@/lib/google-sheets'
import { google } from 'googleapis'

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn(),
    },
    sheets: jest.fn(),
  },
}))

describe('lib/google-sheets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up environment variables
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id'
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com'
    process.env.GOOGLE_PRIVATE_KEY = 'test-private-key'
    process.env.GOOGLE_SHEETS_SHEET_NAME = 'Sheet1'
  })

  afterEach(() => {
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY
    delete process.env.GOOGLE_SHEETS_SHEET_NAME
  })

  it('should prevent duplicate entries by checking existing emails before appending', async () => {
    const mockAuth = {
      email: 'test@example.com',
      key: 'test-key',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }

    const mockSheets = {
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [{ properties: { title: 'Sheet1' } }],
          },
        }),
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [['Email'], ['test@example.com']],
            },
          }),
          append: jest.fn(),
        },
      },
    }

    ;(google.auth.JWT as jest.Mock).mockImplementation(() => mockAuth)
    ;(google.sheets as jest.Mock).mockReturnValue(mockSheets)

    const member = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
    } as any

    await appendMemberToSheet(member)

    // Should check for existing email in column B
    expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
      spreadsheetId: 'test-spreadsheet-id',
      range: 'Sheet1!B:B',
    })
    // Should not append if email already exists (deduplication)
    expect(mockSheets.spreadsheets.values.append).not.toHaveBeenCalled()
  })

  it('should append new member only if email does not exist in sheet', async () => {
    const mockAuth = {
      email: 'test@example.com',
      key: 'test-key',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }

    const mockSheets = {
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [{ properties: { title: 'Sheet1' } }],
          },
        }),
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [['Email'], ['other@example.com']],
            },
          }),
          append: jest.fn().mockResolvedValue({}),
        },
      },
    }

    ;(google.auth.JWT as jest.Mock).mockImplementation(() => mockAuth)
    ;(google.sheets as jest.Mock).mockReturnValue(mockSheets)

    const member = {
      id: 'user-123',
      email: 'newuser@example.com',
      full_name: 'New User',
      first_name: 'New',
      last_name: 'User',
    } as any

    await appendMemberToSheet(member)

    // Should check for existing email
    expect(mockSheets.spreadsheets.values.get).toHaveBeenCalled()
    // Should append new member
    expect(mockSheets.spreadsheets.values.append).toHaveBeenCalled()
  })
})

