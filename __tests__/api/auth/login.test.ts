// Mock Supabase before importing route
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock admin client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { POST } from '@/app/api/auth/login/route'

const makeRequest = (body: object) =>
  new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

describe('/api/auth/login', () => {
  let mockSupabase: any
  let mockAdminClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { createClient: createAdminClient } = require('@supabase/supabase-js')

    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(),
      },
    }
    mockAdminClient = {
      auth: {
        admin: {
          getUserById: jest.fn(),
        },
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
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

  it('returns 401 when Supabase auth fails', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const res = await POST(makeRequest({ email: 'user@example.com', password: 'wrong' }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Invalid login credentials')
  })

  it('returns 200 with user on successful login (non-invited user)', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' }
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: {} } },
    })

    const res = await POST(makeRequest({ email: 'user@example.com', password: 'pass123' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toMatchObject({ id: 'user-123' })
    expect(data.requiresPasswordChange).toBe(false)
  })

  it('returns requiresPasswordChange: true for pending invited user', async () => {
    const mockUser = { id: 'user-123', email: 'invited@example.com' }
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: { invited_by_admin: true } } },
    })
    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { status: 'pending' } }),
    }
    mockAdminClient.from.mockReturnValue(mockFrom)

    const res = await POST(makeRequest({ email: 'invited@example.com', password: 'temppass' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.requiresPasswordChange).toBe(true)
  })

  it('returns requiresPasswordChange: false for approved invited user', async () => {
    const mockUser = { id: 'user-123', email: 'invited@example.com' }
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: { invited_by_admin: true } } },
    })
    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { status: 'approved' } }),
    }
    mockAdminClient.from.mockReturnValue(mockFrom)

    const res = await POST(makeRequest({ email: 'invited@example.com', password: 'newpass' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.requiresPasswordChange).toBe(false)
  })

  it('still returns 200 if admin metadata check throws', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' }
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockAdminClient.auth.admin.getUserById.mockRejectedValue(new Error('Service unavailable'))

    const res = await POST(makeRequest({ email: 'user@example.com', password: 'pass123' }))
    // Should not fail the login
    expect(res.status).toBe(200)
  })
})
