/**
 * A realistic AI result (Clay-shaped) for tests and the stand-in server used
 * in browser checks. Not shipped to users.
 */
import type { AiModule, AiResult } from '../../api/_lib/schemas'

export const FIXTURE_MODULES: AiModule[] = [
  {
    id: 'kid-bar7',
    title: 'The Kid Charlemagne bar 7–9 run at tempo',
    weeks: 2,
    why: '“Kid Charlemagne” lives on fast pentatonic runs that sit on the chords — this is the first one you named.',
    towards: 'Kid Charlemagne solo',
    trains: ['technique:alternate-picking', 'scales:pentatonic-positions', 'improvising:pentatonic-5th-up'],
    warmups: [
      { label: 'Drop 2 maj7 through the cycle', instruction: 'All four inversions on the top four strings, nearest shape each time, say the chord tones.', lab: 'mode=chords&root=C&type=maj7&voicing=drop2&move=c4' },
      { label: 'Spider at 90, +5 a day', instruction: 'One finger per fret, stop at the first sloppy note.', lab: 'mode=technique&ex=spider&pos=5&bpm=90' },
    ],
    concept: { label: 'E minor pentatonic + the 6th, frets 12–17', instruction: 'Loop bars 7–9 at 0.5× with the speed ladder. Say the note names. Hear the C♯ as Dorian, then the G major pentatonic over Cmaj7.', lab: 'mode=scales&root=E&scale=minpent&pos=12' },
    application: {
      instruction: 'Pick one and learn it from a video with the tabs on screen; then solo over it using only this week’s idea.',
      songs: [
        { title: 'Kid Charlemagne solo', artist: 'Larry Carlton', note: 'your goal — lesson with bar map' },
        { title: 'The Thrill Is Gone', artist: 'B.B. King', note: null },
        { title: 'Isn’t She Lovely', artist: 'Stevie Wonder', note: null },
        { title: 'Cissy Strut', artist: 'The Meters', note: 'discovery pick' },
      ],
    },
    doneWhen: ['Bars 7–9 clean at ♩=98', 'G major pentatonic over Cmaj7 without thinking', 'Spider at 100 bpm clean'],
  },
  {
    id: 'guide-tones',
    title: 'Guide tones through “They Can’t Take That Away From Me”',
    weeks: 3,
    why: 'You know your 7th chords but your lines don’t follow the changes yet. Guide tones are the shortest path.',
    towards: 'They Can’t Take That Away From Me',
    trains: ['improvising:guide-tones', 'arpeggios:ii-V-I'],
    warmups: [
      { label: 'Shells R·3·7 · ii–V–I', instruction: 'Through the cycle, smallest move between shapes.', lab: 'mode=chords&root=C&type=maj7&voicing=shell37&set=0&move=251' },
      { label: 'ii–V–I arpeggios from the 3rd', instruction: 'Position 5, click at 60.', lab: 'mode=arpeggios&root=C&type=maj7&pos=5&move=251&start=3&bpm=60' },
    ],
    concept: { label: 'Two-note guide-tone line, all 12 keys', instruction: 'Dm7 (F, C) → G7 (F, B) → Cmaj7 (E, B). One note moves, one holds. Then over the tune’s A section.', lab: null },
    application: {
      instruction: 'Melody first, then a chorus using only guide tones and chord tones.',
      songs: [
        { title: 'They Can’t Take That Away From Me', artist: 'Ella Fitzgerald & Louis Armstrong', note: 'your goal' },
        { title: 'Autumn Leaves', artist: 'standard', note: null },
        { title: 'Fly Me to the Moon', artist: 'standard', note: null },
      ],
    },
    doneWhen: ['Guide tones through a ii–V–I in any key at 80 bpm', 'A full chorus of the tune without a pentatonic box'],
  },
  {
    id: 'grace-voicings',
    title: 'Voicings for an “Amazing Grace” chord-melody',
    weeks: 2,
    why: 'Chord-melody is your third goal; drop 2 and drop 3 with the melody on top are the first step toward it.',
    towards: 'Amazing Grace',
    trains: ['chords:drop2', 'chords:drop3', 'chords:melody-on-top'],
    warmups: [
      { label: 'Drop 3 · ii–V–I', instruction: 'Root on the 6th string, through the cycle.', lab: 'mode=chords&root=C&type=maj7&voicing=drop3&move=251' },
      { label: 'Major triads · G–B–E', instruction: 'Cycle of 4ths, nearest inversion.', lab: 'mode=chords&root=C&type=maj&voicing=close3&set=GBE&move=c4' },
    ],
    concept: { label: 'Melody on top with triads', instruction: 'Play the hymn melody on the top two strings and put a triad under each strong-beat note.', lab: null },
    application: {
      instruction: 'Arrange the first verse.',
      songs: [
        { title: 'Amazing Grace', artist: 'Isaiah Sharkey', note: 'your goal' },
        { title: 'Tenderly', artist: 'Ella & Louis', note: null },
        { title: 'Misty', artist: 'Wes Montgomery', note: 'discovery pick' },
      ],
    },
    doneWhen: ['One verse of Amazing Grace as chord-melody', 'Harmonize any melody note with a drop 2 voicing on demand'],
  },
  {
    id: 'listen-jazz',
    title: 'Jazz listening: the pillars you don’t know yet',
    weeks: 1,
    why: 'You named jazz as a target but know a third of its essential artists. A week of listening changes what you reach for.',
    towards: null,
    trains: ['repertoire:jazz', 'ear:melodies'],
    warmups: [
      { label: 'maj7 arpeggios · cycle', instruction: 'Click at 60.', lab: 'mode=arpeggios&root=C&type=maj7&pos=5&move=c4&bpm=60' },
      { label: 'Major scale with note names', instruction: 'Say every note.', lab: 'mode=scales&root=G&scale=ionian&pos=2&label=note' },
    ],
    concept: { label: 'One record a day, one melody by ear', instruction: 'Kind of Blue, Smokin’ at the Half Note, The Incredible Jazz Guitar. Learn 8 bars of a melody by ear from each.', lab: null },
    application: {
      instruction: 'Play the melody you learned along with the record.',
      songs: [
        { title: 'So What', artist: 'Miles Davis', note: null },
        { title: 'Four on Six', artist: 'Wes Montgomery', note: null },
        { title: 'Blue Bossa', artist: 'Kenny Dorham', note: null },
      ],
    },
    doneWhen: ['Three melodies learned by ear', 'Name the players on each record'],
  },
]

export const FIXTURE_RESULT: AiResult = {
  profile: {
    type: 'Feel-First Soul Player',
    read: [
      'Strong blues vocabulary and a good ear: you learn melodies without tab and your bends are in tune.',
      'You know your 7th chords, modes and even harmonic minor, but they don’t show up when you improvise. That gap is the plan.',
      'The single unlock: lines that follow the changes — guide tones first, then the ♭9 sound.',
      'You’ve played at a high level and play out less now, so the plan skips fundamentals you own and moves fast.',
      'You know 4 of the 16 jazz essentials — start with Wes, Miles and Grant Green.',
    ],
    trust: 0.9,
  },
  vision: {
    statement: 'Phrase like Louis Armstrong’s trumpet and Stevie’s harmonica over the changes. Every solo should make people cry or give them stank face.',
    where: ['On gigs', 'On recordings'],
    pieces: [
      { title: 'Kid Charlemagne solo', artist: 'Larry Carlton', needs: ['fast pentatonic at ♩=98', 'pentatonic a 5th up over maj7', 'secondary-dominant arpeggios'], have: ['pentatonic positions', 'bends and vibrato'], missing: ['16ths at tempo', 'targeting the 9th over minor chords'] },
      { title: 'They Can’t Take That Away From Me', artist: 'Ella & Louis', needs: ['guide tones', 'ii–V–I arpeggios', 'the melody by ear'], have: ['7th chords', 'the melody'], missing: ['guide-tone lines', 'landing on 3rds on beat 1'] },
      { title: 'Amazing Grace', artist: 'Isaiah Sharkey', needs: ['drop 2 and drop 3 voicings', 'melody on top', 'passing chords'], have: ['triads on all string sets'], missing: ['drop 3', 'melody-on-top arranging'] },
    ],
    wants: ['Solo over chord changes', 'Phrasing, feel and tone', 'Know the whole fretboard'],
  },
  skills: [
    { area: 'chords', skill: 'Triads on every string set', level: 4, evidence: 'Yes to all inversions on three sets; uses them comping.' },
    { area: 'chords', skill: 'Drop 2 voicings', level: 3, evidence: 'Plays them at tempo through a ii–V–I; not yet in songs.' },
    { area: 'chords', skill: 'Drop 3 voicings', level: 1, evidence: 'Knows what they are, hasn’t learned the shapes.' },
    { area: 'scales', skill: 'Pentatonic, all five positions', level: 4, evidence: 'Solos across the neck.' },
    { area: 'scales', skill: 'Major modes', level: 3, evidence: 'Plays Dorian and Mixolydian on demand; Dorian check right.' },
    { area: 'scales', skill: 'Harmonic minor modes', level: 2, evidence: 'Knows and can play slowly; never uses them.' },
    { area: 'arpeggios', skill: '7th arpeggios through the cycle', level: 3, evidence: 'Yes at 60 bpm.' },
    { area: 'theory', skill: 'ii–V–I in any key', level: 4, evidence: 'B♭ check right.' },
    { area: 'improvising', skill: 'Guide-tone lines', level: 1, evidence: 'Knows the idea; lines don’t follow the changes yet.' },
    { area: 'rhythm & timing', skill: 'Click on 2 and 4', level: 4, evidence: 'Yes; plays with drummers.' },
    { area: 'technique', skill: 'Clean 16ths', level: 3, evidence: 'Clean at 100–120 bpm, not above.' },
    { area: 'ear', skill: 'Melodies by ear', level: 4, evidence: 'Learns heads without tab.' },
  ],
  gaps: [
    { skill: 'Guide-tone lines', from: 1, to: 4, why: 'Every piece you named needs lines that follow the changes.' },
    { skill: 'Clean 16ths at ♩=98 in 16ths', from: 3, to: 4, why: 'The Kid Charlemagne runs sit just above your clean tempo.' },
    { skill: 'Drop 3 voicings', from: 1, to: 3, why: 'Chord-melody needs them under the melody.' },
  ],
  taste: {
    genres: [
      { id: 'blues', name: 'Blues', rank: 1, depth: 'deep' },
      { id: 'soul', name: 'Soul / R&B', rank: 2, depth: 'solid' },
      { id: 'jazz', name: 'Jazz', rank: 3, depth: 'listening first' },
    ],
    dimensions: [
      { name: 'Harmonically sophisticated ↔ raw', lean: 'leaning sophisticated, blues roots' },
      { name: 'Groove ↔ lead', lean: 'lead, with a comping habit' },
      { name: 'Vintage ↔ modern', lean: 'vintage records, modern players' },
    ],
    inspires: ['Louis Armstrong’s phrasing', 'Stevie’s harmonica', 'Eric Gales going outside and coming back'],
    listening: [
      { artist: 'Wes Montgomery', album: 'Smokin’ at the Half Note', genre: 'Jazz', why: 'The octaves and the blues in his lines are your bridge into jazz.' },
      { artist: 'Grant Green', album: 'Idle Moments', genre: 'Jazz', why: 'Soul-jazz phrasing: simple notes, deep feel.' },
      { artist: 'Cornell Dupree', album: 'Teasin’', genre: 'Soul / R&B', why: 'The fills behind singers you want to play.' },
    ],
  },
  practice: { minutesPerDay: 60, daysPerWeek: 7 },
  modules: FIXTURE_MODULES,
}
