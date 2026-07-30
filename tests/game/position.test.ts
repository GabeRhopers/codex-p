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
  // This corrects an earlier, wrong implementation of this exact rule: the
  // first version required an actually-*empty* lane somewhere past the
  // Titan (cascading further if something else was in the way too), which
  // is both needlessly restrictive and, worse, inconsistent with how the
  // Titan's *own* move already works (a closed 1-for-1 trade that never
  // needs empty space at all — see applyTitanShove's doc comment). The
  // correct behaviour, confirmed against a real reported case: pushing a
  // Normal card into an adjacent Titan is that same trade, just triggered
  // from the other side — it always succeeds, and nothing beyond the
  // Titan's own two lanes and the mover's is ever touched.

  it('always succeeds — the mover lands on the Titan\'s far side, the Titan shifts toward the mover', () => {
    // titan(0,1) - normal-r1(2), pushing left. This is the exact shape
    // from the reported case (a Titan pinned at the true board edge) that
    // was wrongly rejected by the old implementation.
    client = startClient({
      '0': makeSetup(deck, ['normal-r2']),
      '1': makeSetup(deck, ['titan', 'normal-r1']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 2, direction: 'left' });
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual(['1:normal-r1', '1:titan', '1:titan', null, null]);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('a card on the Titan\'s far side (opposite the mover) is never touched', () => {
    // normal-r2(0) - titan(1,2) - normal-r1(3), pushing left. normal-r2 is
    // exactly the kind of card that used to be blamed for "pinning" the
    // Titan under the old (wrong) model — it's irrelevant here, since the
    // Titan only ever trades places with the mover itself.
    client = startClient({
      '0': makeSetup(deck, ['normal-r3']),
      '1': makeSetup(deck, ['normal-r2', 'titan', 'normal-r1']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 3, direction: 'left' });
    const G = getG(client);
    expect(G.players['1'].lanes).toEqual(['1:normal-r2', '1:normal-r1', '1:titan', '1:titan', null]);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('the Titan is not marked as having acted, even though it was the one displaced', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r2']),
      '1': makeSetup(deck, ['titan', 'normal-r1']),
    });
    advanceToPlayerTurn(client, '1');

    client.moves.changePosition({ lane: 2, direction: 'left' }); // titan -> [1,2], normal-r1 -> [0]
    client.moves.enterDefense({ lane: 1 }); // the titan, still free to act
    expect(getG(client).cardInstances['1:titan'].defending).toBe(true);
  });
});
