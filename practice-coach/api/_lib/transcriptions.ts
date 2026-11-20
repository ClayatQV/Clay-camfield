/**
 * The transcription library: videos that meet Clay's standard for learning a
 * piece note for note — the full recording (or the solo) with tabs and/or
 * notation ON SCREEN, synced to the audio, free to watch. Clay supplied the
 * three baselines. Plain data, no imports, so both the server (prompts) and
 * the client (lessons, links) can use it.
 */
export type Transcription = {
  id: string
  youtubeId: string
  song: string
  /** The player whose performance is transcribed. */
  artist: string
  /** Original act, when different from the performer (e.g. Steely Dan for a Carlton solo). */
  originalArtist?: string
  channel: string
  videoTitle: string
  /** What is on screen. */
  format: 'tabs + notation' | 'notation' | 'tabs'
  /** How much of the recording is covered. */
  scope: 'full piece' | 'solo'
  genre: string
  /** Why it is the standard. */
  note: string
  /** Clay's three baselines are `baseline`; later additions are `library`. */
  tier: 'baseline' | 'library'
  /** Other titles the same piece goes by, for matching. */
  aka?: string[]
}

export const TRANSCRIPTIONS: Transcription[] = [
  {
    id: 'kid-charlemagne',
    youtubeId: 'FnFeReSz2j4',
    song: 'Kid Charlemagne',
    artist: 'Larry Carlton',
    originalArtist: 'Steely Dan',
    channel: 'Rens Warnar Music',
    videoTitle: 'Steely Dan - Kid Charlemagne Solo with TAB',
    format: 'tabs + notation',
    scope: 'solo',
    genre: 'jazz-rock',
    note: 'Tabs, notation and chord names on screen with the record; the solo can be learned note for note.',
    tier: 'baseline',
    aka: ['Kid Charlemagne solo'],
  },
  {
    id: 'joe-pass-satin-doll',
    youtubeId: 'hMvMuSpsNmE',
    song: 'Satin Doll',
    artist: 'Joe Pass',
    originalArtist: 'Duke Ellington',
    channel: 'DW Scores',
    videoTitle: 'Satin Doll by JOE PASS - Transcription (w/Tabs)',
    format: 'tabs + notation',
    scope: 'full piece',
    genre: 'jazz',
    note: 'A full solo-guitar performance transcribed with tabs; chord melody, walking bass and single lines in one piece.',
    tier: 'baseline',
  },
  {
    id: 'ted-greene-over-the-rainbow',
    youtubeId: 'oB2YMXSvAz4',
    song: 'Over the Rainbow',
    artist: 'Ted Greene',
    originalArtist: 'Harold Arlen',
    channel: 'François Leduc',
    videoTitle: 'Over the Rainbow - Ted Greene (Transcription)',
    format: 'notation',
    scope: 'full piece',
    genre: 'jazz',
    note: 'Solo-guitar chord melody transcribed in full; the voicings and voice leading are the lesson.',
    tier: 'baseline',
    aka: ['Somewhere Over the Rainbow'],
  },
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’'`"().,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The library entry for a song, if any. Matches on the song title (or a known
 * alias) appearing in `title`, and, when an artist is given, on the performer
 * or the original act appearing in the artist text (so "Kid Charlemagne —
 * Steely Dan" and "Kid Charlemagne solo — Larry Carlton" both match).
 */
export function findTranscription(title: string, artist?: string | null): Transcription | undefined {
  const t = norm(title)
  if (!t) return undefined
  const a = norm(artist ?? '')
  return TRANSCRIPTIONS.find((x) => {
    const names = [x.song, ...(x.aka ?? [])].map(norm)
    const titleHit = names.some((n) => t.includes(n) || n.includes(t))
    if (!titleHit) return false
    if (!a) return true
    const people = [x.artist, x.originalArtist ?? ''].map(norm).filter(Boolean)
    const lastNames = people.map((p) => p.split(' ').pop()!)
    return people.some((p) => a.includes(p)) || lastNames.some((l) => a.includes(l)) || t.includes(norm(x.artist))
  })
}

export const TRANSCRIPTIONS_TEXT = `TRANSCRIPTION STANDARD. A song in an application is only useful if the player can learn it note for note. The standard is a free YouTube video that shows the full recording (or the solo) with tabs and/or notation ON SCREEN, synced to the audio. The baseline examples:
${TRANSCRIPTIONS.filter((x) => x.tier === 'baseline')
  .map((x) => `- ${x.videoTitle} (${x.channel}) — ${x.scope}, ${x.format}`)
  .join('\n')}
Rules for application songs:
1. Prefer songs and solos that almost certainly have a video like that (widely transcribed records, classic solos, standards played by famous guitarists). Set how = "transcription".
2. The player's own named pieces always stay in, even without one. For a piece that is unlikely to have a transcription video (a one-off live or interview performance, an obscure track, a very recent release), set how = "ear" and make the instruction a learn-by-ear plan: the underlying song's form and changes, which section to loop first, what to listen for.
3. When a piece is how = "ear" and the module needs more material, add one alternative with the same lesson value that does have a transcription video (same style, same technique) and say in the note why it is there.
4. Never invent a video title or channel. You only decide how the song is best learned; the app finds the video.`
