jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { POST } from '@/app/api/reactions/route'

const makeRequest = (body: object) =>
  new Request('http://localhost:3000/api/reactions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockUser = { id: 'user-1' }

describe('/api/reactions POST', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(mockUser)

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }), // no existing reaction
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await POST(makeRequest({ thread_id: 't-1', reaction_type: 'like' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid reaction type', async () => {
    const res = await POST(makeRequest({ thread_id: 't-1', reaction_type: 'heart' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid reaction/i)
  })

  it('returns 400 when neither thread_id nor comment_id provided', async () => {
    const res = await POST(makeRequest({ reaction_type: 'like' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/i)
  })

  it('returns 400 when both thread_id and comment_id provided', async () => {
    const res = await POST(makeRequest({ thread_id: 't-1', comment_id: 'c-1', reaction_type: 'like' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/both/i)
  })

  it('creates new reaction when none exists', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // no existing reaction
        .mockResolvedValue({ data: { id: 'reaction-1', reaction_type: 'like' }, error: null }), // inserted
    })

    const res = await POST(makeRequest({ thread_id: 't-1', reaction_type: 'like' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reaction).toBeDefined()
  })

  it('removes reaction when toggling off (same type)', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'reaction-1', reaction_type: 'like' },
        error: null,
      }),
    })

    const res = await POST(makeRequest({ thread_id: 't-1', reaction_type: 'like' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.removed).toBe(true)
  })

  it('can react to a comment', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValue({ data: { id: 'reaction-2', reaction_type: 'like' }, error: null }),
    })

    const res = await POST(makeRequest({ comment_id: 'c-1', reaction_type: 'like' }))
    expect(res.status).toBe(200)
  })
})
