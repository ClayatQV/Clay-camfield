import { describe, expect, it } from 'vitest'
import { findTranscription, TRANSCRIPTIONS } from './transcriptions'

describe('transcription library', () => {
  it('has unique ids and video ids', () => {
    expect(new Set(TRANSCRIPTIONS.map((t) => t.id)).size).toBe(TRANSCRIPTIONS.length)
    expect(new Set(TRANSCRIPTIONS.map((t) => t.youtubeId)).size).toBe(TRANSCRIPTIONS.length)
  })
  it('matches the player wording for a named piece', () => {
    expect(findTranscription('Kid Charlemagne solo', 'Larry Carlton')?.id).toBe('kid-charlemagne')
    expect(findTranscription('Kid Charlemagne', 'Steely Dan')?.id).toBe('kid-charlemagne')
    expect(findTranscription('Somewhere Over the Rainbow', 'Ted Greene')?.id).toBe('ted-greene-over-the-rainbow')
    expect(findTranscription('Satin Doll', 'Joe Pass')?.id).toBe('joe-pass-satin-doll')
  })
  it('does not match the same song by a different player', () => {
    expect(findTranscription('Over the Rainbow', 'Eric Clapton')).toBeUndefined()
    expect(findTranscription('Satin Doll', 'Wes Montgomery')).toBeUndefined()
  })
  it('matches on title alone when no artist is given', () => {
    expect(findTranscription('Satin Doll')?.id).toBe('joe-pass-satin-doll')
    expect(findTranscription('Blackbird', 'Eric Gales')).toBeUndefined()
  })
})
