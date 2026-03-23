jest.mock('@/lib/resend', () => ({
  sendReplyNotificationEmail: jest.fn(),
  sendMentionNotificationEmail: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET as threadsGET } from '@/app/api/threads/route'
import { GET as threadByIdGET } from '@/app/api/threads/[id]/route'
import { GET as threadCommentsGET } from '@/app/api/threads/[id]/comments/route'

describe('Discussions org scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/threads scopes list by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: { org_id: 'org-1' },
    })

    const threadsPromise = Promise.resolve({
      data: [{ id: 't1', created_by: 'u-1', title: 'A', content: '...', category: 'other' }],
      error: null,
    })

    const threadsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: threadsPromise.then.bind(threadsPromise),
    }

    const authorsPromise = Promise.resolve({
      data: [{ user_id: 'u-1', id: 'p1', full_name: 'Alice', email: 'a@b.com', profile_picture_url: null }],
      error: null,
    })

    const authorsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: authorsPromise.then.bind(authorsPromise),
    }

    const countsPromise = Promise.resolve({
      data: [{ thread_id: 't1' }],
      error: null,
    })

    const commentsFrom = {
      from: jest.fn(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: countsPromise.then.bind(countsPromise),
    }

    let fromCall = 0
    const mockSupabase = {
      from: jest.fn((table: string) => {
        fromCall += 1
        if (table === 'threads') return threadsFrom
        if (table === 'user_profiles') return authorsFrom
        if (table === 'comments') return commentsFrom
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    createClient.mockResolvedValue(mockSupabase)

    const res = await threadsGET()
    expect(res.status).toBe(200)

    expect(threadsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(authorsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(commentsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('GET /api/threads/:id scopes thread detail by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: { org_id: 'org-1' },
    })

    const threadSinglePromise = Promise.resolve({
      data: { id: 't1', created_by: 'u-1', title: 'A', content: '...', category: 'other', org_id: 'org-1' },
      error: null,
    })

    const threadsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => threadSinglePromise),
    }

    const authorSinglePromise = Promise.resolve({
      data: { id: 'u-1', full_name: 'Alice', email: 'a@b.com', profile_picture_url: null },
      error: null,
    })

    const authorFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => authorSinglePromise),
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'threads') return threadsFrom
        if (table === 'user_profiles') return authorFrom
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    createClient.mockResolvedValue(mockSupabase)

    const request = new Request('http://example.com/api/threads/t1')
    const res = await threadByIdGET(request as any, { params: Promise.resolve({ id: 't1' }) } as any)
    expect(res.status).toBe(200)

    // eq is called for ('id', ...) and ('org_id', ...)
    expect(threadsFrom.eq.mock.calls.some((c: any[]) => c[0] === 'org_id' && c[1] === 'org-1')).toBe(true)
  })

  it('GET /api/threads/:id/comments scopes comments by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: { org_id: 'org-1' },
    })

    const commentsPromise = Promise.resolve({
      data: [{ id: 'c1', thread_id: 't1', created_by: 'u-1', content: 'hi', created_at: '2026-01-01T00:00:00.000Z', org_id: 'org-1' }],
      error: null,
    })

    const commentsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: commentsPromise.then.bind(commentsPromise),
    }

    const authorsPromise = Promise.resolve({
      data: [{ id: 'u-1', full_name: 'Alice', email: 'a@b.com', profile_picture_url: null }],
      error: null,
    })

    const authorsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: authorsPromise.then.bind(authorsPromise),
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'comments') return commentsFrom
        if (table === 'user_profiles') return authorsFrom
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    createClient.mockResolvedValue(mockSupabase)

    const request = new Request('http://example.com/api/threads/t1/comments')
    const res = await threadCommentsGET(request as any, { params: Promise.resolve({ id: 't1' }) } as any)
    expect(res.status).toBe(200)

    expect(commentsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(authorsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })
})

