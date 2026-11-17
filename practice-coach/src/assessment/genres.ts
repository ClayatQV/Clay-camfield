/**
 * Genre modules. Blues is the template; the others follow it exactly.
 * Drafts for Clay to mark up — swap artists, songs and questions freely.
 * Every spot-check answer must appear verbatim in its options.
 */
import type { Era, GenreArtist, GenreModule, GenreSong } from './types'

const A = (era: Era, names: string[]): GenreArtist[] =>
  names.map((n) => {
    const m = /^(.*) \((.+)\)$/.exec(n)
    return m ? { name: m[1], era, inst: m[2] } : { name: n, era }
  })
const S = (pairs: [string, string][]): GenreSong[] => pairs.map(([title, artist]) => ({ title, artist }))

export const BLUES: GenreModule = {
  id: 'blues',
  name: 'Blues',
  artists: [
    ...A('roots', ['Robert Johnson', 'Muddy Waters', "Howlin' Wolf", 'T-Bone Walker', 'John Lee Hooker', 'Elmore James', 'Little Walter (harp)']),
    ...A('classic', ['B.B. King', 'Albert King', 'Freddie King', 'Buddy Guy', 'Otis Rush', 'Albert Collins', 'Etta James (voice)', 'Jimi Hendrix', 'Stevie Ray Vaughan', 'Robben Ford']),
    ...A('modern', ['Gary Clark Jr.', 'Christone "Kingfish" Ingram', 'Eric Gales']),
  ],
  songs: S([
    ['Sweet Home Chicago', 'Robert Johnson'],
    ['The Thrill Is Gone', 'B.B. King'],
    ['Pride and Joy', 'Stevie Ray Vaughan'],
    ['Red House', 'Jimi Hendrix'],
    ['Born Under a Bad Sign', 'Albert King'],
    ['Hide Away', 'Freddie King'],
    ['Stormy Monday', 'T-Bone Walker'],
    ['Texas Flood', 'Stevie Ray Vaughan'],
    ['Crossroads', 'Robert Johnson / Cream'],
    ['Hoochie Coochie Man', 'Muddy Waters'],
    ['Everyday I Have the Blues', 'B.B. King'],
    ['Got My Mojo Working', 'Muddy Waters'],
  ]),
  forms: {
    id: 'blues-forms',
    title: 'Blues forms',
    start: 2,
    rungs: [
      { id: 'f1', prompt: 'Can you play a 12-bar blues in any key?', label: '12-bar blues' },
      {
        id: 'f2',
        prompt: 'Do you know the "quick change" (IV chord in bar 2)?',
        label: 'the quick change',
        check: { prompt: 'In a quick-change blues in A, bar 2 is…', options: ['A7', 'D7', 'E7', 'F♯m'], answer: 'D7' },
      },
      { id: 'f3', prompt: 'Can you play an 8-bar blues?', label: '8-bar blues' },
      {
        id: 'f4',
        prompt: 'Can you play a minor blues?',
        label: 'minor blues',
        check: { prompt: 'In a minor blues in A, bar 9 is usually…', options: ['E7', 'F7', 'Dm7', 'G7'], answer: 'F7' },
      },
      { id: 'f5', prompt: 'Can you play a jazz blues (I–IV–I–vi–ii–V, ii–V into IV)?', label: 'jazz blues' },
      { id: 'f6', prompt: 'Can you play a Bird blues ("Blues for Alice" changes)?', label: 'Bird blues' },
    ],
  },
  feels: ['Shuffle', 'Texas shuffle', 'Slow blues in 12/8', 'Chicago', 'Rumba blues', 'Delta / acoustic fingerpicking', 'Boogie', 'Jump blues / swing', 'Funky straight-16ths blues'],
  language: {
    id: 'blues-language',
    title: 'Turnarounds',
    start: 1,
    rungs: [
      { id: 't1', prompt: 'Can you play a basic I–V turnaround?', label: 'basic turnarounds' },
      { id: 't2', prompt: 'Can you play the descending chromatic turnaround lick in E and A?', label: 'chromatic turnaround licks' },
      { id: 't3', prompt: 'Can you play a I–VI–ii–V jazz turnaround?', label: 'jazz turnarounds' },
      { id: 't4', prompt: 'Can you play a tritone-sub turnaround?', label: 'tritone-sub turnarounds' },
    ],
  },
  mustHaves: ['Bends in tune (whole step)', 'Controlled vibrato', 'Call and response with a singer', 'Fills behind a singer', 'Mixing major and minor pentatonic with the chord', 'Targeting the 3rd of the IV chord'],
  applied: [
    {
      id: 'blues-a1',
      kind: 'graded',
      prompt: 'Over the V chord in a blues turnaround, what can you play? Tap all that work.',
      options: [
        { label: 'Minor pentatonic of the key', weight: 1 },
        { label: 'The V7 arpeggio', weight: 2 },
        { label: 'Mixolydian of V', weight: 2 },
        { label: 'Major pentatonic of V', weight: 2 },
        { label: 'Half-whole diminished of V', weight: 3 },
        { label: 'Altered scale of V', weight: 3 },
        { label: 'I just play the box', weight: 0 },
      ],
    },
    { id: 'blues-a2', kind: 'quiz', prompt: 'A blues in A, A7 → D7: the 3rd of A7 (C♯) moves a half step to which note of D7?', options: ['Root', '3rd', '5th', '♭7 (C)'], answer: '♭7 (C)' },
    { id: 'blues-a3', kind: 'quiz', prompt: 'Which note bent toward C♯ gives the classic B.B./Albert "major-minor" sound over A7?', options: ['C (♭3)', 'E (5th)', 'G (♭7)', 'F (♭6)'], answer: 'C (♭3)' },
  ],
}

export const JAZZ: GenreModule = {
  id: 'jazz',
  name: 'Jazz',
  artists: [
    ...A('roots', ['Louis Armstrong (trumpet)', 'Duke Ellington (piano)', 'Django Reinhardt', 'Charlie Christian']),
    ...A('classic', ['Charlie Parker (sax)', 'Dizzy Gillespie (trumpet)', 'Thelonious Monk (piano)', 'Miles Davis (trumpet)', 'John Coltrane (sax)', 'Sonny Rollins (sax)', 'Bill Evans (piano)', 'Ella Fitzgerald (voice)', 'Wes Montgomery', 'Joe Pass', 'Jim Hall', 'Kenny Burrell', 'Grant Green']),
    ...A('modern', ['George Benson', 'Pat Metheny', 'Julian Lage']),
  ],
  songs: S([
    ['Autumn Leaves', 'standard'],
    ['All the Things You Are', 'standard'],
    ['Fly Me to the Moon', 'standard'],
    ['Take the A Train', 'Duke Ellington'],
    ['Blue Bossa', 'Kenny Dorham'],
    ['Summertime', 'Gershwin'],
    ['There Will Never Be Another You', 'standard'],
    ['Misty', 'Erroll Garner'],
    ['Satin Doll', 'Duke Ellington'],
    ['So What', 'Miles Davis'],
    ['Footprints', 'Wayne Shorter'],
    ['Stella by Starlight', 'standard'],
  ]),
  forms: {
    id: 'jazz-forms',
    title: 'Jazz forms',
    start: 2,
    rungs: [
      {
        id: 'f1',
        prompt: 'Can you play through a jazz blues?',
        label: 'jazz blues',
        check: { prompt: 'In C major, the ii–V–I is…', options: ['Dm7–G7–Cmaj7', 'Em7–A7–Dmaj7', 'Am7–D7–Gmaj7', 'Fmaj7–G7–C'], answer: 'Dm7–G7–Cmaj7' },
      },
      { id: 'f2', prompt: 'Can you comp through a 32-bar AABA standard from a lead sheet?', label: '32-bar AABA standards' },
      {
        id: 'f3',
        prompt: 'Can you play a minor ii–V–i (m7♭5–7♭9–m6)?',
        label: 'minor ii–V–i',
        check: { prompt: 'In C minor, the ii chord of a minor ii–V–i is…', options: ['Dm7', 'Dm7♭5', 'D7', 'Dmaj7'], answer: 'Dm7♭5' },
      },
      {
        id: 'f4',
        prompt: 'Can you play rhythm changes?',
        label: 'rhythm changes',
        check: { prompt: '"Rhythm changes" come from which song?', options: ['I Got Rhythm', 'Autumn Leaves', 'Take the A Train', 'Satin Doll'], answer: 'I Got Rhythm' },
      },
      { id: 'f5', prompt: 'Can you play a tune that changes key every few bars (like All the Things You Are)?', label: 'tunes with moving key centers' },
      { id: 'f6', prompt: 'Can you play over Coltrane changes (Giant Steps)?', label: 'Coltrane changes' },
    ],
  },
  feels: ['Medium swing', 'Up-tempo swing', 'Ballad', 'Bossa nova', 'Latin / Afro-Cuban', 'Jazz waltz (3/4)', 'Two-feel'],
  language: {
    id: 'jazz-language',
    title: 'Jazz language',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play the head (melody) of a standard from memory?', label: 'heads from memory' },
      { id: 'l2', prompt: 'Can you comp with shell voicings (root, 3rd, 7th)?', label: 'shell-voicing comping' },
      { id: 'l3', prompt: 'Can you play bebop enclosures (approach a target note from above and below)?', label: 'bebop enclosures' },
      { id: 'l4', prompt: 'Can you play over a ii–V using the bebop scale?', label: 'bebop scale lines' },
      { id: 'l5', prompt: 'Can you play a chord-melody chorus of a standard?', label: 'chord-melody choruses' },
    ],
  },
  mustHaves: ['Swing 8ths', 'Freddie Green–style comping', 'Walking bass lines on guitar', 'Trading 4s', 'Reading a lead sheet', 'Soloing through the changes, not over them'],
  applied: [
    {
      id: 'jazz-a1',
      kind: 'graded',
      prompt: 'Over G7 resolving to Cmaj7, what can you play? Tap all that work.',
      options: [
        { label: 'Just the C major scale', weight: 1 },
        { label: 'G Mixolydian', weight: 1 },
        { label: 'The G7 arpeggio', weight: 1 },
        { label: 'The Dm7 arpeggio (ii over V)', weight: 2 },
        { label: 'G half-whole diminished', weight: 3 },
        { label: 'G altered (A♭ melodic minor)', weight: 3 },
      ],
    },
    { id: 'jazz-a2', kind: 'quiz', prompt: 'The guide tones of G7 are…', options: ['G and D', 'B and F', 'D and F', 'G and B'], answer: 'B and F' },
    { id: 'jazz-a3', kind: 'quiz', prompt: 'The tritone substitute for G7 is…', options: ['D♭7', 'C♯m7', 'A♭7', 'E7'], answer: 'D♭7' },
  ],
}

export const SOUL: GenreModule = {
  id: 'soul',
  name: 'Soul / R&B',
  artists: [
    ...A('roots', ['Ray Charles (voice/piano)', 'Sam Cooke (voice)', 'Otis Redding (voice)', 'Aretha Franklin (voice)', 'Steve Cropper']),
    ...A('classic', ['Marvin Gaye (voice)', 'Stevie Wonder (voice/keys)', 'Al Green (voice)', 'Curtis Mayfield', 'Donny Hathaway (voice/keys)', 'Bill Withers (voice)', 'Cornell Dupree', 'Eric Gale', 'David T. Walker', 'Prince']),
    ...A('modern', ["D'Angelo (voice/keys)", 'Erykah Badu (voice)', 'Isaiah Sharkey', 'Anderson .Paak (voice/drums)', 'H.E.R.']),
  ],
  songs: S([
    ['My Girl', 'The Temptations'],
    ['(Sittin\' On) The Dock of the Bay', 'Otis Redding'],
    ["Let's Stay Together", 'Al Green'],
    ['Superstition', 'Stevie Wonder'],
    ["What's Going On", 'Marvin Gaye'],
    ["Ain't No Sunshine", 'Bill Withers'],
    ['Lean on Me', 'Bill Withers'],
    ['Respect', 'Aretha Franklin'],
    ["Isn't She Lovely", 'Stevie Wonder'],
    ['Use Me', 'Bill Withers'],
    ['Brown Sugar', "D'Angelo"],
    ['People Get Ready', 'Curtis Mayfield'],
  ]),
  forms: {
    id: 'soul-forms',
    title: 'Soul guitar',
    start: 2,
    rungs: [
      { id: 'f1', prompt: 'Can you play the rhythm parts on classic soul songs (like "My Girl" or "Dock of the Bay")?', label: 'classic soul rhythm parts' },
      {
        id: 'f2',
        prompt: 'Can you play Steve Cropper–style double-stop fills in 3rds and 6ths?',
        label: 'Cropper-style double stops',
        check: { prompt: 'A "sixths" fill over a C chord can use which note pair (lower note first)?', options: ['C–E', 'E–C', 'C–G', 'G–C'], answer: 'E–C' },
      },
      { id: 'f3', prompt: 'Can you play Curtis Mayfield / Hendrix–style triad embellishments over one chord?', label: 'Curtis-style triad fills' },
      {
        id: 'f4',
        prompt: 'Can you play neo-soul voicings (maj9, m11, 13) with moving inner voices?',
        label: 'neo-soul voicings',
        check: { prompt: 'Which note turns Am7 into Am9?', options: ['B', 'G', 'F', 'D'], answer: 'B' },
      },
      { id: 'f5', prompt: 'Can you play gospel passing chords (diminished passing chords, walk-ups) in a soul song?', label: 'gospel passing chords' },
    ],
  },
  feels: ['Soul ballad in 12/8', 'Motown backbeat', 'Memphis / Stax groove', 'Philly soul', 'Neo-soul, behind the beat', 'Slow jam'],
  language: {
    id: 'soul-language',
    title: 'Soul language',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play a vocal melody on guitar with singer-like phrasing?', label: 'vocal-style melodies' },
      { id: 'l2', prompt: 'Can you play fills behind a singer without stepping on the vocal?', label: 'fills behind a singer' },
      { id: 'l3', prompt: 'Can you play hammer-on chord embellishments while keeping the groove?', label: 'chord embellishments in the groove' },
      { id: 'l4', prompt: 'Can you voice-lead a ii–V in neo-soul voicings?', label: 'neo-soul voice leading' },
    ],
  },
  mustHaves: ['Double stops in 3rds and 6ths', 'Hendrix-style chord embellishments', 'Muted 16th-note rhythm', 'Playing behind the beat', 'Leaving space for the singer', 'Sliding into chords'],
  applied: [
    {
      id: 'soul-a1',
      kind: 'graded',
      prompt: 'Over an Am9 neo-soul vamp, what works? Tap all.',
      options: [
        { label: 'A natural minor', weight: 1 },
        { label: 'A minor pentatonic', weight: 1 },
        { label: 'The Am7 arpeggio', weight: 1 },
        { label: 'A Dorian', weight: 2 },
        { label: 'E minor pentatonic (the 9th sound)', weight: 2 },
        { label: 'G major triad over A (7, 9, 11)', weight: 3 },
      ],
    },
    { id: 'soul-a2', kind: 'quiz', prompt: 'In a I–vi–IV–V in C, the vi chord is…', options: ['Am', 'Em', 'Dm', 'A7'], answer: 'Am' },
    { id: 'soul-a3', kind: 'quiz', prompt: 'A classic passing chord between C and Dm7 is…', options: ['C♯°7', 'D♭maj7', 'B7', 'F♯m7♭5'], answer: 'C♯°7' },
  ],
}

export const FUNK: GenreModule = {
  id: 'funk',
  name: 'Funk',
  artists: [
    ...A('roots', ['James Brown (voice)', 'Jimmy Nolen', 'Catfish Collins', 'Bootsy Collins (bass)', 'Sly & the Family Stone', 'Larry Graham (bass)', 'George Clinton / P-Funk', 'Eddie Hazel', 'The Meters (Leo Nocentelli)']),
    ...A('classic', ['Tower of Power', 'Earth, Wind & Fire (Al McKay)', 'Nile Rodgers', 'Kool & the Gang', 'Chaka Khan & Rufus', 'Prince']),
    ...A('modern', ['Vulfpeck', 'Cory Wong', 'Mark Lettieri', 'Snarky Puppy', 'Lettuce']),
  ],
  songs: S([
    ['Sex Machine', 'James Brown'],
    ['Cold Sweat', 'James Brown'],
    ['Cissy Strut', 'The Meters'],
    ['What Is Hip?', 'Tower of Power'],
    ['Thank You (Falettinme Be Mice Elf Agin)', 'Sly & the Family Stone'],
    ['Le Freak', 'Chic'],
    ['Chameleon', 'Herbie Hancock'],
    ['Pick Up the Pieces', 'Average White Band'],
    ['Kiss', 'Prince'],
    ['Dean Town', 'Vulfpeck'],
  ]),
  forms: {
    id: 'funk-forms',
    title: 'Funk rhythm',
    start: 2,
    rungs: [
      { id: 'f1', prompt: 'Can you hold a one-chord funk vamp for two minutes without losing the pocket?', label: 'one-chord vamps' },
      {
        id: 'f2',
        prompt: 'Can you play 16th-note scratch rhythm with muted strums?',
        label: '16th-note scratch rhythm',
        check: { prompt: 'In 16th-note funk strumming, the strumming hand…', options: ['Keeps moving on every 16th', 'Only moves on beats 1 and 3', 'Strums once per bar', 'Plays only downstrokes'], answer: 'Keeps moving on every 16th' },
      },
      { id: 'f3', prompt: 'Can you play a part that interlocks with the bass and drums, leaving space?', label: 'interlocking parts' },
      { id: 'f4', prompt: 'Can you play Nile Rodgers / Jimmy Nolen single-note lines locked to the hi-hat?', label: 'single-note funk lines' },
      { id: 'f5', prompt: 'Can you play syncopated chord stabs with ghost notes at 100+ bpm?', label: 'fast syncopated stabs' },
    ],
  },
  feels: ['16th-note funk', 'On the "one" (James Brown)', 'New Orleans second line', 'Disco (four on the floor)', 'Minneapolis (Prince)', 'Modern lead-rhythm (Vulfpeck / Cory Wong)'],
  language: {
    id: 'funk-language',
    title: 'Funk chords and lines',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play 9th-chord funk shapes (like E9 on the top four strings)?', label: '9th-chord shapes' },
      { id: 'l2', prompt: 'Can you play half-step slides into 9th chords?', label: 'sliding 9th chords' },
      { id: 'l3', prompt: 'Can you play 7♯9 and 13 chord stabs?', label: '7♯9 and 13 stabs' },
      { id: 'l4', prompt: 'Can you play muted single-note riffs from Dorian and Mixolydian?', label: 'muted modal riffs' },
    ],
  },
  mustHaves: ['A constant 16th-note strumming hand', 'Left-hand muting', 'Ghost notes', 'Landing on the one', 'Locking with the hi-hat', 'Wah technique'],
  applied: [
    { id: 'funk-a1', kind: 'quiz', prompt: 'The classic Jimmy Nolen funk chord on E is usually…', options: ['E9', 'Emaj7', 'Esus2', 'E5'], answer: 'E9' },
    { id: 'funk-a2', kind: 'quiz', prompt: 'Over a one-chord E9 vamp, which scale fits single-note riffs best?', options: ['E Mixolydian', 'E Lydian', 'E Ionian', 'E Phrygian'], answer: 'E Mixolydian' },
  ],
}

export const GOSPEL: GenreModule = {
  id: 'gospel',
  name: 'Gospel',
  artists: [
    ...A('roots', ['Mahalia Jackson (voice)', 'Sister Rosetta Tharpe', 'Pops Staples / The Staple Singers', 'Andraé Crouch', 'Edwin Hawkins', 'Walter Hawkins', 'The Clark Sisters']),
    ...A('classic', ['Richard Smallwood', 'Kirk Franklin', 'Fred Hammond', 'Hezekiah Walker', 'Marvin Sapp', 'CeCe Winans', 'Smokie Norful', 'Israel Houghton', 'Kim Burrell']),
    ...A('modern', ['Tye Tribbett', 'Cory Henry (keys)', 'Jonathan McReynolds', 'Isaiah Sharkey']),
  ],
  songs: S([
    ['Amazing Grace', 'hymn'],
    ['Oh Happy Day', 'Edwin Hawkins Singers'],
    ['Precious Lord, Take My Hand', 'Thomas A. Dorsey'],
    ['Total Praise', 'Richard Smallwood'],
    ['I Need You to Survive', 'Hezekiah Walker'],
    ['Never Would Have Made It', 'Marvin Sapp'],
    ['Take Me to the King', 'Tamela Mann'],
    ['Stomp', 'Kirk Franklin'],
    ['Encourage Yourself', 'Donald Lawrence'],
    ['Something Happens', 'Cory Henry'],
  ]),
  forms: {
    id: 'gospel-forms',
    title: 'Gospel harmony',
    start: 2,
    rungs: [
      {
        id: 'f1',
        prompt: 'Can you play a 1–4–5 song in any key from Nashville numbers?',
        label: 'Nashville-number 1–4–5s',
        check: { prompt: 'A 1–4–5 in E♭ is…', options: ['E♭ A♭ B♭', 'E♭ G♭ B♭', 'E♭ A B♭', 'E♭ F G'], answer: 'E♭ A♭ B♭' },
      },
      { id: 'f2', prompt: 'Can you play the 1–3–4 gospel progression with a dominant III chord?', label: 'the 1–3–4 progression' },
      {
        id: 'f3',
        prompt: 'Can you play diminished passing chords (like ♯1°7 and ♯4°7)?',
        label: 'diminished passing chords',
        check: { prompt: 'In C, a gospel passing chord between F and G is…', options: ['F♯°7', 'E7', 'A♭maj7', 'D7'], answer: 'F♯°7' },
      },
      { id: 'f4', prompt: 'Can you play a 3–6–2–5–1 turnaround with dominant 7ths?', label: '3–6–2–5–1 turnarounds' },
      { id: 'f5', prompt: 'Can you reharmonize a hymn with extended chords (9ths, 13ths, sus)?', label: 'hymn reharmonization' },
    ],
  },
  feels: ['Church shout (fast 16ths)', 'Slow 12/8 worship', 'Praise break', 'Contemporary gospel / R&B groove', 'Gospel shuffle', 'Hymn / ballad'],
  language: {
    id: 'gospel-language',
    title: 'Playing in church',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you follow a worship leader by ear without a chart?', label: 'following by ear' },
      { id: 'l2', prompt: 'Can you change key on the fly (the half-step lift)?', label: 'key changes on the fly' },
      { id: 'l3', prompt: 'Can you play gospel licks with the 6th and 9th and chromatic passing notes?', label: 'gospel licks' },
      { id: 'l4', prompt: 'Can you play shout music (fast 16th-note lines) in time?', label: 'shout music' },
    ],
  },
  mustHaves: ['Nashville numbers', 'Following cues and stops', 'Half-step key lifts', 'Volume swells and pads', 'Playing to a vocalist', 'Sus4 → 3 resolutions'],
  applied: [
    { id: 'gospel-a1', kind: 'quiz', prompt: 'In C, the "3" chord in a 1–3–4 gospel progression is usually played as…', options: ['Em7', 'E7', 'Emaj7', 'E°'], answer: 'E7' },
    {
      id: 'gospel-a2',
      kind: 'graded',
      prompt: 'Over a sustained C chord in a slow worship song, what can you play? Tap all.',
      options: [
        { label: 'C major scale', weight: 1 },
        { label: 'C major pentatonic', weight: 1 },
        { label: 'Major pentatonic with the ♭3 passing note', weight: 2 },
        { label: 'Triads from the key moving over C (F/C, G/C)', weight: 2 },
        { label: 'Upper-structure triads (D/C for the Lydian sound)', weight: 3 },
      ],
    },
  ],
}

export const COUNTRY: GenreModule = {
  id: 'country',
  name: 'Country',
  artists: [
    ...A('roots', ['Hank Williams (voice)', 'Johnny Cash (voice)', 'Merle Haggard', 'Willie Nelson', 'Dolly Parton (voice)', 'Buck Owens & Don Rich', 'Chet Atkins', 'Jerry Reed', 'Glen Campbell', 'James Burton']),
    ...A('classic', ['Albert Lee', 'Danny Gatton', 'Vince Gill', 'Marty Stuart', 'Brent Mason']),
    ...A('modern', ['Brad Paisley', 'Keith Urban', 'Chris Stapleton', 'Sturgill Simpson', 'Daniel Donato']),
  ],
  songs: S([
    ['I Walk the Line', 'Johnny Cash'],
    ['Folsom Prison Blues', 'Johnny Cash'],
    ['Mama Tried', 'Merle Haggard'],
    ['Act Naturally', 'Buck Owens'],
    ['Jolene', 'Dolly Parton'],
    ['On the Road Again', 'Willie Nelson'],
    ['He Stopped Loving Her Today', 'George Jones'],
    ['Amarillo by Morning', 'George Strait'],
    ['Tennessee Whiskey', 'Chris Stapleton'],
    ["Workin' Man Blues", 'Merle Haggard'],
  ]),
  forms: {
    id: 'country-forms',
    title: 'Country guitar',
    start: 2,
    rungs: [
      { id: 'f1', prompt: 'Can you play a I–IV–V country song with boom-chick (bass note, then strum)?', label: 'boom-chick rhythm' },
      {
        id: 'f2',
        prompt: 'Can you play bass-note walk-ups and walk-downs between chords?',
        label: 'bass walk-ups',
        check: { prompt: 'Walking up from G to C, a common bass line is…', options: ['G–A–B–C', 'G–F–E–C', 'G–B–D–C', 'G–D–A–C'], answer: 'G–A–B–C' },
      },
      {
        id: 'f3',
        prompt: 'Can you Travis pick (alternating thumb with melody on top)?',
        label: 'Travis picking',
        check: { prompt: 'In Travis picking, the thumb usually…', options: ['Alternates between two bass strings', 'Plays only the melody', 'Strums the chord', 'Stays on the high E'], answer: 'Alternates between two bass strings' },
      },
      { id: 'f4', prompt: "Can you play hybrid-picked chicken pickin' licks?", label: "chicken pickin'" },
      { id: 'f5', prompt: 'Can you play pedal-steel-style bends (bend one note while holding another)?', label: 'pedal-steel bends' },
    ],
  },
  feels: ['Train beat', 'Two-step', 'Country shuffle', 'Country waltz', 'Bakersfield twang', 'Country rock'],
  language: {
    id: 'country-language',
    title: 'Country licks',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play major-pentatonic country licks with the ♭3 → 3 slide?', label: 'major-pentatonic country licks' },
      { id: 'l2', prompt: 'Can you play double-stop bends?', label: 'double-stop bends' },
      { id: 'l3', prompt: 'Can you play hybrid-picking licks at speed?', label: 'fast hybrid picking' },
      { id: 'l4', prompt: 'Can you play banjo-roll / cascading open-string licks?', label: 'cascading open-string licks' },
    ],
  },
  mustHaves: ['Boom-chick rhythm', 'Hybrid picking', 'Oblique bends', 'Open-string licks', 'Capo fluency', 'Fills between vocal lines'],
  applied: [
    { id: 'country-a1', kind: 'quiz', prompt: 'The G major pentatonic scale is…', options: ['G A B D E', 'G B♭ C D F', 'G A B C D E F♯', 'G B D F'], answer: 'G A B D E' },
    {
      id: 'country-a2',
      kind: 'graded',
      prompt: 'Over a D7 in a country shuffle, what can you play? Tap all.',
      options: [
        { label: 'D minor pentatonic only', weight: 1 },
        { label: 'D major pentatonic', weight: 1 },
        { label: 'D Mixolydian', weight: 2 },
        { label: 'Major pentatonic with the ♭3 (country-blues mix)', weight: 2 },
        { label: 'D7 arpeggio with chromatic passing notes (Brent Mason style)', weight: 3 },
      ],
    },
  ],
}

export const BLUEGRASS: GenreModule = {
  id: 'bluegrass',
  name: 'Bluegrass',
  artists: [
    ...A('roots', ['Bill Monroe (mandolin)', 'Flatt & Scruggs', 'Doc Watson', 'Clarence White', 'Ralph Stanley (banjo/voice)', 'Jimmy Martin', 'Norman Blake']),
    ...A('classic', ['Tony Rice', 'J.D. Crowe (banjo)', 'Del McCoury', 'Sam Bush (mandolin)', 'Jerry Douglas (dobro)', 'Béla Fleck (banjo)', 'Alison Krauss (fiddle/voice)', 'Dan Tyminski', 'Bryan Sutton']),
    ...A('modern', ['Chris Thile (mandolin)', 'Molly Tuttle', 'Sierra Hull (mandolin)', 'Billy Strings']),
  ],
  songs: S([
    ['Blackberry Blossom', 'fiddle tune'],
    ['Salt Creek', 'fiddle tune'],
    ['Whiskey Before Breakfast', 'fiddle tune'],
    ['Big Sciota', 'fiddle tune'],
    ['Nine Pound Hammer', 'traditional'],
    ['Foggy Mountain Breakdown', 'Flatt & Scruggs'],
    ['Man of Constant Sorrow', 'traditional'],
    ["Soldier's Joy", 'fiddle tune'],
    ['Wildwood Flower', 'The Carter Family'],
    ['Red Haired Boy', 'fiddle tune'],
  ]),
  forms: {
    id: 'bluegrass-forms',
    title: 'Bluegrass guitar',
    start: 2,
    rungs: [
      { id: 'f1', prompt: 'Can you play boom-chuck rhythm (bass note + chop) in G, C and D?', label: 'boom-chuck rhythm' },
      {
        id: 'f2',
        prompt: 'Can you play the G-run?',
        label: 'the G-run',
        check: { prompt: 'The G-run ends on which note?', options: ['G', 'D', 'B', 'E'], answer: 'G' },
      },
      {
        id: 'f3',
        prompt: 'Can you play an AABB fiddle-tune melody at 90+ bpm?',
        label: 'fiddle tunes at tempo',
        check: { prompt: 'In an AABB fiddle tune, each part is played…', options: ['Once', 'Twice', 'Three times', 'Four times'], answer: 'Twice' },
      },
      { id: 'f4', prompt: 'Can you crosspick (Clarence White / Tony Rice style)?', label: 'crosspicking' },
      { id: 'f5', prompt: 'Can you improvise a break around a melody instead of just playing it?', label: 'improvised breaks' },
    ],
  },
  feels: ['Breakdown (fast two-beat)', 'Bluegrass waltz', 'Old-time', 'Newgrass', 'Slow ballad'],
  language: {
    id: 'bluegrass-language',
    title: 'Flatpicking',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play Carter-style melody with strums in between?', label: 'Carter-style picking' },
      { id: 'l2', prompt: 'Can you flatpick a fiddle-tune break at 100 bpm?', label: 'flatpicked breaks' },
      { id: 'l3', prompt: 'Can you crosspick through chord changes?', label: 'crosspicking through changes' },
      { id: 'l4', prompt: 'Can you improvise Rice/Sutton-style with open strings and chromatics?', label: 'open-string improvisation' },
    ],
  },
  mustHaves: ['Down-up alternate picking', 'Capo keys (B♭, B, E with G and D shapes)', 'The G-run', 'Holding rhythm while others take breaks', 'Timing at 120+ bpm', 'Open-position fluency in G, C, D, A'],
  applied: [
    { id: 'bluegrass-a1', kind: 'quiz', prompt: 'To play in B♭ with G-chord shapes, you capo at…', options: ['Fret 3', 'Fret 5', 'Fret 2', 'Fret 1'], answer: 'Fret 3' },
    { id: 'bluegrass-a2', kind: 'quiz', prompt: 'In boom-chuck rhythm, the "chuck" lands on…', options: ['Beats 2 and 4', 'Beats 1 and 3', 'Every 8th note', 'Beat 1 only'], answer: 'Beats 2 and 4' },
  ],
}

export const REGGAE: GenreModule = {
  id: 'reggae',
  name: 'Reggae',
  artists: [
    ...A('roots', ['Desmond Dekker (voice)', 'Toots & the Maytals', 'Ernest Ranglin', 'Jimmy Cliff (voice)']),
    ...A('classic', ['Bob Marley', 'Peter Tosh', 'Bunny Wailer', 'Burning Spear', 'Lee "Scratch" Perry (producer)', 'Dennis Brown (voice)', 'Gregory Isaacs (voice)', 'Earl "Chinna" Smith', 'Junior Marvin', 'Sly & Robbie (drums/bass)', 'Black Uhuru', 'Steel Pulse']),
    ...A('modern', ['Damian Marley', 'Chronixx', 'Protoje', 'Koffee']),
  ],
  songs: S([
    ['No Woman, No Cry', 'Bob Marley'],
    ['Three Little Birds', 'Bob Marley'],
    ['Stir It Up', 'Bob Marley'],
    ['One Love', 'Bob Marley'],
    ['Redemption Song', 'Bob Marley'],
    ['Could You Be Loved', 'Bob Marley'],
    ['Pressure Drop', 'Toots & the Maytals'],
    ['The Harder They Come', 'Jimmy Cliff'],
    ['Israelites', 'Desmond Dekker'],
    ['Legalize It', 'Peter Tosh'],
  ]),
  forms: {
    id: 'reggae-forms',
    title: 'Reggae guitar',
    start: 2,
    rungs: [
      {
        id: 'f1',
        prompt: 'Can you play the reggae skank (short chop on the offbeat)?',
        label: 'the skank',
        check: { prompt: 'In a one-drop groove, the guitar skank lands on…', options: ['Beats 2 and 4', 'Beat 1', 'Beat 3 only', 'Every 16th note'], answer: 'Beats 2 and 4' },
      },
      { id: 'f2', prompt: 'Can you play a tight, muted chop (releasing the chord right after the strum)?', label: 'muted chops' },
      { id: 'f3', prompt: 'Can you play the double-chop / "bubble" pattern on guitar?', label: 'the bubble' },
      { id: 'f4', prompt: 'Can you play picked lead lines that double the bass in octaves?', label: 'octave bass doubles' },
      { id: 'f5', prompt: 'Can you switch between one drop, rockers and steppers feels?', label: 'one drop, rockers and steppers' },
    ],
  },
  feels: ['Ska', 'Rocksteady', 'One drop', 'Rockers', 'Steppers', 'Dancehall', 'Dub'],
  language: {
    id: 'reggae-language',
    title: 'Reggae language',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play minor-key reggae progressions (i–iv, i–♭VII)?', label: 'minor-key progressions' },
      { id: 'l2', prompt: 'Can you play melodies in octaves with the picking hand muted?', label: 'octave melodies' },
      { id: 'l3', prompt: 'Can you play Ernest Ranglin–style jazz-ska lead lines?', label: 'Ranglin-style lines' },
      { id: 'l4', prompt: 'Can you use space and delay the way dub does?', label: 'dub space' },
    ],
  },
  mustHaves: ['Staccato chops', 'Left-hand muting', 'Never playing on beat 1', 'Octave melodies', 'Laying back on the beat', 'Leaving space'],
  applied: [
    { id: 'reggae-a1', kind: 'quiz', prompt: 'The "one drop" is named for the kick drum landing on…', options: ['Beat 3', 'Beat 1', 'Every beat', 'Beat 2'], answer: 'Beat 3' },
    { id: 'reggae-a2', kind: 'quiz', prompt: 'In ska, the guitar upstroke usually falls on…', options: ['Every offbeat (the "and" of each beat)', 'Beats 2 and 4 only', 'Beat 1', 'Beat 3'], answer: 'Every offbeat (the "and" of each beat)' },
  ],
}

export const ROCK: GenreModule = {
  id: 'rock',
  name: 'Rock',
  artists: [
    ...A('roots', ['Chuck Berry', 'Scotty Moore', 'George Harrison', 'Keith Richards']),
    ...A('classic', ['Jimi Hendrix', 'Eric Clapton', 'Jeff Beck', 'Jimmy Page', 'Duane Allman', 'David Gilmour', 'Brian May', 'Mark Knopfler', 'Eddie Van Halen', 'Angus Young']),
    ...A('modern', ['The Edge', 'Slash', 'John Frusciante', 'Tom Morello', 'Jack White', 'Derek Trucks']),
  ],
  songs: S([
    ['Johnny B. Goode', 'Chuck Berry'],
    ['Sunshine of Your Love', 'Cream'],
    ['Purple Haze', 'Jimi Hendrix'],
    ['Whole Lotta Love', 'Led Zeppelin'],
    ['Comfortably Numb', 'Pink Floyd'],
    ['Sultans of Swing', 'Dire Straits'],
    ['Hotel California', 'Eagles'],
    ['Back in Black', 'AC/DC'],
    ["Sweet Child O' Mine", "Guns N' Roses"],
    ['Little Wing', 'Jimi Hendrix'],
  ]),
  forms: {
    id: 'rock-forms',
    title: 'Rock guitar',
    start: 2,
    rungs: [
      {
        id: 'f1',
        prompt: 'Can you play power chords with palm muting?',
        label: 'power chords and palm muting',
        check: { prompt: 'A power chord contains…', options: ['Root and 5th', 'Root and 3rd', 'Root and 4th', 'Root, 3rd and 5th'], answer: 'Root and 5th' },
      },
      { id: 'f2', prompt: 'Can you play classic riffs straight from the records?', label: 'classic riffs' },
      { id: 'f3', prompt: 'Can you solo over a rock song with pentatonics and bends?', label: 'pentatonic rock solos' },
      { id: 'f4', prompt: 'Can you play open-string riffs and in drop D?', label: 'open-string and drop D riffs' },
      { id: 'f5', prompt: 'Can you play full parts (rhythm and lead) from records, like "Comfortably Numb"?', label: 'full record parts' },
    ],
  },
  feels: ['Straight-8th rock', 'Rock shuffle', 'Half-time', 'Hard rock', 'Punk (down-picked 8ths)', 'Southern rock'],
  language: {
    id: 'rock-language',
    title: 'Rock lead',
    start: 1,
    rungs: [
      { id: 'l1', prompt: 'Can you play pentatonic licks in all five positions?', label: 'pentatonic in all positions' },
      { id: 'l2', prompt: 'Can you bend in tune with expressive vibrato (Gilmour-style)?', label: 'bends and vibrato with feel' },
      { id: 'l3', prompt: 'Can you mix major and minor pentatonic (Allman / Clapton style)?', label: 'major/minor pentatonic mixing' },
      { id: 'l4', prompt: 'Can you use Dorian and Mixolydian colors in rock solos?', label: 'modal colors' },
      { id: 'l5', prompt: 'Can you play slide guitar?', label: 'slide' },
    ],
  },
  mustHaves: ['Palm muting', 'Down-picking stamina', 'Bends in tune', 'Wide vibrato', 'Muting unused strings at volume', 'Riff accuracy'],
  applied: [
    { id: 'rock-a1', kind: 'quiz', prompt: 'Over a rock song with E, A and D chords, which pentatonic fits all three?', options: ['E minor pentatonic', 'B minor pentatonic', 'C♯ minor pentatonic', 'F minor pentatonic'], answer: 'E minor pentatonic' },
    {
      id: 'rock-a2',
      kind: 'graded',
      prompt: 'Over an A7 in a rock-blues shuffle, what can you play? Tap all.',
      options: [
        { label: 'Just the A minor pentatonic box', weight: 1 },
        { label: 'A major pentatonic', weight: 2 },
        { label: 'Mixing A major and minor pentatonic', weight: 2 },
        { label: 'A Mixolydian', weight: 2 },
        { label: 'Targeting A7 chord tones (Allman-style)', weight: 3 },
      ],
    },
  ],
}

export const GENRE_MODULES: GenreModule[] = [BLUES, JAZZ, SOUL, FUNK, GOSPEL, COUNTRY, BLUEGRASS, REGGAE, ROCK]

/** Every genre a player can pick. Ones without a module are taste-only for now. */
export const GENRE_OPTIONS = [
  { id: 'blues', label: 'Blues' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'soul', label: 'Soul / R&B' },
  { id: 'gospel', label: 'Gospel' },
  { id: 'funk', label: 'Funk' },
  { id: 'rock', label: 'Rock' },
  { id: 'country', label: 'Country' },
  { id: 'bluegrass', label: 'Bluegrass' },
  { id: 'reggae', label: 'Reggae' },
  { id: 'latin', label: 'Latin' },
  { id: 'fusion', label: 'Fusion' },
  { id: 'worship', label: 'Worship' },
  { id: 'folk', label: 'Singer-songwriter / Folk' },
  { id: 'metal', label: 'Metal' },
  { id: 'pop', label: 'Pop' },
]

export const moduleFor = (id: string) => GENRE_MODULES.find((g) => g.id === id)
export const genreName = (id: string) => GENRE_OPTIONS.find((g) => g.id === id)?.label ?? id

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
