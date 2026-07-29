import { beforeEach, describe, expect, it } from 'vitest';
import { advanceToPlayerTurn, getG, makeSetup, startClient } from './fixtures';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile', 'titan'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['normal-r1', 'normal-r2', 'normal-r3']),
    '1': makeSetup(deck, ['titan']),
  });
});

describe('§19 Change position — Normal cards', () => {
  it('swaps with an adjacent friendly Normal card', () => {
    client.moves.changePosition({ lane: 0, direction: 'right' });
    const G = getG(client);
    expect(G.players['0'].lanes[0]).toBe('0:normal-r2');
    expect(G.players['0'].lanes[1]).toBe('0:normal-r1');
  });

  it('rejects moving into an empty lane', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']), // lanes 1-4 empty
      '1': makeSetup(deck, ['titan']),
    });
    client.moves.changePosition({ lane: 0, direction: 'right' });
    expect(getG(client).players['0'].lanes[0]).toBe('0:normal-r1'); // unchanged
    expect(getG(client).turnState.movesUsed).toBe(0);
  });

  it('a card that changed position cannot act again this turn', () => {
    client.moves.changePosition({ lane: 0, direction: 'right' });
    client.moves.enterDefense({ lane: 1 }); // the card now at lane 1 is the one that just moved
    expect(getG(client).cardInstances['0:normal-r1'].defending).toBe(false); // rejected
    expect(getG(client).turnState.movesUsed).toBe(1);
  });
});

describe('§19 Change position — Titans move as one unit', () => {
  it('slides both lanes together into an empty adjacent lane', () => {
    // Player 1's Titan occupies lanes 0-1 by default placement; give it room on lane 2.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['titan']), // occupies lanes 0-1, lanes 2-4 empty
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' });
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual([null, '1:titan', '1:titan', null, null]);
  });

  it('rejects sliding off the edge of the board', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['titan']), // occupies lanes 0-1
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'left' }); // would need lane -1
    expect(getG(client).players['1'].lanes.slice(0, 2)).toEqual(['1:titan', '1:titan']);
    expect(getG(client).turnState.movesUsed).toBe(0);
  });

  it('rejects sliding into a lane occupied by another card', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['titan', 'normal-r2']), // titan lanes 0-1, normal-r2 lane 2
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' }); // needs lane 2, occupied
    expect(getG(client).players['1'].lanes.slice(0, 3)).toEqual(['1:titan', '1:titan', '1:normal-r2']);
    expect(getG(client).turnState.movesUsed).toBe(0);
  });
});
