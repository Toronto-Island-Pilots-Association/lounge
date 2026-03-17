jest.mock('@/lib/auth', () => ({
  getCurrentUserIncludingPending: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET, PATCH } from '@/app/api/profile/route'

const makeRequest = (body: object) =>
  new Request('http://localhost:3000/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockUser = { id: 'user-1', email: 'user@example.com' }
const mockProfile = {
  id: 'user-1',
  email: 'user@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  phone: null,
  status: 'approved',
  role: 'member',
}

describe('/api/profile GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { getCurrentUserIncludingPending } = require('@/lib/auth')
    getCurrentUserIncludingPending.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { getCurrentUserIncludingPending } = require('@/lib/auth')
    getCurrentUserIncludingPending.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 200 with profile', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profile).toMatchObject({ id: 'user-1' })
  })

  it('returns 400 when DB query fails', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    const res = await GET()
    expect(res.status).toBe(400)
  })
})

describe('/api/profile PATCH', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { getCurrentUserIncludingPending } = require('@/lib/auth')
    getCurrentUserIncludingPending.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...mockProfile, phone: '416-555-0100' }, error: null }),
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { getCurrentUserIncludingPending } = require('@/lib/auth')
    getCurrentUserIncludingPending.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ phone: '416-555-0100' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 with updated profile', async () => {
    const res = await PATCH(makeRequest({ phone: '416-555-0100' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profile.phone).toBe('416-555-0100')
  })

  it('does not update full_name or membership_class (read-only)', async () => {
    let updatesArg: any = null
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockImplementation((u) => {
        updatesArg = u
        return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) }
      }),
    })
    await PATCH(makeRequest({ full_name: 'Hacked Name', membership_class: 'Corporate' }))
    expect(updatesArg).not.toHaveProperty('full_name')
    expect(updatesArg).not.toHaveProperty('membership_class')
  })

  it('stores interests as JSON string when array provided', async () => {
    let updatesArg: any = null
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockImplementation((u) => {
        updatesArg = u
        return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) }
      }),
    })
    await PATCH(makeRequest({ interests: ['flying', 'navigation'] }))
    expect(updatesArg.interests).toBe(JSON.stringify(['flying', 'navigation']))
  })

  it('returns 400 when DB update fails', async () => {
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
    })
    const res = await PATCH(makeRequest({ phone: '416-555-0100' }))
    expect(res.status).toBe(400)
  })

  it('converts empty string fields to null', async () => {
    let updatesArg: any = null
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockImplementation((u) => {
        updatesArg = u
        return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) }
      }),
    })
    await PATCH(makeRequest({ phone: '', city: '' }))
    expect(updatesArg.phone).toBeNull()
    expect(updatesArg.city).toBeNull()
  })
})
