/**
 * The adaptive flow. `walk()` yields screens in order and reads earlier
 * answers to decide what comes next (which genres, how deep, which ladder
 * rung). `currentScreen()` replays the walk over the saved answers and stops
 * at the first unanswered screen, so Back and resume are trivial.
 */
import { GENRE_OPTIONS, GENRE_MODULES, moduleFor, slug } from './genres'
import { EXPERIENCE, GOALS, READING, ROLE_OPTS, SAME_LICKS, SPEED, TECHNIQUE, TIMING, VOCAB } from './general'
import { FOLLOWUP_PROMPT, SKILL_AREAS } from './skills'
import type { AnswerValue, Answers, AppliedItem, GenreModule, Ladder, Opt, Screen, SectionId } from './types'

export type Depth = 'listen' | 'standard' | 'full'
export type GenrePlan = { module: GenreModule; index: number; depth: Depth }

/* ---------------- answer helpers ---------------- */

export const isYes = (v: AnswerValue | null | undefined) => v === 'yes'
export const asList = (v: AnswerValue | null | undefined): string[] => (Array.isArray(v) ? v : [])
export const asGrid = (v: AnswerValue | null | undefined): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {}
export const asOne = (v: AnswerValue | null | undefined): string | null => (typeof v === 'string' ? v : null)

export const gridId = (g: string, part: 'artists' | 'songs') => `${g}:${part}`
export const rungId = (l: Ladder, r: string) => `${l.id}:${r}`
export const checkId = (l: Ladder, r: string) => `${l.id}:${r}:check`
export const followId = (l: Ladder, r: string, f: string) => `${l.id}:${r}:${f}`
export const feelsId = (g: string) => `${g}:feels`
export const mustId = (g: string) => `${g}:musthaves`
export const appliedId = (item: AppliedItem) => `applied:${item.id}`

/** Which genre modules run, and how deep. */
export function genrePlan(ans: Answers): GenrePlan[] {
  const top = asList(ans['s1']).slice(0, 3)
  const target = asOne(ans['s3'])
  const ids = top.filter((id) => moduleFor(id))
  if (target && moduleFor(target) && !ids.includes(target)) {
    if (ids.length >= 3) ids[2] = target
    else ids.push(target)
  }
  return ids.map((id, index) => {
    const module = moduleFor(id)!
    const known = Object.values(asGrid(ans[gridId(id, 'artists')])).filter((n) => n >= 1).length
    let depth: Depth = known < 5 ? 'listen' : known < 12 ? 'standard' : 'full'
    if (index > 0 && depth === 'full') depth = 'standard'
    return { module, index, depth }
  })
}

/* ---------------- the walk ---------------- */

type Walk = Generator<Screen, void, void>

function* ladderWalk(l: Ladder, ans: Answers, section: SectionId, eyebrow: string, single = false): Generator<Screen, number, void> {
  const ask = (i: number): Screen => ({ id: rungId(l, l.rungs[i].id), section, kind: 'yn', eyebrow, prompt: l.rungs[i].prompt })
  const check = (i: number): Screen | null => {
    const c = l.rungs[i].check
    return c
      ? {
          id: checkId(l, l.rungs[i].id),
          section,
          kind: 'quiz',
          eyebrow: `${eyebrow} · quick check`,
          prompt: c.prompt,
          options: c.options.map((x) => ({ id: x, label: x })),
          correct: c.answer,
        }
      : null
  }
  const n = l.rungs.length
  if (single) {
    yield ask(0)
    if (isYes(ans[rungId(l, l.rungs[0].id)])) {
      const c = check(0)
      if (c) yield c
      return 0
    }
    return -1
  }
  let lo = -1
  let hi = n
  let next = Math.min(n - 1, Math.max(0, l.start))
  for (let guard = 0; guard < n + 2; guard++) {
    yield ask(next)
    if (isYes(ans[rungId(l, l.rungs[next].id)])) {
      lo = Math.max(lo, next)
      const c = check(next)
      if (c) yield c
    } else {
      hi = Math.min(hi, next)
    }
    if (hi - lo <= 1) break
    next = Math.floor((lo + hi) / 2)
    if (next <= lo) next = lo + 1
    if (next >= hi) next = hi - 1
  }
  return lo
}

function appliedScreen(item: AppliedItem, eyebrow: string): Screen {
  if (item.kind === 'quiz') {
    return {
      id: appliedId(item),
      section: 'genres',
      kind: 'quiz',
      eyebrow: `${eyebrow} · quick check`,
      prompt: item.prompt,
      options: item.options.map((x) => ({ id: x, label: x })),
      correct: item.answer,
    }
  }
  return {
    id: appliedId(item),
    section: 'genres',
    kind: 'multi',
    eyebrow,
    prompt: item.prompt,
    options: item.options.map((x) => ({ id: slug(x.label), label: x.label })),
    weights: Object.fromEntries(item.options.map((x) => [slug(x.label), x.weight])),
  }
}

export function* walk(ans: Answers): Walk {
  yield {
    id: 'welcome',
    section: 'start',
    kind: 'welcome',
    prompt: 'Let’s find out exactly where you are.',
    help: 'About 10 minutes of quick taps. There are no wrong answers — except a few quick checks. Answer honestly and your plan will fit you.',
  }

  /* ---- style ---- */
  const genreOpts: Opt[] = GENRE_OPTIONS.map((g) => ({ id: g.id, label: g.label }))
  yield { id: 's1', section: 'style', kind: 'rank', max: 3, prompt: 'Pick your top 3 genres, in order.', help: 'Your #1 is home base.', options: genreOpts }
  const top = asList(ans['s1'])
  yield {
    id: 's2',
    section: 'style',
    kind: 'multi',
    prompt: 'Any other genres you play or love?',
    noneLabel: 'No, that’s it',
    options: genreOpts.filter((g) => !top.includes(g.id)),
  }
  yield {
    id: 's3',
    section: 'style',
    kind: 'one',
    prompt: 'Which genre are you growing into most?',
    options: [
      ...genreOpts.filter((g) => top.includes(g.id)),
      { id: 'deeper', label: 'None — going deeper in what I play' },
      ...genreOpts.filter((g) => !top.includes(g.id)),
    ],
  }
  yield { id: 's4', section: 'style', kind: 'multi', prompt: 'What’s your role on the bandstand?', noneLabel: 'Just me, at home', options: ROLE_OPTS }

  /* ---- genre modules ---- */
  for (let i = 0; i < 3; i++) {
    const plan = genrePlan(ans)[i]
    if (!plan) break
    const g = plan.module
    const eb = g.name
    yield {
      id: gridId(g.id, 'artists'),
      section: 'genres',
      kind: 'grid',
      eyebrow: eb,
      prompt: `Which ${g.name} artists do you know?`,
      help: 'Tap once if you know them. Tap twice if you can play some of their songs.',
      playLabel: 'can play their songs',
      items: g.artists.map((a) => ({ id: slug(a.name), label: a.name, sub: a.inst })),
    }
    const depth = genrePlan(ans)[i].depth
    yield {
      id: gridId(g.id, 'songs'),
      section: 'genres',
      kind: 'grid',
      eyebrow: eb,
      prompt: `Which of these ${g.name} songs do you know?`,
      help: 'Tap once if you know it. Tap twice if you can play it.',
      playLabel: 'can play it',
      items: g.songs.map((s) => ({ id: slug(s.title), label: s.title, sub: s.artist })),
    }
    yield* ladderWalk(g.forms, ans, 'genres', eb, depth === 'listen')
    if (depth === 'listen') continue
    if (plan.index === 0) {
      yield {
        id: feelsId(g.id),
        section: 'genres',
        kind: 'multi',
        eyebrow: eb,
        prompt: 'Tap the feels you can play on demand.',
        noneLabel: 'None of these yet',
        options: g.feels.map((f) => ({ id: slug(f), label: f })),
      }
    }
    if (plan.index === 0 && depth === 'full') {
      yield* ladderWalk(g.language, ans, 'genres', eb)
      yield {
        id: mustId(g.id),
        section: 'genres',
        kind: 'multi',
        eyebrow: eb,
        prompt: 'Tap what you can do.',
        noneLabel: 'None of these yet',
        options: g.mustHaves.map((m) => ({ id: slug(m), label: m })),
      }
    }
    const items = plan.index === 0 && depth === 'full' ? g.applied : g.applied.slice(0, 1)
    for (const item of items) yield appliedScreen(item, eb)
  }

  /* ---- players ---- */
  const plans = genrePlan(ans)
  const known: Opt[] = []
  const seen = new Set<string>()
  for (const p of plans) {
    const grid = asGrid(ans[gridId(p.module.id, 'artists')])
    for (const a of p.module.artists) {
      const id = slug(a.name)
      if ((grid[id] ?? 0) >= 1 && !seen.has(id)) {
        seen.add(id)
        known.push({ id, label: a.name })
      }
    }
  }
  if (known.length) {
    yield { id: 'influences', section: 'players', kind: 'multi', max: 5, prompt: 'Who shaped your playing most? Pick up to 5.', noneLabel: 'None of these', options: known }
  }
  const target = asOne(ans['s3'])
  const tm = target ? moduleFor(target) : undefined
  const targetOpts = [...known]
  if (tm) for (const a of tm.artists) if (!seen.has(slug(a.name))) targetOpts.push({ id: slug(a.name), label: a.name })
  if (targetOpts.length) {
    yield { id: 'targets', section: 'players', kind: 'multi', max: 5, prompt: 'Who do you want to sound like now? Pick up to 5.', noneLabel: 'None of these', options: targetOpts }
  }

  /* ---- skills ---- */
  for (const area of SKILL_AREAS) {
    const top = yield* ladderWalk(area.ladder, ans, 'skills', area.name)
    if (top >= 0) {
      const r = area.ladder.rungs[top]
      for (const f of area.followups) {
        yield { id: followId(area.ladder, r.id, f), section: 'skills', kind: 'yn', eyebrow: `${area.name} · ${r.label}`, prompt: FOLLOWUP_PROMPT[f](r.label) }
      }
    }
  }
  yield TECHNIQUE
  yield SPEED
  yield TIMING
  yield VOCAB
  yield SAME_LICKS
  yield READING

  /* ---- experience & goals ---- */
  for (const s of EXPERIENCE) yield s
  for (const s of GOALS) yield s
}

/* ---------------- driving the walk ---------------- */

export type FlowState = {
  current: Screen | null
  answered: number
  /** rough total for the progress bar */
  estimate: number
}

export function flowState(ans: Answers): FlowState {
  let answered = 0
  let current: Screen | null = null
  for (const s of walk(ans)) {
    if (s.id in ans) {
      answered++
      continue
    }
    current = s
    break
  }
  return { current, answered, estimate: estimateTotal(ans, answered) }
}

/** All screens the player actually answered, in order (for scoring and review). */
export function answeredScreens(ans: Answers): Screen[] {
  const out: Screen[] = []
  for (const s of walk(ans)) {
    if (!(s.id in ans)) break
    out.push(s)
  }
  return out
}

function estimateTotal(ans: Answers, answered: number): number {
  const plans = genrePlan(ans)
  const nGenres = asList(ans['s1']).length ? plans.length : 3
  const genres = plans.length
    ? plans.reduce((s, p) => s + (p.index === 0 ? (p.depth === 'full' ? 14 : p.depth === 'standard' ? 8 : 3) : p.depth === 'listen' ? 3 : 6), 0)
    : nGenres * 7
  const fixed = 1 + 4 + 2 + SKILL_AREAS.length * 5 + 6 + EXPERIENCE.length + GOALS.length
  return Math.max(answered + 1, fixed + genres)
}

/** Modules exist for these genres (others are taste-only for now). */
export const MODULE_IDS = new Set(GENRE_MODULES.map((g) => g.id))
