interface HomeProps {
  onStartHotseat: () => void;
  onStartSolo: () => void;
  onShowGuide: () => void;
}

export function Home({ onStartHotseat, onStartSolo, onShowGuide }: HomeProps) {
  return (
    <div className="screen screen-home">
      <h1 className="screen-title">Season&rsquo;s Battle</h1>
      <p className="screen-tagline">A tactical card duel across five seasons.</p>
      <p className="screen-note">Play pass-and-play with a friend, or solo against a bot opponent.</p>
      <div className="screen-home-actions">
        <button type="button" className="btn btn-primary" onClick={onStartHotseat}>
          Play Hotseat (2 Players)
        </button>
        <button type="button" className="btn btn-primary" onClick={onStartSolo}>
          Play vs Bot
        </button>
        <button type="button" className="btn" onClick={onShowGuide}>
          How to Play
        </button>
      </div>
    </div>
  );
}
