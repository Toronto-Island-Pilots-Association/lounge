jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import {
  getCurrentUser,
  getCurrentUserIncludingPending,
  requireAuth,
  requireAuthIncludingPending,
  shouldRequireProfileCompletion,
  shouldRequirePayment,
  requireAdmin,
} from '@/lib/auth'
import type { UserProfile } from '@/types/database'

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile =>
  ({
    id: 'user-1',
    email: 'user@example.com',
    role: 'member',
    status: 'approved',
    membership_level: 'Full',
    first_name: 'Jane',
    last_name: 'Doe',
    street: '123 Main St',
    city: 'Toronto',
    country: 'Canada',
    province_state: 'ON',
    postal_zip_code: 'M5V 1A1',
    stripe_subscription_id: null,
    paypal_subscription_id: null,
    ...overrides,
  } as UserProfile)

// ─── getCurrentUser ────────────────────────────────────────────────────────────

describe('getCurrentUser', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns null when no auth user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when auth error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    })
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when profile fetch fails with generic error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST500', message: 'DB down' } }),
    })
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when user profile does not exist and no admin creds', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })
    expect(await getCurrentUser()).toBeNull()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('returns null for pending member (non-admin)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: makeProfile({ status: 'pending' }), error: null }),
    })
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns user with profile for approved member', async () => {
    const profile = makeProfile({ status: 'approved' })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: profile, error: null }),
    })
    const result = await getCurrentUser()
    expect(result).not.toBeNull()
    expect(result?.profile.status).toBe('approved')
  })

  it('always returns admin user regardless of status', async () => {
    const profile = makeProfile({ role: 'admin', status: 'pending' })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: profile, error: null }),
    })
    const result = await getCurrentUser()
    expect(result?.profile.role).toBe('admin')
  })
})

// ─── getCurrentUserIncludingPending ────────────────────────────────────────────

describe('getCurrentUserIncludingPending', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { createClient } = require('@/lib/supabase/server')
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(),
    }
    createClient.mockResolvedValue(mockSupabase)
  })

  it('returns null when no auth user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getCurrentUserIncludingPending()).toBeNull()
  })

  it('returns pending user with profile', async () => {
    const profile = makeProfile({ status: 'pending' })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: profile, error: null }),
    })
    const result = await getCurrentUserIncludingPending()
    expect(result?.profile.status).toBe('pending')
  })

  it('returns null when profile not found (PGRST116)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'u@example.com' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })
    expect(await getCurrentUserIncludingPending()).toBeNull()
  })
})

// ─── requireAuth / requireAuthIncludingPending ─────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws Unauthorized when getCurrentUser returns null', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })

  it('returns user when authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const profile = makeProfile()
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profile, error: null }),
      }),
    })
    const user = await requireAuth()
    expect(user.profile.role).toBe('member')
  })
})

describe('requireAuthIncludingPending', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws Unauthorized when no user', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    await expect(requireAuthIncludingPending()).rejects.toThrow('Unauthorized')
  })
})

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws Forbidden when user is not admin', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const profile = makeProfile({ role: 'member' })
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profile, error: null }),
      }),
    })
    await expect(requireAdmin()).rejects.toThrow('Forbidden: Admin access required')
  })

  it('returns user when user is admin', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const profile = makeProfile({ role: 'admin' })
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profile, error: null }),
      }),
    })
    const user = await requireAdmin()
    expect(user.profile.role).toBe('admin')
  })
})

// ─── shouldRequireProfileCompletion ───────────────────────────────────────────

describe('shouldRequireProfileCompletion', () => {
  it('returns false for admin', () => {
    expect(shouldRequireProfileCompletion(makeProfile({ role: 'admin' }))).toBe(false)
  })

  it('returns false for rejected/expired status', () => {
    expect(shouldRequireProfileCompletion(makeProfile({ status: 'rejected' as any }))).toBe(false)
    expect(shouldRequireProfileCompletion(makeProfile({ status: 'expired' as any }))).toBe(false)
  })

  it('returns true when required fields are missing', () => {
    expect(shouldRequireProfileCompletion(makeProfile({ first_name: null }))).toBe(true)
    expect(shouldRequireProfileCompletion(makeProfile({ city: null }))).toBe(true)
    expect(shouldRequireProfileCompletion(makeProfile({ street: null }))).toBe(true)
    expect(shouldRequireProfileCompletion(makeProfile({ country: null }))).toBe(true)
  })

  it('returns false when all required fields present', () => {
    expect(shouldRequireProfileCompletion(makeProfile())).toBe(false)
  })
})

// ─── shouldRequirePayment ─────────────────────────────────────────────────────

describe('shouldRequirePayment', () => {
  it('returns false for Honorary members', () => {
    expect(shouldRequirePayment(makeProfile({ membership_level: 'Honorary' }))).toBe(false)
  })

  it('returns false for rejected/expired status', () => {
    expect(shouldRequirePayment(makeProfile({ status: 'rejected' as any }))).toBe(false)
    expect(shouldRequirePayment(makeProfile({ status: 'expired' as any }))).toBe(false)
  })

  it('returns false when user has Stripe subscription', () => {
    expect(shouldRequirePayment(makeProfile({ stripe_subscription_id: 'sub_123' }))).toBe(false)
  })

  it('returns true for approved member with no subscription', () => {
    expect(shouldRequirePayment(makeProfile({ status: 'approved', stripe_subscription_id: null }))).toBe(true)
  })

  it('returns true for pending member with no subscription', () => {
    expect(shouldRequirePayment(makeProfile({ status: 'pending', stripe_subscription_id: null }))).toBe(true)
  })
})
