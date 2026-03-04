jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET } from '@/app/api/members/search/route'

describe('/api/members/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(undefined)
  })

  it('returns empty members when q is missing', async () => {
    const req = new Request('http://localhost:3000/api/members/search')
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toEqual({ members: [] })
  })

  it('returns empty members when q is blank after trim', async () => {
    const req = new Request('http://localhost:3000/api/members/search?q=   ')
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toEqual({ members: [] })
  })

  it('returns shaped members and dedupes by id', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { id: 'u1', full_name: 'Alice', email: 'alice@example.com', profile_picture_url: null },
            { id: 'u1', full_name: 'Alice', email: 'alice@example.com', profile_picture_url: null },
            { id: 'u2', full_name: null, email: 'bob@example.com', profile_picture_url: 'https://pic.url/bob.jpg' },
          ],
          error: null,
        }),
      })),
    })

    const req = new Request('http://localhost:3000/api/members/search?q=alice')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.members).toHaveLength(2)
    expect(data.members[0]).toEqual({ id: 'u1', name: 'Alice', profile_picture_url: null })
    expect(data.members[1]).toEqual({ id: 'u2', name: 'bob', profile_picture_url: 'https://pic.url/bob.jpg' })
  })

  it('returns 400 when Supabase returns error', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      })),
    })

    const req = new Request('http://localhost:3000/api/members/search?q=x')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('DB error')
  })
})
