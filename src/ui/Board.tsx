import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { Volume2, VolumeX } from 'lucide-react';
import { CARD_DEFINITIONS } from '../content/cards';
import { otherPlayer, resolveRangePattern } from '../game/board';
import { decideBotAction } from '../game/bot';
import { computeLegalActions } from '../game/legalActions';
import { BOARD_SIZE, MOVES_PER_TURN } from '../game/rules.config';
import type { GameState } from '../game/types';
import { CardView } from './CardView';
import { isSoundMuted, playSound, setSoundMuted } from './sound';

/** Delay before the bot dispatches each move, so solo play reads as a
 * beat-by-beat turn rather than the whole bot turn resolving instantly. */
const BOT_MOVE_DELAY_MS = 650;

type Selection =
  | { mode: 'idle' }
  | { mode: 'selected'; lane: number }
  | { mode: 'awaitingRange1Target'; lane: number }
  | { mode: 'awaitingAbilityTarget'; lane: number };

const SIDE_ORDER = ['left', 'center', 'right'] as const;

/** The two props App.tsx injects on top of boardgame.io's own BoardProps —
 * which starter deck each playerID chose (App.tsx resolves this at match
 * setup, since it's the one place that knows the player's choice) and the
 * callback for the game-over screen's "Play Again". */
interface SeasonsBattleBoardProps extends BoardProps<GameState> {
  playerDeckNames: Record<string, string>;
  onPlayAgain: () => void;
  onShowGuide: () => void;
  /** Set only for solo-vs-bot matches: the human's fixed playerID. Hotseat
   * play (both seats human, taking turns on the same device) omits this, so
   * `you` keeps flipping to whoever's turn it is each turn — the existing,
   * unchanged behavior. In solo play the human never swaps seats, so `you`
   * must stay pinned instead of flipping to the bot on its turns. */
  humanPlayerID?: string;
}

export function Board({ G, ctx, moves, events, playerDeckNames, onPlayAgain, onShowGuide, humanPlayerID }: SeasonsBattleBoardProps) {
  const [selection, setSelection] = useState<Selection>({ mode: 'idle' });

  const you = humanPlayerID ?? ctx.currentPlayer;
  const opponent = otherPlayer(you);
  const isYourTurn = ctx.currentPlayer === you;
  const winner = ctx.gameover?.winner as string | undefined;
  const starterName = (playerID: string) => playerDeckNames[playerID] ?? playerID;

  const [muted, setMuted] = useState(isSoundMuted);
  function toggleMuted() {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  }

  function resetSelection() {
    setSelection({ mode: 'idle' });
  }

  // Any turn change clears a stale selection — without this, selecting a
  // card and then ending the turn without acting on it (or, in solo play,
  // the bot's turn arriving) would leave a dead ActionPanel referencing a
  // lane that's no longer this turn's business.
  useEffect(() => {
    resetSelection();
  }, [ctx.currentPlayer]);

  // Drives the bot's side of a solo match: whenever it's the bot's turn,
  // decide and dispatch exactly one action, on a short delay so a whole
  // bot turn doesn't resolve in a single instant frame. Re-fires after
  // every state change (G is a fresh object each move), which is what
  // advances the bot one action at a time until it ends its turn.
  useEffect(() => {
    if (!humanPlayerID || winner) return;
    if (ctx.currentPlayer === humanPlayerID) return;
    const botPlayerID = ctx.currentPlayer;
    const timer = setTimeout(() => {
      const action = decideBotAction(G, ctx, CARD_DEFINITIONS, botPlayerID);
      switch (action.type) {
        case 'attack':
          moves.attack({ attackerLane: action.attackerLane, targetSide: action.targetSide });
          break;
        case 'enterDefense':
          moves.enterDefense({ lane: action.lane });
          break;
        case 'leaveDefense':
          moves.leaveDefense({ lane: action.lane });
          break;
        case 'changePosition':
          moves.changePosition({ lane: action.lane, direction: action.direction });
          break;
        case 'activateAbility':
          moves.activateAbility({
            lane: action.lane,
            targetPlayerID: action.targetPlayerID,
            targetLane: action.targetLane,
          });
          break;
        case 'endTurn':
          events.endTurn?.();
          break;
      }
    }, BOT_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G, ctx, humanPlayerID, moves, events, winner]);

  // Diffs each new G/ctx against the previous one to fire SFX for attack,
  // defend, destroy, and win — driven by state transitions rather than
  // wired into individual click handlers, so bot-driven moves (which never
  // touch those handlers) get sound exactly the same as human ones do.
  // Independent checks, not else-if: a single attack can both fire the
  // attack sound and, if it destroys a card, layer the destroy sound (and
  // the win fanfare too, if that was the finishing blow) in the same tick.
  const prevSoundStateRef = useRef<{ G: GameState; gameover: boolean } | null>(null);
  useEffect(() => {
    const prev = prevSoundStateRef.current;
    if (prev) {
      if (!prev.G.turnState.attackUsed && G.turnState.attackUsed) {
        playSound('attack');
      }

      for (const instanceId of Object.keys(G.cardInstances)) {
        const prevInstance = prev.G.cardInstances[instanceId];
        if (prevInstance && !prevInstance.defending && G.cardInstances[instanceId].defending) {
          playSound('defend');
          break;
        }
      }

      const currentIds = new Set(Object.keys(G.cardInstances));
      const anyDestroyed = Object.keys(prev.G.cardInstances).some((id) => !currentIds.has(id));
      if (anyDestroyed) playSound('destroy');

      if (!prev.gameover && ctx.gameover) playSound('win');
    }
    prevSoundStateRef.current = { G, gameover: !!ctx.gameover };
  }, [G, ctx.gameover]);

  // Computed here (rather than after the `if (winner)` early return below)
  // so the scrollIntoView effect that depends on them stays an unconditional
  // hook call — React requires every hook to run in the same order on every
  // render, and an early return before a hook violates that.
  const selectedLane = selection.mode !== 'idle' ? selection.lane : null;
  const selectedInstanceId = selectedLane !== null ? G.players[you].lanes[selectedLane] : null;

  // .action-panel stays in plain normal flow (see board.css for why both
  // position: sticky and position: fixed were tried and disproved by real
  // overlap testing) — so instead of trying to keep it permanently pinned,
  // scroll it into view the instant it appears. That's what actually
  // answers the player complaint ("the action bar sometimes is not
  // visible"): whichever of the two mutually-exclusive .action-panel
  // branches below just mounted (ActionPanel itself, or the
  // targeting-prompt panel — only one is ever mounted at a time, sharing
  // this one ref) gets scrolled on-screen on every relevant transition
  // (new card selected, entering/leaving targeting, cancel).
  const actionPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    actionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selection.mode, selectedInstanceId]);

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
    const loser = otherPlayer(winner);
    // Hotseat has no single fixed "you" (the device gets passed back and
    // forth), so the neutral "<deck> wins!" framing is all that makes
    // sense there — solo play has a real you-vs-them outcome worth
    // calling out distinctly rather than always reading identically to a
    // win.
    const isSoloMatch = !!humanPlayerID;
    const soloWon = isSoloMatch && winner === humanPlayerID;
    const headline = !isSoloMatch ? `${starterName(winner)} wins!` : soloWon ? 'You win!' : 'You lose';
    const resultClass = !isSoloMatch ? '' : soloWon ? 'board-gameover-win' : 'board-gameover-loss';
    return (
      <div className={`board board-gameover ${resultClass}`}>
        <h1>{headline}</h1>
        <p className="board-gameover-score">
          {starterName(winner)} {G.players[winner].eliminationPoints} &ndash; {G.players[loser].eliminationPoints}{' '}
          {starterName(loser)}
        </p>
        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    );
  }

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
            {starterName(you)}: {G.players[you].eliminationPoints} / 5
          </span>
          <span className="score-opponent">
            {starterName(opponent)}: {G.players[opponent].eliminationPoints} / 5
          </span>
        </div>
        <div className="turn-info">
          Turn {ctx.turn} — {starterName(ctx.currentPlayer)}'s move ({movesLeft} of {MOVES_PER_TURN} moves left)
          {ctx.turn === 1 && <span className="hint"> — opening turn: no attacks yet</span>}
        </div>
        <button
          type="button"
          className="btn btn-sound"
          onClick={toggleMuted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          aria-pressed={muted}
          title={muted ? 'Unmute sound' : 'Mute sound'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button type="button" className="btn btn-guide" onClick={onShowGuide}>
          How to Play
        </button>
        <button type="button" className="btn btn-end-turn" onClick={() => events.endTurn?.()}>
          End Turn
        </button>
      </header>

      <BenchStrip playerID={opponent} G={G} label={`${starterName(opponent)}'s bench`} />

      <h2 className="arena-title">⚔ Arena</h2>
      <Arena
        G={G}
        you={you}
        opponent={opponent}
        youLabel={starterName(you)}
        opponentLabel={starterName(opponent)}
        interactiveYourRow={isYourTurn && (selection.mode === 'idle' || selection.mode === 'selected')}
        selectedLane={selectedLane}
        targetableLanes={targetableLanes}
        onYourLaneClick={(lane) => {
          if (isYourTurn && (selection.mode === 'idle' || selection.mode === 'selected')) selectLane(lane);
        }}
        onOpponentLaneClick={(lane) => {
          if (selection.mode === 'awaitingRange1Target') fireRange1Target(selection.lane, lane);
          else if (selection.mode === 'awaitingAbilityTarget') fireAbility(selection.lane, lane);
        }}
      />

      <BenchStrip playerID={you} G={G} label={`${starterName(you)}'s bench`} />

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
          panelRef={actionPanelRef}
        />
      )}

      {(selection.mode === 'awaitingRange1Target' || selection.mode === 'awaitingAbilityTarget') && (
        <div className="action-panel" ref={actionPanelRef}>
          <p>{selection.mode === 'awaitingRange1Target' ? 'Choose a highlighted lane to attack.' : 'Choose a highlighted enemy card to target.'}</p>
          <button type="button" className="btn btn-cancel" onClick={resetSelection}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
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
          <button
            type="button"
            className="lane-empty lane-empty-targetable"
            onClick={() => onClick(targetLane)}
            aria-label={`Empty, lane ${targetLane + 1} — attack here`}
          >
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
  panelRef: RefObject<HTMLDivElement | null>;
}

function ActionPanel({ lane, instance, definition, ctx, G, onAttack, onEnterDefense, onLeaveDefense, onMove, onAbility, onCancel, panelRef }: ActionPanelProps) {
  // The single source of truth for what this card may do — shared with the
  // bot (src/game/bot.ts) so button visibility here and the bot's decision
  // logic can never drift apart the way two independently-authored copies
  // of the same rule eventually did earlier in this project (see the
  // Feint/Ward ability rework).
  const legal = computeLegalActions(G, ctx, CARD_DEFINITIONS, instance.owner, lane);
  if (!legal) return null; // shouldn't happen — ActionPanel only renders for a selected, actable card

  return (
    <div className="action-panel" ref={panelRef}>
      <p className="action-panel-title">{definition.name} — choose an action</p>
      <div className="action-buttons">
        {legal.attack?.range === 1 && (
          <button type="button" className="btn" onClick={() => onAttack()}>
            Attack (choose target)
          </button>
        )}
        {legal.attack?.range === 2 && (
          <>
            <button type="button" className="btn" onClick={() => onAttack('left')}>
              Attack Left Flank
            </button>
            <button type="button" className="btn" onClick={() => onAttack('right')}>
              Attack Right Flank
            </button>
          </>
        )}
        {legal.attack?.range === 3 && (
          <button type="button" className="btn" onClick={() => onAttack()}>
            Attack (hits 3 lanes)
          </button>
        )}

        {legal.canEnterDefense && (
          <button type="button" className="btn" onClick={onEnterDefense}>
            Enter Defense Mode
          </button>
        )}
        {legal.canLeaveDefense && (
          <button type="button" className="btn" onClick={onLeaveDefense}>
            Leave Defense Mode
          </button>
        )}

        {legal.canMoveLeft && (
          <button type="button" className="btn" onClick={() => onMove('left')}>
            Move Left
          </button>
        )}
        {legal.canMoveRight && (
          <button type="button" className="btn" onClick={() => onMove('right')}>
            Move Right
          </button>
        )}

        {legal.ability && (
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
