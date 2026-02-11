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
        },
      },
      from: jest.fn((table) => {
        const queryBuilder = {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }
        
        if (table === 'payments') {
          // Payments query: select('id').eq().limit(1)
          queryBuilder.limit.mockResolvedValue({
            data: [], // No payments
          })
        } else if (table === 'user_profiles') {
          queryCallCount++
          // First call chain: select('*').eq().single() - get current profile (status: pending)
          // Second call chain: update().eq().select().single() - get updated profile (status: approved)
          queryBuilder.single.mockImplementation(() => {
            if (queryCallCount === 1) {
              // First query: get current profile
              return Promise.resolve({
                data: { status: 'pending', id: 'user-123', email: 'invited@example.com', full_name: 'Test User' },
              })
            } else {
              // Second query: get updated profile after update
              return Promise.resolve({
                data: { status: 'approved', id: 'user-123', email: 'invited@example.com', full_name: 'Test User' },
              })
            }
          })
        }
        
        return queryBuilder
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)

    const request = new Request('http://localhost:3000/api/auth/change-password', {
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
    expect(mockAdminClient.from).toHaveBeenCalledWith('user_profiles')
    
    // Verify Google Sheets append was called with approved profile
    expect(appendMemberToSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        email: 'invited@example.com',
      })
    )
  })
})
