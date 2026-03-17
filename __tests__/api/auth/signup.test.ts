// Mocks must come before imports
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendNewMemberNotificationToAdmins: jest.fn().mockResolvedValue({ success: true }),
}))

import { POST } from '@/app/api/auth/signup/route'

const makeRequest = (body: object) =>
  new Request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const minimalBody = {
  email: 'new@example.com',
  password: 'password123',
  firstName: 'Jane',
  lastName: 'Doe',
  membershipClass: 'Full',
}

describe('/api/auth/signup', () => {
  let mockSupabase: any
  let mockAdminClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { createClient: createAdminClient } = require('@supabase/supabase-js')

    const mockProfile = {
      id: 'user-abc',
      email: 'new@example.com',
      full_name: 'Jane Doe',
      first_name: 'Jane',
      last_name: 'Doe',
      status: 'pending',
      role: 'member',
      membership_level: 'Full',
    }

    mockAdminClient = {
      auth: {
        admin: {
          updateUserById: jest.fn().mockResolvedValue({
            data: { user: { email_confirmed_at: new Date().toISOString() } },
            error: null,
          }),
        },
      },
      from: jest.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        // admin email query
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          data: [{ email: 'admin@example.com' }],
        }
      }),
    }

    mockSupabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-abc', email: 'new@example.com' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        data: [],
      })),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'pass123' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/i)
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/i)
  })

  it('returns 400 when Supabase auth.signUp fails', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })

    const res = await POST(makeRequest(minimalBody))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Email already registered')
  })

  it('returns 200 with user and success message on valid signup', async () => {
    const res = await POST(makeRequest(minimalBody))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toBeDefined()
    expect(data.message).toMatch(/successful/i)
  })

  it('normalizes email to lowercase', async () => {
    await POST(makeRequest({ ...minimalBody, email: 'NEW@EXAMPLE.COM' }))
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com' })
    )
  })

  it('defaults membershipClass to Full when not provided', async () => {
    const { email, password, firstName, lastName } = minimalBody
    await POST(makeRequest({ email, password, firstName, lastName }))
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ membership_level: 'Full' }),
        }),
      })
    )
  })

  it('maps membershipClass "student" to membership_level "Student"', async () => {
    await POST(makeRequest({ ...minimalBody, membershipClass: 'student' }))
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ membership_level: 'Student' }),
        }),
      })
    )
  })

  it('sends a welcome email after successful signup', async () => {
    const { sendWelcomeEmail } = require('@/lib/resend')
    await POST(makeRequest(minimalBody))
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      'new@example.com',
      expect.any(String)
    )
  })

  it('returns 200 even if welcome email fails', async () => {
    const { sendWelcomeEmail } = require('@/lib/resend')
    sendWelcomeEmail.mockRejectedValue(new Error('Email service down'))

    const res = await POST(makeRequest(minimalBody))
    expect(res.status).toBe(200)
  })
})
