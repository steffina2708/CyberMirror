import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════════════════════
   Confetti helpers
   ═══════════════════════════════════════════════════════════ */

/** Standard badge-unlock burst from the center-bottom */
export const fireConfetti = (opts = {}) => {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    ...opts,
  });
};

/** Dramatic dual side-cannons for level-up */
export const fireLevelUpConfetti = () => {
  confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0,   y: 0.65 } });
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1,   y: 0.65 } });
  }, 150);
};

/** Gold + purple shower for rank promotions */
export const fireRankConfetti = () => {
  const colors = ['#ffd700', '#a855f7', '#00eaff', '#ffffff'];
  confetti({ particleCount: 60,  angle: 60,  spread: 70, origin: { x: 0, y: 0.5 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.5 }, colors });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.3 }, colors });
  }, 500);
};

/* ═══════════════════════════════════════════════════════════
   Web Audio API synthesized sounds   (no mp3 files needed)
   ═══════════════════════════════════════════════════════════ */

let _ctx = null;
const getAudioCtx = () => {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
};

const tone = (freq, duration, type = 'sine', vol = 0.28, delay = 0) => {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const start = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (_) { /* AudioContext may be unavailable in some environments */ }
};

/**
 * playSound(type)
 *   type: 'badge' | 'levelup' | 'rankup' | 'perfect'
 */
export const playSound = (type) => {
  switch (type) {
    /* Three ascending tones — "ding ding DING" */
    case 'badge':
      tone(880,  0.10, 'sine', 0.3, 0.00);
      tone(1100, 0.12, 'sine', 0.3, 0.12);
      tone(1320, 0.28, 'sine', 0.3, 0.26);
      break;

    /* Four-note ascending fanfare */
    case 'levelup':
      tone(440,  0.12, 'triangle', 0.32, 0.00);
      tone(550,  0.12, 'triangle', 0.32, 0.14);
      tone(660,  0.12, 'triangle', 0.32, 0.28);
      tone(880,  0.40, 'triangle', 0.32, 0.42);
      break;

    /* Grand five-note rank fanfare */
    case 'rankup':
      tone(523,  0.14, 'triangle', 0.38, 0.00);
      tone(659,  0.14, 'triangle', 0.38, 0.16);
      tone(784,  0.14, 'triangle', 0.38, 0.32);
      tone(1047, 0.14, 'triangle', 0.38, 0.48);
      tone(1319, 0.55, 'triangle', 0.38, 0.65);
      break;

    /* Quick sparkle trill */
    case 'perfect':
      [660, 880, 1100, 880, 1320, 1047].forEach((f, i) =>
        tone(f, 0.11, 'sine', 0.2, i * 0.07)
      );
      break;

    default: break;
  }
};
