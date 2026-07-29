import { beforeEach, describe, expect, it } from 'vitest';
import { advanceToPlayerTurn, forceAdvanceToPlayerTurn, getG, makeSetup, startClient } from './fixtures';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile', 'buffer', 'steadfast'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['normal-r1', 'buffer', 'steadfast']),
    '1': makeSetup(deck, ['normal-r1']),
  });
});

describe('§18 Defense Mode', () => {
  it('costs 1 move to enter', () => {
    client.moves.enterDefense({ lane: 0 });
    expect(getG(client).cardInstances['0:normal-r1'].defending).toBe(true);
    expect(getG(client).turnState.movesUsed).toBe(1);
  });

  it('a defending card cannot attack', () => {
    client.moves.enterDefense({ lane: 0 });
    client.moves.enterDefense({ lane: 1 }); // buffer, ends the turn (2 moves used, auto-advances to player 1)

    advanceToPlayerTurn(client, '0'); // skip player 1's turn, land on player 0's turn 3

    client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    expect(getG(client).turnState.attackUsed).toBe(false); // rejected: still defending
  });

  it('cannot enter Defense Mode twice without leaving first', () => {
    client.moves.enterDefense({ lane: 0 });
    client.moves.enterDefense({ lane: 0 }); // same card AND already defending — both reasons to reject
    expect(getG(client).turnState.movesUsed).toBe(1);
  });

  it('leaving Defense Mode costs a move and re-enables attacking on a later turn', () => {
    client.moves.enterDefense({ lane: 0 });
    client.moves.enterDefense({ lane: 1 }); // ends the turn (2 moves used, auto-advances to player 1)

    advanceToPlayerTurn(client, '0'); // skip player 1's turn, land on player 0's turn 3
    client.moves.leaveDefense({ lane: 0 });
    expect(getG(client).cardInstances['0:normal-r1'].defending).toBe(false);
    expect(getG(client).turnState.movesUsed).toBe(1);
  });

  it('blocks abilities while defending unless the ability is explicitly usable while defending (§18.4)', () => {
    client.moves.enterDefense({ lane: 0 }); // buffer defends, turn 1, only 1 of 2 moves spent
    forceAdvanceToPlayerTurn(client, '0'); // skip to player 0's next turn (turn 3), fresh actedInstanceIds

    client.moves.activateAbility({ lane: 0 }); // buffer still defending, no usableWhileDefending
    expect(getG(client).cardInstances['0:buffer'].currentAttack).toBe(1); // blocked

    client.moves.activateAbility({ lane: 1 }); // a different, non-defending card
    expect(getG(client).cardInstances['0:steadfast'].currentShield).toBe(3); // its own ability ran fine (already at max, clamped)
  });

  it('a Steadfast-tier ability marked usableWhileDefending can be used while defending', () => {
    client = startClient({
      '0': makeSetup(deck, ['steadfast']),
      '1': makeSetup(deck, ['buffer']), // attack 1 — enough to chip Steadfast without destroying it
    });

    client.moves.enterDefense({ lane: 0 }); // steadfast defends, turn 1, 1 of 2 moves spent
    forceAdvanceToPlayerTurn(client, '1'); // player 1's turn 2

    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // capped at 1 damage by Defense Mode: 3 -> 2
    expect(getG(client).cardInstances['0:steadfast'].currentShield).toBe(2);

    forceAdvanceToPlayerTurn(client, '0'); // player 0's turn 3, steadfast still defending from turn 1

    client.moves.activateAbility({ lane: 0 }); // usableWhileDefending — restores 1, clamped to max 3
    expect(getG(client).cardInstances['0:steadfast'].currentShield).toBe(3);
    expect(getG(client).cardInstances['0:steadfast'].defending).toBe(true); // never left Defense Mode
  });
});
