interface HomeProps {
  onStart: () => void;
  onShowGuide: () => void;
}

export function Home({ onStart, onShowGuide }: HomeProps) {
  return (
    <div className="screen screen-home">
      <h1 className="screen-title">Season&rsquo;s Battle</h1>
      <p className="screen-tagline">A tactical card duel across five seasons.</p>
      <p className="screen-note">2-player pass-and-play — take turns on the same device.</p>
      <div className="screen-home-actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Start Match
        </button>
        <button type="button" className="btn" onClick={onShowGuide}>
          How to Play
        </button>
      </div>
    </div>
  );
}
