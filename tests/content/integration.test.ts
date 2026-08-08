import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS } from '../../src/content/cards';
import { STARTER_DECKS } from '../../src/content/decks';
import { createSeasonsBattleGame } from '../../src/game/game';
import { startClient, getG, advanceToPlayerTurn, endTurn } from '../game/fixtures';

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

    // Normal Mode: every card is 1 lane wide, so 5 starting cards fill the
    // board exactly (no Titan taking a double slot).
    expect(G.players['0'].lanes).toEqual([
      '0:ember_striker',
      '0:firebrand',
      '0:ice_piercer',
      '0:thornvine_skirmisher',
      '0:meadow_runner',
    ]);
    expect(G.players['0'].bench).toEqual([
      '0:solar_lancer',
      '0:snowbound_guard',
      '0:blizzardcaller',
      '0:bulwark_drifter',
      '0:mesmerist',
    ]);

    expect(G.players['1'].lanes).toEqual([
      '1:dune_skirmisher',
      '1:frostguard',
      '1:wayfarer',
      '1:bramble_reaper',
      '1:frost_sentinel',
    ]);
    expect(G.players['1'].bench).toEqual([
      '1:scorchcaller',
      '1:trickster',
      '1:hollow_wanderer',
      '1:stonebound_sentry',
      '1:snowdrift_scout',
    ]);
    client.stop();
  });

  it('plays a full opening sequence: move, attack, and an ability from each side without errors', () => {
    const client = startRealMatch();

    // Turn 1 (player 0): can't attack yet, but abilities and moves are fine.
    client.moves.activateAbility({ lane: 1 }); // Blaze Hawk's Empower, self-targeted
    expect(client.getState()!.G.cardInstances['0:firebrand'].currentAttack).toBe(3);

    client.moves.enterDefense({ lane: 0 }); // Ember Lion defends
    expect(client.getState()!.G.cardInstances['0:ember_striker'].defending).toBe(true);

    // Turn 2 (player 1): Blizzard Wolf's Ward, then attack player 0's defending card.
    client.moves.activateAbility({ lane: 1 }); // Blizzard Wolf's Ward, self-targeted
    expect(client.getState()!.G.cardInstances['1:frostguard'].currentShield).toBe(4); // clamped at max

    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // Dune Jackal vs defending Ember Lion
    const afterAttack = client.getState()!.G;
    // Defense Mode caps the hit at 1, regardless of Dune Jackal's attack (2).
    expect(afterAttack.cardInstances['0:ember_striker'].currentShield).toBe(1); // 2 - 1

    client.stop();
  });

  // Regression coverage for a real content bug: Shadow Fox's Feint and
  // Blizzard Wolf's Ward used to be byte-for-byte identical abilities (same
  // +1 Shield self-heal, same usableWhileDefending) despite shipping in
  // the same starter deck, and Tundra Wolverine's Numbing Frost was
  // identical to Scorch Boar's Scorch (-1 Attack to a target). Neither
  // pair had any real-content test coverage, which is how the duplication
  // went unnoticed — this locks in the fix so it can't silently regress.
  it('Feint and Numbing Frost are no longer identical to Ward and Scorch', () => {
    const client = startClient(
      {
        // ember_striker (Attack 4) exists purely so Numbing Frost's -2 has
        // room to show up distinctly from Scorch's -1 — Shadow Fox's own
        // Attack (2) would floor either way (attackFloor = 1: 2-1 and 2-2
        // both bottom out at 1) and prove nothing.
        '0': { deckDefIds: ['trickster', 'ember_striker'], startingBattlefieldDefIds: ['trickster', 'ember_striker'] },
        '1': { deckDefIds: ['blizzardcaller', 'solar_lancer'], startingBattlefieldDefIds: ['blizzardcaller', 'solar_lancer'] },
      },
      CARD_DEFINITIONS,
    );

    // Ward (Blizzard Wolf) is still usable while defending; Feint (Shadow
    // Fox) no longer is — that alone already distinguishes them regardless
    // of magnitude.
    client.moves.enterDefense({ lane: 0 });
    expect(getG(client).cardInstances['0:trickster'].defending).toBe(true);
    client.moves.activateAbility({ lane: 0 }); // Feint, while defending: must be rejected
    expect(getG(client).turnState.movesUsed).toBe(1); // still just the enterDefense move
    expect(getG(client).cardInstances['0:trickster'].currentShield).toBe(4); // unchanged (printed max)

    advanceToPlayerTurn(client, '1');
    // Numbing Frost (Tundra Wolverine) now hits for 2, not Scorch's 1.
    client.moves.activateAbility({ lane: 0, targetPlayerID: '0', targetLane: 1 });
    expect(getG(client).cardInstances['0:ember_striker'].currentAttack).toBe(2); // 4 - 2

    client.stop();
  });

  // Regression coverage for real user feedback: Mesmerize (Wild Cobra) used
  // to set a target's Shield straight to 0 and Broken unconditionally,
  // regardless of the target's own Shield or Defense Mode status — the
  // only thing in the game that could bypass Defense Mode's damage cap.
  // It's now a heavy (-3) but ordinary Shield hit via reduceShield, so it
  // no longer auto-destroys-in-waiting the toughest cards in the roster,
  // and Defense Mode still caps it at 1 like any other hit (§18).
  it('Mesmerize is a heavy Shield hit, not an unconditional wipe, and still respects Defense Mode', () => {
    const client = startClient(
      {
        '0': { deckDefIds: ['mesmerist', 'ember_striker'], startingBattlefieldDefIds: ['mesmerist', 'ember_striker'] },
        '1': { deckDefIds: ['stonebound_sentry', 'trickster'], startingBattlefieldDefIds: ['stonebound_sentry', 'trickster'] },
      },
      CARD_DEFINITIONS,
    );

    // Turn 1 (player 0): Mesmerize against Stone Husky, the roster's
    // tankiest card (Shield 6). The old behavior would have zeroed and
    // Broken it outright; it should now just take a heavy, survivable hit.
    // Mesmerize costs 1 move like every other ability (see BALANCE_FORMULA.md
    // for why costsBothMoves was dropped), so this turn is ended explicitly
    // rather than the ability auto-spending the whole budget.
    client.moves.activateAbility({ lane: 0, targetPlayerID: '1', targetLane: 0 });
    let G = getG(client);
    expect(G.cardInstances['1:stonebound_sentry'].currentShield).toBe(3); // 6 - 3
    expect(G.cardInstances['1:stonebound_sentry'].broken).toBe(false);
    endTurn(client);

    // Turn 2 (player 1): Shadow Fox enters Defense Mode, then forfeits its
    // second move so play returns to player 0 with Shadow Fox still
    // defending on player 0's next turn.
    client.moves.enterDefense({ lane: 1 });
    endTurn(client);

    // Turn 3 (player 0): Mesmerize again, now against the defending Shadow
    // Fox — must be capped at 1 Shield lost, exactly like a normal attack
    // against a Defense-Mode card, not the old flat -3/wipe.
    client.moves.activateAbility({ lane: 0, targetPlayerID: '1', targetLane: 1 });
    G = getG(client);
    expect(G.cardInstances['1:trickster'].currentShield).toBe(3); // 4 - 1 (capped), not 4 - 3
    expect(G.cardInstances['1:trickster'].broken).toBe(false);

    client.stop();
  });
});
