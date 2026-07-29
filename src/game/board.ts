import { BOARD_SIZE } from './rules.config';
import type { RangeValue } from './types';

export function otherPlayer(playerID: string): string {
  return playerID === '0' ? '1' : '0';
}

export function isValidLane(lane: number): boolean {
  return Number.isInteger(lane) && lane >= 0 && lane < BOARD_SIZE;
}

export type TargetSide = 'left' | 'center' | 'right';

/**
 * §15 — "opposite" is the same lane index on the other side; adjacency is
 * relative to that same index. Returns the lane indices a given attack
 * pattern touches on the defender's side, already clamped to the board.
 *
 * Range 1 is single-target and `side` selects which of the three candidate
 * lanes is attacked; an out-of-bounds choice has no valid referent and is
 * the caller's responsibility to reject (see moves.ts).
 *
 * Range 2/3 always include the opposite lane (always in bounds) plus one or
 * both adjacent lanes; edge clipping there is expected per §15 ("fewer
 * available targets") rather than an error.
 */
export function resolveRangePattern(
  attackerLane: number,
  range: RangeValue,
  side?: TargetSide,
): number[] {
  if (range === 1) {
    const offset = side === 'left' ? -1 : side === 'right' ? 1 : 0;
    const target = attackerLane + offset;
    return isValidLane(target) ? [target] : [];
  }

  if (range === 2) {
    const offset = side === 'right' ? 1 : -1;
    const lanes = [attackerLane, attackerLane + offset];
    return lanes.filter(isValidLane);
  }

  // Range 3: opposite + both sides.
  const lanes = [attackerLane - 1, attackerLane, attackerLane + 1];
  return lanes.filter(isValidLane);
}

export function isAdjacent(laneA: number, laneB: number): boolean {
  return Math.abs(laneA - laneB) === 1;
}
