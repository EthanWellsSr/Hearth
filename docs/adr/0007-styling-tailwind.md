# 7. Styling with Tailwind CSS v4

Date: 2026-09-11

## Status

Accepted (reverses the earlier "no Tailwind" scaffolding choice)

## Context

The app was first styled with hand-written plain CSS. The result felt flat and
mechanical, and iterating on it was slow. Tailwind is the de-facto styling
standard for modern Next.js apps, so adopting it also has transfer value.

## Decision

- Use **Tailwind CSS v4** (via `@tailwindcss/postcss`), styling in the markup with
  utility classes plus a few `@layer components` classes (`.card`, `.btn-primary`,
  `.btn-ghost`, `.field`, `.icon-btn`) for consistency.
- Palette: emerald/stone "botanical" theme; dark mode via `prefers-color-scheme`
  (`dark:` variants), matching the app's existing theme-aware approach.
- No component library (shadcn/ui) yet — revisit if we need complex primitives
  (dialogs, menus, toasts).

## Consequences

- Faster, more consistent styling; a richer default look.
- `@apply` in v4 only accepts real utilities, not other custom classes — component
  classes must be self-contained.
- One more build dependency (PostCSS + Tailwind); `postcss.config.mjs` added.
