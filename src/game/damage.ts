import { otherPlayer } from './board';
import { lanesOccupiedBy } from './state';
import { attackFloor, shieldFloor } from './rules.config';
import type { CardDefinitionRegistry, CardInstance, GameState } from './types';

/**
 * Applies damage to one instance per §16 (Shield absorbs first, floors at
 * zero, doesn't destroy on its own) and §18 (Defense Mode caps incoming
 * damage at 1 regardless of Attack value). Returns true if this hit
 * destroys the card.
 *
 * `wasBrokenBeforeThisAttack` must be a snapshot taken before *this whole
 * attack* began resolving — not the instance's live `broken` flag. §16
 * requires the destroying hit to come from "a later attack"; a Titan hit
 * twice in one Range 2/3 attack (Ruling 1) can end that attack broken, but
 * the second of those two instances must not destroy it just because the
 * first one flipped `broken` moments earlier in the same resolution.
 */
export function applyDamageToInstance(
  instance: CardInstance,
  rawAmount: number,
  wasBrokenBeforeThisAttack: boolean,
): boolean {
  const amount = instance.defending ? Math.min(rawAmount, 1) : rawAmount;
  if (wasBrokenBeforeThisAttack) {
    return true;
  }
  instance.currentShield = Math.max(shieldFloor, instance.currentShield - amount);
  if (instance.currentShield <= shieldFloor) {
    instance.broken = true;
  }
  return false;
}

/**
 * Removes destroyed cards, awards elimination points to their owner's
 * opponent (§2, §22, §23), and auto-replaces each freed lane from the
 * owner's bench in FIFO order (§22.3-5) at no move cost. Standard Mode
 * caps decks at 1 Titan (§9.3), so once a deck's only Titan is destroyed
 * every remaining bench card is a Normal card — each freed lane can always
 * be filled independently, one bench card per lane.
 */
export function resolveDestructions(
  registry: CardDefinitionRegistry,
  G: GameState,
  currentTurn: number,
  destroyedInstanceIds: string[],
): void {
  // Dedupe: a Titan hit twice in one attack (Ruling 1) only needs one pass.
  const unique = Array.from(new Set(destroyedInstanceIds));

  for (const instanceId of unique) {
    const instance = G.cardInstances[instanceId];
    if (!instance) continue; // already resolved earlier in this pass

    const owner = instance.owner;
    const attacker = otherPlayer(owner);
    const def = registry[instance.defId];
    const points = def.form === 'Titan' ? 2 : 1;
    G.players[attacker].eliminationPoints += points;

    const freedLanes = lanesOccupiedBy(G, owner, instanceId).sort((a, b) => a - b);
    for (const lane of freedLanes) {
      G.players[owner].lanes[lane] = null;
    }
    delete G.cardInstances[instanceId];

    for (const lane of freedLanes) {
      const replacementId = G.players[owner].bench.shift();
      if (!replacementId) continue;
      const replacement = G.cardInstances[replacementId];
      replacement.enteredBattlefieldOnTurn = currentTurn;
      G.players[owner].lanes[lane] = replacement.instanceId;
    }
  }
}

/** Helper for ability effects (§20.4 — stat changes are permanent, shown by
 * adjusting the dice). Clamps at the Ruling-4 floor. */
export function adjustAttack(instance: CardInstance, delta: number): void {
  instance.currentAttack = Math.max(attackFloor, instance.currentAttack + delta);
}

/**
 * Reduces Shield by a fixed amount (used by damage-dealing abilities, e.g.
 * Mesmerize) — mirrors combat's own Shield rules rather than bypassing
 * them: Defense Mode still caps this at 1 (§18), same as being attacked,
 * and `broken` is only set if this reduction actually bottoms Shield out
 * (§16), exactly like a normal hit. An ability is a permanent stat
 * adjustment (§20.4), not a direct kill — same as every other ability in
 * the roster, this can set a card up to be destroyed by a later hit, but
 * never destroys it outright by itself.
 */
export function reduceShield(instance: CardInstance, rawAmount: number): void {
  const amount = instance.defending ? Math.min(rawAmount, 1) : rawAmount;
  instance.currentShield = Math.max(shieldFloor, instance.currentShield - amount);
  if (instance.currentShield <= shieldFloor) {
    instance.broken = true;
  }
}

/** Restores Shield (§7 — doesn't happen without an ability), clamped to the
 * card's printed maximum. Clears `broken` once Shield is above zero again,
 * since the card is no longer sitting at the destruction threshold. */
export function restoreShield(
  instance: CardInstance,
  amount: number,
  registry: CardDefinitionRegistry,
): void {
  const maxShield = registry[instance.defId].shield;
  instance.currentShield = Math.min(maxShield, instance.currentShield + amount);
  if (instance.currentShield > shieldFloor) {
    instance.broken = false;
  }
}
