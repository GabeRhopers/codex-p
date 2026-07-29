import { BOARD_SIZE } from './rules.config';
import type {
  CardDefinitionRegistry,
  CardInstance,
  GameState,
  PlayerBoardState,
} from './types';

export interface PlayerSetup {
  /** Full 10-card deck (defIds), no duplicates — see §9. */
  deckDefIds: string[];
  /** Subset of deckDefIds that starts on the battlefield (§10.2); the rest
   * starts on the bench, in deckDefIds order. Deck order becomes bench
   * replacement order — see RULES_SPEC.md implementation notes on §22. */
  startingBattlefieldDefIds: string[];
}

export function instanceIdFor(playerID: string, defId: string): string {
  return `${playerID}:${defId}`;
}

function createInstance(
  registry: CardDefinitionRegistry,
  playerID: string,
  defId: string,
): CardInstance {
  const def = registry[defId];
  if (!def) {
    throw new Error(`Unknown card definition: ${defId}`);
  }
  return {
    instanceId: instanceIdFor(playerID, defId),
    defId,
    owner: playerID,
    currentAttack: def.attack,
    currentShield: def.shield,
    broken: false,
    defending: false,
    enteredBattlefieldOnTurn: 0,
  };
}

function placeBattlefield(
  registry: CardDefinitionRegistry,
  playerID: string,
  battlefieldDefIds: string[],
): { lanes: (string | null)[]; instances: Record<string, CardInstance> } {
  const lanes: (string | null)[] = new Array(BOARD_SIZE).fill(null);
  const instances: Record<string, CardInstance> = {};
  let cursor = 0;

  for (const defId of battlefieldDefIds) {
    const def = registry[defId];
    if (!def) throw new Error(`Unknown card definition: ${defId}`);
    const footprint = def.form === 'Titan' ? 2 : 1;
    if (cursor + footprint > BOARD_SIZE) {
      throw new Error(
        `Starting battlefield for player ${playerID} overflows ${BOARD_SIZE} lanes at ${defId}`,
      );
    }
    const instance = createInstance(registry, playerID, defId);
    instances[instance.instanceId] = instance;
    for (let i = 0; i < footprint; i++) {
      lanes[cursor + i] = instance.instanceId;
    }
    cursor += footprint;
  }

  return { lanes, instances };
}

export function buildInitialG(
  registry: CardDefinitionRegistry,
  playerSetups: Record<string, PlayerSetup>,
): GameState {
  const players: Record<string, PlayerBoardState> = {};
  const cardInstances: Record<string, CardInstance> = {};

  for (const [playerID, setup] of Object.entries(playerSetups)) {
    const { lanes, instances } = placeBattlefield(
      registry,
      playerID,
      setup.startingBattlefieldDefIds,
    );
    Object.assign(cardInstances, instances);

    const benchDefIds = setup.deckDefIds.filter(
      (defId) => !setup.startingBattlefieldDefIds.includes(defId),
    );
    const bench = benchDefIds.map((defId) => {
      const instance = createInstance(registry, playerID, defId);
      cardInstances[instance.instanceId] = instance;
      return instance.instanceId;
    });

    players[playerID] = { lanes, bench, eliminationPoints: 0 };
  }

  return {
    players,
    cardInstances,
    turnState: { movesUsed: 0, attackUsed: false, actedInstanceIds: [] },
  };
}

export function findInstance(G: GameState, instanceId: string): CardInstance {
  const instance = G.cardInstances[instanceId];
  if (!instance) throw new Error(`Unknown card instance: ${instanceId}`);
  return instance;
}

export function instanceAtLane(
  G: GameState,
  playerID: string,
  lane: number,
): CardInstance | null {
  const instanceId = G.players[playerID]?.lanes[lane] ?? null;
  return instanceId ? findInstance(G, instanceId) : null;
}

/** All lane indices currently occupied by this instance (2 for a Titan). */
export function lanesOccupiedBy(
  G: GameState,
  playerID: string,
  instanceId: string,
): number[] {
  const lanes = G.players[playerID].lanes;
  const result: number[] = [];
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === instanceId) result.push(i);
  }
  return result;
}
