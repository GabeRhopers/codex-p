export type Season = 'Summer' | 'Winter' | 'Spring' | 'Autumn' | 'Neutral';
export type CardForm = 'Normal' | 'Titan';
export type AbilityTier = 'Common' | 'Silver' | 'Gold';
export type RangeValue = 1 | 2 | 3;

/**
 * Mutates G directly (boardgame.io wraps moves/effects with Immer).
 * `casterInstanceId` is the card whose ability was activated;
 * `targetInstanceId` is present only when the ability targets another card.
 */
export type AbilityEffect = (params: {
  G: GameState;
  casterInstanceId: string;
  targetInstanceId?: string;
}) => void;

export interface CardAbility {
  id: string;
  name: string;
  /** Mind Control-style abilities (§21): consume both moves as one action. */
  costsBothMoves?: boolean;
  /** §18.4 — most abilities can't be used while defending. */
  usableWhileDefending?: boolean;
  requiresTarget?: boolean;
  effect: AbilityEffect;
}

/** Static template — never mutated at runtime. */
export interface CardDefinition {
  id: string;
  name: string;
  season: Season;
  form: CardForm;
  attack: number;
  shield: number;
  range: RangeValue;
  tier: AbilityTier;
  ability?: CardAbility;
}

export type CardDefinitionRegistry = Record<string, CardDefinition>;

/** Runtime instance of a card in play — plain, JSON-serializable data only. */
export interface CardInstance {
  instanceId: string;
  defId: string;
  owner: string; // boardgame.io PlayerID
  currentAttack: number;
  currentShield: number;
  broken: boolean;
  defending: boolean;
  /** ctx.turn when this instance entered the battlefield; 0 = initial setup. */
  enteredBattlefieldOnTurn: number;
}

export interface PlayerBoardState {
  /** length BOARD_SIZE; instanceId occupying that lane, or null. A Titan
   * occupies two adjacent entries with the same instanceId. */
  lanes: (string | null)[];
  /** instanceIds not on the battlefield, in replacement order (FIFO). */
  bench: string[];
  /** Points this player has scored by destroying the opponent's cards. */
  eliminationPoints: number;
}

export interface TurnState {
  movesUsed: number;
  attackUsed: boolean;
  /** instanceIds that have already performed a move this turn (§12). */
  actedInstanceIds: string[];
}

export interface GameState {
  players: Record<string, PlayerBoardState>;
  cardInstances: Record<string, CardInstance>;
  turnState: TurnState;
}
