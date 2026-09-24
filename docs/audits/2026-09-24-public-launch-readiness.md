# Public launch readiness audit — 2026-09-24

**Question:** can strangers open Hearth's link, create an account, and run their own
Household safely, and is the infrastructure shaped to keep working as Households are
added? Also: is the repository safe to make public?

**Verdict:** not yet. Two blockers stop strangers from signing up at all, and three
high-severity gaps would hurt as usage grows. The tenancy model (Household →
Membership, RLS with `is_member`, anon locked out by `0013`/`0014`) is sound; the work
is around it.

Severity: **Blocker** = strangers cannot use the app · **High** = data loss, security,
or degradation that grows with users · **Medium** = should fix before inviting people ·
**Low** = hygiene.

---

## Blockers

### B1. Vercel Deployment Protection covers production

- **Evidence:** every unauthenticated request to `hearth-hearth13.vercel.app` redirects
  to `vercel.com/sso-api` (seen in curl and in the manifest CORS errors). Only Vercel
  users on the project can reach the app.
- **Fix (Ethan, Vercel dashboard):** Settings → Deployment Protection → **Standard
  Protection** (protects previews and deployment URLs, leaves production domains
  public). [Vercel docs](https://vercel.com/docs/deployment-protection)
- **Why it's safe:** Hearth's own login, JWT verification, and RLS already guard all
  data. Deployment Protection was a second gate for a private app.

### B2. Confirmation emails cannot reach strangers

- **Evidence:** Supabase's built-in email "is not meant for production use," only sends
  to members of the project's team, and is limited to 2 messages per hour.
  [Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp) Hearth uses it,
  so a stranger's sign-up confirmation never arrives.
- **Fix:** custom SMTP. Resend's free plan covers 3,000 emails/month (100/day)
  ([pricing](https://resend.com/pricing)) but requires a **verified domain you own**
  ([Resend + Supabase](https://resend.com/docs/send-with-supabase-smtp)).
- **Needs from Ethan:** a domain (~$10–15/yr; also gives Hearth a real URL instead of
  `hearth-hearth13.vercel.app`), a Resend account, and the SMTP settings entered in
  Supabase → Authentication → SMTP.

---

## High

### H1. List queries scan every Household's rows

- **Evidence:** `todos/page.tsx`, `groceries/page.tsx`, and `chores/page.tsx` select
  without `.eq("household_id", …)` and rely on RLS alone. RLS adds
  `is_member(household_id)`, which Postgres cannot use an index for, so it scans the
  whole table and calls the function per row. Cost grows with *all* Households' data,
  not yours. `todos` and `grocery_items` also have no `household_id` index at all.
- **Fix (code + migration):** filter every list query by `householdId` explicitly (RLS
  stays as the security guarantee; the filter is the performance path) and add
  `(household_id, created_at)` indexes on `todos` and `grocery_items`. Supabase:
  "an unindexed filter column turns a read into a sequential scan."
  [RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Where AI errs:** it treats RLS as a query filter. RLS is a *security* predicate
  applied after the planner picks a plan; you still write the tenant filter yourself.

### H2. No backups

- **Evidence:** Supabase Free has no database backups and pauses projects after a week of
  inactivity. [Pricing](https://supabase.com/pricing),
  [production checklist](https://supabase.com/docs/guides/platform/going-into-prod)
  Once other Households store data, a bad migration or accidental delete is
  unrecoverable.
- **Options:** Supabase Pro ($25/mo: daily backups kept 7 days, no pausing), **or**
  stay free and add a nightly `pg_dump` via scheduled GitHub Action to private storage
  (needs a DB connection string stored as a GitHub secret).

### H3. The database can't be rebuilt from the repo, and one database serves everything

- **Evidence:**
  - `todos` and `grocery_items` are never created in any migration; `0001` alters them
    as pre-existing tables.
  - `0001` Phase B hard-codes the `'Wells'` Household and "the first auth user," so it
    only makes sense on this one database.
  - Migrations are pasted into the SQL Editor by hand; nothing records which ones ran.
  - Development verification, the latency harness, and production all use the same
    Supabase project (the "dev database" in STATUS is production).
- **Fix:** a baseline migration that captures the current schema (Supabase CLI
  `db dump`/`db diff`), a second free Supabase project as staging, and CLI-applied
  migrations so the migration history table is the source of truth. Test migrations on
  staging before production.

---

## Medium

### M1. No password reset, and email confirmation is not handled by the app

- **Evidence:** no `resetPasswordForEmail` anywhere; no `/auth/confirm` route. A user
  who forgets their password is locked out permanently. Supabase's SSR pattern is one
  `/auth/confirm` route calling `verifyOtp({ type, token_hash })` for both sign-up
  (`type=email`) and recovery (`type=recovery`), plus templates pointing at it.
  [Supabase password auth](https://supabase.com/docs/guides/auth/passwords)
- **Also check (Ethan):** Supabase → Authentication → URL Configuration: Site URL must
  be the production URL, with it in the redirect allow list.

### M2. Bot and abuse protection

- **Evidence:** sign-up has no CAPTCHA. The invite-code guess limit (5 per user per 24h
  in `join_household_with_invite`) is per *account*, so unlimited sign-ups bypass it.
  Supabase recommends CAPTCHA on sign-up/sign-in.
  [Production checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- **Fix:** enable Supabase's CAPTCHA (Cloudflare Turnstile is free) and add the widget
  to the login form; consider lengthening invite codes.

### M3. "One Household per User" is enforced only in a function

- **Evidence:** `create_household_with_owner` checks `if exists (… memberships where
  user_id = …)`, but `memberships` only has `unique (user_id, household_id)`. Two
  concurrent requests can both pass the check. `requireHousehold` would then silently
  pick the oldest.
- **Fix:** `unique (user_id)` on `memberships` if one Household per User is the model
  (it is today), so the database enforces it.

### M4. Privacy and account lifecycle

- No privacy policy or terms; strangers' names, avatars, and household data are stored.
- No account deletion (only leaving a Household).
- Recommended before inviting people outside the family, even for a free app.

### M5. Security headers

- **Evidence:** no custom headers in `next.config.ts` or `vercel.json`.
- **Fix:** `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`,
  `Permissions-Policy`; CSP later.

### M6. Observability

- Vercel Hobby keeps runtime logs for 1 hour and has no log drains
  ([Hobby plan](https://vercel.com/docs/plans/hobby)); there is no error tracking. The
  11-second Chores outlier on 2026-09-24 could not be investigated for this reason.
- **Fix:** an error tracker with a free tier (e.g. Sentry), wired to the server and client.

---

## Low

- **Git history is clean:** no keys, tokens, or database URLs in any commit (scanned
  every revision; README has only `...` placeholders). `npm audit --omit=dev`: 0
  vulnerabilities.
- **Commit author email** `ethanwells9798@gmail.com` becomes public with the repo;
  switch to GitHub's noreply address for future commits if unwanted.
- **Test fixture uses a family member's first name** (`AssigneePicker.test.tsx`,
  committed); rename to neutral names.
- **No `LICENSE` file:** a public repo without one is "all rights reserved." Decide
  deliberately.
- Empty `app/debug-performance` and `app/api/debug-performance` directories;
  `README.md` should describe setup for readers of a public repo.
- Vercel Hobby is restricted to non-commercial personal use — fine while Hearth is free.

---

## Suggested order

1. **Ethan, dashboards:** B1 (Standard Protection), Site URL check, domain purchase.
2. **Code:** H1 (tenant filters + indexes), M1 (`/auth/confirm` + password reset), M3,
   M5, Low items.
3. **Ethan + code:** B2 (Resend SMTP on the new domain), M2 (Turnstile).
4. **Infra:** H3 (baseline migration, staging project, CLI migrations), H2 (backups).
5. M4 and M6 before inviting anyone outside the family.
6. Make the repo public → PR `dev` → `master` → require the `checks` and `notices`
   CI jobs with bypass disabled.
