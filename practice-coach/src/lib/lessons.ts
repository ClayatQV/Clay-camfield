import { LESSONS } from '../content/lessons'
import type { Lesson, LessonStatus, Moment } from '../content/types'
import { update, type AppData } from '../store/store'

export type ResolvedLesson = Lesson & { effectiveStatus: LessonStatus; effectiveVideo: string; decided: boolean }

export function resolveLesson(l: Lesson, data: AppData): ResolvedLesson {
  const s = data.lessonState[l.id]
  return {
    ...l,
    effectiveStatus: s?.status ?? l.status,
    effectiveVideo: s?.youtubeId ?? l.youtubeId,
    decided: !!s,
  }
}

export function allLessons(data: AppData): ResolvedLesson[] {
  return LESSONS.map((l) => resolveLesson(l, data))
}

export function setLessonStatus(id: string, status: LessonStatus, youtubeId?: string) {
  update((d) => ({ ...d, lessonState: { ...d.lessonState, [id]: { status, youtubeId, decidedAt: new Date().toISOString() } } }))
}

/** Back to whatever the content file says. */
export function clearLessonStatus(id: string) {
  update((d) => {
    const next = { ...d.lessonState }
    delete next[id]
    return { ...d, lessonState: next }
  })
}

export function momentsFor(l: Lesson, data: AppData): { list: Moment[]; custom: boolean } {
  const c = data.moments[l.id]
  return c ? { list: c, custom: true } : { list: l.moments ?? [], custom: false }
}

export function saveMoments(id: string, list: Moment[]) {
  update((d) => ({ ...d, moments: { ...d.moments, [id]: list } }))
}

export function resetMoments(id: string) {
  update((d) => {
    const next = { ...d.moments }
    delete next[id]
    return { ...d, moments: next }
  })
}

export const tagClass = (tag: string) => {
  const t = tag.toUpperCase()
  if (t.includes('FAST')) return 'tag fast'
  if (t.includes('OUTSIDE')) return 'tag outside'
  if (t.includes('THEORY')) return 'tag theory'
  return 'tag'
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`
}
