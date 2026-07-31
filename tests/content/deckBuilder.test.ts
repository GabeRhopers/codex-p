import { describe, expect, it } from 'vitest';
import {
  BUILDABLE_CARD_IDS,
  abilityCardCount,
  evaluateDeckBuild,
  loadSavedCustomDeck,
  nonNeutralSeasonCount,
  toPlayerSetup,
} from '../../src/content/deckBuilder';
import { CARD_DEFINITIONS } from '../../src/content/cards';

describe('Deck builder pool', () => {
  it('excludes both Titans, reserved for Advanced Mode', () => {
    const titanIds = Object.values(CARD_DEFINITIONS)
      .filter((def) => def.form === 'Titan')
      .map((def) => def.id);
    expect(titanIds.length).toBeGreaterThan(0); // sanity: the roster still has Titans to exclude
    for (const id of titanIds) {
      expect(BUILDABLE_CARD_IDS).not.toContain(id);
    }
  });

  it('is exactly every non-Titan card in the registry', () => {
    expect(BUILDABLE_CARD_IDS.length).toBe(
      Object.values(CARD_DEFINITIONS).filter((def) => def.form !== 'Titan').length,
    );
  });
});

describe('evaluateDeckBuild', () => {
  it('is incomplete below 10 cards', () => {
    const status = evaluateDeckBuild(['ember_striker', 'firebrand']);
    expect(status.isComplete).toBe(false);
    expect(status.cardCount).toBe(2);
  });

  it('is complete for a real legal 10-card selection (the actual Vanguard\'s Alliance list)', () => {
    const status = evaluateDeckBuild([
      'thornvine_skirmisher',
      'ember_striker',
      'solar_lancer',
      'ice_piercer',
      'snowbound_guard',
      'firebrand',
      'blizzardcaller',
      'bulwark_drifter',
      'meadow_runner',
      'mesmerist',
    ]);
    expect(status.cardCount).toBe(10);
    expect(status.abilityCount).toBe(3);
    expect(status.isComplete).toBe(true);
  });

  it('rejects more than 3 ability cards even at exactly 10 total', () => {
    // firebrand, blizzardcaller, mesmerist are the deck's 3 ability cards;
    // swapping in a 4th ability card (scorchcaller) must fail legality.
    const status = evaluateDeckBuild([
      'thornvine_skirmisher',
      'ember_striker',
      'solar_lancer',
      'ice_piercer',
      'scorchcaller',
      'firebrand',
      'blizzardcaller',
      'bulwark_drifter',
      'meadow_runner',
      'mesmerist',
    ]);
    expect(status.cardCount).toBe(10);
    expect(status.abilityCount).toBe(4);
    expect(status.isComplete).toBe(false);
  });

  it('rejects a mono-season 10-card selection (excluding Neutral)', () => {
    // All-Winter, padded with Neutral cards to reach 10 — only 1 non-Neutral
    // season represented, same standard the preset decks are held to.
    const status = evaluateDeckBuild([
      'ice_piercer', // Winter
      'frost_sentinel',
      'frostguard',
      'blizzardcaller',
      'snowdrift_scout',
      'wayfarer',
      'bulwark_drifter',
      'meadow_runner',
      'mesmerist',
      'trickster',
    ]);
    expect(status.seasonCount).toBe(1);
    expect(status.isComplete).toBe(false);
  });
});

describe('toPlayerSetup', () => {
  it('splits the first 5 picked as the starting battlefield, the rest as bench', () => {
    const defIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const setup = toPlayerSetup(defIds);
    expect(setup.deckDefIds).toEqual(defIds);
    expect(setup.startingBattlefieldDefIds).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('loadSavedCustomDeck', () => {
  it('returns null rather than throwing when localStorage is unavailable (Node test environment)', () => {
    expect(() => loadSavedCustomDeck()).not.toThrow();
    expect(loadSavedCustomDeck()).toBeNull();
  });
});

describe('abilityCardCount / nonNeutralSeasonCount', () => {
  it('count correctly against real content', () => {
    expect(abilityCardCount(['firebrand', 'ember_striker'])).toBe(1);
    expect(nonNeutralSeasonCount(['ember_striker', 'ice_piercer', 'wayfarer'])).toBe(2); // Summer + Winter, Neutral excluded
  });
});
