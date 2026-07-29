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
