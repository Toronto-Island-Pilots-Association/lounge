import { GET } from '@/app/api/payments/route'

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/payments GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('scopes payment history to the authenticated user and current org', async () => {
    const { requireAuth } = require('@/lib/auth')
    const { createClient } = require('@/lib/supabase/server')

    requireAuth.mockResolvedValue({
      id: 'user-1',
      profile: {
        org_id: 'org-1',
      },
    })

    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'pay-1', user_id: 'user-1', org_id: 'org-1' }],
      error: null,
    })
    const eqOrg = jest.fn(() => ({ order }))
    const eqUser = jest.fn(() => ({ eq: eqOrg }))

    createClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: eqUser,
        })),
      })),
    })

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.payments).toEqual([{ id: 'pay-1', user_id: 'user-1', org_id: 'org-1' }])
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eqOrg).toHaveBeenCalledWith('org_id', 'org-1')
    expect(order).toHaveBeenCalledWith('payment_date', { ascending: false })
  })
})
