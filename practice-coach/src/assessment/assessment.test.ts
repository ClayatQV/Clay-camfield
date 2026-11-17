import { describe, expect, it } from 'vitest'
import { flowState, genrePlan } from './engine'
import { GENRE_MODULES } from './genres'
import { CLAY, NEW_ROCK_PLAYER, simulate } from './personas'
import { scoreAssessment } from './scoring'
import { SKILL_AREAS } from './skills'

describe('content', () => {
  it('every genre module has 20 artists, songs, ladders and valid spot checks', () => {
    for (const g of GENRE_MODULES) {
      expect(g.artists, g.id).toHaveLength(20)
      expect(g.songs.length, g.id).toBeGreaterThanOrEqual(10)
      expect(g.applied.length, g.id).toBeGreaterThanOrEqual(2)
      for (const l of [g.forms, g.language]) {
        expect(l.start).toBeLessThan(l.rungs.length)
        for (const r of l.rungs) if (r.check) expect(r.check.options, `${g.id} ${r.id}`).toContain(r.check.answer)
      }
      for (const q of g.applied) if (q.kind === 'quiz') expect(q.options, q.id).toContain(q.answer)
    }
    for (const a of SKILL_AREAS) for (const r of a.ladder.rungs) if (r.check) expect(r.check.options).toContain(r.check.answer)
  })
})

describe('engine', () => {
  it('starts with the welcome screen', () => {
    expect(flowState({}).current?.kind).toBe('welcome')
  })

  it('Clay: full blues module, standard soul and jazz, finishes in a 10-minute budget', () => {
    const { answers, screens } = simulate(CLAY)
    const plan = genrePlan(answers)
    expect(plan.map((p) => [p.module.id, p.depth])).toEqual([
      ['blues', 'full'],
      ['soul', 'standard'],
      ['jazz', 'standard'],
    ])
    // ~5 s per tap, grids ~20 s: stay comfortably near 10 minutes.
    expect(screens).toBeLessThan(110)
    expect(screens).toBeGreaterThan(50)
  })

  it('a beginner with taste-only genres gets a short, quick assessment', () => {
    const { answers, screens } = simulate(NEW_ROCK_PLAYER)
    expect(genrePlan(answers).map((p) => [p.module.id, p.depth])).toEqual([['rock', 'standard']])
    expect(screens).toBeLessThan(80)
  })

  it('placement asks only ~3–4 questions per ladder', () => {
    const { answers } = simulate(CLAY)
    const chordQs = Object.keys(answers).filter((k) => /^chords:c\d+$/.test(k))
    expect(chordQs.length).toBeLessThanOrEqual(4)
  })
})

describe('scoring', () => {
  it('Clay reads as a feel-first blues & soul player whose unlock is playing over changes', () => {
    const r = scoreAssessment(simulate(CLAY).answers)
    expect(r.playerType).toBe('Feel-First Blues & Soul Player')
    expect(r.unlock?.area).toBe('improv')
    expect(r.skills.scales).toMatchObject({ label: 'harmonic minor modes', play: true, use: false })
    expect(r.skills.chords.label).toBe('triads on every string set')
    expect(r.sameLicks).toBe(true)
    expect(r.read.join(' ')).toMatch(/played at a high level/)
    expect(r.genres[0]).toMatchObject({ id: 'blues', known: 18, rootsGap: false })
    expect(r.adjustments).toHaveLength(0)
  })

  it('a missed spot check moves that area down one step and is reported', () => {
    const r = scoreAssessment(simulate({ ...CLAY, miss: ['theory:t3:check'] }).answers)
    expect(r.skills.theory.top).toBe(3)
    expect(r.skills.theory.adjusted).toMatch(/quick check/)
    expect(r.adjustments.some((a) => a.area === 'Theory')).toBe(true)
  })

  it('flags a roots gap and builds an honest listening list', () => {
    const r = scoreAssessment(simulate(NEW_ROCK_PLAYER).answers)
    const rock = r.genres[0]
    expect(rock.rootsGap).toBe(true)
    expect(rock.unknownArtists[0].era).toBe('roots')
    expect(r.read.join(' ')).toMatch(/modern Rock players but not its roots — start with Chuck Berry/)
    expect(r.listening.length).toBeGreaterThan(0)
    expect(r.playerType).toBe('Rising Rock Player')
  })
})
