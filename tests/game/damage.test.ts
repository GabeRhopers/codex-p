import { beforeEach, describe, expect, it } from 'vitest';
import { advanceToAttackableTurn, forceAdvanceToPlayerTurn, getG, makeSetup, startClient } from './fixtures';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['fragile']),
    '1': makeSetup(deck, ['normal-r1']), // attack 3, well above fragile's 1 shield
  });
  advanceToAttackableTurn(client, '1');
});

describe('§16 Resolving damage', () => {
  it('a card at 0 Shield is broken, not destroyed, even from overkill damage', () => {
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // attack(3) vs shield(1)
    const G = getG(client);
    const fragile = G.cardInstances['0:fragile'];
    expect(fragile).toBeDefined();
    expect(fragile.currentShield).toBe(0);
    expect(fragile.broken).toBe(true);
    expect(G.players['1'].eliminationPoints).toBe(0); // not destroyed yet
  });

  it('requires a later, separate attack to actually destroy a broken card', () => {
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // breaks it, 1 of 2 moves spent
    forceAdvanceToPlayerTurn(client, '1'); // skip past player 0's turn to player 1's next turn

    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // finishing blow
    const G = getG(client);
    expect(G.cardInstances['0:fragile']).toBeUndefined();
    expect(G.players['1'].eliminationPoints).toBe(1);
  });
});

describe('§18 Defense Mode damage cap', () => {
  it('a defending card takes only 1 damage from a much stronger attacker', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r2']), // shield 3
      '1': makeSetup(deck, ['normal-r1']), // attack 3
    });
    client.moves.enterDefense({ lane: 0 }); // player 0, turn 1, allowed (not an attack)
    advanceToAttackableTurn(client, '1');

    client.moves.attack({ attackerLane: 0, targetSide: 'center' });
    const G = getG(client);
    expect(G.cardInstances['0:normal-r2'].currentShield).toBe(2); // 3 - 1, not 3 - 3
  });
});
