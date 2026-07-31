import { useMemo, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { CARD_DEFINITIONS } from '../content/cards';
import { STARTER_DECKS } from '../content/decks';
import { createSeasonsBattleGame } from '../game/game';
import type { PlayerSetup } from '../game/state';
import { Board } from './Board';
import { DeckBuilder } from './DeckBuilder';
import { DeckSelect } from './DeckSelect';
import { Home } from './Home';
import { HowToPlay } from './HowToPlay';
import './fonts.css';
import './board.css';

type Screen = 'home' | 'pickDeck' | 'buildDeck' | 'match';
type PlayerID = '0' | '1';

interface DeckChoice {
  setup: PlayerSetup;
  name: string;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  // Deck choice is symmetric and sequential: each player independently
  // picks a preset or builds their own, one after the other — unlike the
  // old "Player 1 picks, Player 2 gets whichever preset is left" shortcut,
  // that only worked because there were exactly two mutually-exclusive
  // decks. A custom deck breaks that assumption (nothing stops both
  // players choosing the same preset, or both going custom), so there's no
  // "the other one" to auto-assign anymore.
  const [pickingPlayer, setPickingPlayer] = useState<PlayerID>('0');
  const [choices, setChoices] = useState<Partial<Record<PlayerID, DeckChoice>>>({});
  // Bumped on every new match so <Match> remounts fresh — boardgame.io's
  // Client keeps its own internal state, and a match that just ended
  // shouldn't leak into the next one.
  const [matchKey, setMatchKey] = useState(0);
  // Lives here, not inside Home or Match, because it's opened from both —
  // rendering it as a sibling overlay (below) means closing it always
  // returns to whichever screen was already showing, mid-match included,
  // without touching that screen's own state.
  const [showGuide, setShowGuide] = useState(false);

  function beginPicking() {
    setChoices({});
    setPickingPlayer('0');
    setScreen('pickDeck');
  }

  function commitChoice(choice: DeckChoice) {
    setChoices((prev) => ({ ...prev, [pickingPlayer]: choice }));
    if (pickingPlayer === '0') {
      setPickingPlayer('1');
      setScreen('pickDeck');
    } else {
      setMatchKey((key) => key + 1);
      setScreen('match');
    }
  }

  function choosePreset(deckId: string) {
    const deck = STARTER_DECKS[deckId];
    commitChoice({ setup: deck.setup, name: deck.name });
  }

  function confirmCustomDeck(setup: PlayerSetup) {
    commitChoice({ setup, name: 'Custom Deck' });
  }

  const playerLabel = pickingPlayer === '0' ? 'Player 1' : 'Player 2';
  const opponentDeckName = pickingPlayer === '1' ? choices['0']?.name : undefined;

  return (
    <div className="app">
      {screen === 'home' && <Home onStart={beginPicking} onShowGuide={() => setShowGuide(true)} />}
      {screen === 'pickDeck' && (
        <DeckSelect
          playerLabel={playerLabel}
          opponentDeckName={opponentDeckName}
          onChoosePreset={choosePreset}
          onBuildCustom={() => setScreen('buildDeck')}
        />
      )}
      {screen === 'buildDeck' && (
        <DeckBuilder playerLabel={playerLabel} onConfirm={confirmCustomDeck} onCancel={() => setScreen('pickDeck')} />
      )}
      {screen === 'match' && choices['0'] && choices['1'] && (
        <Match
          key={matchKey}
          choices={choices as Record<PlayerID, DeckChoice>}
          onPlayAgain={beginPicking}
          onShowGuide={() => setShowGuide(true)}
        />
      )}
      {showGuide && <HowToPlay onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function Match({
  choices,
  onPlayAgain,
  onShowGuide,
}: {
  choices: Record<PlayerID, DeckChoice>;
  onPlayAgain: () => void;
  onShowGuide: () => void;
}) {
  // Client() returns a component *type*, not an element — constructing it
  // fresh on every render (rather than once per mount) would hand React a
  // different type at the same JSX position on the next unrelated
  // re-render, which forces a full unmount/remount and wipes the match
  // mid-game. memoized on choices, which is stable for this component's
  // whole lifetime anyway (App.tsx remounts <Match> via `key` whenever a
  // genuinely new match starts).
  const GameClient = useMemo(() => {
    const game = createSeasonsBattleGame(CARD_DEFINITIONS, {
      '0': choices['0'].setup,
      '1': choices['1'].setup,
    });
    return Client({ game, board: Board, numPlayers: 2, debug: false });
  }, [choices]);
  const playerDeckNames = {
    '0': choices['0'].name,
    '1': choices['1'].name,
  };

  return <GameClient playerDeckNames={playerDeckNames} onPlayAgain={onPlayAgain} onShowGuide={onShowGuide} />;
}
