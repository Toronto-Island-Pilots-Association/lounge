jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  sendEventNotificationEmail: jest.fn().mockResolvedValue({ success: true }),
}))

import { GET, POST } from '@/app/api/events/route'

const makePostRequest = (body: object) =>
  new Request('http://localhost:3000/api/events', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  profile: { role: 'admin', status: 'approved' },
}
const mockMemberUser = {
  id: 'member-1',
  email: 'member@example.com',
  profile: { role: 'member', status: 'approved' },
}

const mockEvent = {
  id: 'event-1',
  title: 'Annual Fly-In',
  description: 'A fun event',
  location: 'Toronto Island Airport',
  start_time: '2026-06-01T10:00:00Z',
  end_time: '2026-06-01T16:00:00Z',
  image_url: null,
  created_by: 'admin-1',
}

describe('/api/events GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')

    requireAuth.mockResolvedValue(mockMemberUser)

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockEvent], error: null }),
          }
        }
        if (table === 'event_rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [] }),
            eq: jest.fn().mockReturnThis(),
          }
        }
        return { select: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [], error: null }) }
      }),
      storage: {
        from: jest.fn(() => ({
          createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://cdn.example.com/img.jpg' }, error: null }),
        })),
      },
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 200 with events list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.events)).toBe(true)
    expect(data.events[0]).toMatchObject({ id: 'event-1', title: 'Annual Fly-In' })
  })

  it('attaches rsvp_count and user_rsvped to each event', async () => {
    // RSVP data: event-1 has 2 RSVPs, and current user RSVPed
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [mockEvent], error: null }),
        }
      }
      if (table === 'event_rsvps') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [{ event_id: 'event-1' }, { event_id: 'event-1' }] }),
          eq: jest.fn().mockReturnThis(),
        }
      }
      return { select: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const res = await GET()
    const data = await res.json()
    expect(data.events[0].rsvp_count).toBe(2)
  })

  it('returns 400 when database query fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'events') {
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

describe('/api/events POST', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')

    requireAuth.mockResolvedValue(mockAdminUser)

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockEvent, id: 'event-new' }, error: null }),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            data: [],
          }
        }
        return { select: jest.fn().mockReturnThis() }
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await POST(makePostRequest({ title: 'Event', start_time: '2026-06-01T10:00:00Z' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when a non-admin user tries to create an event', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(mockMemberUser)

    const res = await POST(makePostRequest({ title: 'Event', start_time: '2026-06-01T10:00:00Z' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when title is missing', async () => {
    const res = await POST(makePostRequest({ start_time: '2026-06-01T10:00:00Z' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/title/i)
  })

  it('returns 400 when start_time is missing', async () => {
    const res = await POST(makePostRequest({ title: 'My Event' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/start time/i)
  })

  it('creates event and returns 200 on valid admin request', async () => {
    const res = await POST(
      makePostRequest({ title: 'Annual Fly-In', start_time: '2026-06-01T10:00:00Z', send_notifications: false })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.event).toBeDefined()
    expect(data.event.id).toBe('event-new')
  })

  it('does not store signed URLs as image_url', async () => {
    let insertedData: any = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          insert: jest.fn().mockImplementation((d) => { insertedData = d; return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }) } }),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), not: jest.fn().mockReturnThis() }
    })

    await POST(
      makePostRequest({
        title: 'Event',
        start_time: '2026-06-01T10:00:00Z',
        image_url: 'https://signed.url/image.jpg',
        send_notifications: false,
      })
    )

    expect(insertedData?.image_url).toBeNull()
  })
})
