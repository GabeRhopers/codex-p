import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { CARD_DEFINITIONS } from '../content/cards';
import { STARTER_DECKS } from '../content/decks';
import { isValidLane, otherPlayer, resolveRangePattern } from '../game/board';
import { BOARD_SIZE, MOVES_PER_TURN } from '../game/rules.config';
import { lanesOccupiedBy } from '../game/state';
import type { GameState } from '../game/types';
import { CardView } from './CardView';

type Selection =
  | { mode: 'idle' }
  | { mode: 'selected'; lane: number }
  | { mode: 'awaitingRange1Target'; lane: number }
  | { mode: 'awaitingAbilityTarget'; lane: number };

const SIDE_ORDER = ['left', 'center', 'right'] as const;

export function Board({ G, ctx, moves, events }: BoardProps<GameState>) {
  const [selection, setSelection] = useState<Selection>({ mode: 'idle' });

  const you = ctx.currentPlayer;
  const opponent = otherPlayer(you);
  const winner = ctx.gameover?.winner as string | undefined;

  function resetSelection() {
    setSelection({ mode: 'idle' });
  }

  function selectLane(lane: number) {
    const instanceId = G.players[you].lanes[lane];
    if (!instanceId) return;
    if (G.turnState.actedInstanceIds.includes(instanceId)) return;
    setSelection({ mode: 'selected', lane });
  }

  function fireAttack(attackerLane: number, targetSide?: 'left' | 'center' | 'right') {
    moves.attack({ attackerLane, targetSide });
    resetSelection();
  }

  function fireRange1Target(attackerLane: number, targetLane: number) {
    const side = SIDE_ORDER.find((s) => {
      const pattern = resolveRangePattern(attackerLane, 1, s);
      return pattern[0] === targetLane;
    });
    if (!side) return;
    fireAttack(attackerLane, side);
  }

  function fireEnterDefense(lane: number) {
    moves.enterDefense({ lane });
    resetSelection();
  }

  function fireLeaveDefense(lane: number) {
    moves.leaveDefense({ lane });
    resetSelection();
  }

  function fireMove(lane: number, direction: 'left' | 'right') {
    moves.changePosition({ lane, direction });
    resetSelection();
  }

  function fireAbility(lane: number, targetLane?: number) {
    if (targetLane === undefined) {
      moves.activateAbility({ lane });
    } else {
      moves.activateAbility({ lane, targetPlayerID: opponent, targetLane });
    }
    resetSelection();
  }

  if (winner) {
    return (
      <div className="board board-gameover">
        <h1>{STARTER_NAME(winner)} wins!</h1>
        <p>Reload the page to start a new match.</p>
      </div>
    );
  }

  const selectedLane = selection.mode !== 'idle' ? selection.lane : null;
  const selectedInstanceId = selectedLane !== null ? G.players[you].lanes[selectedLane] : null;
  const selectedInstance = selectedInstanceId ? G.cardInstances[selectedInstanceId] : null;
  const selectedDef = selectedInstance ? CARD_DEFINITIONS[selectedInstance.defId] : null;

  const movesLeft = MOVES_PER_TURN - G.turnState.movesUsed;

  const range1Targets: Set<number> = new Set();
  if (selection.mode === 'awaitingRange1Target') {
    for (const side of SIDE_ORDER) {
      const pattern = resolveRangePattern(selection.lane, 1, side);
      pattern.forEach((lane) => range1Targets.add(lane));
    }
  }

  const abilityTargets: Set<number> = new Set();
  if (selection.mode === 'awaitingAbilityTarget') {
    for (let lane = 0; lane < BOARD_SIZE; lane++) {
      if (G.players[opponent].lanes[lane]) abilityTargets.add(lane);
    }
  }

  const targetableLanes = selection.mode === 'awaitingRange1Target'
    ? range1Targets
    : selection.mode === 'awaitingAbilityTarget'
      ? abilityTargets
      : new Set<number>();

  return (
    <div className="board">
      <header className="board-header">
        <div className="score">
          <span className="score-you">
            {STARTER_NAME(you)}: {G.players[you].eliminationPoints} / 5
          </span>
          <span className="score-opponent">
            {STARTER_NAME(opponent)}: {G.players[opponent].eliminationPoints} / 5
          </span>
        </div>
        <div className="turn-info">
          Turn {ctx.turn} — {STARTER_NAME(you)}'s move ({movesLeft} of {MOVES_PER_TURN} moves left)
          {ctx.turn === 1 && <span className="hint"> — opening turn: no attacks yet</span>}
        </div>
        <button type="button" className="btn btn-end-turn" onClick={() => events.endTurn?.()}>
          End Turn
        </button>
      </header>

      <BenchStrip playerID={opponent} G={G} label={`${STARTER_NAME(opponent)}'s bench`} />

      <h2 className="arena-title">⚔ Arena</h2>
      <Arena
        G={G}
        you={you}
        opponent={opponent}
        youLabel={STARTER_NAME(you)}
        opponentLabel={STARTER_NAME(opponent)}
        interactiveYourRow={selection.mode === 'idle' || selection.mode === 'selected'}
        selectedLane={selectedLane}
        targetableLanes={targetableLanes}
        onYourLaneClick={(lane) => {
          if (selection.mode === 'idle' || selection.mode === 'selected') selectLane(lane);
        }}
        onOpponentLaneClick={(lane) => {
          if (selection.mode === 'awaitingRange1Target') fireRange1Target(selection.lane, lane);
          else if (selection.mode === 'awaitingAbilityTarget') fireAbility(selection.lane, lane);
        }}
      />

      <BenchStrip playerID={you} G={G} label={`${STARTER_NAME(you)}'s bench`} />

      {selectedInstance && selectedDef && selection.mode !== 'awaitingRange1Target' && selection.mode !== 'awaitingAbilityTarget' && (
        <ActionPanel
          lane={selectedLane!}
          instance={selectedInstance}
          definition={selectedDef}
          ctx={ctx}
          G={G}
          onAttack={(side) => (selectedDef.range === 1 ? setSelection({ mode: 'awaitingRange1Target', lane: selectedLane! }) : fireAttack(selectedLane!, side))}
          onEnterDefense={() => fireEnterDefense(selectedLane!)}
          onLeaveDefense={() => fireLeaveDefense(selectedLane!)}
          onMove={(dir) => fireMove(selectedLane!, dir)}
          onAbility={() => (selectedDef.ability?.requiresTarget ? setSelection({ mode: 'awaitingAbilityTarget', lane: selectedLane! }) : fireAbility(selectedLane!))}
          onCancel={resetSelection}
        />
      )}

      {(selection.mode === 'awaitingRange1Target' || selection.mode === 'awaitingAbilityTarget') && (
        <div className="action-panel">
          <p>{selection.mode === 'awaitingRange1Target' ? 'Choose a highlighted lane to attack.' : 'Choose a highlighted enemy card to target.'}</p>
          <button type="button" className="btn btn-cancel" onClick={resetSelection}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// Mirrors App.tsx's playerID -> starter deck assignment. Sourcing the name
// from STARTER_DECKS itself (rather than a second hardcoded literal here)
// means the two can never drift apart the way a duplicated string could.
const PLAYER_DECK_NAMES: Record<string, string> = {
  '0': STARTER_DECKS.vanguardAlliance.name,
  '1': STARTER_DECKS.wardenAlliance.name,
};

function STARTER_NAME(playerID: string): string {
  return PLAYER_DECK_NAMES[playerID] ?? playerID;
}

// Grid rows within the arena (see Arena below) — kept as named constants so
// the row each piece belongs to is legible at every call site instead of
// bare numbers.
const OPPONENT_ROW = 1;
const DIVIDER_ROW = 2;
const YOUR_ROW = 3;

interface ArenaProps {
  G: GameState;
  you: string;
  opponent: string;
  youLabel: string;
  opponentLabel: string;
  interactiveYourRow: boolean;
  selectedLane: number | null;
  targetableLanes: Set<number>;
  onYourLaneClick: (lane: number) => void;
  onOpponentLaneClick: (lane: number) => void;
}

/**
 * The central arena: one CSS Grid shared by both players' 5 lanes plus a
 * lane-number divider between them, so "what's in front of what" is a
 * pixel-guaranteed property of the layout (same grid columns for both
 * rows) rather than something two independently-scrolling rows merely
 * happen to look aligned. The whole grid scrolls as a single unit on
 * narrow viewports so the two rows can never drift out of column sync.
 */
function Arena({
  G,
  you,
  opponent,
  youLabel,
  opponentLabel,
  interactiveYourRow,
  selectedLane,
  targetableLanes,
  onYourLaneClick,
  onOpponentLaneClick,
}: ArenaProps) {
  const opponentLanes = G.players[opponent].lanes;
  const yourLanes = G.players[you].lanes;

  const columnStrips: ReactNode[] = [];
  for (let lane = 0; lane < BOARD_SIZE; lane++) {
    const isTarget = targetableLanes.has(lane);
    const classes = [
      'arena-column-strip',
      lane % 2 === 1 ? 'arena-column-strip-alt' : '',
      isTarget ? 'arena-column-strip-target' : '',
    ]
      .filter(Boolean)
      .join(' ');
    columnStrips.push(
      <div key={`strip-${lane}`} className={classes} style={{ gridColumn: lane + 2, gridRow: `${OPPONENT_ROW} / span 3` }} />,
    );
  }

  const dividerCells: ReactNode[] = [];
  for (let lane = 0; lane < BOARD_SIZE; lane++) {
    dividerCells.push(
      <div key={`div-${lane}`} className="arena-divider-cell" style={{ gridColumn: lane + 2, gridRow: DIVIDER_ROW }}>
        {lane + 1}
      </div>,
    );
  }

  return (
    <div className="arena-wrap">
      <div className="arena-scroll">
        <div className="arena-grid">
          {columnStrips}

          <div
            className="arena-label arena-label-opponent"
            style={{ gridColumn: 1, gridRow: OPPONENT_ROW }}
            title={opponentLabel}
          >
            <span className="label-full">{opponentLabel}</span>
            <span className="label-short">OPP</span>
          </div>
          <div className="arena-label arena-label-divider" style={{ gridColumn: 1, gridRow: DIVIDER_ROW }}>
            <span className="label-full">Lane</span>
            <span className="label-short">#</span>
          </div>
          <div
            className="arena-label arena-label-you"
            style={{ gridColumn: 1, gridRow: YOUR_ROW }}
            title={youLabel}
          >
            <span className="label-full">{youLabel}</span>
            <span className="label-short">YOU</span>
          </div>

          {dividerCells}

          {renderRow({
            G,
            playerID: opponent,
            lanes: opponentLanes,
            gridRow: OPPONENT_ROW,
            side: 'opponent',
            selectedLane: null,
            targetableLanes,
            interactive: false,
            onClick: onOpponentLaneClick,
          })}

          {renderRow({
            G,
            playerID: you,
            lanes: yourLanes,
            gridRow: YOUR_ROW,
            side: 'you',
            selectedLane,
            targetableLanes: new Set(),
            interactive: interactiveYourRow,
            onClick: onYourLaneClick,
          })}
        </div>
      </div>
      <div className="arena-scroll-fade" aria-hidden="true" />
    </div>
  );
}

interface RenderRowArgs {
  G: GameState;
  playerID: string;
  lanes: (string | null)[];
  gridRow: number;
  /** Which side of the arena this row is on, from the current active
   * player's perspective. Stamped onto each cell as data-side so
   * automated tests (and any future tooling) can find "my own row" or
   * "the opponent's row" reliably even as bench replacements change which
   * card occupies a lane, and even as the two rows swap which physical
   * grid row they render in from turn to turn. */
  side: 'you' | 'opponent';
  selectedLane: number | null;
  targetableLanes: Set<number>;
  interactive: boolean;
  onClick: (lane: number) => void;
}

/**
 * Builds the card cells for one side of the arena. A Titan occupies two
 * adjacent lanes with the same instanceId (§5) — rendered as one wide card
 * spanning both grid columns (CSS Grid's column-span keeps this pixel
 * aligned with whatever's in those same two columns on the other row) —
 * not two identical adjacent cards, and not two independently-tracked
 * cells that could ever drift apart.
 */
function renderRow({ G, playerID, lanes, gridRow, side, selectedLane, targetableLanes, interactive, onClick }: RenderRowArgs): ReactNode[] {
  const cells: ReactNode[] = [];

  for (let lane = 0; lane < lanes.length; lane++) {
    const instanceId = lanes[lane];
    if (instanceId !== null && lanes[lane - 1] === instanceId) {
      continue; // already rendered as part of the previous (wide) cell
    }

    const spansSecondLane = instanceId !== null && lanes[lane + 1] === instanceId;
    const span = spansSecondLane ? 2 : 1;
    const instance = instanceId ? G.cardInstances[instanceId] : null;
    const def = instance ? CARD_DEFINITIONS[instance.defId] : null;
    const coveredLanes = spansSecondLane ? [lane, lane + 1] : [lane];

    const targetable = coveredLanes.some((l) => targetableLanes.has(l));
    const targetLane = coveredLanes.find((l) => targetableLanes.has(l)) ?? lane;
    const alreadyActed = !!instance && G.turnState.actedInstanceIds.includes(instance.instanceId);
    const clickable = targetable || (interactive && !!instance && !alreadyActed);
    // A card is worth visually de-emphasizing when it's already done for
    // the turn, or when the player is actively choosing a target elsewhere
    // on the board and this one isn't an eligible choice — not merely
    // because it isn't part of the *current* interaction at all (e.g. the
    // opponent's whole board during ordinary card selection, which isn't
    // "disabled", it's just not what you're looking at right now).
    const inActiveTargetingMode = targetableLanes.size > 0;
    const deemphasized = alreadyActed || (inActiveTargetingMode && !targetable);

    const style: CSSProperties = { gridColumn: `${lane + 2} / span ${span}`, gridRow };

    cells.push(
      <div
        className={`arena-cell${span === 2 ? ' arena-cell-wide' : ''}`}
        key={`${playerID}-${lane}`}
        style={style}
        data-side={side}
        data-lane={lane}
      >
        {instance && def ? (
          <CardView
            definition={def}
            instance={instance}
            selected={coveredLanes.includes(selectedLane ?? -1)}
            targetable={targetable}
            clickable={clickable}
            deemphasized={deemphasized}
            onClick={() => onClick(targetable ? targetLane : lane)}
          />
        ) : targetable ? (
          // §15 — an in-range but unoccupied lane is a legal (if pointless)
          // attack target: "only occupied positions receive damage", not
          // "only occupied positions may be targeted". Without this, a
          // Range 1 attacker whose sole geometrically valid target happens
          // to be empty would have no way to complete (or deliberately
          // waste) that attack through the UI at all.
          <button type="button" className="lane-empty lane-empty-targetable" onClick={() => onClick(targetLane)}>
            empty
          </button>
        ) : (
          <div className="lane-empty">empty</div>
        )}
      </div>,
    );
  }

  return cells;
}

/**
 * Mirrors the legality check in game/moves.ts's changePositionMove without
 * importing it (that version mutates G and returns INVALID_MOVE; this one
 * is a pure read-only predicate for deciding whether to show the button at
 * all). A Titan's own shove (Ruling 5) always succeeds in-bounds. A Normal
 * card's move succeeds against an adjacent friendly Normal card (direct
 * swap) or an adjacent friendly Titan that has room to shift one further
 * lane the same direction (push-through) — never against empty space, and
 * never against a Titan with nowhere to go.
 */
function canSlide(G: GameState, owner: string, lane: number, footprint: number, direction: 'left' | 'right'): boolean {
  const delta = direction === 'left' ? -1 : 1;
  if (direction === 'left') {
    if (lane <= 0) return false;
  } else if (lane >= BOARD_SIZE - footprint) {
    return false;
  }
  if (footprint === 2) return true;

  const targetLane = lane + delta;
  const targetId = G.players[owner].lanes[targetLane];
  if (!targetId) return false;
  const targetDef = CARD_DEFINITIONS[G.cardInstances[targetId].defId];
  if (targetDef.form === 'Normal') return true;

  const titanLanes = lanesOccupiedBy(G, owner, targetId);
  const newTitanLanes = titanLanes.map((l) => l + delta);
  if (!newTitanLanes.every(isValidLane)) return false;
  const titanFarLane = newTitanLanes.find((l) => !titanLanes.includes(l))!;
  return G.players[owner].lanes[titanFarLane] === null;
}

function BenchStrip({ playerID, G, label }: { playerID: string; G: GameState; label: string }) {
  const bench = G.players[playerID].bench;
  return (
    <section className="bench-section">
      <span className="bench-label">
        {label} ({bench.length}):
      </span>
      <div className="bench-row">
        {bench.map((instanceId) => {
          const instance = G.cardInstances[instanceId];
          const def = CARD_DEFINITIONS[instance.defId];
          return <CardView key={instanceId} definition={def} instance={instance} size="bench" />;
        })}
      </div>
    </section>
  );
}

interface ActionPanelProps {
  lane: number;
  instance: GameState['cardInstances'][string];
  definition: (typeof CARD_DEFINITIONS)[string];
  ctx: BoardProps<GameState>['ctx'];
  G: GameState;
  onAttack: (side?: 'left' | 'right') => void;
  onEnterDefense: () => void;
  onLeaveDefense: () => void;
  onMove: (direction: 'left' | 'right') => void;
  onAbility: () => void;
  onCancel: () => void;
}

function ActionPanel({ lane, instance, definition, ctx, G, onAttack, onEnterDefense, onLeaveDefense, onMove, onAbility, onCancel }: ActionPanelProps) {
  const movesLeft = MOVES_PER_TURN - G.turnState.movesUsed;
  const canAttack = !instance.defending && !G.turnState.attackUsed && movesLeft >= 1 && ctx.turn !== 1;
  const canDefendToggle = movesLeft >= 1;
  const canMove = movesLeft >= 1;
  const abilityCost = definition.ability?.costsBothMoves ? MOVES_PER_TURN : 1;
  const canAbility = !!definition.ability && movesLeft >= abilityCost && (!instance.defending || definition.ability.usableWhileDefending === true);
  // `lane` is always a Titan's *lower* occupied index (see renderRow), so
  // its rightmost occupied lane is `lane + footprint - 1`, not `lane`
  // itself — the right-move bound has to account for that or it'll offer
  // "Move Right" one lane past where a 2-wide Titan can actually go.
  const footprint = definition.form === 'Titan' ? 2 : 1;
  // §19: a Normal card may only swap with an adjacent friendly *Normal*
  // card — it has no way to displace a Titan (only a Titan's own move can
  // shove a Normal card aside, per Ruling 5; there's no reverse). Board
  // edges alone aren't enough to decide whether the button should show:
  // a Normal card sitting next to a Titan, or next to an empty lane, is
  // just as blocked as one at the literal edge of the board, and offering
  // the button in those cases only to have the engine silently reject it
  // is the same bug the Titan edge case was.
  const canMoveLeft = canMove && canSlide(G, instance.owner, lane, footprint, 'left');
  const canMoveRight = canMove && canSlide(G, instance.owner, lane, footprint, 'right');

  return (
    <div className="action-panel">
      <p className="action-panel-title">{definition.name} — choose an action</p>
      <div className="action-buttons">
        {canAttack && definition.range === 1 && (
          <button type="button" className="btn" onClick={() => onAttack()}>
            Attack (choose target)
          </button>
        )}
        {canAttack && definition.range === 2 && (
          <>
            <button type="button" className="btn" onClick={() => onAttack('left')}>
              Attack Left Flank
            </button>
            <button type="button" className="btn" onClick={() => onAttack('right')}>
              Attack Right Flank
            </button>
          </>
        )}
        {canAttack && definition.range === 3 && (
          <button type="button" className="btn" onClick={() => onAttack()}>
            Attack (hits 3 lanes)
          </button>
        )}

        {canDefendToggle && !instance.defending && (
          <button type="button" className="btn" onClick={onEnterDefense}>
            Enter Defense Mode
          </button>
        )}
        {canDefendToggle && instance.defending && (
          <button type="button" className="btn" onClick={onLeaveDefense}>
            Leave Defense Mode
          </button>
        )}

        {canMoveLeft && (
          <button type="button" className="btn" onClick={() => onMove('left')}>
            Move Left
          </button>
        )}
        {canMoveRight && (
          <button type="button" className="btn" onClick={() => onMove('right')}>
            Move Right
          </button>
        )}

        {canAbility && (
          <button type="button" className="btn btn-ability" onClick={onAbility}>
            {definition.ability!.name}
          </button>
        )}

        <button type="button" className="btn btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
