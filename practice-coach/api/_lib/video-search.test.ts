import { describe, expect, it } from 'vitest'
import { parseResultsPage, scoreHit } from './video-search'

const page = (items: object[]) =>
  `<html><script>var ytInitialData = ${JSON.stringify({ contents: { a: { b: items } } })};</script></html>`

const vr = (videoId: string, title: string, channel: string, length?: string) => ({
  videoRenderer: { videoId, title: { runs: [{ text: title }] }, ownerText: { runs: [{ text: channel }] }, ...(length ? { lengthText: { simpleText: length } } : {}) },
})

describe('video search', () => {
  it('parses videos out of the results page JSON, once each', () => {
    const html = page([vr('a1', 'Kid Charlemagne Solo with TAB', 'Rens Warnar Music', '0:57'), { x: [vr('a1', 'dup', 'dup')] }, vr('b2', 'Kid Charlemagne lesson', 'Someone', '28:50')])
    const hits = parseResultsPage(html)
    expect(hits.map((h) => h.id)).toEqual(['a1', 'b2'])
    expect(hits[0]).toMatchObject({ title: 'Kid Charlemagne Solo with TAB', channel: 'Rens Warnar Music', length: '0:57' })
  })
  it('returns nothing for a page without the JSON', () => {
    expect(parseResultsPage('<html>no data</html>')).toEqual([])
  })
  it('ranks transcriptions with tabs above lessons and originals', () => {
    const tab = scoreHit({ id: '1', title: 'Steely Dan - Kid Charlemagne Solo with TAB', channel: 'Rens Warnar Music', length: '0:57' })
    const trans = scoreHit({ id: '2', title: 'Satin Doll by JOE PASS - Transcription (w/Tabs)', channel: 'DW Scores', length: '3:10' })
    const lesson = scoreHit({ id: '3', title: 'Kid Charlemagne guitar solo lesson', channel: 'X', length: '28:50' })
    const orig = scoreHit({ id: '4', title: 'Steely Dan - Kid Charlemagne (Official Audio)', channel: 'Steely Dan', length: '4:38' })
    const backing = scoreHit({ id: '5', title: 'Kid Charlemagne backing track', channel: 'Y', length: null })
    expect(trans.score).toBeGreaterThan(tab.score - 1)
    expect(tab.score).toBeGreaterThan(lesson.score)
    expect(lesson.score).toBeGreaterThan(backing.score)
    expect(orig.score).toBeLessThan(0)
    expect(tab.hint).toMatch(/Tabs/)
    expect(lesson.hint).toMatch(/lesson/)
  })
})
