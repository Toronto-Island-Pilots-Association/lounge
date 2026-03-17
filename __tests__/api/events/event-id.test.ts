jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { PATCH, DELETE } from '@/app/api/events/[id]/route'

const makeRequest = (body: object, method = 'PATCH') =>
  new Request('http://localhost:3000/api/events/event-1', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const adminUser = { id: 'admin-1', profile: { role: 'admin' } }
const memberUser = { id: 'member-1', profile: { role: 'member' } }

describe('/api/events/[id] PATCH', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(adminUser)

    mockSupabase = {
      from: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'event-1', title: 'Updated Event' },
          error: null,
        }),
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await PATCH(makeRequest({ title: 'Test' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)
    const res = await PATCH(makeRequest({ title: 'Test' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 200 and updated event on valid patch', async () => {
    const res = await PATCH(makeRequest({ title: 'Updated' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.event).toBeDefined()
  })

  it('strips signed URLs from image_url and fetches storage path', async () => {
    let updateArg: any = null
    let fetchCallMade = false
    mockSupabase.from.mockImplementation((table: string) => {
      return {
        update: jest.fn().mockImplementation((u) => { updateArg = u; return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }) } }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          fetchCallMade = true
          return Promise.resolve({ data: { image_url: 'uploads/events/image.jpg' }, error: null })
        }),
      }
    })

    await PATCH(
      makeRequest({ title: 'Event', image_url: 'https://signed.cdn.url/image.jpg' }),
      { params: Promise.resolve({ id: 'event-1' }) }
    )

    expect(updateArg?.image_url).toBe('uploads/events/image.jpg')
  })

  it('sets image_url to null when passed empty string', async () => {
    let updateArg: any = null
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockImplementation((u) => { updateArg = u; return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }) } }),
    })

    await PATCH(makeRequest({ title: 'Event', image_url: '' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(updateArg?.image_url).toBeNull()
  })

  it('preserves storage path when image_url is a path (not a URL)', async () => {
    let updateArg: any = null
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockImplementation((u) => { updateArg = u; return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }) } }),
    })

    await PATCH(makeRequest({ title: 'Event', image_url: 'events/new-image.jpg' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(updateArg?.image_url).toBe('events/new-image.jpg')
  })

  it('returns 400 when DB update fails', async () => {
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
    })
    const res = await PATCH(makeRequest({ title: 'Event' }), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(400)
  })
})

describe('/api/events/[id] DELETE', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(adminUser)

    mockSupabase = {
      from: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockResolvedValue(memberUser)
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 200 on successful delete', async () => {
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/deleted/i)
  })

  it('returns 400 when DB delete fails', async () => {
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    })
    const res = await DELETE(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'event-1' }) })
    expect(res.status).toBe(400)
  })
})
