import type { RepertoireTune } from './types'

export const REPERTOIRE: RepertoireTune[] = [
  { title: "They Can't Take That Away From Me", artist: 'Ella & Louis', lane: 'standard', blocks: [1, 2, 5] },
  { title: 'Cheek to Cheek', artist: 'Ella & Louis', lane: 'standard', blocks: [2, 3, 5] },
  { title: 'Tenderly', artist: 'Ella & Louis', lane: 'ballad', blocks: [5, 6] },
  { title: 'Moonlight in Vermont', artist: 'Ella & Louis', lane: 'ballad', blocks: [5, 6] },
  { title: 'Superwoman', artist: 'Stevie Wonder', lane: 'soul harmony', blocks: [4, 5] },
  { title: 'As', artist: 'Stevie Wonder', lane: 'soul harmony', blocks: [4, 8] },
  { title: 'Too Shy to Say', artist: 'Stevie Wonder', lane: 'soul ballad', blocks: [4, 6] },
  { title: 'At Last', artist: 'Etta James', lane: 'soul ballad', blocks: [2, 6] },
  { title: "Let's Stay Together", artist: 'Al Green', lane: 'soul groove', blocks: [4, 8] },
  { title: 'Amazing Grace', artist: 'Isaiah Sharkey', lane: 'gospel chord-melody', blocks: [2, 6] },
  { title: 'Something Happens', artist: 'Cory Henry', lane: 'gospel', blocks: [2, 4] },
  { title: 'Spanish Joint', artist: "D'Angelo", lane: 'groove', blocks: [7, 8] },
  { title: 'Trinity', artist: 'Snarky Puppy', lane: 'fusion groove', blocks: [7, 8] },
  { title: 'I Can Feel You Smiling', artist: 'Tedeschi Trucks Band', lane: 'soul-blues', blocks: [3, 5] },
  { title: 'Save Me', artist: 'Marcus King', lane: 'soul-blues', blocks: [3, 7] },
]

export const tunesForBlock = (n: number) => REPERTOIRE.filter((t) => t.blocks.includes(n))
