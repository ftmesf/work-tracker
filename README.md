# Work Tracker

A personal, offline-first work-tracking PWA — built for tracking highly parallel work (company / personal / learning) without the overhead of a "real" project management tool. Persian-first UI (RTL, Vazirmatn, Jalali calendar), single-user, no login.

**Live demo:** [work-tracker-fatemehesf-projects.vercel.app](https://work-tracker-fatemehesf-projects.vercel.app)

---

## Why this exists

Built for a workflow with ~10 concurrent threads and ~12 context switches a day, where nothing gets written down in the moment. The app answers two questions at a glance: *what did I actually do*, and *how much time went where* — split across three buckets (company work, personal projects, learning) with daily time breakdowns per task.

## Features

- **Three-bucket system** — every task belongs to company / personal / learning, visualized everywhere (split charts, colored group headers, filters)
- **Daily time breakdown** — a task can span multiple days; each work session is its own log entry (`time_logs`), not a duplicate task
- **Jalali (Persian) calendar** — a from-scratch Gregorian ↔ Jalali converter (no external calendar library), validated against 5,000+ consecutive days and cross-checked against `Intl.DateTimeFormat('en-u-ca-persian')`
- **Offline-first sync** — writes land in `localStorage` instantly; a background queue pushes to Supabase when online. No conflict resolution needed (single user, single device) — just "don't lose what I typed"
- **No hard deletes** — everything is soft-archived (`archived_at`); cancelled/archived work still counts in historical stats
- **Attendance tracking** — office days, arrival/departure times, weekly/monthly totals
- **In-app reminders** — open commitments, pinned notes, "haven't logged anything today" — instead of push notifications
- **Markdown & CSV/JSON export** — one-click text summary of any date range; full data export for backup
- **Installable PWA** — add to iOS home screen, works fully offline after first load

## Tech stack

- **React 18 + Vite** — no framework, no router (single-page dashboard)
- **Supabase (Postgres)** — optional cloud backup; app is fully functional without it
- **`vite-plugin-pwa`** — service worker, manifest, offline caching
- **Zero calendar/date dependencies** — the Jalali conversion, week/month range logic, and formatting all live in [`src/lib/jalali.js`](src/lib/jalali.js)
- **No CSS framework** — hand-written design tokens (spacing/color/radius scale) in [`src/styles.css`](src/styles.css)

## Project structure

```
src/
  lib/
    jalali.js      Gregorian ↔ Jalali conversion, date math, formatting
    report.js       All derived stats (bucket splits, cold categories, trends, markdown export)
    store.js        Local-first data layer: localStorage + Supabase sync queue
    backup.js        JSON/CSV export
    constants.js     Buckets, statuses, colors
  sections/          One component per dashboard card
  icons.jsx          Hand-drawn SVG icon set (no icon library dependency)
supabase/
  schema.sql         Full Postgres schema + RLS policies
tests/
  run.mjs            Dependency-free test suite (22 tests: calendar math, report logic, CSV escaping)
```

## Running locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Runs entirely offline with local storage — Supabase is optional (see below).

Run the test suite:

```bash
npm test
```

## Optional: Supabase backup

1. Create a free project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Copy the **Project URL** and **anon public key** from Project Settings → API.
4. Either paste them into the app's "Connect to Supabase" card, or set them as environment variables:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

Note: since this app has no auth, anyone with the deployed URL and anon key can read/write the data. Fine for a private personal tool; don't publish the live URL.

## Deploying

Standard Vite static build — deploys to Vercel/Netlify/any static host with zero config:

```bash
npm run build
```

Set the two `VITE_SUPABASE_*` environment variables in your host's project settings if you want cloud sync in production.

---

Built with [Claude Code](https://claude.com/claude-code).
