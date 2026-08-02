/**
 * Synthesized SFX via the Web Audio API — no external audio files. Every
 * sound here is generated at runtime from oscillators and noise bursts,
 * which sidesteps sourcing/licensing CC0 assets entirely (nothing to
 * attribute, nothing to fetch, nothing to keep in the repo) and keeps the
 * game's zero-additional-cost, self-contained footprint (see PLAN).
 *
 * Lazily creates its AudioContext on first `playSound` call rather than at
 * module load — browsers can warn or refuse to start an AudioContext
 * before any user gesture has occurred, and by the time a sound-worthy game
 * event happens (an attack, a defend, a destroy) a click has already
 * happened.
 */

export type SoundKind = 'attack' | 'defend' | 'destroy' | 'win';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

const MUTE_KEY = 'seasonsBattle.soundMuted.v1';

/** Defaults to unmuted; wrapped in try/catch for the same reason
 * deckBuilder.ts's localStorage reads are — Vitest's Node test
 * environment (and any private-browsing mode) has no `localStorage`. */
export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Quota exceeded, private browsing, non-browser environment — losing
    // this preference silently is fine; it's a convenience, not a
    // requirement (same reasoning as deckBuilder.ts's saveCustomDeck).
  }
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  /** If set, the oscillator's frequency glides from `freq` to this value
   * over the tone's duration — an exponential ramp reads as a much more
   * natural pitch bend than a linear one for short percussive sounds. */
  glideTo?: number;
}

function tone(ctx: AudioContext, dest: AudioNode, freq: number, startTime: number, duration: number, opts: ToneOptions = {}): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  if (opts.glideTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.glideTo, startTime + duration);
  }

  const gainNode = ctx.createGain();
  const peak = opts.gain ?? 0.2;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peak, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gainNode).connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** A short burst of decaying white noise — the percussive "thwack"/"crunch"
 * component no pure tone can produce on its own. */
function noiseBurst(ctx: AudioContext, dest: AudioNode, startTime: number, duration: number, gain = 0.15): void {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(gainNode).connect(dest);
  src.start(startTime);
}

/**
 * Plays one short SFX for a game event. Every call is independent (its own
 * gain node feeding the context's destination), so overlapping events
 * (e.g. a destroy immediately following the attack that caused it) layer
 * naturally instead of cutting each other off.
 */
export function playSound(kind: SoundKind): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  const now = ctx.currentTime;

  switch (kind) {
    case 'attack':
      // A sharp descending square-wave hit plus a quick noise transient —
      // reads as a swing-and-impact rather than a single flat beep.
      tone(ctx, master, 340, now, 0.12, { type: 'square', gain: 0.25, glideTo: 120 });
      noiseBurst(ctx, master, now + 0.02, 0.08, 0.18);
      break;
    case 'defend':
      // Two-note rising sine interval — a bright, protective "shield up" cue.
      tone(ctx, master, 440, now, 0.14, { type: 'sine', gain: 0.18 });
      tone(ctx, master, 660, now + 0.06, 0.18, { type: 'sine', gain: 0.16 });
      break;
    case 'destroy':
      // A low descending sawtooth under a noise crunch — a heavier,
      // final-sounding break, distinct from the lighter attack hit.
      noiseBurst(ctx, master, now, 0.18, 0.22);
      tone(ctx, master, 180, now, 0.3, { type: 'sawtooth', gain: 0.2, glideTo: 50 });
      break;
    case 'win':
      // A short major-triad arpeggio (C5-E5-G5) — a small triumphant
      // fanfare without needing a real instrument sample.
      tone(ctx, master, 523.25, now, 0.16, { type: 'triangle', gain: 0.2 });
      tone(ctx, master, 659.25, now + 0.14, 0.16, { type: 'triangle', gain: 0.2 });
      tone(ctx, master, 783.99, now + 0.28, 0.28, { type: 'triangle', gain: 0.22 });
      break;
  }
}
