import { GET as resourcesGET, POST as resourcesPOST } from '@/app/api/resources/route'
import {
  GET as resourceByIdGET,
  PATCH as resourceByIdPATCH,
  DELETE as resourceByIdDELETE,
} from '@/app/api/resources/[id]/route'

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
  isOrgPublic: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/settings', () => ({
  getFeatureFlags: jest.fn().mockResolvedValue({ resources: true }),
}))

jest.mock('@/lib/org-billing-activation', () => ({
  getOrgBillingActivationStatus: jest.fn().mockResolvedValue({
    activated: true,
    requiresActivation: false,
  }),
}))

describe('Resources org scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/resources scopes by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      profile: { org_id: 'org-1' },
    })

    const listResult = Promise.resolve({
      data: [
        { id: 'res-1', title: 't', created_at: '2026-01-01T00:00:00.000Z', image_url: null, file_url: null },
      ],
      error: null,
    })

    const resourcesFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: listResult.then.bind(listResult),
    }

    const mockSupabase = {
      from: jest.fn(() => resourcesFrom),
      storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn() })) },
    }

    createClient.mockResolvedValue(mockSupabase)

    const res = await resourcesGET()
    expect(res.status).toBe(200)

    // Ensure we never return resources from other tenants.
    expect(resourcesFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('GET /api/resources/:id scopes by org_id', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      profile: { org_id: 'org-1' },
    })

    const singleResult = Promise.resolve({
      data: { id: 'res-1', title: 't', created_at: '2026-01-01T00:00:00.000Z', image_url: null, file_url: null },
      error: null,
    })

    const resourcesFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(singleResult),
    }

    const mockSupabase = {
      from: jest.fn(() => resourcesFrom),
      storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn() })) },
    }

    createClient.mockResolvedValue(mockSupabase)

    const request = new Request('http://example.com/api/resources/res-1', { method: 'GET' })
    const res = await resourceByIdGET(request as any, { params: Promise.resolve({ id: 'res-1' }) } as any)
    expect(res.status).toBe(200)

    expect(resourcesFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('POST /api/resources injects org_id and PATCH / DELETE scope by org_id', async () => {
    const { requireAdmin } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAdmin.mockResolvedValue({
      profile: { org_id: 'org-1' },
    })

    // --- POST mocks ---
    const insertResult = Promise.resolve({
      data: { id: 'res-1', title: 't', created_at: '2026-01-01T00:00:00.000Z', image_url: null, file_url: null },
      error: null,
    })

    const resourcesInsertFrom = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(insertResult),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    }

    // --- PATCH mocks ---
    const patchSingleResult = Promise.resolve({
      data: { id: 'res-1', title: 'patched', created_at: '2026-01-01T00:00:00.000Z', image_url: null, file_url: null },
      error: null,
    })

    const resourcesUpdateFrom = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(patchSingleResult),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn(),
    }

    // --- DELETE mocks ---
    const deleteThenableResult = Promise.resolve({ error: null })
    const resourcesDeleteFrom = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: deleteThenableResult.then.bind(deleteThenableResult),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    }

    let fromCall = 0
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table !== 'resources') throw new Error('unexpected table')
        fromCall += 1
        if (fromCall === 1) return resourcesInsertFrom
        if (fromCall === 2) return resourcesUpdateFrom
        if (fromCall === 3) return resourcesDeleteFrom
        throw new Error(`unexpected from('resources') call #${fromCall}`)
      }),
      storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn() })) },
    }

    createClient.mockResolvedValue(mockSupabase)

    const postRequest = new Request('http://example.com/api/resources', {
      method: 'POST',
      body: JSON.stringify({ title: 't', category: 'other', org_id: 'org-other' }),
    })

    const postRes = await resourcesPOST(postRequest as any)
    expect(postRes.status).toBe(200)

    // The route should overwrite any incoming org_id.
    expect(resourcesInsertFrom.insert).toHaveBeenCalled()
    const inserted = resourcesInsertFrom.insert.mock.calls[0][0]
    expect(inserted.org_id).toBe('org-1')

    const patchRequest = new Request('http://example.com/api/resources/res-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'patched', category: 'other', org_id: 'org-other' }),
    })

    const patchRes = await resourceByIdPATCH(patchRequest as any, {
      params: Promise.resolve({ id: 'res-1' }),
    } as any)
    expect(patchRes.status).toBe(200)

    // PATCH should enforce tenant scope on both the update and selection.
    expect(resourcesUpdateFrom.update.mock.calls[0][0]).not.toHaveProperty('org_id')
    expect(resourcesUpdateFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')

    const deleteRequest = new Request('http://example.com/api/resources/res-1', { method: 'DELETE' })

    const deleteRes = await resourceByIdDELETE(deleteRequest as any, {
      params: Promise.resolve({ id: 'res-1' }),
    } as any)
    expect(deleteRes.status).toBe(200)

    expect(resourcesDeleteFrom.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })
})
