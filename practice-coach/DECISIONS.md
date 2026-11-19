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

## Fretboard Lab
- **The original file is kept untouched at `reference/fretboard-lab.html`**; the served copy is `public/fretboard-lab.html`. The only changes to the served copy are additive: a "URL presets" block right after its state is loaded, a `syncControls()` for hash changes, two lines in the mode/hash wiring, and three CSS lines for `?embed=1`. Diff the two files to see exactly what changed.
- **Preset params** go in the query string or after `#`: `mode`, `bpm`, `label`, `theme`, `embed`, plus the current mode's control ids (`root`, `type`, `voicing`, `set`, `move`, `zone`, `pos`, `start`, `pat`, `scale`, `fing`, …). `set` accepts an index or string names like `GBE` / `DGB` / `ADG`. Roots accept `Bb`, `B♭`, `A#`. `type=` also works as an alias for `scale=` in Scales mode. Invalid values are ignored, so a bad link falls back to the saved state instead of breaking.
- **Presets override the Lab's saved `fretboard-lab` state on load and are then saved**, so the Lab reopens where the last deep link left it.
- **In-app, the Lab runs in a full-height iframe** with `embed=1` (hides the big title) and `theme=` matching the app. A slim bar shows what the preset is, a Back button (when you came from a link) and a full-screen link.
- **Arpeggio position for B7 / C7 drills**: the brief didn't give one; I used frets 7 and 8 so they sit near the Kid Charlemagne lines.
- **`src/lib/lab.test.ts` lists every Lab link the app ships** (116 across all blocks, weeks and lessons). Each was checked in Chromium against a deliberately different saved Lab state: right mode and every control value.
- **Test files are excluded from the app typecheck** (`tsconfig.app.json`); Vitest type-strips them when it runs them.

## Polish and deploy
- **Checked at 375 px and 320 px** on every screen: no horizontal page scroll; wide content (concept chips, tables, heatmap) scrolls inside its own box. Buttons and tabs on Today are at least 40×40 px (most are 48–56 px tall).
- **Offline verified in Chromium**: after one online visit, every screen and Fretboard Lab (with presets) load with the network off; lesson videos show "needs a connection" with Open on YouTube and Retry.
- **Export → reset → import verified** to restore the app data and the Lab's settings byte for byte.
- **`vercel.json` / `netlify.toml`** set `no-cache` on `sw.js`, `index.html` and `fretboard-lab.html` and long-term caching on hashed `assets/`, so updates reach the phone quickly.

## v0.2 quick wins (from Clay's 11-17 voice notes)
- **Drills show the whole neck** (frets 0–15, the same view as the neck map) in every Lab mode, including the chord drill. On a phone the neck scrolls sideways inside its box, like the neck map, and re-centers on the current note at each step.
- **Click volume and tone** live in Fretboard Lab's saved state (`clickVol`, `clickTone`) so there's one setting: the app's Settings → Metronome click and the Lab's new "Click" panel both edit it. Tones: Classic (the original sound), Woodblock, Beep, Low. Volume 70% equals the original loudness.
- **Fire and ice**: a Mon–Sun strip on Today and Progress shows a flame on practiced days and a snowflake on days the freeze covered. The streak pill and stat use the flame too.
- **Groundwork for the stats page**: sessions now save seconds per part (`partSeconds`). The Lab tells the app which mode is open and when you're active (touches or a running click); the app counts that time per mode per day (`labTime`), pausing after 90 s idle or when the app is in the background. Sessions logged before this only have totals, so charts start from now.
- **Fixed a sideways scroll in the Lab on phones** (also present in the original file): grid items can now shrink below their content width. The tempo row wraps when the new Click button doesn't fit.

## Player assessment (v0.3)
- **Code owns the frame, content is data.** The tap flow, placement rules and scoring are code (`src/assessment/engine.ts`, `scoring.ts`). Genre modules, skill ladders and questions are plain data (`genres.ts`, `skills.ts`, `general.ts`), so an AI can later write new genre modules from the blues template and they slot straight in. The draft question bank is in `docs/assessment-question-bank.md`.
- **Nine full genre modules** (blues, jazz, soul/R&B, funk, gospel, country, bluegrass, reggae, rock), each with 20 artists across eras and instruments, 10–12 songs, a forms ladder, feels, a second language ladder, must-have skills and graded applied questions. Every spot-check answer is unit-tested to appear in its options. Latin, fusion, worship, folk, metal and pop are taste-only for now.
- **Adaptive placement.** Top-3 genres in order; #1 gets the full module, #2/#3 the short one; how many of the 20 artists you know sets the depth (0–4 = "listen first"). Every ladder is a binary search from a middle rung, so each area takes 3–4 questions, then Know → Play → Use → Explain follow-ups at the rung reached. Tested length: about 8 minutes for Clay, about 5½ for a beginner.
- **Spot checks:** a missed check at or below your top rung moves that area down one step; the results screen says which and why (Clay's choice). Missed applied-theory checks are listed too.
- **Know/can-play grids:** tap once = know, twice = can play (a check mark vs. a filled chip with a play icon).
- **Results are rule-based for now** (player type, the read, biggest unlock, listening list) from one `AssessmentResult` object; an AI writer can replace `buildRead` later without touching the flow.
- **Finishing the assessment replaces the plan (Clay's choice).** `src/plan/generate.ts` picks blocks from a library of 18 focuses (`src/plan/foci.ts`: Clay's original nine, now with week-by-week content, plus foundation blocks) by scoring need (low on the ladder, or know-but-don't-use), goals, genre fit and "same licks", assuming a step of growth after each block. The plan starts today; the previous plan and start date are saved and one tap restores them. Check: Clay's answers rebuild a plan that starts with "See the chord, hit the chord".
- **Session minutes in generated plans** follow Clay's example: warm-ups short, transcription about half (30 min = 5/5/5/15, 60 min = 8/8/14/30).
- **Application offers 3–5 songs every week**, rotating: songs you want to learn, the block's featured tune, songs from your genres you know but can't play yet, and one discovery pick from another genre. Each links to a YouTube search for a transcription with tab on screen; lesson videos become an "extra resource".
- **One plan shape for everything** (`src/plan/model.ts`): the original plan is materialized into the same JSON as a generated one, so Today, Plan and Settings have one code path. Done-when checks for generated plans are keyed by plan id.

## Vision first (v0.4, from Clay's feedback: "if I don't have the vision for why, it all falls apart")
- **The assessment opens with the vision, before anything is measured** (Clay wasn't sure; dream first, then measure against it, is easy to flip in `engine.ts`). In the player's own words: "What would you love to be able to play comfortably and fluidly?", where they see themselves playing, up to 3 signature songs or solos, and what about each they want to play (the fast runs, lines through the changes, melody and chords together…).
- **The goals list that mirrored Clay's gaps is gone.** It's replaced by a general "What do you want to learn?" list in plain words (solo better, play the songs I love, rhythm and groove, fingerstyle, write my own songs, get gig-ready…) plus "which excites you most".
- **Plans are built toward the vision, about 70/30 wants vs. needs.** Blocks are milestones toward the signature pieces: the skills inside the music they named, with stepping stones when a skill isn't reachable yet (e.g. voicings before chord-melody). Each new block for a piece starts from a different part of it. Remaining blocks follow their wants; assessment needs drive the daily warm-ups (about 30% of each session) and fill gaps.
- **Every block and part has a "why"** in terms of the player's vision. The last block for a piece ends with "Milestone: play it start to finish, record it, compare with week 1". If a signature piece has a lesson in the library (Kid Charlemagne), its block links that lesson and loops one of its moments each week.
- **"Not feeling this block? Swap it"** rebuilds the plan without that block; earlier blocks stay the same.
- **Seven new blocks** for wants outside Clay's style: learning songs from the record, lead essentials, speed, fingerstyle, writing, gig-ready, reading.
- **Without AI yet**, the written vision is shown back (results, Home, Plan) as the "why"; the plan is built from the structured answers (pieces, what about them, wants). An AI planner can later read the written vision too.

## Desktop-first layout (v0.4)
- **Left sidebar on desktop (≥960 px); on phones a top bar with a menu that slides in from the left.** The bottom tab bar is gone (Clay asked for a left-side nav with a drop-down).
- **Home is a dashboard (`#/`):** the vision with progress toward each signature piece, "jump back in" to today's session, this week's drills, streak, song of the day, our pick (a lesson), and listen this week. Today's session moved to **Practice (`#/practice`)**.
- **The running timer shows on every page** (sidebar on desktop, top bar on phones) and links back to Practice.
- **Lesson page on desktop:** big video on the left (sticky), Watch / Understand / Drill on the right. Practice parts and lesson cards go two to a row on wide screens.

## The AI coach (v0.5)
- **Why the switch:** hand-written branches and ladders only cover the players someone thought of in advance. Clay's blues case study was a way of thinking, not a script. So the assessment is now run by an AI interviewer that writes each question for the player in front of it, following Clay's method (`docs/interviewer-rules.md`, enforced in `api/_lib/prompts.ts`). The old tap assessment stays as the offline fallback (`#/assessment/tap`).
- **Three blocks in a fixed order, skills → taste and genre → vision**, each 1½–3 minutes, each ending in "here's what I heard" that the player can correct. Corrections win in the results. Clay's reasoning: every player has fundamentals to build whatever their style; taste and vision then steer the plan.
- **No rating scales anywhere.** Specific yes/no questions on a six-step scale (not yet · know it · play it slowly · at tempo · use it in music · can teach it), quick checks with right answers, taste from "which would you learn next?" between named recordings, up to five ranked genres.
- **Where the code sits:** Vercel functions in `practice-coach/api/` (`interview`, `results`, `module`, `auth`, `health`), one Claude call each, structured outputs validated with zod. The same handlers mount at `/api` in `vite dev`/`vite preview`. Model: Claude Opus 5.5 with server-side refusal fallbacks on. Prompt caching on the system prompt.
- **Passcode, not accounts.** The site is public, so every AI route needs `x-passcode` = `APP_PASSCODE` (a Vercel environment variable). The player enters it once (hub or Settings); it's stored on the device. Fail-closed: no passcode on the server means the coach is off.
- **The server owns the frame, the AI owns the questions.** Block budgets (16 / 10 / 7 screens) are enforced server-side; unanswerable screens (no options, bad quiz answer) are dropped; the AI may return up to 3 screens per call when later ones don't depend on earlier answers. The AI keeps private "notes" (≤80 words) that are fed back each call, so it doesn't re-ask.
- **Results → Build → Plan.** The results writer returns profile, skill levels with evidence, gaps, vision needs/have/missing, taste, and 4–10 modules of 1–3 weeks (Clay: shorter than 6–8 week blocks; anything can be repeated). The Build page lets the player keep / swap / drop / reorder / set weeks / add their own (the `module` route writes one on request) and set minutes and days; "Make this my plan" converts modules into the same plan shape the app already runs (`src/plan/fromModules.ts`), with the previous plan restorable.
- **Lab presets written by the AI are validated** against the Lab's vocabulary (`api/_lib/lab-vocab.ts`); invalid ones are dropped rather than shipped.
- **Testing:** the client flow was driven end to end in Chromium against a stand-in server (passcode, all three blocks incl. a correction, results, build with swap/add/weeks/reorder, plan applied, Practice and Home). Real-model runs against test players still need the API key in a session (`ANTHROPIC_API_KEY` as an environment variable on the Clay-camfield environment); that's the next step once the key is in place.
