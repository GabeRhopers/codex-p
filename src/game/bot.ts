import { otherPlayer, resolveRangePattern } from './board';
import { computeLegalActions } from './legalActions';
import { BOARD_SIZE, MOVES_PER_TURN } from './rules.config';
import type { CardDefinitionRegistry, CardInstance, GameState } from './types';

export type BotAction =
  | { type: 'attack'; attackerLane: number; targetSide?: 'left' | 'center' | 'right' }
  | { type: 'enterDefense'; lane: number }
  | { type: 'leaveDefense'; lane: number }
  | { type: 'changePosition'; lane: number; direction: 'left' | 'right' }
  // Mirrors ActivateAbilityPayload in moves.ts exactly (both target fields
  // optional together) rather than splitting into two variants — a
  // targeted ability always sets both or neither, same as the real move.
  | { type: 'activateAbility'; lane: number; targetPlayerID?: string; targetLane?: number }
  | { type: 'endTurn' };

/**
 * One card's contribution to how good it would be to hit `target` with
 * `attackerAttack` damage right now. Higher is better. A single, shared
 * scale across every action type below (attack/defend/ability) is what
 * lets decideBotAction pick the single best thing to do this move rather
 * than needing a separate priority tier per action kind.
 */
function scoreAttackOnTarget(target: CardInstance, attackerAttack: number): number {
  if (target.broken) return 100; // a guaranteed kill is never worth passing up
  const damage = target.defending ? Math.min(attackerAttack, 1) : attackerAttack;
  let score = damage;
  if (damage >= target.currentShield) score += 20; // this hit would break it — a strong follow-up setup
  return score;
}

const ATTACK_SIDES_R1 = ['left', 'center', 'right'] as const;
const ATTACK_SIDES_R2 = ['left', 'right'] as const;

/**
 * Heuristic, single-move decision: given it's `botPlayerID`'s turn with at
 * least one move left, what's the single best next action? Called once per
 * move (not once per turn) — Board.tsx re-invokes this after every move the
 * bot makes, since the board state (and therefore what's best) changes
 * after each one. Never proposes anything computeLegalActions wouldn't
 * already say is legal, so every action returned here is guaranteed
 * accepted by the real move functions in moves.ts — this function never
 * touches G, only reads it.
 *
 * Deliberately a greedy one-move-lookahead, not a search — proportionate
 * to a heuristic opponent for casual solo play, not a competitive AI.
 */
export function decideBotAction(
  G: GameState,
  ctx: { currentPlayer: string; turn: number },
  registry: CardDefinitionRegistry,
  botPlayerID: string,
): BotAction {
  if (ctx.currentPlayer !== botPlayerID) return { type: 'endTurn' };
  const movesLeft = MOVES_PER_TURN - G.turnState.movesUsed;
  if (movesLeft <= 0) return { type: 'endTurn' };

  const opponent = otherPlayer(botPlayerID);
  const myLanes = G.players[botPlayerID].lanes;
  const opponentLanes = G.players[opponent].lanes;

  // One entry per distinct card the bot controls (a 2-lane Titan appears
  // twice in `lanes` with the same instanceId — dedupe to its lower lane,
  // matching how Board.tsx's renderRow identifies "the" lane for a card).
  const myCardLanes: number[] = [];
  for (let lane = 0; lane < BOARD_SIZE; lane++) {
    const instanceId = myLanes[lane];
    if (instanceId && myLanes[lane - 1] !== instanceId) myCardLanes.push(lane);
  }

  let best: { score: number; action: BotAction } | null = null;
  function consider(score: number, action: BotAction) {
    if (!best || score > best.score) best = { score, action };
  }

  for (const lane of myCardLanes) {
    const legal = computeLegalActions(G, ctx, registry, botPlayerID, lane);
    if (!legal) continue;
    const instance = G.cardInstances[legal.instanceId];

    if (legal.attack) {
      if (legal.attack.range === 1) {
        for (const side of ATTACK_SIDES_R1) {
          const pattern = resolveRangePattern(lane, 1, side);
          const targetId = pattern[0] !== undefined ? opponentLanes[pattern[0]] : null;
          if (!targetId) continue;
          consider(scoreAttackOnTarget(G.cardInstances[targetId], instance.currentAttack), {
            type: 'attack',
            attackerLane: lane,
            targetSide: side,
          });
        }
      } else if (legal.attack.range === 2) {
        for (const side of ATTACK_SIDES_R2) {
          const pattern = resolveRangePattern(lane, 2, side);
          const hitIds = pattern.map((l) => opponentLanes[l]).filter((id): id is string => !!id);
          if (hitIds.length === 0) continue;
          const score = hitIds.reduce((sum, id) => sum + scoreAttackOnTarget(G.cardInstances[id], instance.currentAttack), 0);
          consider(score, { type: 'attack', attackerLane: lane, targetSide: side });
        }
      } else {
        const pattern = resolveRangePattern(lane, 3);
        const hitIds = pattern.map((l) => opponentLanes[l]).filter((id): id is string => !!id);
        if (hitIds.length > 0) {
          const score = hitIds.reduce((sum, id) => sum + scoreAttackOnTarget(G.cardInstances[id], instance.currentAttack), 0);
          consider(score, { type: 'attack', attackerLane: lane });
        }
      }
    }

    // Defend a card that's in real danger (broken, or would break to a
    // typical hit) rather than every card every chance it gets — a bot
    // that reflexively turtles everything isn't a credible opponent.
    if (legal.canEnterDefense && (instance.broken || instance.currentShield <= 2)) {
      consider(3, { type: 'enterDefense', lane });
    }

    if (legal.ability) {
      if (!legal.ability.requiresTarget) {
        // Self-buffs are cheap value with no downside — worth doing, but
        // never ahead of an attack or securing a kill.
        consider(2.5, { type: 'activateAbility', lane });
      } else {
        // Aim a targeted ability at whatever the opponent has with the
        // least Shield left — the easiest to threaten or finish next.
        const targets = opponentLanes
          .map((id, l) => (id ? { id, lane: l } : null))
          .filter((t): t is { id: string; lane: number } => t !== null);
        if (targets.length > 0) {
          const weakest = targets.reduce((a, b) =>
            G.cardInstances[a.id].currentShield <= G.cardInstances[b.id].currentShield ? a : b,
          );
          consider(legal.ability.costsBothMoves ? 4 : 2.7, {
            type: 'activateAbility',
            lane,
            targetPlayerID: opponent,
            targetLane: weakest.lane,
          });
        }
      }
    }
  }

  return best ? (best as { score: number; action: BotAction }).action : { type: 'endTurn' };
}
