import { beforeEach, describe, expect, it } from 'vitest';
import { advanceToAttackableTurn, getG, makeSetup, startClient } from './fixtures';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['normal-r1', 'normal-r2', 'normal-r3']),
    '1': makeSetup(deck, ['normal-r1', 'normal-r2', 'normal-r3']),
  });
  advanceToAttackableTurn(client, '1'); // move past the opening no-attack turn to player 1
});

describe('§14-17 Attacking', () => {
  it('Range 1 hits only the single chosen lane', () => {
    client.moves.attack({ attackerLane: 0, targetSide: 'right' }); // normal-r1 (attack 3) hits opponent lane 1
    const G = getG(client);
    expect(G.cardInstances['0:normal-r1'].currentShield).toBe(3); // lane 0 untouched
    expect(G.cardInstances['0:normal-r2'].currentShield).toBe(0); // 3 - attack(3)
  });

  it('rejects an out-of-bounds Range 1 target', () => {
    client.moves.attack({ attackerLane: 0, targetSide: 'left' }); // lane -1 doesn't exist
    const G = getG(client);
    expect(G.turnState.movesUsed).toBe(0);
    expect(G.turnState.attackUsed).toBe(false);
  });

  it('attacking an unoccupied lane is legal but deals no damage', () => {
    // Clear player 0's lane 2 to make it a legal-but-empty Range 1 target.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1', 'normal-r2']),
      '1': makeSetup(deck, ['normal-r3']),
    });
    advanceToAttackableTurn(client, '1');
    client.moves.attack({ attackerLane: 0, targetSide: 'right' }); // opponent lane 1 is empty
    const G = getG(client);
    expect(G.turnState.attackUsed).toBe(true); // the move still happened
    expect(G.players['0'].eliminationPoints).toBe(0);
  });

  it('Range 2 requires an explicit side and hits center + that side', () => {
    client.moves.attack({ attackerLane: 1, targetSide: undefined });
    expect(getG(client).turnState.attackUsed).toBe(false); // missing side is invalid

    client.moves.attack({ attackerLane: 1, targetSide: 'left' }); // lanes 0 and 1
    const G = getG(client);
    expect(G.cardInstances['0:normal-r1'].currentShield).toBe(1); // 3 - attack(2)
    expect(G.cardInstances['0:normal-r2'].currentShield).toBe(1); // 3 - attack(2)
    expect(G.cardInstances['0:normal-r3'].currentShield).toBe(2); // lane 2 untouched
  });

  it('Range 3 hits all three lanes without needing a side', () => {
    // Range-3 attacker at lane 2 hits defender lanes [1, 2, 3] (left/center/right
    // of lane 2) — lane 0 is out of this particular pattern entirely.
    client.moves.attack({ attackerLane: 2 });
    const G = getG(client);
    expect(G.cardInstances['0:normal-r1'].currentShield).toBe(3); // lane 0, not in the pattern
    expect(G.cardInstances['0:normal-r2'].currentShield).toBe(2); // lane 1: 3 - attack(1)
    expect(G.cardInstances['0:normal-r3'].currentShield).toBe(1); // lane 2: 2 - attack(1)
  });

  it('a card can only attack its own row, never the opponent’s own cards', () => {
    client.moves.attack({ attackerLane: 5, targetSide: 'center' }); // out-of-bounds attacker lane
    expect(getG(client).turnState.attackUsed).toBe(false);
  });
});
