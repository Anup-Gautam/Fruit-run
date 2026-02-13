/**
 * Simple procedural sound effects using Web Audio API.
 * No external audio files required.
 */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15
): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    // Ignore audio errors (e.g. autoplay policy)
  }
}

export function playGameStart(): void {
  playTone(523, 80, 'sine', 0.12);
  setTimeout(() => playTone(659, 80, 'sine', 0.12), 90);
  setTimeout(() => playTone(784, 120, 'sine', 0.12), 180);
}

export function playSnakeEats(): void {
  playTone(220, 100, 'square', 0.08);
  setTimeout(() => playTone(180, 120, 'square', 0.06), 80);
}

export function playPlayerEats(): void {
  playTone(880, 60, 'sine', 0.1);
  setTimeout(() => playTone(1100, 80, 'sine', 0.08), 50);
}

export function playGameEnd(isWin: boolean): void {
  if (isWin) {
    playTone(523, 120, 'sine', 0.12);
    setTimeout(() => playTone(659, 120, 'sine', 0.12), 130);
    setTimeout(() => playTone(784, 120, 'sine', 0.12), 260);
    setTimeout(() => playTone(1047, 250, 'sine', 0.1), 390);
  } else {
    playTone(200, 150, 'sawtooth', 0.1);
    setTimeout(() => playTone(160, 200, 'sawtooth', 0.08), 120);
  }
}
