import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS } from '../../src/content/cards';
import { STARTER_DECKS } from '../../src/content/decks';
import { BOARD_SIZE, DECK_SIZE, MAX_SPECIAL_ABILITY_CARDS, MAX_TITANS_PER_DECK } from '../../src/game/rules.config';

describe('Card registry', () => {
  it('every definition key matches its own id', () => {
    for (const [key, def] of Object.entries(CARD_DEFINITIONS)) {
      expect(def.id).toBe(key);
    }
  });

  it('has a reasonable MVP roster size (16-20 unique cards)', () => {
    const count = Object.keys(CARD_DEFINITIONS).length;
    expect(count).toBeGreaterThanOrEqual(16);
    expect(count).toBeLessThanOrEqual(20);
  });
});

describe('§9 Standard Mode deck legality', () => {
  for (const deck of Object.values(STARTER_DECKS)) {
    describe(deck.name, () => {
      it(`contains exactly ${DECK_SIZE} cards (§9.1)`, () => {
        expect(deck.setup.deckDefIds).toHaveLength(DECK_SIZE);
      });

      it('contains no duplicate cards (§9.2)', () => {
        const unique = new Set(deck.setup.deckDefIds);
        expect(unique.size).toBe(deck.setup.deckDefIds.length);
      });

      it('every card in the deck exists in the registry', () => {
        for (const defId of deck.setup.deckDefIds) {
          expect(CARD_DEFINITIONS[defId]).toBeDefined();
        }
      });

      it(`contains no more than ${MAX_TITANS_PER_DECK} Titan (§9.3)`, () => {
        const titans = deck.setup.deckDefIds.filter(
          (defId) => CARD_DEFINITIONS[defId].form === 'Titan',
        );
        expect(titans.length).toBeLessThanOrEqual(MAX_TITANS_PER_DECK);
      });

      it(`contains no more than ${MAX_SPECIAL_ABILITY_CARDS} special-ability cards (§9.4)`, () => {
        const abilityCards = deck.setup.deckDefIds.filter(
          (defId) => CARD_DEFINITIONS[defId].ability !== undefined,
        );
        expect(abilityCards.length).toBeLessThanOrEqual(MAX_SPECIAL_ABILITY_CARDS);
      });

      it('starting battlefield is a subset of the deck with no duplicates', () => {
        const unique = new Set(deck.setup.startingBattlefieldDefIds);
        expect(unique.size).toBe(deck.setup.startingBattlefieldDefIds.length);
        for (const defId of deck.setup.startingBattlefieldDefIds) {
          expect(deck.setup.deckDefIds).toContain(defId);
        }
      });

      it(`starting battlefield fits within ${BOARD_SIZE} lanes (§10)`, () => {
        const footprint = deck.setup.startingBattlefieldDefIds.reduce((sum, defId) => {
          return sum + (CARD_DEFINITIONS[defId].form === 'Titan' ? 2 : 1);
        }, 0);
        expect(footprint).toBeLessThanOrEqual(BOARD_SIZE);
      });

      it('draws from more than one season (a real collection is not mono-season)', () => {
        const seasons = new Set(
          deck.setup.deckDefIds
            .map((defId) => CARD_DEFINITIONS[defId].season)
            .filter((season) => season !== 'Neutral'),
        );
        expect(seasons.size).toBeGreaterThanOrEqual(2);
      });
    });
  }

  it('the two starter decks share no cards (MVP scope: fully distinct decks)', () => {
    const [deckA, deckB] = Object.values(STARTER_DECKS);
    const overlap = deckA.setup.deckDefIds.filter((id) => deckB.setup.deckDefIds.includes(id));
    expect(overlap).toEqual([]);
  });
});
