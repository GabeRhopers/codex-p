import { it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { CARD_DEFINITIONS } from '../../src/content/cards';
import { STARTER_DECKS } from '../../src/content/decks';
import {
  BUILDABLE_CARD_IDS,
  abilityCardCount,
  evaluateDeckBuild,
} from '../../src/content/deckBuilder';
import { decideBotAction } from '../../src/game/bot';
import { createSeasonsBattleGame } from '../../src/game/game';
import { DECK_SIZE } from '../../src/game/rules.config';
import type { PlayerSetup } from '../../src/game/state';

/**
 * Phase 5 (PLAN.md) — an automated balance pass, now that Phase 4's bot
 * gives us a rules-legal player to run unattended matches with. Two
 * distinct signals, since this engine has zero randomness (no dice, no
 * shuffled draws — see RULES_SPEC.md's ruling on fixed printed stats):
 *
 * 1. The two *fixed* starter decks are a deterministic matchup — running
 *    it twice never teaches us anything new, so instead we run it both
 *    ways (each deck taking the first-player seat once) to separate "this
 *    deck is stronger" from "going first is stronger."
 * 2. Individual card strength has no deterministic signal at all from the
 *    fixed decks (only 20 of 22 cards even appear in them). Sampling many
 *    random *legal* decks (reusing the deck builder's own legality rules,
 *    so nothing simulated here could not actually be built in-app) and
 *    tracking each card's win rate when included is what surfaces a
 *    quietly over- or under-tuned card — the kind of signal that's
 *    impossible to eyeball from stats alone once abilities are involved.
 *
 * Run with `npm run balance`. Not part of `npm test` / CI — see
 * vitest.balance.config.ts for why.
 */

type PlayerID = '0' | '1';
type Move =
  | { type: 'attack'; attackerLane: number; targetSide?: 'left' | 'center' | 'right' }
  | { type: 'enterDefense'; lane: number }
  | { type: 'leaveDefense'; lane: number }
  | { type: 'changePosition'; lane: number; direction: 'left' | 'right' }
  | { type: 'activateAbility'; lane: number; targetPlayerID?: string; targetLane?: number }
  | { type: 'endTurn' };

// Mulberry32 — tiny seeded PRNG so re-running the report is reproducible
// (comparable before/after a card-stat change) rather than noisy each time.
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A random deck built the same way a player legally could through
 * src/ui/DeckBuilder.tsx — greedily filling a shuffled card pool while
 * respecting the ability cap, then rejecting (and retrying) any sample
 * that fails the season-minimum rule. */
function randomValidDeck(rng: () => number): string[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const pool = shuffle(BUILDABLE_CARD_IDS, rng);
    const picked: string[] = [];
    for (const id of pool) {
      if (picked.length >= DECK_SIZE) break;
      const hasAbility = CARD_DEFINITIONS[id].ability !== undefined;
      if (hasAbility && abilityCardCount(picked) >= 3) continue;
      picked.push(id);
    }
    if (evaluateDeckBuild(picked).isComplete) return picked;
  }
  throw new Error('randomValidDeck: failed to sample a legal deck after 500 attempts');
}

function toSetup(defIds: string[]): PlayerSetup {
  return { deckDefIds: defIds, startingBattlefieldDefIds: defIds.slice(0, 5) };
}

function dispatchMove(client: ReturnType<typeof Client>, move: Move): void {
  switch (move.type) {
    case 'attack':
      client.moves.attack({ attackerLane: move.attackerLane, targetSide: move.targetSide });
      break;
    case 'enterDefense':
      client.moves.enterDefense({ lane: move.lane });
      break;
    case 'leaveDefense':
      client.moves.leaveDefense({ lane: move.lane });
      break;
    case 'changePosition':
      client.moves.changePosition({ lane: move.lane, direction: move.direction });
      break;
    case 'activateAbility':
      client.moves.activateAbility({
        lane: move.lane,
        targetPlayerID: move.targetPlayerID,
        targetLane: move.targetLane,
      });
      break;
    case 'endTurn':
      client.events.endTurn?.();
      break;
  }
}

interface MatchResult {
  winner: PlayerID | null;
  turns: number;
  timedOut: boolean;
}

/** Bot-vs-bot to a real conclusion (or a generous cutoff — see bot.test.ts's
 * identical stuck-turn guard for why a cutoff, not an assertion, is the
 * right response to a pathological matchup between two very passive random
 * decks rather than a hard failure). */
function playMatch(setups: Record<PlayerID, PlayerSetup>, maxActions = 600): MatchResult {
  const game = createSeasonsBattleGame(CARD_DEFINITIONS, setups);
  const client = Client({ game, numPlayers: 2 });
  client.start();

  let lastTurn = -1;
  let stuckCount = 0;
  for (let i = 0; i < maxActions; i++) {
    const state = client.getState();
    if (!state) break;
    if (state.ctx.gameover) break;
    if (state.ctx.turn === lastTurn) {
      stuckCount++;
      if (stuckCount > 40) break;
    } else {
      stuckCount = 0;
      lastTurn = state.ctx.turn;
    }
    const action = decideBotAction(state.G, state.ctx, CARD_DEFINITIONS, state.ctx.currentPlayer);
    dispatchMove(client, action as Move);
  }

  const final = client.getState();
  client.stop();
  const winner = (final?.ctx.gameover?.winner as PlayerID | undefined) ?? null;
  return { winner, turns: final?.ctx.turn ?? 0, timedOut: winner === null };
}

it('reports starter-deck and random-deck bot-vs-bot balance signal', () => {
  const lines: string[] = [];
  const log = (line: string) => lines.push(line);

  // --- 1. The two fixed starter decks, both starting orders -------------
  log('\n=== Starter deck matchup (deterministic — engine has no randomness) ===');
  const starterIds = Object.keys(STARTER_DECKS);
  for (const [firstId, secondId] of [
    [starterIds[0], starterIds[1]],
    [starterIds[1], starterIds[0]],
  ]) {
    const result = playMatch({
      '0': STARTER_DECKS[firstId].setup,
      '1': STARTER_DECKS[secondId].setup,
    });
    const winnerName =
      result.winner === null
        ? 'no winner (timed out)'
        : result.winner === '0'
          ? STARTER_DECKS[firstId].name
          : STARTER_DECKS[secondId].name;
    log(
      `  ${STARTER_DECKS[firstId].name} (P1) vs ${STARTER_DECKS[secondId].name} (P2): ` +
        `winner = ${winnerName}, turns = ${result.turns}${result.timedOut ? ' [TIMED OUT]' : ''}`,
    );
  }

  // --- 2. Random legal decks, tracking each card's win rate -------------
  const SAMPLE_SIZE = 150;
  const rng = makeRng(20260802);
  const included: Record<string, number> = {};
  const includedWins: Record<string, number> = {};
  for (const id of BUILDABLE_CARD_IDS) {
    included[id] = 0;
    includedWins[id] = 0;
  }

  let timeouts = 0;
  let turnsTotal = 0;
  let p1Wins = 0;

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const deckA = randomValidDeck(rng);
    const deckB = randomValidDeck(rng);
    const result = playMatch({ '0': toSetup(deckA), '1': toSetup(deckB) });
    turnsTotal += result.turns;
    if (result.timedOut) timeouts++;
    if (result.winner === '0') p1Wins++;

    for (const id of deckA) {
      included[id]++;
      if (result.winner === '0') includedWins[id]++;
    }
    for (const id of deckB) {
      included[id]++;
      if (result.winner === '1') includedWins[id]++;
    }
  }

  log(`\n=== Random legal decks (${SAMPLE_SIZE} matches, seeded RNG for reproducibility) ===`);
  log(`  Player-1-seat win rate: ${((p1Wins / SAMPLE_SIZE) * 100).toFixed(1)}% (first-move advantage signal)`);
  log(`  Average match length: ${(turnsTotal / SAMPLE_SIZE).toFixed(1)} turns`);
  log(`  Timed out (no conclusion within ${600} actions): ${timeouts} / ${SAMPLE_SIZE}`);

  log('\n  Per-card win rate when included in a deck (sorted, worst to best):');
  const rows = BUILDABLE_CARD_IDS.map((id) => {
    const def = CARD_DEFINITIONS[id];
    const games = included[id];
    const winRate = games > 0 ? (includedWins[id] / games) * 100 : Number.NaN;
    return { id, name: def.name, season: def.season, tier: def.tier, games, winRate };
  }).sort((a, b) => a.winRate - b.winRate);

  for (const row of rows) {
    const winRateStr = Number.isNaN(row.winRate) ? '  n/a' : row.winRate.toFixed(1).padStart(5);
    log(`    ${winRateStr}%  (n=${String(row.games).padStart(3)})  ${row.name} [${row.season}/${row.tier}]`);
  }

  log(
    '\n  Reading this: ~50% is balanced. A card sitting well above or below that ' +
      'across a decent sample (n) is the kind of thing worth a manual look — this ' +
      'report flags candidates, it does not hand down verdicts (a weak card in a ' +
      'strong random deck still often wins, and vice versa).',
  );

  console.log(lines.join('\n'));
});
