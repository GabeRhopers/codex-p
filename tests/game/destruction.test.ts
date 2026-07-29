import { beforeEach, describe, expect, it } from 'vitest';
import { endTurn, getCtx, getG, makeSetup, startClient } from './fixtures';

const deck = ['titan', 'normal-r1', 'normal-r2', 'normal-r3', 'fragile'];

let client: ReturnType<typeof startClient>;

/** Player 0 always plays turn 1, and turn 1 can never attack (§11), so
 * reaching player 0's first attackable turn (turn 3) means skipping both
 * turn 1 (player 0, forced) and turn 2 (player 1, nothing useful here).
 * Always called right after a player-0 action, so it's always exactly 2
 * turn-skips back to player 0 — player 1 never actually acts in this file,
 * so their intervening turn is always a clean 0-move skip. */
function skipToPlayer0sNextAttackableTurn() {
  expect(getCtx(client).currentPlayer).toBe('0');
  endTurn(client);
  endTurn(client);
  expect(getCtx(client).currentPlayer).toBe('0');
}

// Player 0's normal-r2 (Range 2, Attack 2) sits at lane 1; with side 'left'
// its pattern is [1, 0] — exactly the two lanes a Titan placed first on the
// battlefield occupies (0-1). Every overlap attack in this file reuses that.
function overlapAttack() {
  client.moves.attack({ attackerLane: 1, targetSide: 'left' });
}

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['fragile', 'normal-r2']), // lane 0 filler, lane 1 the Range-2 attacker
    '1': makeSetup(deck, ['titan']), // occupies lanes 0-1, shield 6; bench gets normal-r1, normal-r2, normal-r3
  });
  skipToPlayer0sNextAttackableTurn();
});

describe('§22-23 Destruction & bench replacement', () => {
  it('destroying a Titan awards 2 points and refills both freed lanes independently from bench', () => {
    // Bring the Titan down with ordinary single-lane hits so this test
    // isolates §22/§23 bench mechanics from the Ruling-1 overlap behavior.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']), // Range 1, Attack 3, at lane 0
      '1': makeSetup(deck, ['titan']), // shield 6
    });
    skipToPlayer0sNextAttackableTurn();

    const hit = () => client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    hit(); // 6 -> 3
    skipToPlayer0sNextAttackableTurn();
    hit(); // 3 -> 0, broken
    skipToPlayer0sNextAttackableTurn();
    hit(); // finishing blow

    const G = getG(client);
    expect(G.cardInstances['1:titan']).toBeUndefined();
    expect(G.players['0'].eliminationPoints).toBe(2);
    // Standard Mode caps a deck at 1 Titan (§9.3), so once it's gone every
    // remaining bench card is a Normal card — both freed lanes fill safely.
    expect(G.players['1'].lanes[0]).toBe('1:normal-r1');
    expect(G.players['1'].lanes[1]).toBe('1:normal-r2');
    expect(G.players['1'].bench).toEqual(['1:normal-r3', '1:fragile']);
  });

  it('Ruling 1: a Titan hit on both its occupied lanes by one attack takes damage twice', () => {
    overlapAttack(); // two instances of Attack(2) = 4 total
    const G = getG(client);
    expect(G.cardInstances['1:titan'].currentShield).toBe(2); // 6 - 2 - 2
    expect(G.cardInstances['1:titan'].broken).toBe(false);
  });

  it('an overlap attack that reaches 0 Shield mid-resolution still does not destroy the card that same attack', () => {
    overlapAttack(); // 6 -> 2
    skipToPlayer0sNextAttackableTurn();

    overlapAttack(); // first instance: 2 -> 0 (broken flips true mid-attack); second instance must NOT then destroy it
    const afterSecondOverlap = getG(client);
    expect(afterSecondOverlap.cardInstances['1:titan']).toBeDefined();
    expect(afterSecondOverlap.cardInstances['1:titan'].currentShield).toBe(0);
    expect(afterSecondOverlap.cardInstances['1:titan'].broken).toBe(true);
    expect(afterSecondOverlap.players['0'].eliminationPoints).toBe(0);

    skipToPlayer0sNextAttackableTurn();

    overlapAttack(); // a genuinely later attack — this one destroys it
    const final = getG(client);
    expect(final.cardInstances['1:titan']).toBeUndefined();
    expect(final.players['0'].eliminationPoints).toBe(2);
  });
});
