// Normal Mode structural constants (§9-§11) and the rulebook ambiguity
// rulings, kept as named flags rather than baked-in logic. See
// RULES_SPEC.md for the rulebook citations behind each of these.
//
// Normal Mode (the only mode built so far) has no Titans and no Seasonal
// Advantage — both are reserved for a future Advanced Mode. The Titan
// rulings below (1 and 5) and MAX_TITANS_PER_DECK aren't dead code: they're
// exactly as correct as they've always been, just currently unreachable
// because no Normal Mode deck includes a Titan. They stay defined and
// tested against synthetic fixtures (see tests/game/) so Advanced Mode
// later is "add a Titan back to a deck," not "rebuild Titan support."

export const BOARD_SIZE = 5; // §10 — 5 lanes per side in Normal Mode
export const DECK_SIZE = 10; // §9.1
export const MAX_TITANS_PER_DECK = 1; // §9.3 — moot in Normal Mode (0 Titans in any current deck); applies once Advanced Mode reintroduces them
export const MAX_SPECIAL_ABILITY_CARDS = 3; // §9.4
export const MOVES_PER_TURN = 2; // §12
export const WIN_POINTS = 5; // §2

/**
 * Ruling 1 (RULES_SPEC.md): does a Range 2/3 attack whose pattern includes
 * both of a Titan's occupied lanes damage it once per included lane, or
 * once total? `true` = literal reading of §17 (once per lane). Dormant in
 * Normal Mode — no deck currently includes a Titan to trigger this — but
 * exercised by tests/game/*.test.ts against synthetic fixtures, and will
 * matter again once Advanced Mode ships.
 */
export const titanMultiHitOnOverlap = true;

/**
 * Ruling 2: a card at 0 Shield is `broken`, not destroyed, per §16. This
 * flag exists to make that state explicit and testable rather than
 * implicit; it is always `true` in Normal Mode.
 */
export const brokenStateRequiresFollowUpHit = true;

/** Ruling 4: floors for Attack/Shield dice under ability effects. */
export const attackFloor = 1;
export const shieldFloor = 0;

/**
 * Ruling 5: dormant in Normal Mode for the same reason as Ruling 1 above —
 * no current deck has a Titan to move — but kept fully implemented and
 * tested for when Advanced Mode reintroduces them.
 *
 * §19 defines a swap for a moving Normal card ("may swap with
 * one adjacent friendly Normal card") but is silent on what happens when a
 * move would put a Titan and a Normal card in each other's way. A strict
 * "must be empty" reading would make Titan movement legal almost never —
 * a standard starting board fills all 5 lanes, so an empty lane only
 * appears once a destroyed card's owner has run out of bench replacements.
 *
 * `true` (default): displacement, both directions, both built on the same
 * single operation (`applyTitanShove` in game/moves.ts): a Titan steps by
 * one lane, claiming a new lane and vacating its old one, and whatever
 * occupied the newly-claimed lane is relocated into the lane just vacated.
 * That's always a closed 1-for-1 trade — the Titan's footprint size never
 * changes, and §9.3 caps a deck at 1 Titan so the occupant is always a
 * single Normal card that always fits the single vacated lane — so it
 * never depends on anything further down the board, and the only way it
 * fails is the Titan itself running off the edge.
 *   - A Titan's own move calls this directly, extending §19's swap concept
 *     across its two-lane footprint instead of requiring the destination
 *     empty.
 *   - A Normal card's move can push an adjacent Titan too — implemented as
 *     the exact same operation, just triggered from the Normal card's Move
 *     button with the Titan stepping in the *opposite* direction (toward,
 *     and then past, the mover's own lane). That's provably always the
 *     mover's own lane landing in the Titan's newly-vacated spot: three
 *     already-valid, already-adjacent lanes (the Titan's two plus the
 *     mover's) simply rotate one step, so this direction can never fail on
 *     bounds either, and nothing beyond those three lanes is ever touched.
 */
export const titanMoveDisplacesOccupant = true;
