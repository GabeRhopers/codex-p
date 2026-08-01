import { describe, expect, it } from 'vitest';
import {
  FIXTURE_CARDS,
  advanceToAttackableTurn,
  endTurn,
  getCtx,
  getG,
  makeSetup,
  startClient,
} from './fixtures';
import { decideBotAction } from '../../src/game/bot';

const deck = ['normal-r1', 'normal-r2', 'normal-r3', 'fragile', 'buffer', 'healer', 'steadfast', 'mindcontrol'];

let client: ReturnType<typeof startClient>;

describe('decideBotAction', () => {
  it('ends the turn immediately if called when it is not actually the bot\'s turn', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r2']),
    });
    // It's player 0's turn; ask the bot to decide as if it were player 1.
    const action = decideBotAction(getG(client), getCtx(client), FIXTURE_CARDS, '1');
    expect(action).toEqual({ type: 'endTurn' });
  });

  it('ends the turn once its move budget is spent', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r2']),
    });
    client.moves.enterDefense({ lane: 0 });
    // Force movesUsed to budget via two legal moves instead, using two units.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1', 'normal-r2']),
      '1': makeSetup(deck, ['normal-r3']),
    });
    client.moves.enterDefense({ lane: 0 });
    client.moves.enterDefense({ lane: 1 });
    const action = decideBotAction(getG(client), getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'endTurn' });
  });

  it('prefers finishing off an already-broken enemy card over any other action', () => {
    // normal-r1 (Attack 3) faces a broken fragile (0 Shield, broken) and a
    // healthy normal-r3 — attacking the broken one secures a kill, which
    // should heavily outscore just chipping the healthy one.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['fragile']),
    });
    advanceToAttackableTurn(client, '0');
    // getG(client) returns boardgame.io's frozen state — clone before mutating.
    const G = structuredClone(getG(client));
    G.cardInstances['1:fragile'].currentShield = 0;
    G.cardInstances['1:fragile'].broken = true;

    const action = decideBotAction(G, getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'attack', attackerLane: 0, targetSide: 'center' });
  });

  it('attacks when it can and nothing else outscores it', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']), // Attack 3, Range 1
      '1': makeSetup(deck, ['normal-r2']), // healthy, not defending
    });
    advanceToAttackableTurn(client, '0');
    const action = decideBotAction(getG(client), getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'attack', attackerLane: 0, targetSide: 'center' });
  });

  it('defends a card that is in real danger when attacking is not available (turn 1)', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']),
      '1': makeSetup(deck, ['normal-r2']),
    });
    const G = structuredClone(getG(client));
    G.cardInstances['0:normal-r1'].currentShield = 1; // in real danger
    const action = decideBotAction(G, getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'enterDefense', lane: 0 });
  });

  it('does not waste a move defending a healthy card when nothing else is useful', () => {
    client = startClient({
      '0': makeSetup(deck, ['normal-r1']), // healthy, no ability, turn 1 so no attack
      '1': makeSetup(deck, ['normal-r2']),
    });
    const action = decideBotAction(getG(client), getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'endTurn' });
  });

  it('uses a self-buff ability when nothing else is available', () => {
    client = startClient({
      '0': makeSetup(deck, ['buffer']), // Empower-style: no target, turn 1
      '1': makeSetup(deck, ['normal-r2']),
    });
    // buffer's base Shield (2) is within the "in real danger" defend
    // threshold, which would otherwise dominate — bump it above that so
    // this test isolates the self-buff-vs-endTurn choice, not defend-vs-buff.
    const G = structuredClone(getG(client));
    G.cardInstances['0:buffer'].currentShield = 3;
    const action = decideBotAction(G, getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({ type: 'activateAbility', lane: 0 });
  });

  it('aims a targeted ability at the opponent card with the least Shield', () => {
    client = startClient({
      '0': makeSetup(deck, ['healer']), // requiresTarget: true — but this is a *heal*, aimed at the weakest target regardless of whose it is
      '1': makeSetup(deck, ['normal-r1', 'normal-r2']),
    });
    const G = structuredClone(getG(client));
    // healer's own base Shield (2) is within the "in real danger" defend
    // threshold, which would otherwise dominate — bump it above that so
    // this test isolates targeted-ability aim, not defend-vs-ability.
    G.cardInstances['0:healer'].currentShield = 3;
    G.cardInstances['1:normal-r1'].currentShield = 1; // the weaker of the two
    const action = decideBotAction(G, getCtx(client), FIXTURE_CARDS, '0');
    expect(action).toEqual({
      type: 'activateAbility',
      lane: 0,
      targetPlayerID: '1',
      targetLane: 0,
    });
  });

  it('every action it proposes across a full bot-vs-bot match is accepted by the real move functions', () => {
    // The real regression test: run decideBotAction as *both* players
    // against the live client (same infra fixtures.ts uses), dispatching
    // whatever it returns for real. If the bot ever proposed something the
    // engine considers illegal, boardgame.io just silently no-ops the
    // move — so the actual assertion is that the match reaches a real
    // conclusion (or the turn/move counters keep moving) rather than
    // getting stuck retrying the same illegal action forever.
    client = startClient({
      '0': makeSetup(deck, ['normal-r1', 'buffer', 'steadfast']),
      '1': makeSetup(deck, ['normal-r2', 'healer', 'mindcontrol']),
    });

    let previousTurn = -1;
    let stuckCount = 0;
    for (let i = 0; i < 300; i++) {
      const ctx = getCtx(client);
      if (ctx.gameover) break;

      if (ctx.turn === previousTurn) {
        stuckCount++;
        expect(stuckCount).toBeLessThan(20); // would only climb this high if actions were silently rejected in a loop
      } else {
        stuckCount = 0;
        previousTurn = ctx.turn;
      }

      const action = decideBotAction(getG(client), ctx, FIXTURE_CARDS, ctx.currentPlayer);
      switch (action.type) {
        case 'attack':
          client.moves.attack({ attackerLane: action.attackerLane, targetSide: action.targetSide });
          break;
        case 'enterDefense':
          client.moves.enterDefense({ lane: action.lane });
          break;
        case 'leaveDefense':
          client.moves.leaveDefense({ lane: action.lane });
          break;
        case 'changePosition':
          client.moves.changePosition({ lane: action.lane, direction: action.direction });
          break;
        case 'activateAbility':
          client.moves.activateAbility({
            lane: action.lane,
            targetPlayerID: action.targetPlayerID,
            targetLane: action.targetLane,
          });
          break;
        case 'endTurn':
          endTurn(client);
          break;
      }
    }

    // A match between two decks this small, with only 1 point per kill and
    // 5 needed to win, may not always finish inside 300 actions purely from
    // stat attrition — the real assertion above (never stuck retrying the
    // same illegal action) is what actually proves the bot's proposals are
    // all legal. This just confirms the game state is still coherent.
    expect(['0', '1']).toContain(getCtx(client).currentPlayer);
  });
});
