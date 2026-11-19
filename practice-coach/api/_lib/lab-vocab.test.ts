import { describe, expect, it } from 'vitest'
import { cleanLabQuery } from './lab-vocab.ts'

describe('cleanLabQuery', () => {
  it('keeps valid presets and drops unknown values', () => {
    expect(cleanLabQuery('mode=chords&root=C&type=maj&voicing=close3&set=GBE&move=c4&zone=mid')).toBe('mode=chords&root=C&type=maj&voicing=close3&set=GBE&move=c4&zone=mid')
    expect(cleanLabQuery('?mode=scales&root=G&scale=majpent&pos=7&junk=1')).toBe('mode=scales&root=G&scale=majpent&pos=7')
    expect(cleanLabQuery('mode=arpeggios&root=Bb&type=7b9&pos=99&move=chrom')).toBe('mode=arpeggios&root=Bb&type=7b9')
    expect(cleanLabQuery('mode=technique&ex=spider&pos=5&bpm=80')).toBe('mode=technique&ex=spider&pos=5&bpm=80')
  })
  it('rejects presets without a valid mode', () => {
    expect(cleanLabQuery('root=C')).toBeNull()
    expect(cleanLabQuery('mode=piano')).toBeNull()
    expect(cleanLabQuery(null)).toBeNull()
  })
})
