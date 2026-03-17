import { getTrialEndDate, isOnTrial } from '@/lib/trial'

describe('getTrialEndDate', () => {
  it('returns null for null/undefined level', () => {
    expect(getTrialEndDate(null, null)).toBeNull()
    expect(getTrialEndDate(undefined, null)).toBeNull()
  })

  it('returns next Sept 1 for Full', () => {
    const result = getTrialEndDate('Full', null)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getMonth()).toBe(8) // September (0-indexed)
    expect(result!.getDate()).toBe(1)
    expect(result!.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns next Sept 1 for Associate', () => {
    const result = getTrialEndDate('Associate', null)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getMonth()).toBe(8)
  })

  it('returns date 12 months from created_at for Student', () => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const result = getTrialEndDate('Student', sixMonthsAgo.toISOString())
    expect(result).toBeInstanceOf(Date)
    expect(result!.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns null for Student with no created_at', () => {
    expect(getTrialEndDate('Student', null)).toBeNull()
    expect(getTrialEndDate('Student', undefined)).toBeNull()
  })

  it('returns null for Corporate', () => {
    expect(getTrialEndDate('Corporate', null)).toBeNull()
  })

  it('returns null for Honorary', () => {
    expect(getTrialEndDate('Honorary', null)).toBeNull()
  })
})

describe('isOnTrial', () => {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const createdAt = sixMonthsAgo.toISOString()

  it('returns false for non-approved status', () => {
    expect(isOnTrial('Full', createdAt, 'pending')).toBe(false)
    expect(isOnTrial('Full', createdAt, 'rejected')).toBe(false)
    expect(isOnTrial('Full', createdAt, null)).toBe(false)
  })

  it('returns true for approved Full member (within trial)', () => {
    expect(isOnTrial('Full', createdAt, 'approved')).toBe(true)
  })

  it('returns true for approved Student within 12 months', () => {
    expect(isOnTrial('Student', createdAt, 'approved')).toBe(true)
  })

  it('returns false for Student whose trial has expired', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    expect(isOnTrial('Student', twoYearsAgo.toISOString(), 'approved')).toBe(false)
  })

  it('returns false for Corporate (no trial)', () => {
    expect(isOnTrial('Corporate', createdAt, 'approved')).toBe(false)
  })

  it('returns false for Honorary (no trial)', () => {
    expect(isOnTrial('Honorary', createdAt, 'approved')).toBe(false)
  })
})
