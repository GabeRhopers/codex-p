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

  it('shoves the occupant of its new lane into the lane it just vacated (§19 Ruling 5)', () => {
    // A standard 5-lane board never has an empty lane to slide into, so
    // this is the case that actually matters in real play, not the edge
    // case: sliding into an occupied lane must still work.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['titan', 'normal-r2']), // titan lanes 0-1, normal-r2 lane 2
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' }); // slides into lane 2, occupied by normal-r2
    const G = getG(client);
    expect(G.players['1'].lanes.slice(0, 3)).toEqual(['1:normal-r2', '1:titan', '1:titan']);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('the displaced card is not marked as having acted this turn', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['titan', 'normal-r2']), // titan lanes 0-1, normal-r2 lane 2
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' }); // titan -> [1,2], normal-r2 -> [0]
    client.moves.enterDefense({ lane: 0 }); // normal-r2, now at lane 0, still free to act
    expect(getG(client).cardInstances['1:normal-r2'].defending).toBe(true);
  });
});

describe('§19 Change position — a Normal card pushing an adjacent Titan (Ruling 5)', () => {
  it('pushes the Titan one further lane when its far side is empty', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r2', 'titan']), // normal-r2 lane 0, titan lanes 1-2, lanes 3-4 empty
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' }); // pushes into the titan's near lane (1)
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual([null, '1:normal-r2', '1:titan', '1:titan', null]);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('is rejected when the Titan has nowhere to go (the reported scenario: pinned against another card)', () => {
    // This is the exact shape of the reported bug: Normal - Titan - Normal,
    // with the far side of the Titan occupied. Even with push-through
    // implemented, this specific arrangement has no legal resolution — the
    // Titan can't be split, and its only escape lane is taken.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r1', 'titan', 'normal-r2']), // normal-r1 lane 0, titan lanes 1-2, normal-r2 lane 3
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 3, direction: 'left' }); // would need the titan to vacate into lane 0, occupied
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual(['1:normal-r1', '1:titan', '1:titan', '1:normal-r2', null]);
    expect(G.turnState.movesUsed).toBe(0);
  });

  it('is rejected when pushing the Titan would run it off the edge of the board', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r1', 'normal-r2', 'normal-r3', 'titan']), // titan pinned at the true right edge, lanes 3-4
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 2, direction: 'right' }); // titan would need lane 5 — doesn't exist
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual(['1:normal-r1', '1:normal-r2', '1:normal-r3', '1:titan', '1:titan']);
    expect(G.turnState.movesUsed).toBe(0);
  });

  it('cascades through the Titan AND a further Normal card when there is room past both', () => {
    // normal-r1(0) - titan(1,2) - normal-r2(3) - empty(4). Pushing normal-r1
    // right has to walk past the Titan, find normal-r2 still in the way,
    // and keep going to lane 4 before it finds real room. Every unit in the
    // line should end up shifted by exactly one lane.
    client = startClient({
      '0': makeSetup(deck, ['fragile']),
      '1': makeSetup(deck, ['normal-r1', 'titan', 'normal-r2']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' });
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual([
      null,
      '1:normal-r1',
      '1:titan',
      '1:titan',
      '1:normal-r2',
    ]);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('rejects the cascade when the Titan and a further Normal card leave no room anywhere', () => {
    // normal-r1(0) - titan(1,2) - normal-r2(3) - normal-r3(4): completely
    // full board in that direction, no empty lane to absorb the push at any
    // depth. Nothing should move.
    client = startClient({
      '0': makeSetup(deck, ['fragile']),
      '1': makeSetup(deck, ['normal-r1', 'titan', 'normal-r2', 'normal-r3']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' });
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual([
      '1:normal-r1',
      '1:titan',
      '1:titan',
      '1:normal-r2',
      '1:normal-r3',
    ]);
    expect(G.turnState.movesUsed).toBe(0);
  });

  it('cascading units other than the mover remain free to act this turn', () => {
    client = startClient({
      '0': makeSetup(deck, ['fragile']),
      '1': makeSetup(deck, ['normal-r1', 'titan', 'normal-r2']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 0, direction: 'right' }); // titan -> [2,3], normal-r2 -> [4]
    client.moves.enterDefense({ lane: 4 }); // normal-r2, shifted but never the initiator, still free to act
    expect(getG(client).cardInstances['1:normal-r2'].defending).toBe(true);
  });
});
