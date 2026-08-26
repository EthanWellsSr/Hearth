# Stack: TypeScript + Next.js + Supabase on Vercel; extras deferred

The stack is TypeScript (the language), Next.js (the frontend + backend
framework), and Supabase (Postgres database + user auth + realtime sync),
deployed on Vercel. Supabase was chosen to bundle database, login, and live sync
into one service, minimizing moving parts for a first app. The trade-off: it
hides more machinery than wiring separate specialist vendors would (e.g. Neon +
Better Auth + Drizzle), so we learn fewer internals — accepted for simplicity.
Testing (Vitest/Playwright), CI (GitHub Actions), the AI meal-planner (Claude
API), and the bank feed (Plaid) are deliberately deferred until the feature that
needs each one exists.
