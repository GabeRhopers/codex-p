import { BOARD_SIZE, MOVES_PER_TURN } from './rules.config';
import type { CardDefinitionRegistry, GameState } from './types';

/**
 * A pure, UI-agnostic mirror of exactly what moves.ts's own move functions
 * accept for a given card, computed the same way Board.tsx's ActionPanel
 * already worked it out inline before this was extracted. Two consumers
 * need this identically: the human UI (which buttons to show) and the bot
 * (which actions it's allowed to even consider) — hand-rolling it twice
 * risks exactly the kind of drift this project has already hit once this
 * session (two "different" abilities that turned out to be byte-for-byte
 * identical, from being authored independently). One source of truth here
 * means a rules change only ever needs to happen in one place.
 *
 * Deliberately re-derives legality rather than calling the real move
 * functions speculatively (e.g. to "try" a move and see if it's rejected)
 * — moves.ts's functions mutate G directly, so speculative execution would
 * mean cloning G first, which is both wasteful and a second, indirect way
 * for this and the real rules to drift if the clone were ever imperfect.
 */
export interface LegalActions {
  instanceId: string;
  /** Present (with the card's range) only if attacking is legal right now;
   * absent (not merely "false") makes "can I attack" and "what range" the
   * same check, so a caller can never read attack.range without having
   * already confirmed attacking is legal. */
  attack: { range: 1 | 2 | 3 } | null;
  canEnterDefense: boolean;
  canLeaveDefense: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  ability: { requiresTarget: boolean; costsBothMoves: boolean } | null;
}

/**
 * Whether to show a Move button at all — a pure read-only predicate, since
 * the real move (game/moves.ts's changePositionMove) mutates G and returns
 * INVALID_MOVE instead of a boolean. Both a Normal-Normal swap and a
 * Normal card pushing into an adjacent Titan (see applyTitanShove in
 * game/moves.ts) always succeed once the target lane is occupied and
 * in-bounds — neither ever depends on anything further down the board —
 * so this only needs bounds + occupancy, no re-derivation of the push
 * logic itself.
 */
export function canSlide(
  G: GameState,
  owner: string,
  lane: number,
  footprint: number,
  direction: 'left' | 'right',
): boolean {
  const delta = direction === 'left' ? -1 : 1;
  if (direction === 'left') {
    if (lane <= 0) return false;
  } else if (lane >= BOARD_SIZE - footprint) {
    return false;
  }
  if (footprint === 2) return true; // Titan's own shove always succeeds in-bounds

  const targetLane = lane + delta;
  return G.players[owner].lanes[targetLane] !== null;
}

/**
 * Returns null if there's no card at `lane` belonging to `playerID`, or it
 * already can't act at all this turn (already acted, or — §22.6-7 — it's a
 * bench replacement that entered this very turn and can't act until its
 * controller's next one). Otherwise every field reflects exactly what that
 * card may still do given the turn's remaining move budget.
 */
export function computeLegalActions(
  G: GameState,
  ctx: { currentPlayer: string; turn: number },
  registry: CardDefinitionRegistry,
  playerID: string,
  lane: number,
): LegalActions | null {
  const instanceId = G.players[playerID].lanes[lane];
  if (!instanceId) return null;
  if (G.turnState.actedInstanceIds.includes(instanceId)) return null;

  const instance = G.cardInstances[instanceId];
  if (instance.enteredBattlefieldOnTurn >= ctx.turn) return null;

  const definition = registry[instance.defId];
  const movesLeft = MOVES_PER_TURN - G.turnState.movesUsed;

  const canAttack =
    playerID === ctx.currentPlayer &&
    !instance.defending &&
    !G.turnState.attackUsed &&
    movesLeft >= 1 &&
    ctx.turn !== 1;
  const canDefendToggle = playerID === ctx.currentPlayer && movesLeft >= 1;
  const canMove = playerID === ctx.currentPlayer && movesLeft >= 1;
  const abilityCost = definition.ability?.costsBothMoves ? MOVES_PER_TURN : 1;
  const canAbility =
    playerID === ctx.currentPlayer &&
    !!definition.ability &&
    movesLeft >= abilityCost &&
    (!instance.defending || definition.ability.usableWhileDefending === true);

  // `lane` is always a Titan's *lower* occupied index (see Board.tsx's
  // renderRow), so its rightmost occupied lane is `lane + footprint - 1`,
  // not `lane` itself — canSlide's right-move bound accounts for that.
  const footprint = definition.form === 'Titan' ? 2 : 1;

  return {
    instanceId,
    attack: canAttack ? { range: definition.range } : null,
    canEnterDefense: canDefendToggle && !instance.defending,
    canLeaveDefense: canDefendToggle && instance.defending,
    canMoveLeft: canMove && canSlide(G, playerID, lane, footprint, 'left'),
    canMoveRight: canMove && canSlide(G, playerID, lane, footprint, 'right'),
    ability: canAbility
      ? {
          requiresTarget: !!definition.ability!.requiresTarget,
          costsBothMoves: !!definition.ability!.costsBothMoves,
        }
      : null,
  };
}
