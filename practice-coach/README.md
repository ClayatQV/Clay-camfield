# Practice Coach

Clay's daily guitar practice app (prototype v0.1). Desktop-first and also works on a phone, installable, works offline, no accounts, no backend, no tracking.

- **Home** — your vision and progress toward your signature songs, jump back into today's session, song of the day, a lesson pick and what to listen to this week.
- **Assessment** — about 10 minutes: your vision in your own words, the songs you want to play, what you want to learn, then a placement of your genres and skills. Finishing it builds your plan.
- **Practice** — this week's 4-part session (Triads · Arpeggios · Concept · Application), 30/60-minute versions, timers, done checks, finish + log, **Share with Dad**.
- **Progress** — current/longest streak, total and weekly minutes, practice heatmap, weekly streak freeze, session history.
- **Plan** — player profile, the 6-month block sequence, Block 1 week by week with "done when" checks, repertoire bank.
- **Lessons** — tab-on-screen videos with speed control, A–B loop, saved moments, speed ladder, a tappable bar-by-bar analysis and Fretboard Lab drills. Candidates get approved or rejected after you check them.
- **Lab** — Fretboard Lab, deep-linked from Today and lessons with presets.
- **Settings** — plan start date, block/week override, default length, Dad's number, theme, export/import/reset.

## Run it locally

Needs Node 20+ (22 recommended).

```bash
cd practice-coach
```

```bash
npm install
```

```bash
npm run dev
```

Open the printed URL. To try it on your phone over Wi-Fi, run `npm run dev -- --host` and open the "Network" URL on the phone (the service worker only runs in production builds, see below).

Other scripts:

```bash
npm test            # unit tests: streaks + freeze, plan weeks, share text, Lab links
npm run build       # type-check + production build into dist/
npm run preview     # serve dist/ locally (service worker + offline enabled)
```

## Deploy

It's a static site (`dist/`). Hash routing (`#/lessons/…`) means no rewrite rules are needed. The repo includes `vercel.json` and `netlify.toml`, which also stop the service worker from being cached by the CDN.

### Vercel

1. Go to https://vercel.com/new and import the `Clay-camfield` GitHub repo.
2. **Root Directory**: click *Edit* and choose `practice-coach`.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist` (already set in `vercel.json`).
4. Click **Deploy**. Every push to the branch you pick redeploys.

From the command line instead:

```bash
cd practice-coach
```

```bash
npx vercel --prod
```

(answer the prompts; when asked for the directory, it's the current one).

### Netlify

1. Go to https://app.netlify.com/start and pick the `Clay-camfield` repo.
2. **Base directory**: `practice-coach`. Netlify reads the build command (`npm run build`) and publish directory (`dist`) from `netlify.toml`.
3. Click **Deploy site**.

Or drag and drop: run `npm run build`, then drop the `practice-coach/dist` folder onto https://app.netlify.com/drop.

### GitHub Pages (set up in this repo)

`.github/workflows/deploy-practice-coach.yml` builds and publishes the app on every push to `main` that touches `practice-coach/`. One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then at https://clayatqv.github.io/Clay-camfield/ (the Actions tab shows each deploy).

### Any other static host (GitHub Pages, Cloudflare Pages, S3…)

Run `npm run build` and upload `dist/`. The build uses relative paths, so it also works from a sub-folder.

## Put it on your home screen

- **iPhone (Safari)**: open the site → Share → *Add to Home Screen*.
- **Android (Chrome)**: open the site → ⋮ menu → *Install app* (or *Add to Home screen*).

Open it once while online so everything gets cached. After that it works offline, except YouTube playback (lessons show an "Open on YouTube" button when there's no connection). When a new version is deployed, a "New version is ready · Reload" bar appears.

Tips: the screen stays awake while a practice timer runs, and a soft chime plays when a part hits its target time.

## Your data

Everything lives in your phone's browser storage (`localStorage`):

- `practice-coach` — settings, sessions, lesson approvals, done-when checks, your custom loop points, today's in-progress session.
- `fretboard-lab` — Fretboard Lab's own settings.

**Settings → Export backup** downloads both as one JSON file. **Import backup** restores it (on the same or a new phone). Clearing Safari's website data, or deleting the home-screen app on some phones, erases local storage, so export now and then.

## Editing content

All content is typed TypeScript under `src/content/`:

| File | What |
|---|---|
| `profile.ts` | Player profile |
| `blocks.ts` | The 9-block sequence |
| `block1.ts` | Block 1 detail: daily table, week-by-week table, done-when checks, and the Today parts for weeks 1–3 (instructions, minutes, Lab links, lesson links, share labels) |
| `lessons.ts` | Lessons: video, status, concepts, bar map, moments, theory notes, drill links |
| `repertoire.ts` | Repertoire bank |
| `types.ts` | The types for all of the above |

**Adding a lesson**: copy an entry in `lessons.ts`, give it a new `id` and `youtubeId`, set `status: 'candidate'`, and it appears under Lessons → *To review*. Bar-map times (`t`) and moments (`a`, `b`) are in seconds.

**Writing the next block**: add a `detail` to that block in `blocks.ts` (same shape as `BLOCK1_DETAIL`) and a parts function like `block1Parts()`, then return it from `sessionParts()` in `src/lib/session.ts`. Until then, blocks 2–9 run the permanent warm-ups plus the block's focus.

## Fretboard Lab presets

`public/fretboard-lab.html` reads a preset from the query string (or after `#`) and applies it over its saved state:

```
fretboard-lab.html?mode=scales&root=G&scale=majpent&pos=7
fretboard-lab.html?mode=chords&root=C&type=maj7&voicing=drop2&set=0&move=c4
fretboard-lab.html?mode=arpeggios&root=C&type=m7&pos=5&move=c4&start=3&bpm=60
```

| Key | Values |
|---|---|
| `mode` | `chords` · `arpeggios` · `scales` · `technique` |
| `root` | `C`, `Bb`, `B♭`, `F#`, `A#`… |
| `type` | chord/arpeggio id: `maj` `min` `maj7` `m7` `7` `m7b5` `dim7` `7b9` `7s9` `13` `7alt`… (symbols like `Δ7`, `-7` also work) |
| `scale` | `ionian` `dorian` `mixolydian` `majpent` `minpent` `blues` `lyddom` `altered` `hwdim` `bebdom`… |
| `voicing` | `close3` `open3` `shell37` `shell73` `close4` `drop2` `drop3` `drop24` |
| `set` | string-set index, or names: `GBE`, `DGB`, `ADG`, `EAD`… |
| `move` | `static` `c4` `c5` `chrom` `251` `m251` `custom` (+ `custom=Dm7 G7 Cmaj7`) |
| `zone` | `low` `mid` `high` |
| `pos` | fret 0–12 |
| `start` | arpeggios: `low` `r` `3` `5` `7` |
| `pat` | arpeggios: `ud` `up` `dn` · scales: `line` `3rds` `4ths` `g3` `g4` `tri` `sev` |
| `fing` | scales: `box` `2` `3` `4` |
| `bpm`, `label` | 30–240 · `deg` / `note` |
| `theme`, `embed` | `light`/`dark` · `1` hides the big title (used in-app) |

Inside the app, link to `#/lab?…` with the same keys (`labPath()` in `src/lib/lab.ts` builds these). The untouched original is in `reference/fretboard-lab.html`.

## Project layout

```
practice-coach/
  public/            fretboard-lab.html (with presets), sw.js, manifest, icons
  reference/         original fretboard-lab.html
  src/
    content/         typed content (profile, blocks, lessons, repertoire)
    lib/             dates, streaks, plan math, session parts, sharing, Lab links, YouTube loader
    store/           localStorage store, export/import, session actions
    screens/         Today, Progress, Plan, Lessons, LessonPage, Lab, Settings
    components/      tab bar, icons, share card, toast, YouTube hook
  vite.config.ts     includes the tiny service-worker precache plugin
  DECISIONS.md       choices made while building v0.1
```

Not in v0.1 (by design): accounts, a backend, AI feedback, backing tracks, generated licks, push notifications, payments. The store (`src/store/store.ts`) is the one place to swap for a backend later.
