jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { POST } from '@/app/api/auth/logout/route'

describe('/api/auth/logout', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')

    mockSupabase = {
      auth: {
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns 200 with success message', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/logged out/i)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('returns 500 when signOut throws', async () => {
    mockSupabase.auth.signOut.mockRejectedValue(new Error('Network error'))

    const res = await POST()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })
})
