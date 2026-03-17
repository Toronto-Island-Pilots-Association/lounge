jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/google-calendar', () => ({
  addEventToUserCalendar: jest.fn().mockResolvedValue(undefined),
}))

import { POST, DELETE } from '@/app/api/events/[id]/rsvp/route'

const makeRequest = (method = 'POST') =>
  new Request('http://localhost:3000/api/events/event-1/rsvp', { method }) as any

const approvedUser = { id: 'user-1', profile: { role: 'member', status: 'approved' } }
const pendingUser = { id: 'user-2', profile: { role: 'member', status: 'pending' } }
const adminUser = { id: 'admin-1', profile: { role: 'admin', status: 'approved' } }

describe('/api/events/[id]/rsvp POST', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(approvedUser)

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }),
          }
        }
        if (table === 'event_rsvps') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'user_google_calendar_tokens') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null }),
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
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 for pending members', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(pendingUser)
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/approved/i)
  })

  it('returns 404 when event does not exist', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) }
      }
      return {}
    })
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'bad-event' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 on successful RSVP', async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/successful/i)
  })

  it('returns 409 when user has already RSVPed', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }) }
      }
      if (table === 'event_rsvps') {
        return { insert: jest.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate key' } }) }
      }
      return {}
    })
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/already/i)
  })

  it('allows admin to RSVP regardless of status', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(adminUser)
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(200)
  })
})

// Helper: creates a chainable builder that resolves to `result` when awaited
const makeDeleteBuilder = (result: any) => {
  const builder: any = {
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    catch: (fn: any) => Promise.resolve(result).catch(fn),
  }
  return builder
}

describe('/api/events/[id]/rsvp DELETE', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(approvedUser)

    mockSupabase = {
      from: jest.fn(() => makeDeleteBuilder({ error: null })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful un-RSVP', async () => {
    const res = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/removed/i)
  })

  it('returns 400 when DB delete fails', async () => {
    mockSupabase.from.mockReturnValue(makeDeleteBuilder({ error: { message: 'Delete failed' } }))
    const res = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(400)
  })
})
