import {
  computeTrialEndFromConfig,
  getTrialConfigItemForLevel,
  normalizeMembershipLevelKey,
  type TrialConfigItem,
} from '@/lib/settings'

describe('lib/settings trial helpers', () => {
  test('computeTrialEndFromConfig returns null when config is missing', () => {
    expect(computeTrialEndFromConfig(undefined, '2026-01-01T00:00:00.000Z')).toBeNull()
  })

  test('normalizeMembershipLevelKey lowercases keys', () => {
    expect(normalizeMembershipLevelKey('Full')).toBe('full')
  })

  test('getTrialConfigItemForLevel supports case-insensitive lookup', () => {
    const config: Record<string, TrialConfigItem> = {
      full: { type: 'none' },
      student: { type: 'months', months: 12 },
    }

    expect(getTrialConfigItemForLevel(config, 'Full')).toBe(config.full)
    expect(getTrialConfigItemForLevel(config, 'student')).toBe(config.student)
  })
})

