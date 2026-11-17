import { describe, expect, it } from 'vitest'
import { CLAY, NEW_ROCK_PLAYER, simulate } from '../assessment/personas'
import { scoreAssessment } from '../assessment/scoring'
import { buildPlan } from './generate'

const plan = (p: typeof CLAY) => buildPlan(scoreAssessment(simulate(p).answers), new Date('2026-11-17T12:00:00'))

describe('buildPlan', () => {
  it('Clay: the first block is "See the chord, hit the chord" — the plan we built by hand', () => {
    const p = plan(CLAY)
    expect(p.blocks[0].title).toBe('See the chord, hit the chord')
    expect(p.blocks.map((b) => b.focusId)).toContain('b9')
    expect(p.blocks).toHaveLength(9) // 8 blocks + finish, 6 months
    expect(p.blocks.at(-1)!.weeks[1]).toBe(26)
  })

  it('every week has four parts and Application offers 3–5 songs', () => {
    for (const persona of [CLAY, NEW_ROCK_PLAYER]) {
      const p = plan(persona)
      for (const b of p.blocks) {
        expect(b.weekParts.length).toBe(b.weeks[1] - b.weeks[0] + 1)
        for (const parts of b.weekParts) {
          expect(parts.map((x) => x.id)).toEqual(['triads', 'arps', 'concept', 'application'])
          const n = parts[3].options?.length ?? 0
          expect(n).toBeGreaterThanOrEqual(3)
          expect(n).toBeLessThanOrEqual(5)
          // Application gets about half the session.
          expect(parts[3].minutes[30]).toBe(15)
        }
      }
    }
  })

  it('a beginner starts with foundations, not advanced blocks', () => {
    const p = plan(NEW_ROCK_PLAYER)
    expect(p.blocks).toHaveLength(5) // 3 months: 4 blocks + finish
    const first = p.blocks[0].focusId
    expect(['pentatonic', 'neck', 'triads', 'sevenths', 'time', 'genreforms', 'ears']).toContain(first)
    expect(p.blocks.slice(0, 2).map((b) => b.focusId)).not.toContain('altered')
  })

  it('songs rotate week to week', () => {
    const p = plan(CLAY)
    const w1 = p.blocks[0].weekParts[0][3].options!.map((o) => o.label).join()
    const w2 = p.blocks[0].weekParts[1][3].options!.map((o) => o.label).join()
    expect(w1).not.toBe(w2)
  })
})
