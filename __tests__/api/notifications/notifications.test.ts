jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET, PATCH } from '@/app/api/notifications/route'

const makeRequest = (body: object, params = '') =>
  new Request(`http://localhost:3000/api/notifications${params}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const makeGetRequest = (params = '') =>
  new Request(`http://localhost:3000/api/notifications${params}`) as any

const mockUser = { id: 'user-1' }

const mockNotification = {
  id: 'notif-1',
  type: 'reply',
  thread_id: 'thread-1',
  comment_id: 'comment-1',
  actor_id: 'actor-1',
  read_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('/api/notifications GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'notifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockNotification], error: null }),
            count: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'threads') {
          return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [{ id: 'thread-1', title: 'Test Thread' }] }) }
        }
        if (table === 'user_profiles') {
          return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [{ id: 'actor-1', full_name: 'Actor User', profile_picture_url: null }] }) }
        }
        return {}
      }),
    }

    // Mock the unread count query separately (uses head: true)
    const originalFrom = mockSupabase.from.bind(mockSupabase)
    let unreadCountCalled = false
    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'notifications' && unreadCountCalled) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          count: 5,
        }
      }
      const result = originalFrom(table)
      if (table === 'notifications') unreadCountCalled = true
      return result
    })

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
  })

  it('returns 200 with notifications and unread count', async () => {
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.notifications).toBeDefined()
    expect(typeof data.unreadCount).toBe('number')
  })

  it('returns empty array when no notifications', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {}
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.notifications).toEqual([])
  })
})

describe('/api/notifications PATCH', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [{ id: 'notif-1' }], error: null }),
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 400 when neither ids nor thread_id provided', async () => {
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('marks notifications read by ids', async () => {
    const res = await PATCH(makeRequest({ ids: ['notif-1', 'notif-2'] }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.marked).toBeDefined()
  })

  it('marks notifications read by thread_id', async () => {
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: 'notif-1' }], error: null }),
    })
    const res = await PATCH(makeRequest({ thread_id: 'thread-1' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.marked).toBe(1)
  })

  it('returns 400 on DB error when marking by ids', async () => {
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    const res = await PATCH(makeRequest({ ids: ['notif-1'] }))
    expect(res.status).toBe(400)
  })
})
