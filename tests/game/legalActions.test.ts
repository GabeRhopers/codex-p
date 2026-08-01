import { beforeEach, describe, expect, it } from 'vitest';
import {
  FIXTURE_CARDS,
  advanceToAttackableTurn,
  advanceToPlayerTurn,
  endTurn,
  getCtx,
  getG,
  makeSetup,
  startClient,
} from './fixtures';
import { computeLegalActions } from '../../src/game/legalActions';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile', 'buffer', 'healer', 'steadfast', 'mindcontrol'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['normal-r1', 'buffer', 'steadfast', 'mindcontrol']),
    '1': makeSetup(deck, ['normal-r2', 'healer']),
  });
});

describe('computeLegalActions', () => {
  it('returns null for an empty lane', () => {
    expect(computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 4)).toBeNull();
  });

  it('returns null once the card has already acted this turn', () => {
    client.moves.enterDefense({ lane: 0 }); // normal-r1 acts
    const legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 0);
    expect(legal).toBeNull();
  });

  it('blocks attacking on turn 1 even though every other condition is met', () => {
    const legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 0);
    expect(legal?.attack).toBeNull();
  });

  it('allows attacking once past turn 1', () => {
    advanceToAttackableTurn(client, '0');
    const legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 0);
    expect(legal?.attack).toEqual({ range: 1 });
  });

  it('blocks attacking (and everything player-turn-gated) for a card that is not the current player\'s', () => {
    // It's player 0's turn; ask about player 1's card at lane 0 (normal-r2).
    const legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '1', 0);
    expect(legal).not.toBeNull();
    expect(legal?.attack).toBeNull();
    expect(legal?.canEnterDefense).toBe(false);
    expect(legal?.canLeaveDefense).toBe(false);
    expect(legal?.canMoveLeft).toBe(false);
    expect(legal?.canMoveRight).toBe(false);
    expect(legal?.ability).toBeNull();
  });

  it('a defending card cannot attack, and can only use abilities marked usableWhileDefending', () => {
    // Entering Defense Mode is itself this turn's one move for that card
    // (§12) — usableWhileDefending only matters on a *later* turn, while
    // the defending flag carries over but the card hasn't acted yet.
    client.moves.enterDefense({ lane: 2 }); // steadfast defends
    endTurn(client); // forfeit the remaining move, end this turn
    advanceToPlayerTurn(client, '0'); // steadfast is still defending, but fresh for this new turn
    let legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 2);
    expect(legal?.attack).toBeNull(); // still can't attack while defending
    expect(legal?.ability).not.toBeNull(); // steadfast's own usableWhileDefending ability is allowed

    // buffer's ability (no usableWhileDefending flag) should be blocked once defending.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1', 'buffer']),
      '1': makeSetup(deck, ['normal-r2']),
    });
    client.moves.enterDefense({ lane: 1 }); // buffer defends
    endTurn(client);
    advanceToPlayerTurn(client, '0');
    legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 1);
    expect(legal?.ability).toBeNull();
  });

  it('a costsBothMoves ability is illegal with fewer than 2 moves left', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1', 'mindcontrol']),
      '1': makeSetup(deck, ['normal-r2']),
    });
    client.moves.enterDefense({ lane: 0 }); // spend 1 of 2 moves
    const legal = computeLegalActions(getG(client), getCtx(client), FIXTURE_CARDS, '0', 1);
    expect(legal?.ability).toBeNull();
  });

  it('a bench replacement that entered this exact turn cannot act at all', () => {
    // §16 — a card at 0 Shield is Broken, not destroyed; it takes a *later*
    // hit while still broken to actually destroy and bench-replace it. So
    // this needs two of player 1's attacks, on two different turns, against
    // player 0's 1-Shield card before a replacement ever enters.
    client = startClient({
      '0': makeSetup(['fragile', 'normal-r1'], ['fragile']), // 1 Shield; normal-r1 waits on the bench
      '1': makeSetup(deck, ['normal-r1']),
    });
    advanceToAttackableTurn(client, '1'); // player 1's first attack-eligible turn
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // breaks fragile (1 -> 0 Shield), not destroyed yet
    endTurn(client); // forfeit the remaining move rather than spend it on anything relevant here
    advanceToPlayerTurn(client, '1'); // skip player 0's turn, back to player 1
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // still broken -> this hit destroys it, replaced from bench

    const G = getG(client);
    expect(G.players['0'].lanes[0]).toBe('0:normal-r1'); // replacement is in
    const ctx = getCtx(client);
    // Still player 1's turn — ask about player 0's freshly-entered card.
    const legal = computeLegalActions(G, ctx, FIXTURE_CARDS, '0', 0);
    expect(legal).toBeNull();
  });
});
