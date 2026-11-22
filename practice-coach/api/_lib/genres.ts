/** Genres a module can emphasize or listen in. Shared by the prompts and the genre drop-down. */
export const GENRES = [
  'Blues',
  'Rock',
  'Jazz',
  'Soul / R&B',
  'Funk',
  'Gospel / worship',
  'Country',
  'Bluegrass',
  'Folk / singer-songwriter',
  'Reggae',
  'Latin',
  'Fusion',
  'Metal',
  'Pop',
  'Classical / fingerstyle',
  'Hip-hop / neo-soul',
  'Americana',
] as const
export const GENRES_TEXT = GENRES.join(', ')
