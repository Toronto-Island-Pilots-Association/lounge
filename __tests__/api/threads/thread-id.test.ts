jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET, DELETE, PATCH } from '@/app/api/threads/[id]/route'

const makeRequest = (body: object = {}, method = 'GET') =>
  new Request('http://localhost:3000/api/threads/thread-1', {
    method,
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  }) as any

const memberUser = { id: 'user-1', profile: { role: 'member' } }
const adminUser = { id: 'admin-1', profile: { role: 'admin' } }
const otherUser = { id: 'other-user', profile: { role: 'member' } }

const mockThread = {
  id: 'thread-1',
  title: 'Test Thread',
  content: 'Content here',
  category: 'general_aviation',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
}

describe('/api/threads/[id] GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)

    let callCount = 0
    mockSupabase = {
      from: jest.fn(() => {
        callCount++
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: callCount === 1
              ? mockThread
              : { id: 'user-1', full_name: 'Jane Doe', email: 'j@example.com', profile_picture_url: null },
            error: null,
          }),
        }
      }),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 200 with thread and author', async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thread.id).toBe('thread-1')
  })

  it('returns 400 when thread DB query fails', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(400)
  })
})

describe('/api/threads/[id] DELETE', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)

    let callCount = 0
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'threads' && callCount === 0) {
          callCount++
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' }, error: null }),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }
        }
        // delete call
        return {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        }
      }),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 200 when owner deletes their own thread', async () => {
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/deleted/i)
  })

  it('returns 403 when non-owner non-admin tries to delete', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(otherUser)

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads' && callCount === 0) {
        callCount++
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }) }
      }
      if (table === 'user_profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'member' } }) }
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) }
    })

    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(403)
  })

  it('allows admin to delete any thread', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(adminUser)

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads' && callCount === 0) {
        callCount++
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }) }
      }
      if (table === 'user_profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) }
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) }
    })

    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 when thread does not exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})

describe('/api/threads/[id] PATCH', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)

    let callCount = 0
    mockSupabase = {
      from: jest.fn(() => {
        if (callCount === 0) {
          callCount++
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { ...mockThread, title: 'Updated' }, error: null }),
        }
      }),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 403 when non-owner tries to edit', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(otherUser)
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }),
    })
    const res = await PATCH(makeRequest({ title: 'New', content: 'Content' }, 'PATCH'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 400 when title is missing', async () => {
    const res = await PATCH(makeRequest({ content: 'Content' }, 'PATCH'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when content is missing', async () => {
    const res = await PATCH(makeRequest({ title: 'Title' }, 'PATCH'), { params: Promise.resolve({ id: 'thread-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated thread on valid patch', async () => {
    const res = await PATCH(
      makeRequest({ title: 'Updated Title', content: 'New content', category: 'general_aviation' }, 'PATCH'),
      { params: Promise.resolve({ id: 'thread-1' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thread).toBeDefined()
  })

  it('returns 404 when thread not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })
    const res = await PATCH(makeRequest({ title: 'T', content: 'C' }, 'PATCH'), { params: Promise.resolve({ id: 'bad' }) })
    expect(res.status).toBe(404)
  })
})
