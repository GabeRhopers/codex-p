// Standard Mode structural constants (§9-§11) and the four rulebook
// ambiguity rulings, kept as named flags rather than baked-in logic.
// See RULES_SPEC.md for the rulebook citations behind each of these.

export const BOARD_SIZE = 5; // §10 — 5 lanes per side in Standard Mode
export const DECK_SIZE = 10; // §9.1
export const MAX_TITANS_PER_DECK = 1; // §9.3
export const MAX_SPECIAL_ABILITY_CARDS = 3; // §9.4
export const MOVES_PER_TURN = 2; // §12
export const WIN_POINTS = 5; // §2

/**
 * Ruling 1 (RULES_SPEC.md): does a Range 2/3 attack whose pattern includes
 * both of a Titan's occupied lanes damage it once per included lane, or
 * once total? `true` = literal reading of §17 (once per lane).
 */
export const titanMultiHitOnOverlap = true;

/**
 * Ruling 2: a card at 0 Shield is `broken`, not destroyed, per §16. This
 * flag exists to make that state explicit and testable rather than
 * implicit; it is always `true` in Standard Mode.
 */
export const brokenStateRequiresFollowUpHit = true;

/** Ruling 4: floors for Attack/Shield dice under ability effects. */
export const attackFloor = 1;
export const shieldFloor = 0;

/**
 * Ruling 5: §19 defines a swap for a moving Normal card ("may swap with
 * one adjacent friendly Normal card") but is silent on what happens when a
 * move would put a Titan and a Normal card in each other's way. A strict
 * "must be empty" reading would make Titan movement legal almost never —
 * a standard starting board fills all 5 lanes, so an empty lane only
 * appears once a destroyed card's owner has run out of bench replacements.
 *
 * `true` (default): displacement, both directions —
 *   - A Titan's own move shoves the occupant of its newly-entered lane
 *     into the lane it just vacated, extending §19's swap concept across
 *     its two-lane footprint instead of requiring the destination empty.
 *     Always succeeds in-bounds — this is a closed 1-for-1 trade (the
 *     Titan vacates exactly 1 lane, the occupant needs exactly 1 lane), so
 *     it never depends on anything further down the board.
 *   - A Normal card's move can push an adjacent Titan too, but a Titan
 *     can't be split, so this isn't a simple swap — it walks past the
 *     Titan (and past anything *further* blocking it) looking for an
 *     actual empty lane to absorb the whole line. If one exists before the
 *     edge of the board, every unit in the line shifts over together. If
 *     the line runs into the board edge first, the whole move fails —
 *     nothing shifts partway. See `planPushChain` in game/moves.ts.
 */
export const titanMoveDisplacesOccupant = true;
