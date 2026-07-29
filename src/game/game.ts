import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import {
  activateAbilityMove,
  attackMove,
  changePositionMove,
  enterDefenseMove,
  leaveDefenseMove,
} from './moves';
import type {
  ActivateAbilityPayload,
  AttackPayload,
  ChangePositionPayload,
} from './moves';
import { buildInitialG } from './state';
import type { PlayerSetup } from './state';
import { WIN_POINTS } from './rules.config';
import type { CardDefinitionRegistry, GameState } from './types';

/**
 * Standard Mode game definition, parameterized by the card registry and the
 * two players' decks/starting lineups. boardgame.io's plain local `Client`
 * (no server/lobby) has no `setupData` passthrough — only the
 * server/matchmaking path threads that through — so for a local-first game
 * the setup is baked into the returned `Game` object itself. The engine
 * still has no compile-time dependency on specific content: Phase 2 owns
 * the real 16-20 card roster and starter decks; tests use small fixture
 * registries and setups.
 */
export function createSeasonsBattleGame(
  registry: CardDefinitionRegistry,
  playerSetups: Record<string, PlayerSetup>,
): Game<GameState, Record<string, unknown>> {
  return {
    name: 'seasons-battle',
    minPlayers: 2,
    maxPlayers: 2,

    setup: () => buildInitialG(registry, playerSetups),

    turn: {
      onBegin: ({ G }) => {
        G.turnState = { movesUsed: 0, attackUsed: false, actedInstanceIds: [] };
      },
    },

    moves: {
      attack: ({ G, ctx, playerID, events }, payload: AttackPayload) =>
        attackMove({ registry, G, ctx, playerID, events }, payload),

      enterDefense: (
        { G, ctx, playerID, events },
        payload: { lane: number },
      ) => enterDefenseMove({ registry, G, ctx, playerID, events }, payload),

      leaveDefense: (
        { G, ctx, playerID, events },
        payload: { lane: number },
      ) => leaveDefenseMove({ registry, G, ctx, playerID, events }, payload),

      changePosition: (
        { G, ctx, playerID, events },
        payload: ChangePositionPayload,
      ) => changePositionMove({ registry, G, ctx, playerID, events }, payload),

      activateAbility: (
        { G, ctx, playerID, events },
        payload: ActivateAbilityPayload,
      ) => activateAbilityMove({ registry, G, ctx, playerID, events }, payload),
    },

    endIf: ({ G }) => {
      for (const [playerID, player] of Object.entries(G.players)) {
        if (player.eliminationPoints >= WIN_POINTS) {
          return { winner: playerID };
        }
      }
      return undefined;
    },
  };
}

export { INVALID_MOVE };
