<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SportsTranslate

Cross-sport athlete comparison site. Three modes, each its own tab in the header nav:

- **Translate** (`/`, `/translate/[athleteId]/[sportKey]`) — type any athlete, pick a target sport, AI finds the single best equivalent in that sport. Can't translate into the athlete's own sport (blocked in the UI and as a server-side guard in `getOrCreateTranslation`).
- **Compare** (`/compare`, `/compare/[athleteXId]/[athleteYId]`) — type two athletes from different sports, get a 0-100 match percentage + explanation of how good a cross-sport equivalent pairing they are. Cached by normalized pair (A-vs-B and B-vs-A hit the same row).
- **Game** (`/game`) — spin a wheel for a random athlete (filtered by sport selection and a Current/All-Time toggle), spin again for a target sport (excludes the athlete's own sport), then race a 45s timer to guess the equivalent (guess search is scoped to the spun target sport, but the guess itself can be any era regardless of wheel mode). AI scores the guess 0-100 with one sentence of feedback, shown next to the official answer.

## Architecture

- All athlete data is AI-generated (Claude, `claude-opus-4-8`) — no live sports-stats API. `src/lib/generation.ts` has every Claude call; `src/lib/prompts.ts` builds the prompts; `src/lib/schemas.ts` has the Zod output schemas.
- Profile generation (`generateAthleteProfile`, `generateAthleteProfileAutoDetect`) uses Claude's `web_search_20260209` tool and is told searching is *mandatory* — without that instruction the model sometimes answers from stale training data for famous athletes (this caused a real bug: Luka Dončić showing his old team after his trade).
- The match-finding call (`findEquivalentAndCompare`) deliberately has **no** web search — it's on the hot path of every Translate/Game request, and search there was mostly wasted (the matched athlete's fresh profile is only used when that athlete is new to the DB; existing curated athletes ignore it). This dropped typical latency from 60s+ to ~14s.
- `withRetries` wraps every generation call — rare model sampling glitches can garble a single field (e.g. a name) into something like `"YyEdwards"` even when the JSON is technically valid. The `properName` Zod regex catches most garbling; a same-character-class-but-wrong-content glitch can still occasionally slip through (cross-checking against `SEED_ATHLETES`' known names is the most reliable detector when ground truth exists).
- Database is SQLite via Prisma (`dev.db`, not committed). Won't work as-is on most serverless hosts (ephemeral filesystem) — swap to a hosted Postgres/Turso before deploying for real, and check the platform's function timeout against the ~14s typical AI call.
- `isActive` (current vs. retired) was backfilled via web search for NBA and NFL only — confirmed accurate. Other sports still default to `true` (never finished backfilling — see `scripts/refresh-athlete.ts` for the single-athlete-refresh pattern to reuse if finishing this).

## Known environment quirk (not a code issue)

This machine intermittently runs very low on disk and/or free memory, which makes `next dev` extremely slow to start (minutes instead of seconds) or briefly unresponsive after reporting "Ready." Confirmed via direct script testing that the underlying app logic is unaffected — only the dev server's own startup/responsiveness is impacted. If `npm run dev` seems stuck, give it several minutes before assuming something's wrong.
