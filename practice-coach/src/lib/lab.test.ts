import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { LESSONS } from '../content/lessons'
import { BLOCKS } from '../content/blocks'
import { sessionParts } from './session'
import { CLAY, NEW_ROCK_PLAYER, simulate } from '../assessment/personas'
import { scoreAssessment } from '../assessment/scoring'
import { buildPlan } from '../plan/generate'
import { FOCI } from '../plan/foci'
import { labFileUrl, labPath } from './lab'

/** Every Lab deep link the app ships with. */
export function allLabLinks(): { from: string; url: string }[] {
  const out: { from: string; url: string }[] = []
  for (const b of BLOCKS)
    for (let w = 1; w <= b.weeks[1] - b.weeks[0] + 1; w++)
      for (const p of sessionParts(b.n, w).parts) for (const l of p.labLinks ?? []) out.push({ from: `B${b.n}W${w} ${p.id}: ${l.label}`, url: l.labUrl })
  for (const l of LESSONS) for (const d of l.drills ?? []) out.push({ from: `${l.id}: ${d.label}`, url: d.labUrl })
  // Generated plans (warm-ups vary by level) and every focus in the library.
  for (const persona of [CLAY, NEW_ROCK_PLAYER]) {
    const plan = buildPlan(scoreAssessment(simulate(persona).answers))
    for (const b of plan.blocks)
      b.weekParts.forEach((parts, w) => {
        for (const p of parts) for (const l of p.labLinks ?? []) out.push({ from: `${persona.name} B${b.n}W${w + 1} ${p.id}: ${l.label}`, url: l.labUrl })
      })
  }
  for (const f of FOCI) for (const w of f.weeks) for (const l of w.lab) out.push({ from: `focus ${f.id}: ${l.label}`, url: labPath(l.p) })
  return [...new Map(out.map((x) => [x.url, x])).values()]
}

describe('lab links', () => {
  it('builds in-app paths and iframe URLs', () => {
    const p = labPath({ mode: 'scales', root: 'G', scale: 'majpent', pos: 7 })
    expect(p).toBe('/lab?mode=scales&root=G&scale=majpent&pos=7')
    expect(labFileUrl(new URLSearchParams(p.split('?')[1] + '&junk=1'), { embed: '1' })).toBe(
      'fretboard-lab.html?mode=scales&root=G&scale=majpent&pos=7&embed=1',
    )
  })
  it('every shipped link has a mode', () => {
    const links = allLabLinks()
    expect(links.length).toBeGreaterThan(20)
    for (const l of links) expect(new URLSearchParams(l.url.split('?')[1]).get('mode')).toMatch(/^(chords|arpeggios|scales|technique)$/)
    if (process.env.LAB_LINKS_OUT) writeFileSync(process.env.LAB_LINKS_OUT, JSON.stringify(links, null, 1))
  })
})
