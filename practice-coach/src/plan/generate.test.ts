import { describe, expect, it } from 'vitest'
import { CLAY, NEW_ROCK_PLAYER, simulate } from '../assessment/personas'
import { scoreAssessment } from '../assessment/scoring'
import { buildPlan } from './generate'

const result = (p: typeof CLAY) => scoreAssessment(simulate(p).answers)
const plan = (p: typeof CLAY, rejected: string[] = []) => buildPlan(result(p), new Date('2026-11-17T12:00:00'), rejected)

describe('vision-led buildPlan', () => {
  it('Clay: blocks are milestones toward his three signature pieces, with a why', () => {
    const p = plan(CLAY)
    expect(p.blocks).toHaveLength(9) // 8 blocks + finish, 6 months
    expect(p.blocks.at(-1)!.weeks[1]).toBe(26)
    const towards = p.blocks.map((b) => b.towards).filter(Boolean)
    expect(new Set(towards)).toEqual(new Set(['Kid Charlemagne solo', 'They Can’t Take That Away From Me', 'Amazing Grace']))
    for (const b of p.blocks) expect(b.why, b.title).toBeTruthy()
    // Each piece gets its own milestone list.
    expect(p.milestones!.map((m) => m.blocks.length)).toEqual([2, 2, 2])
  })

  it('Clay: the Kid Charlemagne block links his lesson, and "changes" leads to chord tones', () => {
    const p = plan(CLAY)
    const kid = p.blocks.find((b) => b.towards === 'Kid Charlemagne solo')!
    const goal = kid.weekParts[0][3].options![0]
    expect(goal.kind).toBe('goal')
    expect(goal.url).toBe('#/lessons/kid-charlemagne')
    const tune = p.blocks.find((b) => b.towards === 'They Can’t Take That Away From Me')!
    expect(tune.focusId).toBe('chordtones')
    // Chord-melody isn't reachable yet, so it starts with a stepping stone.
    const grace = p.blocks.filter((b) => b.towards === 'Amazing Grace').map((b) => b.focusId)
    expect(grace[0]).toBe('voicings')
  })

  it('the last block for a piece ends with a play-through milestone', () => {
    const p = plan(CLAY)
    const lastKid = [...p.blocks].reverse().find((b) => b.towards === 'Kid Charlemagne solo')!
    expect(lastKid.weekParts[2][3].focus).toMatch(/^Milestone: play “Kid Charlemagne solo”/)
    expect(lastKid.doneWhen!.join(' ')).toMatch(/start to finish/)
  })

  it('every week has four parts, each with a why, and 3–5 song choices', () => {
    for (const persona of [CLAY, NEW_ROCK_PLAYER]) {
      for (const b of plan(persona).blocks) {
        expect(b.weekParts.length).toBe(b.weeks[1] - b.weeks[0] + 1)
        for (const parts of b.weekParts) {
          expect(parts.map((x) => x.id)).toEqual(['triads', 'arps', 'concept', 'application'])
          for (const part of parts) expect(part.why, `${b.title} ${part.id}`).toBeTruthy()
          const n = parts[3].options?.length ?? 0
          expect(n).toBeGreaterThanOrEqual(3)
          expect(n).toBeLessThanOrEqual(5)
          expect(parts[3].minutes[30]).toBe(15)
        }
      }
    }
  })

  it('a beginner rock player gets their song and their wants, not jazz blocks', () => {
    const p = plan(NEW_ROCK_PLAYER)
    expect(p.blocks).toHaveLength(5) // 3 months: 4 blocks + finish
    const ids = p.blocks.map((b) => b.focusId)
    expect(ids).not.toContain('b9')
    expect(ids).not.toContain('altered')
    expect(p.blocks[0].towards).toBe("Sweet Child O' Mine")
    expect(ids.some((id) => id === 'songs' || id === 'speed' || id === 'lead')).toBe(true)
  })

  it('swapping a block keeps earlier blocks and replaces that one', () => {
    const before = plan(CLAY)
    const third = before.blocks[2].focusId!
    const after = plan(CLAY, [third])
    expect(after.blocks.slice(0, 2).map((b) => b.focusId)).toEqual(before.blocks.slice(0, 2).map((b) => b.focusId))
    expect(after.blocks.map((b) => b.focusId)).not.toContain(third)
  })
})
