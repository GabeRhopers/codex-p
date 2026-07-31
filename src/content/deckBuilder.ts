import { CARD_DEFINITIONS } from './cards';
import { DECK_SIZE, MAX_SPECIAL_ABILITY_CARDS } from '../game/rules.config';
import type { PlayerSetup } from '../game/state';

/**
 * The card pool a player can build a deck from — every card except the 2
 * Titans, which are reserved for a future Advanced Mode (see
 * cards.ts / RULES_SPEC.md). Derived by filtering rather than a hardcoded
 * list, so it can never drift out of sync with the actual roster.
 */
export const BUILDABLE_CARD_IDS: string[] = Object.values(CARD_DEFINITIONS)
  .filter((def) => def.form !== 'Titan')
  .map((def) => def.id);

export function abilityCardCount(defIds: string[]): number {
  return defIds.filter((id) => CARD_DEFINITIONS[id]?.ability !== undefined).length;
}

/** Mirrors deckLegality.test.ts's "a real collection is not mono-season"
 * check for the preset decks — applied here too so a custom deck holds to
 * the same standard, not a looser one. */
export function nonNeutralSeasonCount(defIds: string[]): number {
  return new Set(
    defIds.map((id) => CARD_DEFINITIONS[id]?.season).filter((season) => season && season !== 'Neutral'),
  ).size;
}

export interface DeckBuildStatus {
  cardCount: number;
  abilityCount: number;
  seasonCount: number;
  isComplete: boolean;
}

export function evaluateDeckBuild(defIds: string[]): DeckBuildStatus {
  const cardCount = defIds.length;
  const abilityCount = abilityCardCount(defIds);
  const seasonCount = nonNeutralSeasonCount(defIds);
  return {
    cardCount,
    abilityCount,
    seasonCount,
    isComplete: cardCount === DECK_SIZE && abilityCount <= MAX_SPECIAL_ABILITY_CARDS && seasonCount >= 2,
  };
}

/** The first 5 cards a player picks become their starting battlefield, the
 * rest their bench — same order-preserving rule the engine already applies
 * to bench-replacement priority for the preset decks (state.ts), so a
 * custom deck behaves identically, not as a special case. */
export function toPlayerSetup(defIds: string[]): PlayerSetup {
  return {
    deckDefIds: defIds,
    startingBattlefieldDefIds: defIds.slice(0, 5),
  };
}

const STORAGE_KEY = 'seasonsBattle.customDeck.v1';

/** Reads back a previously-saved custom deck, or null if there isn't one,
 * it's corrupt, or it references cards that no longer exist / are no
 * longer buildable (e.g. after a content update) — never throws, since
 * losing a remembered deck is a minor inconvenience, not a failure. Also
 * the safe no-op path in non-browser environments (this project's Vitest
 * config runs tests under Node, which has no `localStorage`). */
export function loadSavedCustomDeck(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string' && BUILDABLE_CARD_IDS.includes(id))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCustomDeck(defIds: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defIds));
  } catch {
    // Quota exceeded, private browsing, non-browser environment — losing
    // persistence silently is fine; it's a convenience, not a requirement.
  }
}
