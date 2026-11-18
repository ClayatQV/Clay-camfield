/**
 * Vision questions: where the player wants to be, in their own words, and the
 * music that would make them feel they'd arrived. The plan is built toward
 * these; the skill assessment measures the distance.
 */
import type { Opt } from './types'

const o = (pairs: [string, string][]): Opt[] => pairs.map(([id, label]) => ({ id, label }))

export const WHERE_OPTS = o([
  ['self', 'Just for me'],
  ['friends', 'With friends / at jams'],
  ['church', 'At church'],
  ['gigs', 'On gigs'],
  ['recording', 'On recordings'],
  ['online', 'Online / social media'],
  ['teaching', 'Teaching others'],
])

/** What about a signature piece the player wants to be able to play. */
export const ELEMENT_OPTS = o([
  ['fastruns', 'The fast runs'],
  ['licks', 'The licks and phrasing'],
  ['bends', 'The bends and vibrato'],
  ['changes', 'Lines through the chord changes'],
  ['outside', 'The outside / tension notes'],
  ['chords', 'The chords and voicings'],
  ['rhythm', 'The rhythm part and groove'],
  ['riffs', 'The riffs'],
  ['chordmelody', 'Melody and chords together'],
  ['fingerstyle', 'The fingerpicking'],
  ['melody', 'The melody itself'],
  ['whole', 'The whole thing, start to finish'],
])

/** General "what do you want to learn" — plain words, any style of player. */
export const WANT_OPTS = o([
  ['solo', 'Solo and improvise better'],
  ['changes', 'Solo over chord changes'],
  ['songs', 'Play the songs I love'],
  ['lead', 'Lead guitar: bends, vibrato, licks'],
  ['speed', 'Speed and clean technique'],
  ['groove', 'Rhythm and groove'],
  ['chords', 'Better chords and voicings'],
  ['fingerstyle', 'Fingerstyle / fingerpicking'],
  ['chordmelody', 'Chord-melody / solo guitar'],
  ['fretboard', 'Know the whole fretboard'],
  ['theory', 'Understand the theory behind what I play'],
  ['ear', 'Play by ear'],
  ['phrasing', 'Phrasing, feel and tone'],
  ['write', 'Write my own songs and parts'],
  ['gig', 'Get gig-ready / play in a band'],
  ['reading', 'Read charts and notation'],
])

export const label = (opts: Opt[], id: string) => opts.find((x) => x.id === id)?.label ?? id

/** "Kid Charlemagne solo — Larry Carlton" → { title, artist } */
export function splitPiece(s: string): { title: string; artist: string } {
  const m = /^(.*?)\s+[—–-]\s+(.*)$/.exec(s.trim())
  return m ? { title: m[1].trim(), artist: m[2].trim() } : { title: s.trim(), artist: '' }
}
