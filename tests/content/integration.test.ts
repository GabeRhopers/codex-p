import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS } from '../../src/content/cards';
import { STARTER_DECKS } from '../../src/content/decks';
import { createSeasonsBattleGame } from '../../src/game/game';

/**
 * A smoke test with the *real* content and engine together — the two unit
 * suites (deckLegality.test.ts, and the Phase 1 engine tests against
 * fixtures) each pass in isolation, but only running them together catches
 * wiring mistakes like a mistyped defId or an ability effect that throws
 * against real data.
 */
function startRealMatch() {
  const game = createSeasonsBattleGame(CARD_DEFINITIONS, {
    '0': STARTER_DECKS.summerPressure.setup,
    '1': STARTER_DECKS.winterControl.setup,
  });
  const client = Client({ game, numPlayers: 2 });
  client.start();
  return client;
}

describe('Real content integration', () => {
  it('sets up both starter decks onto a legal 5-lane battlefield each', () => {
    const client = startRealMatch();
    const G = client.getState()!.G;

    expect(G.players['0'].lanes).toEqual([
      '0:sunblade_vanguard',
      '0:sunblade_vanguard',
      '0:ember_striker',
      '0:solar_lancer',
      '0:firebrand',
    ]);
    expect(G.players['0'].bench).toEqual([
      '0:dune_skirmisher',
      '0:scorchcaller',
      '0:wayfarer',
      '0:bulwark_drifter',
      '0:trickster',
      '0:meadow_runner',
    ]);

    expect(G.players['1'].lanes).toEqual([
      '1:glacier_warden',
      '1:glacier_warden',
      '1:frost_sentinel',
      '1:ice_piercer',
      '1:frostguard',
    ]);
    client.stop();
  });

  it('plays a full opening sequence: move, attack, and an ability from each side without errors', () => {
    const client = startRealMatch();

    // Turn 1 (player 0): can't attack yet, but abilities and moves are fine.
    client.moves.activateAbility({ lane: 4 }); // Firebrand's Empower, self-targeted
    expect(client.getState()!.G.cardInstances['0:firebrand'].currentAttack).toBe(3);

    client.moves.enterDefense({ lane: 0 }); // the Titan defends (either lane index works)
    expect(client.getState()!.G.cardInstances['0:sunblade_vanguard'].defending).toBe(true);

    // Turn 2 (player 1): Frostguard's Ward, then attack player 0's Titan.
    client.moves.activateAbility({ lane: 4 }); // Frostguard's Ward, self-targeted
    expect(client.getState()!.G.cardInstances['1:frostguard'].currentShield).toBe(4); // clamped at max

    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // Glacier Warden vs defending Titan
    const afterAttack = client.getState()!.G;
    // Defense Mode caps the hit at 1, regardless of the Titan's attack(4).
    expect(afterAttack.cardInstances['0:sunblade_vanguard'].currentShield).toBe(7);

    client.stop();
  });
});
