import { beforeEach, describe, expect, it } from 'vitest';
import { advanceToAttackableTurn, forceAdvanceToPlayerTurn, getCtx, getG, makeSetup, startClient } from './fixtures';

function standardSetups() {
  const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile'];
  const battlefield = ['normal-r1', 'normal-r2'];
  return {
    '0': makeSetup(deck, battlefield),
    '1': makeSetup(deck, battlefield),
  };
}

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient(standardSetups());
});

describe('§12-13 Turn structure', () => {
  it('grants exactly 2 moves per turn and auto-ends the turn after the second', () => {
    client.moves.enterDefense({ lane: 0 });
    expect(getG(client).turnState.movesUsed).toBe(1);
    expect(getCtx(client).currentPlayer).toBe('0');

    client.moves.enterDefense({ lane: 1 });
    expect(getCtx(client).currentPlayer).toBe('1');
    expect(getCtx(client).turn).toBe(2);
  });

  it('rejects a second move by the same card in one turn', () => {
    client.moves.enterDefense({ lane: 0 });
    const afterFirst = getG(client);
    expect(afterFirst.turnState.movesUsed).toBe(1);

    client.moves.leaveDefense({ lane: 0 }); // same card, still turn 1
    const afterSecond = getG(client);
    expect(afterSecond.turnState.movesUsed).toBe(1); // rejected, no change
    expect(afterSecond.cardInstances['0:normal-r1'].defending).toBe(true);

    // A different card can still use the turn's second move. That completes
    // the budget and auto-ends the turn within this same call, so
    // turnState is already reset for turn 2 by the time we read it — check
    // the move's effect and the turn handoff instead.
    client.moves.enterDefense({ lane: 1 });
    expect(getG(client).cardInstances['0:normal-r2'].defending).toBe(true);
    expect(getCtx(client).currentPlayer).toBe('1');
  });

  it('allows at most one attack per turn even with a move remaining', () => {
    advanceToAttackableTurn(client, '1');
    expect(getCtx(client).currentPlayer).toBe('1');

    client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    const afterFirstAttack = getG(client);
    expect(afterFirstAttack.turnState.attackUsed).toBe(true);
    expect(afterFirstAttack.turnState.movesUsed).toBe(1);
    expect(afterFirstAttack.cardInstances['0:normal-r1'].currentShield).toBe(0);

    client.moves.attack({ attackerLane: 1, targetSide: 'left' });
    const afterSecondAttempt = getG(client);
    expect(afterSecondAttempt.turnState.movesUsed).toBe(1); // rejected
    expect(afterSecondAttempt.cardInstances['0:normal-r2'].currentShield).toBe(3); // untouched
  });

  it('blocks the opening turn from attacking but allows other moves (§11)', () => {
    expect(getCtx(client).turn).toBe(1);

    client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    expect(getG(client).turnState.attackUsed).toBe(false);
    expect(getG(client).turnState.movesUsed).toBe(0);

    client.moves.enterDefense({ lane: 0 });
    expect(getG(client).cardInstances['0:normal-r1'].defending).toBe(true);
    expect(getG(client).turnState.movesUsed).toBe(1);
  });

  it('does not restrict attacking once the match has moved past turn 1, even on a player’s own first turn', () => {
    advanceToAttackableTurn(client, '1'); // player 1's own first turn, but ctx.turn is 2, not 1
    expect(getCtx(client).turn).toBe(2);

    client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    expect(getG(client).turnState.attackUsed).toBe(true);
    expect(getG(client).cardInstances['0:normal-r1'].currentShield).toBe(0);
  });

  it('replacing a destroyed card from the bench does not cost a move (§13, §22)', () => {
    // Player 1's lane 0 is a 1-shield fragile card; player 0 attacks it.
    client = startClient({
      '0': makeSetup(['normal-r1', 'normal-r2', 'normal-r3'], ['normal-r1', 'normal-r2']),
      '1': makeSetup(['fragile', 'normal-r3', 'normal-r2'], ['fragile']),
    });

    advanceToAttackableTurn(client, '0');
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // breaks it, doesn't destroy
    expect(getG(client).cardInstances['1:fragile'].broken).toBe(true);

    forceAdvanceToPlayerTurn(client, '0'); // forfeit the remaining move, cycle back to player 0
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // destroys it, triggers replacement

    const G = getG(client);
    expect(G.turnState.movesUsed).toBe(1); // only the attack itself, not the replacement
    expect(G.players['0'].eliminationPoints).toBe(1);
    expect(G.cardInstances['1:fragile']).toBeUndefined();
    expect(G.players['1'].lanes[0]).toBe('1:normal-r3'); // first bench card, FIFO
    expect(G.players['1'].bench).toEqual(['1:normal-r2']);
  });
});
