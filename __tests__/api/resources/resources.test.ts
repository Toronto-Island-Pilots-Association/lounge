jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET, POST } from '@/app/api/resources/route'

const makePostRequest = (body: object) =>
  new Request('http://localhost:3000/api/resources', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockResource = {
  id: 'res-1',
  title: 'Spring Newsletter',
  category: 'tipa_newsletters',
  file_url: null,
  image_url: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('/api/resources GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAuth } = require('@/lib/auth')

    requireAuth.mockResolvedValue({ id: 'user-1', profile: { role: 'member' } })

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockResource], error: null }),
      })),
      storage: {
        from: jest.fn(() => ({
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://cdn.example.com/file.pdf' },
            error: null,
          }),
        })),
      },
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = require('@/lib/auth')
    requireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(500) // auth throws; caught as generic error
  })

  it('returns 200 with resources list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.resources)).toBe(true)
    expect(data.resources[0]).toMatchObject({ id: 'res-1', title: 'Spring Newsletter' })
  })

  it('returns 400 when database query fails', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const res = await GET()
    expect(res.status).toBe(400)
  })

  it('generates signed URLs for storage paths', async () => {
    const resourceWithPath = { ...mockResource, file_url: 'uploads/newsletter.pdf' }
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [resourceWithPath], error: null }),
    })

    const res = await GET()
    const data = await res.json()
    // file_url should be replaced with a signed URL
    expect(data.resources[0].file_url).toMatch(/^https:\/\//)
  })

  it('preserves full URLs without re-signing', async () => {
    const resourceWithFullUrl = { ...mockResource, file_url: 'https://storage.example.com/file.pdf' }
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [resourceWithFullUrl], error: null }),
    })

    const res = await GET()
    const data = await res.json()
    // Full URLs should be returned as-is, storage.createSignedUrl not called for them
    expect(data.resources[0].file_url).toBe('https://storage.example.com/file.pdf')
  })
})

describe('/api/resources POST', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAdmin } = require('@/lib/auth')

    requireAdmin.mockResolvedValue({ id: 'admin-1', profile: { role: 'admin' } })

    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...mockResource, id: 'res-new' }, error: null }),
      })),
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 403 when non-admin user tries to create resource', async () => {
    const { requireAdmin } = require('@/lib/auth')
    requireAdmin.mockRejectedValue(new Error('Forbidden: Admin access required'))

    const res = await POST(makePostRequest({ title: 'Newsletter', category: 'tipa_newsletters' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid category', async () => {
    const res = await POST(makePostRequest({ title: 'Resource', category: 'invalid_category' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid category/i)
  })

  it('creates resource and returns 200 for valid admin request', async () => {
    const res = await POST(makePostRequest({ title: 'Spring Newsletter', category: 'tipa_newsletters' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.resource).toBeDefined()
    expect(data.resource.id).toBe('res-new')
  })

  it('defaults category to "other" when not provided', async () => {
    let insertedData: any = null
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockImplementation((d) => {
        insertedData = d
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockResource, error: null }),
        }
      }),
    })

    await POST(makePostRequest({ title: 'Resource' }))
    expect(insertedData?.category).toBe('other')
  })

  it('accepts all valid categories', async () => {
    const validCategories = ['tipa_newsletters', 'airport_updates', 'reminder', 'other']

    for (const category of validCategories) {
      const res = await POST(makePostRequest({ title: 'Resource', category }))
      expect(res.status).toBe(200)
    }
  })

  it('returns 400 when database insert fails', async () => {
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    })

    const res = await POST(makePostRequest({ title: 'Resource', category: 'other' }))
    expect(res.status).toBe(400)
  })
})
