jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  resend: null, // Default: resend not configured, Supabase path used
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/auth/forgot-password/route'

const makeRequest = (body: object) =>
  new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

describe('/api/auth/forgot-password', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')

    mockSupabase = {
      auth: {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      },
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/i)
  })

  it('returns 400 when email is not a string', async () => {
    const res = await POST(makeRequest({ email: 123 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is blank/whitespace', async () => {
    const res = await POST(makeRequest({ email: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with generic message for valid email (Supabase path)', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/check your inbox/i)
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('reset-password') })
    )
  })

  it('normalizes email to lowercase before sending', async () => {
    await POST(makeRequest({ email: 'USER@EXAMPLE.COM' }))
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.anything()
    )
  })

  it('returns 200 even when Supabase resetPasswordForEmail errors (no user found)', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'User not found' },
    })

    const res = await POST(makeRequest({ email: 'nobody@example.com' }))
    // Must not reveal whether user exists
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/check your inbox/i)
  })

  it('returns 200 with Resend path when resend is configured', async () => {
    // Override the resend mock with a truthy resend instance
    const resendModule = require('@/lib/resend')
    resendModule.resend = { emails: { send: jest.fn() } }

    const { createServiceRoleClient } = require('@/lib/supabase/server')
    const mockAdminClient = {
      auth: {
        admin: {
          generateLink: jest.fn().mockResolvedValue({
            data: { properties: { action_link: 'https://supabase.co/reset?token=abc' } },
            error: null,
          }),
        },
      },
    }
    createServiceRoleClient.mockReturnValue(mockAdminClient)

    const { sendPasswordResetEmail } = require('@/lib/resend')

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(String)
    )

    // Restore
    resendModule.resend = null
  })
})
