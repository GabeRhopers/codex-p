import { useMemo, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { CARD_DEFINITIONS } from '../content/cards';
import { STARTER_DECKS } from '../content/decks';
import { createSeasonsBattleGame } from '../game/game';
import { Board } from './Board';
import { DeckSelect } from './DeckSelect';
import { Home } from './Home';
import { HowToPlay } from './HowToPlay';
import './fonts.css';
import './board.css';

type Screen = 'home' | 'deckSelect' | 'match';

interface PlayerDeckIds {
  '0': string;
  '1': string;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerDeckIds, setPlayerDeckIds] = useState<PlayerDeckIds | null>(null);
  // Bumped on every new match so <Match> remounts fresh — boardgame.io's
  // Client keeps its own internal state, and a match that just ended
  // shouldn't leak into the next one.
  const [matchKey, setMatchKey] = useState(0);
  // Lives here, not inside Home or Match, because it's opened from both —
  // rendering it as a sibling overlay (below) means closing it always
  // returns to whichever screen was already showing, mid-match included,
  // without touching that screen's own state.
  const [showGuide, setShowGuide] = useState(false);

  function startMatch(player1DeckId: string) {
    const player2DeckId = Object.keys(STARTER_DECKS).find((id) => id !== player1DeckId)!;
    setPlayerDeckIds({ '0': player1DeckId, '1': player2DeckId });
    setMatchKey((key) => key + 1);
    setScreen('match');
  }

  function playAgain() {
    setPlayerDeckIds(null);
    setScreen('deckSelect');
  }

  return (
    <div className="app">
      {screen === 'home' && <Home onStart={() => setScreen('deckSelect')} onShowGuide={() => setShowGuide(true)} />}
      {screen === 'deckSelect' && <DeckSelect onChoose={startMatch} />}
      {screen === 'match' && playerDeckIds && (
        <Match
          key={matchKey}
          playerDeckIds={playerDeckIds}
          onPlayAgain={playAgain}
          onShowGuide={() => setShowGuide(true)}
        />
      )}
      {showGuide && <HowToPlay onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function Match({
  playerDeckIds,
  onPlayAgain,
  onShowGuide,
}: {
  playerDeckIds: PlayerDeckIds;
  onPlayAgain: () => void;
  onShowGuide: () => void;
}) {
  // Client() returns a component *type*, not an element — constructing it
  // fresh on every render (rather than once per mount) would hand React a
  // different type at the same JSX position on the next unrelated
  // re-render, which forces a full unmount/remount and wipes the match
  // mid-game. memoized on playerDeckIds, which is stable for this
  // component's whole lifetime anyway (App.tsx remounts <Match> via `key`
  // whenever the deck choice actually changes).
  const GameClient = useMemo(() => {
    const game = createSeasonsBattleGame(CARD_DEFINITIONS, {
      '0': STARTER_DECKS[playerDeckIds['0']].setup,
      '1': STARTER_DECKS[playerDeckIds['1']].setup,
    });
    return Client({ game, board: Board, numPlayers: 2, debug: false });
  }, [playerDeckIds]);
  const playerDeckNames = {
    '0': STARTER_DECKS[playerDeckIds['0']].name,
    '1': STARTER_DECKS[playerDeckIds['1']].name,
  };

  return <GameClient playerDeckNames={playerDeckNames} onPlayAgain={onPlayAgain} onShowGuide={onShowGuide} />;
}
