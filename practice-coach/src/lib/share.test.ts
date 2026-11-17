import { describe, expect, it } from 'vitest'
import { buildShareText, smsLink } from './share'

describe('buildShareText', () => {
  it('matches the example format', () => {
    expect(
      buildShareText({
        minutes: 42,
        labels: ['Triads (D–G–B)', 'm7 arpeggios', 'guide tones'],
        note: 'Kid Charlemagne bar 7',
        streak: 9,
        date: '2026-11-17',
        today: '2026-11-17',
      }),
    ).toBe('Practiced 42 min today ✅ Triads (D–G–B), m7 arpeggios, guide tones, Kid Charlemagne bar 7. Streak: 9 days.')
  })
  it('says yesterday for a late-night session logged the next day', () => {
    expect(buildShareText({ minutes: 20, labels: [], streak: 1, date: '2026-11-16', today: '2026-11-17' })).toBe(
      'Practiced 20 min yesterday ✅ Streak: 1 day.',
    )
  })
  it('builds an sms link', () => {
    expect(smsLink('+1 (555) 123-4567', 'hi there')).toBe('sms:+15551234567?&body=hi%20there')
  })
})
