import { describe, expect, it } from 'vitest'
import { FIXTURE_RESULT } from '../ai/fixture'
import { planFromModules } from './fromModules'
import { normalize } from '../store/store'

describe('planFromModules', () => {
  const plan = planFromModules(FIXTURE_RESULT, FIXTURE_RESULT.modules, new Date('2026-11-19T12:00:00'))

  it('one block per module, weeks add up, every week has four parts with a why', () => {
    expect(plan.blocks).toHaveLength(4)
    expect(plan.blocks.map((b) => b.weeks)).toEqual([
      [1, 2],
      [3, 5],
      [6, 7],
      [8, 8],
    ])
    for (const b of plan.blocks) {
      expect(b.weekParts).toHaveLength(b.weeks[1] - b.weeks[0] + 1)
      for (const parts of b.weekParts) {
        expect(parts.map((p) => p.id)).toEqual(['triads', 'arps', 'concept', 'application'])
        for (const p of parts) expect(p.why).toBeTruthy()
        expect(parts[3].options!.length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('keeps Lab links, marks the goal song, and builds milestones per piece', () => {
    const b = plan.blocks[0]
    expect(b.weekParts[0][0].labLinks?.[0]?.labUrl).toBe('/lab?mode=chords&root=C&type=maj7&voicing=drop2&move=c4')
    expect(b.weekParts[0][3].options![0]).toMatchObject({ label: 'Kid Charlemagne solo', kind: 'goal' })
    expect(b.towards).toBe('Kid Charlemagne solo')
    expect(plan.milestones).toEqual([
      { piece: 'Kid Charlemagne solo — Larry Carlton', blocks: [1] },
      { piece: 'They Can’t Take That Away From Me — Ella & Louis', blocks: [2] },
      { piece: 'Amazing Grace — Isaiah Sharkey', blocks: [3] },
    ])
    expect(plan.vision?.statement).toMatch(/stank face/)
  })

  it('song choices rotate week to week', () => {
    const b = plan.blocks[1]
    expect(b.weekParts[0][3].options![0].label).not.toBe(b.weekParts[1][3].options![0].label)
  })
})

describe('store normalize: ai state', () => {
  it('keeps a saved result and interview, drops junk', () => {
    const d = normalize({
      ai: { passcode: 'abc', result: FIXTURE_RESULT, resultAt: '2026-11-19T12:00:00Z', interview: { block: 'taste', turns: [{ screen: { id: 's1', kind: 'yn', prompt: 'x' }, answer: 'yes' }, 'junk'], queue: [], blockAsked: 1 } },
    })
    expect(d.ai.passcode).toBe('abc')
    expect(d.ai.result?.profile.type).toBe('Feel-First Soul Player')
    expect(d.ai.interview?.turns).toHaveLength(1)
    expect(d.ai.interview?.block).toBe('taste')
    expect(normalize({ ai: { interview: { block: 'nope', turns: [] } } }).ai.interview).toBeNull()
  })
})
