import { useState } from 'react';
import type { ReactNode } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { CARD_DEFINITIONS } from '../content/cards';
import { otherPlayer, resolveRangePattern } from '../game/board';
import { BOARD_SIZE, MOVES_PER_TURN } from '../game/rules.config';
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

      <PlayerLanes
        playerID={opponent}
        label={`${STARTER_NAME(opponent)} (opponent)`}
        G={G}
        targetableLanes={selection.mode === 'awaitingRange1Target' ? range1Targets : selection.mode === 'awaitingAbilityTarget' ? abilityTargets : new Set()}
        onLaneClick={(lane) => {
          if (selection.mode === 'awaitingRange1Target') fireRange1Target(selection.lane, lane);
          else if (selection.mode === 'awaitingAbilityTarget') fireAbility(selection.lane, lane);
        }}
      />

      <PlayerLanes
        playerID={you}
        label={`${STARTER_NAME(you)} (you)`}
        G={G}
        interactive={selection.mode === 'idle' || selection.mode === 'selected'}
        selectedLane={selectedLane}
        onLaneClick={(lane) => {
          if (selection.mode === 'idle' || selection.mode === 'selected') selectLane(lane);
        }}
      />

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

function STARTER_NAME(playerID: string): string {
  return playerID === '0' ? 'Summer Pressure' : 'Winter Control';
}

interface PlayerLanesProps {
  playerID: string;
  label: string;
  G: GameState;
  /** True for the current player's own row: occupied, unacted lanes become
   * clickable to select. False (default) for the opponent's row, where the
   * only clickable lanes are the ones in `targetableLanes`. */
  interactive?: boolean;
  selectedLane?: number | null;
  targetableLanes?: Set<number>;
  onLaneClick: (lane: number) => void;
}

function PlayerLanes({ playerID, label, G, interactive = false, selectedLane, targetableLanes, onLaneClick }: PlayerLanesProps) {
  const lanes = G.players[playerID].lanes;
  const bench = G.players[playerID].bench;

  // A Titan occupies two adjacent lanes with the same instanceId (§5) — it's
  // rendered as one wide card spanning both slots, not two identical cards,
  // so the "one unit, two spaces" rule reads clearly.
  const slots: ReactNode[] = [];
  for (let lane = 0; lane < lanes.length; lane++) {
    const instanceId = lanes[lane];
    const instance = instanceId ? G.cardInstances[instanceId] : null;
    const def = instance ? CARD_DEFINITIONS[instance.defId] : null;
    const spansSecondLane = instanceId !== null && lanes[lane + 1] === instanceId;

    if (instanceId !== null && lanes[lane - 1] === instanceId) {
      continue; // already rendered as part of the previous (wide) slot
    }

    const coveredLanes = spansSecondLane ? [lane, lane + 1] : [lane];
    const targetable = coveredLanes.some((l) => targetableLanes?.has(l));
    const targetLane = coveredLanes.find((l) => targetableLanes?.has(l)) ?? lane;
    const alreadyActed = !!instance && G.turnState.actedInstanceIds.includes(instance.instanceId);
    const clickable = targetable || (interactive && !!instance && !alreadyActed);

    slots.push(
      <div className={`lane-slot${spansSecondLane ? ' lane-slot-wide' : ''}`} key={lane}>
        {instance && def ? (
          <CardView
            definition={def}
            instance={instance}
            selected={coveredLanes.includes(selectedLane ?? -1)}
            targetable={targetable}
            clickable={clickable}
            onClick={() => onLaneClick(targetable ? targetLane : lane)}
          />
        ) : (
          <div className="lane-empty">empty</div>
        )}
      </div>,
    );
  }

  return (
    <section className="player-lanes">
      <h2>{label}</h2>
      <div className="lane-row">{slots}</div>
      <div className="bench-row">
        <span className="bench-label">Bench ({bench.length}):</span>
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

        {canMove && lane > 0 && (
          <button type="button" className="btn" onClick={() => onMove('left')}>
            Move Left
          </button>
        )}
        {canMove && lane < BOARD_SIZE - 1 && (
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
