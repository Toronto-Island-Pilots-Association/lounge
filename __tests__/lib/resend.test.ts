jest.mock('resend', () => ({ Resend: jest.fn() }))

import { generateICal } from '@/lib/resend'

describe('lib/resend generateICal', () => {
  const fixedStart = '2026-06-15T14:00:00.000Z'
  const fixedEnd = '2026-06-15T16:00:00.000Z'

  it('produces valid VCALENDAR/VEVENT with required fields', () => {
    const ical = generateICal({ title: 'Test Event', startTime: fixedStart })
    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('END:VCALENDAR')
    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('END:VEVENT')
    expect(ical).toMatch(/VERSION:2\.0/)
    expect(ical).toMatch(/SUMMARY:Test Event/)
    expect(ical).toMatch(/DTSTART:\d{8}T\d{6}Z/)
    expect(ical).toMatch(/DTEND:\d{8}T\d{6}Z/)
  })

  it('escapes special characters in SUMMARY (comma, semicolon, backslash)', () => {
    const ical = generateICal({
      title: 'Meeting, 2pm; bring docs\\notes',
      startTime: fixedStart,
    })
    expect(ical).toContain('SUMMARY:Meeting\\, 2pm\\; bring docs\\\\notes')
  })

  it('escapes newlines in description', () => {
    const ical = generateICal({
      title: 'Event',
      startTime: fixedStart,
      description: 'Line1\nLine2',
    })
    expect(ical).toContain('DESCRIPTION:Line1\\nLine2')
  })

  it('includes attendee count in description (singular)', () => {
    const ical = generateICal({
      title: 'Event',
      startTime: fixedStart,
      attendeeCount: 1,
      eventPageUrl: 'https://app.example.com/events',
    })
    expect(ical).toContain('1 person attending')
    expect(ical).toContain('See event page for details')
  })

  it('includes attendee count in description (plural)', () => {
    const ical = generateICal({
      title: 'Event',
      startTime: fixedStart,
      attendeeCount: 3,
    })
    expect(ical).toContain('3 people attending')
  })

  it('includes ATTENDEE with PARTSTAT when provided', () => {
    const ical = generateICal({
      title: 'Event',
      startTime: fixedStart,
      attendees: [
        { email: 'a@example.com', displayName: 'Alice', partstat: 'ACCEPTED' },
      ],
    })
    expect(ical).toContain('ATTENDEE')
    expect(ical).toContain('mailto:a@example.com')
    expect(ical).toContain('PARTSTAT=ACCEPTED')
    expect(ical).toContain('CN="Alice"')
  })
})
