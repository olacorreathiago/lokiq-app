# Lokiq — Claude Code Instructions

## Project

Prospecting Engine para PMEs sem website. Next.js 15 (App Router) + Supabase + Google Places API (New) + Claude Haiku 4.5.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint

## Architecture rules (non-negotiable)

1. `lead_events` is append-only — INSERT only, never UPDATE/DELETE
2. FieldMask is mandatory on every Google Places API request — never omit
3. Never request `websiteUri` (Enterprise SKU ~€0.035/req) — use `checkWebsite()` with DNS instead
4. RLS active on all tables — policies use `user_id = auth.uid()`
5. Secret keys only in API Routes (`/app/api/`) — never in client code
6. Claude prompt caching: system prompt must be fixed and long (>1024 tokens)
7. Claude Haiku 4.5 is the only model in Phase 1

## Code style

- TypeScript strict — no `any`, no unjustified `@ts-ignore`
- Files: `kebab-case` — Components: `PascalCase` — Functions: `camelCase` — Constants: `SCREAMING_SNAKE`
- Server Components by default — `'use client'` only when needed
- Pure functions in `lib/` — no side effects, no business logic in components
- Zod validation on all API Route inputs
- No `console.log` in production

## Git conventions

```
feat: adds radius mode with GPS
fix: corrects FieldMask in Place Details
refactor: extracts calcScore to lib/scoring
test: adds fixtures for beauty niche
chore: updates dependencies
```

Branches: `main` (production) · `develop` (integration) · `feat/feature-name`
