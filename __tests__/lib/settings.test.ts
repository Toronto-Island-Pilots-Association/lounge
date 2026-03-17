jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import {
  getMembershipFeeForLevel,
  getAllMembershipFees,
  setMembershipFeeForLevel,
  getTrialEndDateAsync,
  getTrialEndDate,
  getMembershipExpiresAtFromSubscription,
} from '@/lib/settings'

function makeMockSupabase(settingsRows: { key: string; value: string }[] = []) {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: settingsRows }),
      single: jest.fn().mockResolvedValue({
        data: settingsRows[0] ?? null,
        error: settingsRows.length === 0 ? { message: 'no rows' } : null,
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  }
}

describe('getMembershipFeeForLevel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns default fee when no setting in DB', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    expect(await getMembershipFeeForLevel('Full')).toBe(45)
    expect(await getMembershipFeeForLevel('Student')).toBe(25)
    expect(await getMembershipFeeForLevel('Corporate')).toBe(125)
    expect(await getMembershipFeeForLevel('Honorary')).toBe(0)
  })

  it('returns custom fee from DB setting', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(
      makeMockSupabase([{ key: 'membership_fee_full', value: '75' }])
    )
    expect(await getMembershipFeeForLevel('Full')).toBe(75)
  })

  it('falls back to default if DB value is NaN', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(
      makeMockSupabase([{ key: 'membership_fee_full', value: 'abc' }])
    )
    expect(await getMembershipFeeForLevel('Full')).toBe(45)
  })
})

describe('getAllMembershipFees', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns defaults when no DB settings', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    const fees = await getAllMembershipFees()
    expect(fees.Full).toBe(45)
    expect(fees.Student).toBe(25)
    expect(fees.Honorary).toBe(0)
  })

  it('merges custom fees with defaults', async () => {
    const { createClient } = require('@/lib/supabase/server')
    // getSetting calls createClient() once per level; return '100' only for 'membership_fee_full'
    createClient.mockImplementation(async () => ({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((_col: string, key: string) => ({
          single: jest.fn().mockResolvedValue(
            key === 'membership_fee_full'
              ? { data: { value: '100' }, error: null }
              : { data: null, error: { message: 'not found' } }
          ),
        })),
      })),
    }))
    const fees = await getAllMembershipFees()
    expect(fees.Full).toBe(100)
    expect(fees.Student).toBe(25) // still default
  })
})

describe('setMembershipFeeForLevel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upserts the fee into settings table', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const upsertMock = jest.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValue({
      from: jest.fn(() => ({ upsert: upsertMock })),
    })
    await setMembershipFeeForLevel('Full', 80)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'membership_fee_full', value: '80' }),
      { onConflict: 'key' }
    )
  })

  it('throws if upsert fails', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue({
      from: jest.fn(() => ({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      })),
    })
    await expect(setMembershipFeeForLevel('Full', 80)).rejects.toThrow('Failed to save fee')
  })
})

describe('getTrialEndDateAsync', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null for Corporate (no trial)', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    const result = await getTrialEndDateAsync('Corporate', '2026-01-01')
    expect(result).toBeNull()
  })

  it('returns null for Honorary (no trial)', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    const result = await getTrialEndDateAsync('Honorary', null)
    expect(result).toBeNull()
  })

  it('returns next Sept 1 for Full member', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    const result = await getTrialEndDateAsync('Full', '2026-01-01')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getMonth()).toBe(8) // September (0-indexed)
    expect(result!.getDate()).toBe(1)
  })

  it('returns date 12 months from created_at for Student', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(makeMockSupabase([]))
    const createdAt = '2025-06-01T00:00:00Z'
    const result = await getTrialEndDateAsync('Student', createdAt)
    expect(result).toBeInstanceOf(Date)
    // Should be ~12 months later
    const expected = new Date(createdAt)
    expected.setMonth(expected.getMonth() + 12)
    expect(result!.getFullYear()).toBe(expected.getFullYear())
    expect(result!.getMonth()).toBe(expected.getMonth())
  })

  it('uses admin-configured trial type from DB', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(
      makeMockSupabase([{ key: 'trial_type_full', value: 'none' }])
    )
    const result = await getTrialEndDateAsync('Full', '2026-01-01')
    expect(result).toBeNull()
  })
})

describe('getTrialEndDate (sync)', () => {
  it('returns next Sept 1 for Full', () => {
    const result = getTrialEndDate('Full', null)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getMonth()).toBe(8)
  })

  it('returns next Sept 1 for Associate', () => {
    const result = getTrialEndDate('Associate', null)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getMonth()).toBe(8)
  })

  it('returns null for Corporate', () => {
    expect(getTrialEndDate('Corporate', null)).toBeNull()
  })

  it('returns 12 months for Student', () => {
    const created = new Date()
    created.setMonth(created.getMonth() - 6)
    const result = getTrialEndDate('Student', created.toISOString())
    expect(result).toBeInstanceOf(Date)
    expect(result!.getTime()).toBeGreaterThan(Date.now())
  })
})

describe('getMembershipExpiresAtFromSubscription', () => {
  it('returns Sept 1 next year when subscription started before Sept 1', () => {
    const start = new Date('2026-03-01') // before Sept 1 2026
    const end = new Date('2027-03-01')
    const result = getMembershipExpiresAtFromSubscription(end, start)
    expect(result).toBe(new Date(2027, 8, 1).toISOString())
  })

  it('returns Stripe period end when subscription started after Sept 1', () => {
    const start = new Date('2026-10-01') // after Sept 1 2026
    const end = new Date('2027-10-01')
    const result = getMembershipExpiresAtFromSubscription(end, start)
    expect(result).toBe(end.toISOString())
  })
})
