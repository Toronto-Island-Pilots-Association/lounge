// Mock Supabase before importing route
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock admin client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

// Mock Google Sheets
jest.mock('@/lib/google-sheets', () => ({
  appendMemberToSheet: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/auth/change-password/route'

describe('/api/auth/change-password - Complex Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update invited user status to approved and append to Google Sheets when password is changed', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const { createClient: createAdminClient } = require('@supabase/supabase-js')
    const { appendMemberToSheet } = require('@/lib/google-sheets')

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'invited@example.com' } },
        }),
        signInWithPassword: jest.fn().mockResolvedValue({
          error: null,
        }),
        updateUser: jest.fn().mockResolvedValue({
          error: null,
        }),
      },
    }

    let queryCallCount = 0
    const mockAdminClient = {
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                user_metadata: { invited_by_admin: true },
              },
            },
          }),
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
        },
      },
      from: (() => {
        const orgMembershipsMaybeSingle = jest.fn()
          .mockResolvedValueOnce({
            data: { status: 'pending', id: 'user-123', email: 'invited@example.com', stripe_subscription_id: null },
          })
          .mockResolvedValueOnce({
            data: { status: 'approved', id: 'user-123', email: 'invited@example.com' },
          })
        return jest.fn().mockImplementation((table) => {
          if (table === 'payments') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({ data: [] }),
            }
          }
          if (table === 'org_memberships') {
            return {
              select: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: orgMembershipsMaybeSingle,
            }
          }
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
        })
      })(),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)

    const request = new Request('http://clublounge.local:3000/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      }),
      headers: { 'Content-Type': 'application/json' },
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('successfully')
    expect(data.statusUpdated).toBe(true)
    expect(mockSupabase.auth.updateUser).toHaveBeenCalled()
    
    // Verify status was updated to 'approved'
    expect(mockAdminClient.from).toHaveBeenCalledWith('org_memberships')
    
    // Verify Google Sheets append was called with approved profile
    expect(appendMemberToSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        email: 'invited@example.com',
      })
    )
  })
})
