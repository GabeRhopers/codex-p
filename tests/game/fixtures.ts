import { Client } from 'boardgame.io/client';
import { adjustAttack, restoreShield } from '../../src/game/damage';
import { createSeasonsBattleGame } from '../../src/game/game';
import type { PlayerSetup } from '../../src/game/state';
import type { CardDefinitionRegistry } from '../../src/game/types';

export const FIXTURE_CARDS: CardDefinitionRegistry = {
  'normal-r1': {
    id: 'normal-r1',
    name: 'Range1 Normal',
    season: 'Summer',
    form: 'Normal',
    attack: 3,
    shield: 3,
    range: 1,
    tier: 'Common',
  },
  'normal-r2': {
    id: 'normal-r2',
    name: 'Range2 Normal',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 2,
    tier: 'Common',
  },
  'normal-r3': {
    id: 'normal-r3',
    name: 'Range3 Normal',
    season: 'Spring',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 3,
    tier: 'Common',
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile',
    season: 'Autumn',
    form: 'Normal',
    attack: 1,
    shield: 1,
    range: 1,
    tier: 'Common',
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    season: 'Neutral',
    form: 'Titan',
    attack: 3,
    shield: 6,
    range: 1,
    tier: 'Common',
  },
  buffer: {
    id: 'buffer',
    name: 'Buffer',
    season: 'Spring',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'buffer-ability',
      name: 'Empower',
      requiresTarget: false,
      effect: ({ G, casterInstanceId }) => {
        adjustAttack(G.cardInstances[casterInstanceId], 1);
      },
    },
  },
  healer: {
    id: 'healer',
    name: 'Healer',
    season: 'Spring',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'healer-ability',
      name: 'Restore',
      requiresTarget: true,
      effect: ({ G, targetInstanceId }) => {
        if (targetInstanceId) restoreShield(G.cardInstances[targetInstanceId], 2, FIXTURE_CARDS);
      },
    },
  },
  steadfast: {
    id: 'steadfast',
    name: 'Steadfast',
    season: 'Winter',
    form: 'Normal',
    attack: 1,
    shield: 3,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'steadfast-ability',
      name: 'Steadfast Ward',
      requiresTarget: false,
      usableWhileDefending: true,
      effect: ({ G, casterInstanceId }) => {
        restoreShield(G.cardInstances[casterInstanceId], 1, FIXTURE_CARDS);
      },
    },
  },
  mindcontrol: {
    id: 'mindcontrol',
    name: 'Mesmerize',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 1,
    range: 1,
    tier: 'Gold',
    ability: {
      id: 'mesmerize-ability',
      name: 'Mesmerize',
      requiresTarget: true,
      costsBothMoves: true,
      effect: ({ G, targetInstanceId }) => {
        if (targetInstanceId) G.cardInstances[targetInstanceId].currentShield = 0;
      },
    },
  },
};

export function makeSetup(deckDefIds: string[], battlefieldDefIds: string[]): PlayerSetup {
  return { deckDefIds, startingBattlefieldDefIds: battlefieldDefIds };
}

export function startClient(
  setups: Record<string, PlayerSetup>,
  registry: CardDefinitionRegistry = FIXTURE_CARDS,
) {
  const game = createSeasonsBattleGame(registry, setups);
  const client = Client({ game, numPlayers: 2 });
  client.start();
  return client;
}

export function getG<T extends ReturnType<typeof startClient>>(client: T) {
  const state = client.getState();
  if (!state) throw new Error('Client has no state');
  return state.G;
}

export function getCtx<T extends ReturnType<typeof startClient>>(client: T) {
  const state = client.getState();
  if (!state) throw new Error('Client has no state');
  return state.ctx;
}

/** boardgame.io types `client.events.endTurn` as optional (it can be
 * disabled per-game); this project never disables it, so this wrapper just
 * removes the need for a non-null assertion at every call site. */
export function endTurn(client: ReturnType<typeof startClient>): void {
  if (!client.events.endTurn) throw new Error('endTurn event is disabled');
  client.events.endTurn();
}

/**
 * Advances turns (via the raw `endTurn` event, bypassing move validation)
 * until it's exactly `targetPlayerID`'s turn. Manually counting `endTurn()`
 * calls is error-prone once a turn can also auto-end after 2 moves (see
 * `moves.ts`'s `endTurnIfBudgetSpent`) — an extra explicit call after an
 * auto-end silently skips a whole turn. This converges regardless of how
 * the previous turn ended.
 */
export function advanceToPlayerTurn(
  client: ReturnType<typeof startClient>,
  targetPlayerID: string,
): void {
  for (let guard = 0; guard < 20; guard++) {
    if (getCtx(client).currentPlayer === targetPlayerID) return;
    endTurn(client);
  }
  throw new Error(`advanceToPlayerTurn: did not reach player ${targetPlayerID}`);
}

/** Same as `advanceToPlayerTurn`, but also skips past turn 1 (§11 — the
 * opening turn can never attack), so the result is always attack-eligible. */
export function advanceToAttackableTurn(
  client: ReturnType<typeof startClient>,
  targetPlayerID: string,
): void {
  for (let guard = 0; guard < 20; guard++) {
    const ctx = getCtx(client);
    if (ctx.currentPlayer === targetPlayerID && ctx.turn !== 1) return;
    endTurn(client);
  }
  throw new Error(`advanceToAttackableTurn: did not reach player ${targetPlayerID}`);
}

/**
 * Use when the client is mid-turn for `targetPlayerID` (e.g. only 1 of 2
 * moves spent) and the intent is to reach that player's *next* turn, not
 * the current one. Unconditionally forfeits the rest of the current turn
 * first, then converges like `advanceToPlayerTurn`. Using the non-forcing
 * helper here would return immediately without advancing at all.
 */
export function forceAdvanceToPlayerTurn(
  client: ReturnType<typeof startClient>,
  targetPlayerID: string,
): void {
  endTurn(client);
  advanceToPlayerTurn(client, targetPlayerID);
}
