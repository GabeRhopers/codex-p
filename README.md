# Season's Battle

A seasonal-creature card battler for the browser. Build a deck, deploy across
5 lanes, and push your opponent's elimination score to zero — hotseat
(pass-and-play) or solo against a bot. No install, no accounts, no backend.

**Play it live:** https://gaberhopers.github.io/codex-p/

## What's here

- A full rules engine (`src/game/`) implementing Normal Mode from the
  tabletop rulebook — see [`RULES_SPEC.md`](./RULES_SPEC.md) for the formal,
  section-by-section spec, including every place the rulebook was ambiguous
  and how that ambiguity became a named, one-line-to-change flag in
  `src/game/rules.config.ts` instead of buried logic.
- A 22-card roster (`src/content/cards.ts`) with hand-picked portrait art, two
  fixed starter decks, and a custom deck builder.
- A heuristic bot opponent (`src/game/bot.ts`) for solo play.
- A React UI (`src/ui/`) built on [boardgame.io](https://boardgame.io/) —
  chosen specifically so a future networked-multiplayer mode can reuse the
  same game-rules code unchanged, only swapping the transport.
- Installable as a PWA (offline-capable app shell, add-to-home-screen).

## Development

```bash
npm install
npm run dev          # start the dev server
```

```bash
npm run build         # typecheck + production build
npm run preview       # serve the production build locally
```

## Testing

Three layers, each catching a different class of bug:

```bash
npm run test          # Vitest — rules engine unit tests, one file per rulebook section
npm run test:e2e      # Playwright — full matches driven in a real browser
npm run balance       # bot-vs-bot simulation — per-card win-rate report (see below)
npm run lint           # oxlint
npx tsc -b              # typecheck
```

### Balance report

`npm run balance` runs a seeded, deterministic bot-vs-bot simulation (the two
fixed starter decks both ways, plus 150 random-legal-deck matches) and prints
a per-card win-rate table — a diagnostic for spotting an over- or
under-tuned card, not a pass/fail gate (see the report's own header comment
in `tests/balance/balanceSim.report.ts` for why). It also runs automatically
in CI (`.github/workflows/balance-report.yml`) whenever card or rules-engine
content changes, publishing the report to that run's job summary.

## Deployment

Pushing to `claude/seasons-battle-capacity-hp09cp` triggers
`.github/workflows/deploy-pages.yml`: typecheck → unit tests → lint →
Playwright E2E → production build → deploy to GitHub Pages. Nothing ships
unless every one of those passes.

## Tech stack

React 19, TypeScript, Vite, [boardgame.io](https://boardgame.io/), Vitest,
Playwright, oxlint. No backend, no database — the whole game runs
client-side and deploys as a static site.
