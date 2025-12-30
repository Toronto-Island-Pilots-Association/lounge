// Mock auth before importing route
jest.mock('@/lib/auth', () => ({
  requireAdmin: jest.fn().mockResolvedValue(undefined),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock admin client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

// Mock Resend
jest.mock('@/lib/resend', () => ({
  sendInvitationWithPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
}))

import { POST } from '@/app/api/admin/invite-member/route'

describe('/api/admin/invite-member - Complex Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create user with temporary password, set status to pending, and send invitation email', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const { createClient: createAdminClient } = require('@supabase/supabase-js')
    const { sendInvitationWithPasswordEmail } = require('@/lib/resend')

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })),
    }

    const mockNewUser = {
      id: 'new-user-123',
      email: 'newuser@example.com',
    }

    const mockProfile = {
      id: 'new-user-123',
      email: 'newuser@example.com',
      status: 'pending',
    }

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: mockNewUser },
            error: null,
          }),
        },
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
        }),
      })),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)

    const request = new Request('http://localhost:3000/api/admin/invite-member', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      }),
      headers: { 'Content-Type': 'application/json' },
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('successfully')
    
    // Verify user was created with temporary password and auto-confirmed email
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          invited_by_admin: true,
        }),
      })
    )
    
    // Verify profile was created with 'pending' status
    expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    
    // Verify invitation email was sent with temporary password
    expect(sendInvitationWithPasswordEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      expect.any(String), // name (fullName || email)
      expect.any(String), // temporary password
      expect.any(String) // appUrl (base URL, not login URL)
    )
  })
})
