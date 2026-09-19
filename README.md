# Hearth

A shared web app where the members of one household coordinate their to-dos,
grocery list, chores, and more — in one place.

**Live:** https://hearth-omega-umber.vercel.app

## Features

- **To-dos** — one-off tasks; add, assign by Member name and Avatar, check off,
  and delete; completed ones auto-purge nightly.
- **Grocery List** — add, check off (bought), delete, and "clear bought"; bought
  items sink to the bottom.
- **Chores** — recurring tasks (every N days, or weekly on a weekday); `next_due`
  advances on completion; optional assignment by Member name and Avatar.
- **Calendar** — shared all-day and timed Events, including multi-day Events, with
  month and upcoming views in the Household timezone.
- **Auth + Households** — email/password login; all data is scoped to a Household
  and enforced by Postgres row-level security (see `docs/adr/0006`).
- **User Profiles + Household people** — display names, private Avatars, reusable
  Invitation Links with readable backup codes, and owner-controlled Member removal.
- Installable as a PWA (Add to Home Screen).

## Stack

- **Next.js** (App Router) + **TypeScript** — app lives in [`web/`](web/)
- **Supabase** (Postgres, Auth, RLS, `pg_cron`)
- **Tailwind CSS v4** for styling
- **Sharp** for server-side Avatar validation and normalization
- **Vitest** for unit tests
- **Vercel** for hosting

## Project layout

```
CHANGELOG.md          # curated history for each shipped version
CONTEXT.md            # canonical Hearth domain language
docs/adr/             # architecture decision records (why, not just what)
docs/design/          # confirmed feature designs
docs/ROADMAP.md       # planned releases and dependencies
docs/STATUS.md        # current release and immediate handoff
web/                  # the Next.js app
  app/                # routes (including /calendar) + server actions
  components/         # shared UI (AppHeader, CheckableList, PlantMark)
  lib/                # Supabase, auth, Calendar, recurrence, and Avatar normalization
  public/legal/       # deployed third-party license notices
  supabase/migrations # SQL migrations (run by hand in the Supabase SQL editor)
```

## Local development

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm test           # run the unit tests
```

For phone testing on the same Wi-Fi network, run
`npm run dev -- --hostname 0.0.0.0` and open the Mac's LAN address on the phone.
Hearth automatically permits the development machine's current IPv4 addresses.

Create `web/.env.local` (gitignored) with:

```
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...            # server-only admin key (bypasses RLS)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # publishable key; user-scoped client
```

## Database

Supabase Postgres. Schema changes live as SQL files in
[`web/supabase/migrations/`](web/supabase/migrations/) and are applied by hand in
the Supabase SQL editor (in filename order). RLS is enforced on every table.

## Deployment

Hosted on Vercel (Hobby):

- **Root Directory:** `web`
- **Production branch:** `master` — pushes deploy to production automatically
- **Preview:** every push to another branch (e.g. `dev`) gets its own preview URL
- The four env vars above are set in Vercel for Production and Preview

## Branches & versioning

- `dev` — day-to-day work; merge into `master` to release
- Releases use semver package versions and annotated Git tags. Update the package
  version on `dev`, commit the release and documentation, merge `dev` into
  `master`, then tag the merge commit:

  ```bash
  npm version patch --no-git-tag-version
  npm run notices
  cd ..
  git add -A
  git commit -m "release vX.Y.Z"
  git switch master
  git merge --no-ff dev -m "merge dev for vX.Y.Z"
  git tag -a vX.Y.Z -m "vX.Y.Z"
  git push Hearth master --follow-tags
  ```

  The app footer shows the current version, read from `web/package.json`. Shipped
  release contents are recorded in [`CHANGELOG.md`](CHANGELOG.md).
