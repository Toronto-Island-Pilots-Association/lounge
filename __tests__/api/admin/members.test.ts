jest.mock('@/lib/auth', () => ({
  requireAdmin: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  sendMemberApprovalEmail: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/lib/google-sheets', () => ({
  appendMemberToSheet: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/settings', () => ({
  getTrialEndDateAsync: jest.fn().mockResolvedValue(null),
  getMembershipFeeForLevel: jest.fn().mockResolvedValue(100),
}))

jest.mock('@/lib/stripe', () => ({
  isStripeEnabled: jest.fn().mockReturnValue(false),
  getStripeInstance: jest.fn(),
}))

import { GET, PATCH } from '@/app/api/admin/members/route'

const makePatchRequest = (body: object) =>
  new Request('http://localhost:3000/api/admin/members', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const mockMember = {
  id: 'member-1',
  email: 'member@example.com',
  full_name: 'Jane Doe',
  first_name: 'Jane',
  last_name: 'Doe',
  role: 'member',
  status: 'pending',
  membership_level: 'Full',
  created_at: '2026-01-01T00:00:00Z',
  stripe_subscription_id: null,
  paypal_subscription_id: null,
  membership_expires_at: null,
}

describe('/api/admin/members GET', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    const { requireAdmin } = require('@/lib/auth')

    requireAdmin.mockResolvedValue({ id: 'admin-1', profile: { role: 'admin' } })

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [mockMember], error: null }),
          }
        }
        if (table === 'payments') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {}
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 403 when non-admin tries to access', async () => {
    const { requireAdmin } = require('@/lib/auth')
    requireAdmin.mockRejectedValue(new Error('Forbidden: Admin access required'))

    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 200 with members list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.members)).toBe(true)
    expect(data.members[0]).toMatchObject({ id: 'member-1', email: 'member@example.com' })
  })

  it('attaches trial_end and expected_fee to each member', async () => {
    const { getTrialEndDateAsync, getMembershipFeeForLevel } = require('@/lib/settings')
    getTrialEndDateAsync.mockResolvedValue(new Date('2026-09-01'))
    getMembershipFeeForLevel.mockResolvedValue(150)

    const res = await GET()
    const data = await res.json()
    expect(data.members[0].trial_end).toBe('2026-09-01T00:00:00.000Z')
    expect(data.members[0].expected_fee).toBe(150)
  })

  it('attaches payment_summary for members with payments', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [mockMember], error: null }),
        }
      }
      if (table === 'payments') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [{ user_id: 'member-1', amount: 100, currency: 'CAD', payment_method: 'stripe' }],
          }),
        }
      }
      return {}
    })

    const res = await GET()
    const data = await res.json()
    expect(data.members[0].payment_summary).toMatchObject({ amount: 100, currency: 'CAD' })
  })

  it('returns 400 when user_profiles query fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
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

describe('/api/admin/members PATCH', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')
    const { requireAdmin } = require('@/lib/auth')

    requireAdmin.mockResolvedValue({ id: 'admin-1', profile: { role: 'admin' } })

    const mockUpdatedMember = { ...mockMember, status: 'approved', full_name: 'Jane Doe Updated' }

    // Track calls per table so sequential from() calls return the right data
    let profileCallCount = 0
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'user_profiles') {
          profileCallCount++
          if (profileCallCount === 1) {
            // First call: fetch current member
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockMember }),
            }
          }
          // Subsequent calls: update returns the approved member
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUpdatedMember }),
          }
        }
        if (table === 'payments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {}
      }),
    }

    createClient.mockResolvedValue(mockSupabase)
    createServiceRoleClient.mockReturnValue({
      auth: { admin: { updateUserById: jest.fn().mockResolvedValue({ error: null }) } },
    })
  })

  it('returns 403 when non-admin tries to update', async () => {
    const { requireAdmin } = require('@/lib/auth')
    requireAdmin.mockRejectedValue(new Error('Forbidden: Admin access required'))

    const res = await PATCH(makePatchRequest({ id: 'member-1', status: 'approved' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when id is missing', async () => {
    const res = await PATCH(makePatchRequest({ status: 'approved' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/id/i)
  })

  it('returns 404 when member does not exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })

    const res = await PATCH(makePatchRequest({ id: 'nonexistent', status: 'approved' }))
    expect(res.status).toBe(404)
  })

  it('returns 200 and updated member on valid patch', async () => {
    const res = await PATCH(makePatchRequest({ id: 'member-1', full_name: 'Jane Doe Updated' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.member).toBeDefined()
  })

  it('sends approval email when status changes to approved', async () => {
    const { sendMemberApprovalEmail } = require('@/lib/resend')
    const { appendMemberToSheet } = require('@/lib/google-sheets')

    const res = await PATCH(makePatchRequest({ id: 'member-1', status: 'approved' }))
    expect(res.status).toBe(200)

    // Allow async email/sheet tasks to settle
    await new Promise(r => setTimeout(r, 10))

    expect(sendMemberApprovalEmail).toHaveBeenCalledWith(
      expect.any(String), // email
      expect.anything()   // name
    )
    expect(appendMemberToSheet).toHaveBeenCalled()
  })

  it('does not send approval email when status is unchanged', async () => {
    const alreadyApproved = { ...mockMember, status: 'approved' }
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn()
            .mockResolvedValueOnce({ data: alreadyApproved })
            .mockResolvedValue({ data: alreadyApproved }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [] }) }
    })

    const { sendMemberApprovalEmail } = require('@/lib/resend')
    await PATCH(makePatchRequest({ id: 'member-1', full_name: 'Updated Name' }))

    await new Promise(r => setTimeout(r, 10))
    expect(sendMemberApprovalEmail).not.toHaveBeenCalled()
  })

  it('rejects invalid email format', async () => {
    const res = await PATCH(makePatchRequest({ id: 'member-1', email: 'not-an-email' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid email/i)
  })

  it('converts empty string membership_expires_at to null', async () => {
    let updatesArg: any = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockImplementation((u) => { updatesArg = u; return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockMember }) } }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({ data: mockMember }),
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [] }) }
    })

    await PATCH(makePatchRequest({ id: 'member-1', membership_expires_at: '' }))
    expect(updatesArg?.membership_expires_at).toBeNull()
  })
})
