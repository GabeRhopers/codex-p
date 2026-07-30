import type { Ctx, FnContext } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { isValidLane, otherPlayer, resolveRangePattern } from './board';
import { applyDamageToInstance, resolveDestructions } from './damage';
import { MOVES_PER_TURN, titanMoveDisplacesOccupant, titanMultiHitOnOverlap } from './rules.config';
import { findInstance, instanceAtLane, lanesOccupiedBy } from './state';
import type { CardDefinitionRegistry, GameState } from './types';
import type { TargetSide } from './board';

type EventsApi = FnContext<GameState>['events'];

interface MoveCtx {
  registry: CardDefinitionRegistry;
  G: GameState;
  ctx: Ctx;
  playerID: string;
  events: EventsApi;
}

function endTurnIfBudgetSpent(mctx: MoveCtx): void {
  if (mctx.G.turnState.movesUsed >= MOVES_PER_TURN) {
    mctx.events.endTurn();
  }
}

function requireOwnUnactedInstance(
  mctx: MoveCtx,
  lane: number,
): ReturnType<typeof findInstance> | typeof INVALID_MOVE {
  if (!isValidLane(lane)) return INVALID_MOVE;
  const instance = instanceAtLane(mctx.G, mctx.playerID, lane);
  if (!instance) return INVALID_MOVE;
  if (mctx.G.turnState.actedInstanceIds.includes(instance.instanceId)) {
    return INVALID_MOVE; // §12 — same card can't perform two moves this turn
  }
  if (instance.enteredBattlefieldOnTurn >= mctx.ctx.turn) {
    return INVALID_MOVE; // §22.6-7 — a fresh replacement can't act until its controller's next turn
  }
  return instance;
}

function markActed(mctx: MoveCtx, instanceId: string, movesSpent: number): void {
  mctx.G.turnState.movesUsed += movesSpent;
  mctx.G.turnState.actedInstanceIds.push(instanceId);
}

// ---------------------------------------------------------------------------
// Attack (§14-17)
// ---------------------------------------------------------------------------

export interface AttackPayload {
  attackerLane: number;
  targetSide?: TargetSide;
}

export function attackMove(
  mctx: MoveCtx,
  payload: AttackPayload,
): void | typeof INVALID_MOVE {
  const { G, ctx, registry, playerID } = mctx;

  if (ctx.turn === 1) return INVALID_MOVE; // §11 — opening turn can't attack
  if (G.turnState.attackUsed) return INVALID_MOVE; // §14 — one attack per turn
  if (G.turnState.movesUsed >= MOVES_PER_TURN) return INVALID_MOVE;

  const attacker = requireOwnUnactedInstance(mctx, payload.attackerLane);
  if (attacker === INVALID_MOVE) return INVALID_MOVE;
  if (attacker.defending) return INVALID_MOVE; // §18.3 — can't attack while defending

  const def = registry[attacker.defId];
  const pattern = resolveRangePattern(payload.attackerLane, def.range, payload.targetSide);

  if (def.range === 1 && pattern.length === 0) return INVALID_MOVE; // no such lane
  if (def.range === 2 && payload.targetSide !== 'left' && payload.targetSide !== 'right') {
    return INVALID_MOVE; // §15 — Range 2 requires a chosen side
  }

  const defenderPlayerID = otherPlayer(playerID);
  const attackValue = attacker.currentAttack;

  // Snapshot each target's broken state as it stood *before this attack*.
  // §16 requires the destroying hit to come from "a later attack" — within
  // one multi-hit attack (Ruling 1's Titan overlap), a card that starts
  // healthy must never be destroyed by that same attack's hits.
  const brokenBeforeAttack = new Map<string, boolean>();
  function wasBrokenBeforeAttack(instanceId: string): boolean {
    if (!brokenBeforeAttack.has(instanceId)) {
      brokenBeforeAttack.set(instanceId, findInstance(G, instanceId).broken);
    }
    return brokenBeforeAttack.get(instanceId)!;
  }

  const destroyed: string[] = [];
  if (titanMultiHitOnOverlap) {
    // Ruling 1: full Attack applied once per occupied lane in the pattern —
    // a Titan spanning two hit lanes takes it twice.
    for (const lane of pattern) {
      const target = instanceAtLane(G, defenderPlayerID, lane);
      if (!target) continue;
      const wasBroken = wasBrokenBeforeAttack(target.instanceId);
      if (applyDamageToInstance(target, attackValue, wasBroken)) destroyed.push(target.instanceId);
    }
  } else {
    const targetedInstanceIds = new Set<string>();
    for (const lane of pattern) {
      const target = instanceAtLane(G, defenderPlayerID, lane);
      if (target) targetedInstanceIds.add(target.instanceId);
    }
    for (const instanceId of targetedInstanceIds) {
      const target = findInstance(G, instanceId);
      const wasBroken = wasBrokenBeforeAttack(instanceId);
      if (applyDamageToInstance(target, attackValue, wasBroken)) destroyed.push(instanceId);
    }
  }

  resolveDestructions(registry, G, ctx.turn, destroyed);

  G.turnState.attackUsed = true;
  markActed(mctx, attacker.instanceId, 1);
  endTurnIfBudgetSpent(mctx);
}

// ---------------------------------------------------------------------------
// Defense Mode (§18)
// ---------------------------------------------------------------------------

export function enterDefenseMove(
  mctx: MoveCtx,
  payload: { lane: number },
): void | typeof INVALID_MOVE {
  if (mctx.G.turnState.movesUsed >= MOVES_PER_TURN) return INVALID_MOVE;
  const instance = requireOwnUnactedInstance(mctx, payload.lane);
  if (instance === INVALID_MOVE) return INVALID_MOVE;
  if (instance.defending) return INVALID_MOVE; // already defending

  instance.defending = true;
  markActed(mctx, instance.instanceId, 1);
  endTurnIfBudgetSpent(mctx);
}

export function leaveDefenseMove(
  mctx: MoveCtx,
  payload: { lane: number },
): void | typeof INVALID_MOVE {
  if (mctx.G.turnState.movesUsed >= MOVES_PER_TURN) return INVALID_MOVE;
  const instance = requireOwnUnactedInstance(mctx, payload.lane);
  if (instance === INVALID_MOVE) return INVALID_MOVE;
  if (!instance.defending) return INVALID_MOVE; // not defending

  instance.defending = false;
  markActed(mctx, instance.instanceId, 1);
  endTurnIfBudgetSpent(mctx);
}

// ---------------------------------------------------------------------------
// Change position (§19)
// ---------------------------------------------------------------------------

export interface ChangePositionPayload {
  lane: number;
  direction: 'left' | 'right';
}

/**
 * The one operation a Titan ever needs for a 1-lane step, reused from both
 * directions: the Titan's own move, and a Normal card pushing into it.
 *
 * A Titan steps by `delta`: it claims exactly one new lane (its leading
 * edge + delta) and vacates exactly one old lane (its trailing edge) — its
 * *middle* lane is occupied continuously throughout, regardless of which
 * direction it steps. Whatever occupies the newly-claimed lane gets
 * relocated to the lane the Titan just vacated. That's always a clean,
 * closed trade — the Titan's footprint size never changes and the
 * occupant (guaranteed a single Normal card; §9.3 caps a deck at 1 Titan)
 * always fits the single vacated lane exactly — so this never depends on
 * anything further away on the board, and the only way it fails is the
 * Titan itself running off the edge.
 *
 * A Normal card pushing into an adjacent Titan is this exact same
 * operation, just triggered from the Normal card's own Move button with
 * the Titan stepping in the *opposite* direction (i.e. toward, and then
 * past, the Normal card's own lane): the Titan's newly-claimed lane is
 * then provably always the mover's own lane (three already-valid,
 * already-adjacent lanes — the Titan's near and far lanes plus the
 * mover's — simply rotate one step), so this direction can never fail on
 * bounds either. There is no case where a Normal card meeting a Titan
 * needs to search further down the board for room.
 */
function applyTitanShove(
  G: GameState,
  registry: CardDefinitionRegistry,
  playerID: string,
  titanInstanceId: string,
  delta: number,
): boolean {
  const occupied = lanesOccupiedBy(G, playerID, titanInstanceId);
  const newLanes = occupied.map((lane) => lane + delta);
  if (!newLanes.every(isValidLane)) return false;

  const vacatedLane = occupied.find((lane) => !newLanes.includes(lane))!;
  const enteredLane = newLanes.find((lane) => !occupied.includes(lane))!;
  const displacedInstanceId = G.players[playerID].lanes[enteredLane];

  if (displacedInstanceId !== null) {
    if (!titanMoveDisplacesOccupant) return false; // Ruling 5 (off): the destination must be empty instead
    // §9.3 caps a deck at 1 Titan, so the only thing a Titan can ever find
    // in its own new lane is a Normal card — guarded anyway rather than
    // assumed.
    if (registry[findInstance(G, displacedInstanceId).defId].form !== 'Normal') return false;
  }

  G.players[playerID].lanes[vacatedLane] = displacedInstanceId;
  for (const lane of newLanes) {
    G.players[playerID].lanes[lane] = titanInstanceId;
  }
  return true;
}

export function changePositionMove(
  mctx: MoveCtx,
  payload: ChangePositionPayload,
): void | typeof INVALID_MOVE {
  const { G, playerID, registry } = mctx;
  if (G.turnState.movesUsed >= MOVES_PER_TURN) return INVALID_MOVE;

  const instance = requireOwnUnactedInstance(mctx, payload.lane);
  if (instance === INVALID_MOVE) return INVALID_MOVE;

  const def = registry[instance.defId];
  const delta = payload.direction === 'left' ? -1 : 1;

  if (def.form === 'Normal') {
    const targetLane = payload.lane + delta;
    if (!isValidLane(targetLane)) return INVALID_MOVE;
    const targetInstance = instanceAtLane(G, playerID, targetLane);
    if (!targetInstance) return INVALID_MOVE; // must swap with an occupied lane

    if (registry[targetInstance.defId].form === 'Normal') {
      // §19's literal "swap with one adjacent Normal card" — always a
      // clean 1-for-1 trade.
      G.players[playerID].lanes[payload.lane] = targetInstance.instanceId;
      G.players[playerID].lanes[targetLane] = instance.instanceId;
    } else {
      // Ruling 5, the other direction: a Normal card can push a Titan out
      // of its way too — implemented as the Titan taking its own step
      // (see applyTitanShove) in the opposite direction, which always
      // lands the mover exactly in the Titan's newly-vacated lane.
      if (!applyTitanShove(G, registry, playerID, targetInstance.instanceId, -delta)) return INVALID_MOVE;
    }
  } else {
    if (!applyTitanShove(G, registry, playerID, instance.instanceId, delta)) return INVALID_MOVE;
  }

  markActed(mctx, instance.instanceId, 1);
  endTurnIfBudgetSpent(mctx);
}

// ---------------------------------------------------------------------------
// Abilities & Mind Control (§20-21)
// ---------------------------------------------------------------------------

export interface ActivateAbilityPayload {
  lane: number;
  targetPlayerID?: string;
  targetLane?: number;
}

export function activateAbilityMove(
  mctx: MoveCtx,
  payload: ActivateAbilityPayload,
): void | typeof INVALID_MOVE {
  const { G, registry } = mctx;
  const instance = requireOwnUnactedInstance(mctx, payload.lane);
  if (instance === INVALID_MOVE) return INVALID_MOVE;

  const def = registry[instance.defId];
  const ability = def.ability;
  if (!ability) return INVALID_MOVE;
  if (instance.defending && !ability.usableWhileDefending) return INVALID_MOVE; // §18.4

  const cost = ability.costsBothMoves ? MOVES_PER_TURN : 1;
  if (G.turnState.movesUsed + cost > MOVES_PER_TURN) return INVALID_MOVE; // §21

  let targetInstanceId: string | undefined;
  if (ability.requiresTarget) {
    if (payload.targetPlayerID === undefined || payload.targetLane === undefined) {
      return INVALID_MOVE;
    }
    const target = instanceAtLane(G, payload.targetPlayerID, payload.targetLane);
    if (!target) return INVALID_MOVE;
    targetInstanceId = target.instanceId;
  }

  ability.effect({ G, casterInstanceId: instance.instanceId, targetInstanceId });

  markActed(mctx, instance.instanceId, cost);
  endTurnIfBudgetSpent(mctx);
}

export type { MoveCtx };
