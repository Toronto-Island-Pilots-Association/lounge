import { GET as eventsGET, POST as eventsPOST } from '@/app/api/events/route'
import { GET as eventRsvpsGET } from '@/app/api/events/[id]/rsvps/route'

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  sendEventNotificationEmail: jest.fn(),
}))

jest.mock('@/lib/org-billing-activation', () => ({
  getOrgBillingActivationStatus: jest.fn().mockResolvedValue({
    activated: true,
    requiresActivation: false,
  }),
}))

jest.mock('@/lib/settings', () => ({
  getFeatureFlags: jest.fn().mockResolvedValue({ events: true }),
}))

describe('Events org scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/events scopes by org_id for the event list + RSVP counts', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: { org_id: 'org-1' },
    })

    const eventsListPromise = Promise.resolve({
      data: [{ id: 'ev-1', start_time: '2026-01-01T00:00:00.000Z', image_url: null }],
      error: null,
    })

    const countsResultPromise = Promise.resolve({ data: [], error: null })
    const userRsvpsResultPromise = Promise.resolve({ data: [], error: null })

    const eventsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: eventsListPromise.then.bind(eventsListPromise),
    }

    const countsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: countsResultPromise.then.bind(countsResultPromise),
    }

    const userRsvpsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: userRsvpsResultPromise.then.bind(userRsvpsResultPromise),
    }

    let fromCall = 0
    const mockSupabase = {
      from: jest.fn((table: string) => {
        fromCall += 1
        if (table === 'events') return eventsFrom
        if (table === 'event_rsvps' && fromCall === 2) return countsFrom
        if (table === 'event_rsvps' && fromCall === 3) return userRsvpsFrom
        return countsFrom
      }),
      storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn() })) },
    }

    createClient.mockResolvedValue(mockSupabase)

    const res = await eventsGET()
    expect(res.status).toBe(200)

    expect(eventsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(countsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    const allEventRsvpEqCalls = [
      ...countsFrom.eq.mock.calls,
      ...userRsvpsFrom.eq.mock.calls,
    ]
    expect(allEventRsvpEqCalls).toContainEqual(['org_id', 'org-1'])
  })

  it('POST /api/events injects org_id on create', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'admin-1',
      profile: { org_id: 'org-1', role: 'admin' },
    })

    const eventsInsertResultPromise = Promise.resolve({
      data: { id: 'ev-1', org_id: 'org-1' },
      error: null,
    })

    const eventsFrom = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(eventsInsertResultPromise),
    }

    const mockSupabase = {
      from: jest.fn(() => eventsFrom),
      storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn() })) },
    }

    createClient.mockResolvedValue(mockSupabase)

    const req = new Request('http://example.com/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'My event',
        description: 'desc',
        location: 'loc',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: null,
        image_url: null,
        send_notifications: false,
      }),
    })

    const res = await eventsPOST(req as any)
    expect(res.status).toBe(200)

    const inserted = eventsFrom.insert.mock.calls[0][0]
    expect(inserted.org_id).toBe('org-1')
  })

  it('GET /api/events/:id/rsvps scopes by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: { org_id: 'org-1' },
    })

    const eventVerifyPromise = Promise.resolve({ data: { id: 'ev-1' }, error: null })
    const rsvpsPromise = Promise.resolve({
      data: [{ id: 'rsvp-1', user_id: 'u-1', created_at: '2026-01-01T00:00:00.000Z' }],
      error: null,
    })

    const profilesPromise = Promise.resolve({
      data: [{ id: 'u-1', full_name: 'Alice', first_name: null, last_name: null, email: 'a@b.com', profile_picture_url: null }],
      error: null,
    })

    const eventsVerifyFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnValue(eventVerifyPromise),
    }

    const rsvpsFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: rsvpsPromise.then.bind(rsvpsPromise),
    }

    const profilesFrom = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: profilesPromise.then.bind(profilesPromise),
    }

    let fromCall = 0
    const mockSupabase = {
      from: jest.fn((table: string) => {
        fromCall += 1
        if (table === 'events') return eventsVerifyFrom
        if (table === 'event_rsvps') return rsvpsFrom
        if (table === 'user_profiles') return profilesFrom
        return rsvpsFrom
      }),
    }

    createClient.mockResolvedValue(mockSupabase)

    const req = new Request('http://example.com/api/events/ev-1/rsvps', { method: 'GET' })
    const res = await eventRsvpsGET(req as any, { params: Promise.resolve({ id: 'ev-1' }) } as any)

    expect(res.status).toBe(200)

    expect(eventsVerifyFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(rsvpsFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
    // user_profiles no longer has org_id (moved to org_memberships); profiles are fetched by user_id
    expect(profilesFrom.in).toHaveBeenCalledWith('user_id', expect.any(Array))
  })
})
