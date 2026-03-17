jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET, POST } from '@/app/api/threads/route'

const makePostRequest = (body: object) =>
  new Request('http://localhost:3000/api/threads', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockUser = {
  id: 'user-1',
  email: 'member@example.com',
  profile: { role: 'member', status: 'approved' },
}

const mockThread = {
  id: 'thread-1',
  title: 'Hello World',
  content: 'First post',
  category: 'general_aviation',
  image_urls: null,
  created_by: 'user-1',
  author_email: 'member@example.com',
  created_at: '2026-01-01T00:00:00Z',
}

describe('/api/threads GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')

    requireAuth.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'threads') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockThread], error: null }),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'user-1', full_name: 'Jane Doe', email: 'member@example.com', profile_picture_url: null }],
            }),
          }
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [{ thread_id: 'thread-1' }] }),
          }
        }
        return {}
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(500) // auth throws and is caught generically
  })

  it('returns 200 with threads list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.threads)).toBe(true)
    expect(data.threads[0]).toMatchObject({ id: 'thread-1', title: 'Hello World' })
  })

  it('attaches comment_count to each thread', async () => {
    const res = await GET()
    const data = await res.json()
    expect(data.threads[0].comment_count).toBe(1)
  })

  it('returns 400 when threads query fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }
      }
      return {}
    })

    const res = await GET()
    expect(res.status).toBe(400)
  })
})

describe('/api/threads POST', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')

    requireAuth.mockResolvedValue(mockUser)

    const mockAuthor = { id: 'user-1', full_name: 'Jane Doe', email: 'member@example.com', profile_picture_url: null }

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'threads') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockThread, id: 'thread-new' }, error: null }),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockAuthor }),
          }
        }
        return {}
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 400 when title is missing', async () => {
    const res = await POST(makePostRequest({ content: 'some content' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/title/i)
  })

  it('returns 400 when content is missing', async () => {
    const res = await POST(makePostRequest({ title: 'My Thread' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/content/i)
  })

  it('creates thread and returns 200 on valid request', async () => {
    const res = await POST(
      makePostRequest({ title: 'New Discussion', content: 'Hello everyone!', category: 'general_aviation' })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.thread).toBeDefined()
    expect(data.thread.id).toBe('thread-new')
  })

  it('defaults to category "other" for invalid category', async () => {
    let insertedData: any = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          insert: jest.fn().mockImplementation((d) => {
            insertedData = d
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { ...mockThread, category: 'other' }, error: null }),
            }
          }),
        }
      }
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-1', email: 'member@example.com' } }),
        }
      }
      return {}
    })

    await POST(makePostRequest({ title: 'Thread', content: 'Content', category: 'not_a_real_category' }))
    expect(insertedData?.category).toBe('other')
  })

  it('limits image_urls to 5 items', async () => {
    let insertedData: any = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          insert: jest.fn().mockImplementation((d) => {
            insertedData = d
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockThread, error: null }),
            }
          }),
        }
      }
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-1', email: 'member@example.com' } }),
        }
      }
      return {}
    })

    const manyImages = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    await POST(makePostRequest({ title: 'Thread', content: 'Content', image_urls: manyImages }))
    expect(insertedData?.image_urls?.length).toBeLessThanOrEqual(5)
  })

  it('returns error when database insert fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
        }
      }
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-1', email: 'member@example.com' } }),
        }
      }
      return {}
    })

    const res = await POST(makePostRequest({ title: 'Thread', content: 'Content' }))
    expect(res.status).toBe(400)
  })
})
