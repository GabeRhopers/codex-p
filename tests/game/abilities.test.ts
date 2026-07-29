import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceToAttackableTurn,
  advanceToPlayerTurn,
  forceAdvanceToPlayerTurn,
  getCtx,
  getG,
  makeSetup,
  startClient,
} from './fixtures';

const deck = ['normal-r1', 'normal-r2', 'buffer', 'healer', 'mindcontrol', 'fragile'];

let client: ReturnType<typeof startClient>;

beforeEach(() => {
  client = startClient({
    '0': makeSetup(deck, ['buffer', 'normal-r1', 'healer']),
    '1': makeSetup(deck, ['mindcontrol', 'fragile']),
  });
});

describe('§20 Abilities', () => {
  it('costs 1 move and applies a permanent stat change (§20.4)', () => {
    client.moves.activateAbility({ lane: 0 }); // buffer: +1 Attack, self-targeted
    const G = getG(client);
    expect(G.cardInstances['0:buffer'].currentAttack).toBe(2);
    expect(G.turnState.movesUsed).toBe(1);
  });

  it('the ability-vs-attack restriction is scoped to one turn, not permanent', () => {
    client.moves.activateAbility({ lane: 0 }); // buffer acts, turn 1 (only 1 of 2 moves spent)
    forceAdvanceToPlayerTurn(client, '0'); // player 0's next turn (turn 3), fresh actedInstanceIds

    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // same card, but a fresh turn
    expect(getG(client).turnState.attackUsed).toBe(true);
  });

  it('restricts a single card to ability OR attack within one turn, not both', () => {
    advanceToAttackableTurn(client, '0'); // skip turns 1-2, land on player 0's turn 3

    client.moves.activateAbility({ lane: 0 }); // buffer's ability
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // same card, same turn
    expect(getG(client).turnState.attackUsed).toBe(false); // rejected: already acted
  });

  it('a different card may still attack after another card used an ability this turn', () => {
    client.moves.activateAbility({ lane: 0 }); // buffer, turn 1 (only 1 of 2 moves spent)
    forceAdvanceToPlayerTurn(client, '0'); // player 0's next turn (turn 3), fresh actedInstanceIds

    client.moves.activateAbility({ lane: 0 }); // buffer again
    client.moves.attack({ attackerLane: 1, targetSide: 'center' }); // normal-r1, different card
    // This is the turn's 2nd move, so it auto-ends the turn — turnState is
    // already reset for turn 4 by the time we can read it. Check the
    // attack's actual effect and the turn handoff instead.
    expect(getG(client).cardInstances['1:fragile'].currentShield).toBe(0);
    expect(getG(client).cardInstances['1:fragile'].broken).toBe(true);
    expect(getCtx(client).currentPlayer).toBe('1');
  });

  it('rejects a targeted ability with a missing target', () => {
    advanceToAttackableTurn(client, '0'); // skip turns 1-2, land on player 0's turn 3

    client.moves.activateAbility({ lane: 2 }); // healer requires a target, none given
    const G = getG(client);
    expect(G.turnState.movesUsed).toBe(0);
  });

  it('a targeted ability resolves against the specified card and clears the broken flag on restore', () => {
    client = startClient({
      '0': makeSetup(deck, ['buffer', 'healer']),
      '1': makeSetup(deck, ['normal-r1']), // attack 3, enough to break buffer's 2 shield in one hit
    });

    advanceToAttackableTurn(client, '1');
    client.moves.attack({ attackerLane: 0, targetSide: 'center' }); // breaks buffer
    expect(getG(client).cardInstances['0:buffer'].broken).toBe(true);

    advanceToPlayerTurn(client, '0'); // player 1 used only 1 of 2 moves, but a plain step to player 0 is fine
    client.moves.activateAbility({ lane: 1, targetPlayerID: '0', targetLane: 0 }); // healer -> buffer
    const G = getG(client);
    expect(G.cardInstances['0:buffer'].currentShield).toBe(2); // restored, clamped to printed max
    expect(G.cardInstances['0:buffer'].broken).toBe(false);
  });
});

describe('§21 Mind Control', () => {
  it('costs both moves as one action and leaves nothing left this turn', () => {
    advanceToPlayerTurn(client, '1');

    client.moves.activateAbility({ lane: 0, targetPlayerID: '0', targetLane: 0 }); // mindcontrol -> buffer
    // Costing both moves auto-ends the turn within this same call, so
    // turnState is already reset for the next turn by the time we read it —
    // check the effect and the turn handoff instead.
    expect(getG(client).cardInstances['0:buffer'].currentShield).toBe(0); // fixture effect marker
    expect(getCtx(client).currentPlayer).toBe('0'); // both moves spent as one action ends the turn immediately
  });

  it('cannot be used if a move has already been spent this turn', () => {
    advanceToPlayerTurn(client, '1');

    client.moves.enterDefense({ lane: 1 }); // fragile spends the first move
    client.moves.activateAbility({ lane: 0, targetPlayerID: '0', targetLane: 0 }); // needs both, only 1 left
    const G = getG(client);
    expect(G.turnState.movesUsed).toBe(1); // mind control rejected
    expect(G.cardInstances['0:buffer'].currentShield).toBe(2); // untouched
  });
});
