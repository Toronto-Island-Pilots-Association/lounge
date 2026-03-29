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
    const orgId = 'org-123'
    const { createClient } = require('@/lib/supabase/server')
    const { createClient: createAdminClient } = require('@supabase/supabase-js')
    const { sendInvitationWithPasswordEmail } = require('@/lib/resend')

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
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
      from: jest.fn((table: string) => {
        if (table === 'member_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'user_profiles') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) }
        }
        if (table === 'org_memberships') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)

    const request = new Request('http://clublounge.local:3000/api/admin/invite-member', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      }),
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
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
          org_id: orgId,
        }),
      })
    )
    
    // Verify membership rows were created
    expect(mockAdminClient.from).toHaveBeenCalledWith('user_profiles')
    expect(mockAdminClient.from).toHaveBeenCalledWith('org_memberships')
    
    // Verify invitation email was sent with temporary password
    expect(sendInvitationWithPasswordEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      expect.any(String), // name (fullName || email)
      expect.any(String), // temporary password
      expect.any(String) // appUrl (base URL, not login URL)
    )
  })
})
