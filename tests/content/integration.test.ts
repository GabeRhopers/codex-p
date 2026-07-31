import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS } from '../../src/content/cards';
import { STARTER_DECKS } from '../../src/content/decks';
import { createSeasonsBattleGame } from '../../src/game/game';
import { startClient, getG, advanceToPlayerTurn } from '../game/fixtures';

/**
 * A smoke test with the *real* content and engine together — the two unit
 * suites (deckLegality.test.ts, and the Phase 1 engine tests against
 * fixtures) each pass in isolation, but only running them together catches
 * wiring mistakes like a mistyped defId or an ability effect that throws
 * against real data.
 */
function startRealMatch() {
  const game = createSeasonsBattleGame(CARD_DEFINITIONS, {
    '0': STARTER_DECKS.vanguardAlliance.setup,
    '1': STARTER_DECKS.wardenAlliance.setup,
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
      '0:ice_piercer',
      '0:firebrand',
    ]);
    expect(G.players['0'].bench).toEqual([
      '0:solar_lancer',
      '0:snowbound_guard',
      '0:blizzardcaller',
      '0:bulwark_drifter',
      '0:meadow_runner',
      '0:mesmerist',
    ]);

    expect(G.players['1'].lanes).toEqual([
      '1:glacier_warden',
      '1:glacier_warden',
      '1:dune_skirmisher',
      '1:wayfarer',
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

  // Regression coverage for a real content bug: Trickster's Feint and
  // Frostguard's Ward used to be byte-for-byte identical abilities (same
  // +1 Shield self-heal, same usableWhileDefending) despite shipping in
  // the same starter deck, and Blizzardcaller's Numbing Frost was
  // identical to Scorchcaller's Scorch (-1 Attack to a target). Neither
  // pair had any real-content test coverage, which is how the duplication
  // went unnoticed — this locks in the fix so it can't silently regress.
  it('Feint and Numbing Frost are no longer identical to Ward and Scorch', () => {
    const client = startClient(
      {
        // ember_striker (Attack 4) exists purely so Numbing Frost's -2 has
        // room to show up distinctly from Scorch's -1 — Trickster's own
        // Attack (1) would floor either way (attackFloor = 1) and prove
        // nothing.
        '0': { deckDefIds: ['trickster', 'ember_striker'], startingBattlefieldDefIds: ['trickster', 'ember_striker'] },
        '1': { deckDefIds: ['blizzardcaller', 'solar_lancer'], startingBattlefieldDefIds: ['blizzardcaller', 'solar_lancer'] },
      },
      CARD_DEFINITIONS,
    );

    // Ward (Frostguard) is still usable while defending; Feint (Trickster)
    // no longer is — that alone already distinguishes them regardless of
    // magnitude.
    client.moves.enterDefense({ lane: 0 });
    expect(getG(client).cardInstances['0:trickster'].defending).toBe(true);
    client.moves.activateAbility({ lane: 0 }); // Feint, while defending: must be rejected
    expect(getG(client).turnState.movesUsed).toBe(1); // still just the enterDefense move
    expect(getG(client).cardInstances['0:trickster'].currentShield).toBe(3); // unchanged

    advanceToPlayerTurn(client, '1');
    // Numbing Frost (Blizzardcaller) now hits for 2, not Scorch's 1.
    client.moves.activateAbility({ lane: 0, targetPlayerID: '0', targetLane: 1 });
    expect(getG(client).cardInstances['0:ember_striker'].currentAttack).toBe(2); // 4 - 2

    client.stop();
  });
});
