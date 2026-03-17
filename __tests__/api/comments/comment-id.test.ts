jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { DELETE } from '@/app/api/comments/[id]/route'

const makeRequest = () =>
  new Request('http://localhost:3000/api/comments/comment-1', {
    method: 'DELETE',
  }) as any

const memberUser = { id: 'user-1' }
const adminUser = { id: 'admin-1' }
const otherUser = { id: 'other-user' }

describe('/api/comments/[id] DELETE', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)

    let callCount = 0
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'comments' && callCount === 0) {
          callCount++
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'member' } }),
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
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'comment-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when comment does not exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 when owner deletes their own comment', async () => {
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'comment-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/deleted/i)
  })

  it('returns 403 when non-owner non-admin tries to delete', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(otherUser)

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'comments' && callCount === 0) {
        callCount++
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }) }
      }
      if (table === 'user_profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'member' } }) }
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) }
    })

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'comment-1' }) })
    expect(res.status).toBe(403)
  })

  it('allows admin to delete any comment', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(adminUser)

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'comments' && callCount === 0) {
        callCount++
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }) }
      }
      if (table === 'user_profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) }
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) }
    })

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'comment-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 400 when DB delete fails', async () => {
    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'comments' && callCount === 0) {
        callCount++
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { created_by: 'user-1' } }) }
      }
      if (table === 'user_profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'member' } }) }
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }) }
    })

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'comment-1' }) })
    expect(res.status).toBe(400)
  })
})
