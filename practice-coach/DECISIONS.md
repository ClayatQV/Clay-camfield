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
