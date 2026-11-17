/** Fixed questions: style, technique/timing habits, playing experience, goals and learning. */
import type { Opt, Screen } from './types'

const o = (pairs: [string, string][]): Opt[] => pairs.map(([id, label]) => ({ id, label }))

export const ROLE_OPTS = o([
  ['soloist', 'Soloist'],
  ['rhythm', 'Rhythm / comping'],
  ['chordmelody', 'Chord-melody / solo guitar'],
  ['singer', 'Singer who plays'],
  ['session', 'Session / sideman'],
  ['worship', 'Worship band'],
  ['songwriter', 'Songwriter'],
])

export const TECHNIQUE: Screen = {
  id: 'technique',
  section: 'skills',
  kind: 'multi',
  eyebrow: 'Technique',
  prompt: 'Tap what you can do cleanly.',
  noneLabel: 'None of these yet',
  options: o([
    ['alternate', 'Alternate picking'],
    ['economy', 'Economy picking'],
    ['legato', 'Legato (hammer-ons, pull-offs)'],
    ['hybrid', 'Hybrid picking'],
    ['sweep', 'Sweep picking'],
    ['tapping', 'Tapping'],
    ['skipping', 'String skipping'],
    ['muting', 'Clean muting'],
  ]),
}

export const SPEED: Screen = {
  id: 'speed',
  section: 'skills',
  kind: 'one',
  eyebrow: 'Technique',
  prompt: 'Fastest tempo you can play clean 16th notes?',
  options: o([
    ['lt80', 'Under 80 bpm'],
    ['80', '80–100 bpm'],
    ['100', '100–120 bpm'],
    ['120', '120+ bpm'],
  ]),
}

export const TIMING: Screen = {
  id: 'timing',
  section: 'skills',
  kind: 'multi',
  eyebrow: 'Timing and feel',
  prompt: 'Tap what’s true for you.',
  noneLabel: 'None of these',
  options: o([
    ['metronome', 'I practice with a metronome'],
    ['two-four', 'I can put the click on 2 and 4'],
    ['drummer', 'I play with a live drummer weekly'],
    ['swing', 'I can switch between swing and straight on demand'],
    ['pocket', 'I can hold 16th-note funk rhythm in the pocket'],
    ['placement', 'I play behind or ahead of the beat on purpose'],
    ['record', 'I record myself and listen back'],
  ]),
}

export const VOCAB: Screen = {
  id: 'vocab',
  section: 'skills',
  kind: 'one',
  eyebrow: 'Vocabulary',
  prompt: 'How many licks or phrases can you play in any key?',
  options: o([
    ['0', 'None yet'],
    ['1', '1–5'],
    ['6', '6–20'],
    ['20', 'More than 20'],
  ]),
}

export const SAME_LICKS: Screen = {
  id: 'samelicks',
  section: 'skills',
  kind: 'yn',
  eyebrow: 'Vocabulary',
  prompt: 'When you solo, do the same licks keep coming out?',
}

export const READING: Screen = {
  id: 'reading',
  section: 'skills',
  kind: 'multi',
  eyebrow: 'Reading',
  prompt: 'What can you read?',
  noneLabel: 'None of these',
  options: o([
    ['tab', 'Tab'],
    ['charts', 'Chord charts'],
    ['nashville', 'Nashville number charts'],
    ['leadsheets', 'Lead sheets'],
    ['notation', 'Standard notation (slowly)'],
    ['sightread', 'Sight-reading'],
  ]),
}

export const EXPERIENCE: Screen[] = [
  {
    id: 'x1',
    section: 'experience',
    kind: 'one',
    prompt: 'What’s the highest level you’ve ever played at?',
    options: o([
      ['self', 'Just for myself'],
      ['jams', 'Jams and open mics'],
      ['local', 'A local band'],
      ['regional', 'A regional act'],
      ['national', 'A nationally touring artist'],
      ['major', 'A major-label artist'],
    ]),
  },
  {
    id: 'x2',
    section: 'experience',
    kind: 'one',
    prompt: 'How often do you play out now?',
    options: o([
      ['never', 'Never'],
      ['yearly', 'A few times a year'],
      ['monthly', 'Monthly'],
      ['weekly', 'Weekly'],
      ['nightly', 'Several nights a week'],
    ]),
  },
  {
    id: 'x3',
    section: 'experience',
    kind: 'multi',
    prompt: 'Where do you play?',
    noneLabel: 'Nowhere yet',
    options: o([
      ['bedroom', 'My bedroom'],
      ['jams', 'Open mics / jams'],
      ['church', 'Church'],
      ['bars', 'Bars'],
      ['clubs', 'Clubs / theaters'],
      ['festivals', 'Festivals / arenas'],
      ['online', 'Online / streaming'],
    ]),
  },
  {
    id: 'x4',
    section: 'experience',
    kind: 'multi',
    prompt: 'What do you play?',
    noneLabel: 'None of these',
    options: o([
      ['originals', 'Originals'],
      ['covers', 'Covers'],
      ['worship', 'Worship'],
      ['sessions', 'Sessions'],
      ['events', 'Weddings / corporate'],
      ['teaching', 'Teaching'],
    ]),
  },
  {
    id: 'x5',
    section: 'experience',
    kind: 'one',
    prompt: 'Studio experience?',
    options: o([
      ['never', 'Never recorded'],
      ['home', 'Home recordings'],
      ['others', 'Played on others’ records'],
      ['paid', 'Paid session player'],
    ]),
  },
  {
    id: 'x6',
    section: 'experience',
    kind: 'one',
    prompt: 'Any releases?',
    options: o([
      ['none', 'None'],
      ['indie', 'Independent'],
      ['label', 'Label'],
    ]),
  },
]

export const GOAL_OPTS = o([
  ['changes', 'Playing over changes'],
  ['fretboard', 'Knowing the fretboard'],
  ['jazzvocab', 'Jazz vocabulary'],
  ['chordmelody', 'Chord-melody'],
  ['voicings', 'Chord voicings'],
  ['speed', 'Speed and technique'],
  ['groove', 'Rhythm and groove'],
  ['theory', 'Theory'],
  ['ear', 'Ear training'],
  ['phrasing', 'Phrasing and feel'],
  ['songwriting', 'Songwriting'],
  ['reading', 'Reading'],
])

export const GOALS: Screen[] = [
  {
    id: 'g1',
    section: 'goals',
    kind: 'multi',
    max: 2,
    prompt: 'What are you practicing for? Pick up to 2.',
    options: o([
      ['gigs', 'Being gig-ready'],
      ['church', 'Church'],
      ['recording', 'Recording'],
      ['jamming', 'Jamming with friends'],
      ['comeback', 'Getting back to pro level'],
      ['growth', 'Personal growth'],
      ['teaching', 'Teaching'],
    ]),
  },
  { id: 'g2', section: 'goals', kind: 'multi', max: 3, prompt: 'What do you want to get better at next? Pick up to 3.', options: GOAL_OPTS },
  {
    id: 'g3',
    section: 'goals',
    kind: 'one',
    prompt: 'How long is this push?',
    options: o([
      ['4w', '4 weeks'],
      ['3m', '3 months'],
      ['6m', '6 months'],
      ['ongoing', 'Ongoing'],
    ]),
  },
  {
    id: 'g4',
    section: 'goals',
    kind: 'one',
    prompt: 'How many minutes a day can you practice?',
    options: o([
      ['15', '15'],
      ['30', '30'],
      ['45', '45'],
      ['60', '60'],
      ['90', '90+'],
    ]),
  },
  {
    id: 'g5',
    section: 'goals',
    kind: 'one',
    prompt: 'How many days a week?',
    options: o([
      ['3', '3'],
      ['4', '4'],
      ['5', '5'],
      ['6', '6'],
      ['7', '7'],
    ]),
  },
  {
    id: 'g6',
    section: 'goals',
    kind: 'multi',
    prompt: 'What’s your setup?',
    options: o([
      ['phone', 'Phone'],
      ['tablet', 'Tablet'],
      ['laptop', 'Laptop'],
      ['electric', 'Electric, unplugged'],
      ['amp', 'An amp'],
      ['acoustic', 'Acoustic'],
      ['headphones', 'Headphone amp'],
    ]),
  },
  { id: 'g7', section: 'goals', kind: 'text', max: 3, prompt: 'Any songs you want to learn? (optional)', placeholder: 'Song — artist' },
  {
    id: 'l1',
    section: 'goals',
    kind: 'multi',
    prompt: 'What do you already learn from?',
    noneLabel: 'None of these',
    options: o([
      ['transcriptions', 'YouTube transcriptions (tab on screen)'],
      ['tutorials', 'Lesson / tutorial videos'],
      ['tabsites', 'Tab websites'],
      ['books', 'Books'],
      ['teacher', 'A teacher'],
      ['ear', 'Learning by ear from records'],
      ['theory', 'Theory content'],
    ]),
  },
  {
    id: 'l2',
    section: 'goals',
    kind: 'one',
    prompt: 'When you learn a solo, you usually…',
    options: o([
      ['tab', 'Read tab while listening'],
      ['ear', 'Learn it by ear, then check'],
      ['loop', 'Slow it down and loop it'],
      ['mix', 'A mix of these'],
    ]),
  },
  { id: 'l3', section: 'goals', kind: 'yn', prompt: 'Do you have a set practice routine right now?' },
]
