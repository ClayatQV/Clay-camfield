# Decisions

Choices made while building v0.1 without stopping to ask. Newest at the bottom of each section.

## Repo and tooling
- **Lives in `practice-coach/` inside the `Clay-camfield` repo**, not a separate repo: this session can only push to `ClayatQV/Clay-camfield`. Moving it out later is a `git subtree split` or a plain copy; nothing depends on the parent folder. Vercel/Netlify just need "root/base directory = `practice-coach`".
- **Vite 8 + React 19 + TypeScript 5.9.** Runtime deps are only `react` and `react-dom`. Dev deps: Vite, the React plugin, TypeScript, Vitest (for streak/date/plan logic tests).
- **Hash routing (`#/lessons/kid-charlemagne`) with a 50-line router** instead of react-router. Works on any static host without rewrite rules and keeps the offline service worker trivial.
- **Hand-rolled service worker** (`public/sw.js`) instead of vite-plugin-pwa/Workbox. A 40-line Vite plugin in `vite.config.ts` injects the list of built files and a content-hash cache version at build time, so the whole app (including Fretboard Lab) is precached on first visit. Same-origin requests are cache-first; YouTube and Google Fonts go to the network.
- **`base: './'`** so the build also works from a sub-path (e.g. GitHub Pages), not just a domain root.
- **System font stack**, no web fonts, so the app looks the same offline.

## Data
- **One localStorage key, `practice-coach`**, holding settings, sessions, lesson reviews, done-when checks, custom loop points and today's in-progress draft. Every read/write is wrapped in try/catch; a banner in Settings warns if saving fails (e.g. private mode).
- **Everything is normalized on load and import** (`normalize()` in `src/store/store.ts`), so old or hand-edited backups can't crash the app.
- **Export includes Fretboard Lab's own saved settings** (`fretboard-lab` key) so export → reset → import restores everything. Reset clears both.
- **Today's draft (timers, checks, note) is persisted** with a running-timer start timestamp, so locking the phone, switching apps or reloading never loses time.

## Plan, Today, Progress
- **Current week = whole weeks since the plan start date** (default: the day you first open the app). Settings offers two ways to move it: "Start this week today" (rewrites the start date so weeks keep advancing) and "Pin it" (a fixed override until unpinned).
- **Blocks 2–9 have no week-by-week detail yet** (the brief only specified Block 1). Today still works for them: triads rotate string sets weekly, arpeggios rotate maj7/m7/7, and the Concept part uses the block's device with Fretboard Lab links I picked (e.g. Block 2: E°7 = C7♭9 from the 3rd; Block 3: G altered scale). The Plan screen says so plainly.
- **Week 2 triads "alternate maj/min"** is two Lab links (major, minor) rather than one, since the Lab shows one chord quality at a time.
- **Timers count up, one at a time**: starting a part pauses the other. A soft chime + vibration plays once when a part reaches its target. The screen is kept awake (Wake Lock API) while a timer runs.
- **Finish → minutes are editable** (pre-filled from the clocks, or from the done parts' targets if no clock ran), so a session practiced without timers can still be logged.
- **A session left open past midnight** shows as "Unfinished session from Mon" with Log it / Discard, and logs to the day it started.
- **Several sessions per day are allowed**; the day's share text sums them.
- **Streak rules** (`src/lib/streaks.ts`, unit-tested): a day counts with ≥1 session; the streak stays alive until today ends; one freeze per Mon–Sun week auto-covers a single missed day between two practiced days; two misses in a row break it. Frozen days bridge the streak but don't add to its length. If yesterday was missed, the freeze shows as "covering yesterday — practice today".
- **Share with Dad**: Web Share API first; if unavailable, the `sms:` link (with Dad's number from Settings) and then copy-to-clipboard. "Text Dad" and "Copy" are always available as separate buttons. Uses the `sms:NUMBER?&body=` form, which works on both iOS and Android.
- **Sessions can be deleted** from Progress (two-tap confirm) to fix mistakes.

## Lessons
- **The Chase Maddox concept videos are lessons too** (`kind: 'concept'`, approved), so Today's Application part opens them in the same player with speed, A–B loop and moments. They show "Concept video — no bar map" instead of "Analysis coming".
- **Lessons with several candidate videos** (Sookie Sookie) show a video switcher in the review card; Approve/Reject records which video you picked. The already-rejected paywalled video is listed so it doesn't get re-added. "Undo" puts a lesson back to its original status.
- **The video stays pinned at the top** of the lesson page (sticky) while you scroll the controls, and is kept mounted across the Watch / Understand / Drill tabs so a bar-map tap can seek it.
- **A–B loop**: polls `getCurrentTime()` every 50 ms and seeks to A once past B, with a 300 ms cooldown so one wrap counts as one pass. If B is at the very end of the video, the ENDED event closes the loop. Setting B turns the loop on and jumps to A. Changing speed by hand stops the ladder.
- **Speed ladder** counts passes per speed (0.25 → 0.5 → 0.75 → 1×, N passes each, default 4, stored in Settings and adjustable on the lesson page), then stops at full speed.
- **Moments are editable**: "Save current A/B here" overwrites a pre-defined loop (for fine-tuning the approximate times), "Save A/B as a new moment" adds one, Reset restores the defaults. Stored per lesson in localStorage.
- **Drill presets I added** beyond the brief's four: B♭ Lydian dominant and A minor pentatonic for Kid Charlemagne; F minor pentatonic / F blues for Sookie Sookie; major pentatonic for Affirmation; arpeggio/shell presets for the Chase Maddox videos.
- **Video errors** (embedding disabled 101/150/153, removed 100, offline) show a plain message and an "Open on YouTube" button that starts at the current A point. Offline also offers Retry.
- **Testing note**: YouTube is blocked in the build sandbox, so the loop and ladder were tested against a stub of the IFrame API (simulated clock and playback rate). Test the real player on your phone.
