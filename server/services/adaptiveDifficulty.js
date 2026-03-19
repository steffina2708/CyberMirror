/* ═══════════════════════════════════════════════════════════════
   Adaptive Difficulty Engine
   Calculates the ideal difficulty tier for a player based on:
     • accuracy percentage
     • recent game score trend
     • correct-answer streak
     • average response time
   ═══════════════════════════════════════════════════════════════ */

const TIERS = ['easy', 'medium', 'hard', 'expert'];

/**
 * clamp — keep difficulty within valid tier range
 */
const clampTier = (idx) => TIERS[Math.min(TIERS.length - 1, Math.max(0, idx))];

/**
 * calculateDifficulty(user)
 * Returns { level, reason } where level is one of TIERS.
 */
const calculateDifficulty = (user) => {
  const accuracy   = user.accuracyPercentage  || 0;
  const streak     = user.correctAnswersStreak || 0;
  const avgTime    = user.averageResponseTime  || 0;   // ms per answer
  const scores     = (user.recentGameScores    || []).slice(-5);

  /* ── Base tier from accuracy ─────────────────────────────── */
  let tierIdx;
  if      (accuracy < 50) tierIdx = 0;          // easy
  else if (accuracy < 70) tierIdx = 1;          // medium
  else if (accuracy < 85) tierIdx = 2;          // hard
  else                    tierIdx = 3;          // expert

  const reasons = [`accuracy ${accuracy.toFixed(0)}% → base tier: ${TIERS[tierIdx]}`];

  /* ── Streak adjustment ───────────────────────────────────── */
  if (streak >= 5) {
    tierIdx += 1;
    reasons.push(`+1 tier (win streak ${streak})`);
  } else if (streak <= -3) {
    tierIdx -= 1;
    reasons.push(`-1 tier (loss streak ${Math.abs(streak)})`);
  }

  /* ── Response time adjustment ────────────────────────────── */
  // Fast answers (< 3 s avg) suggest the player is not being challenged
  if (avgTime > 0 && avgTime < 3000 && tierIdx < 3) {
    tierIdx += 1;
    reasons.push(`+1 tier (fast responses ${(avgTime/1000).toFixed(1)}s avg)`);
  }
  // Very slow answers (> 12 s) suggest player is struggling
  if (avgTime > 12000 && tierIdx > 0) {
    tierIdx -= 1;
    reasons.push(`-1 tier (slow responses ${(avgTime/1000).toFixed(1)}s avg)`);
  }

  /* ── Recent score trend ──────────────────────────────────── */
  if (scores.length >= 3) {
    const avg   = scores.reduce((s, v) => s + v, 0) / scores.length;
    const first = scores.slice(0, 2).reduce((s, v) => s + v, 0) / 2;
    const last  = scores.slice(-2).reduce((s, v) => s + v, 0) / 2;
    // Consistently improving trend
    if (last > first * 1.2 && avg > 70) {
      tierIdx += 1;
      reasons.push('+1 tier (improving score trend)');
    }
    // Declining trend
    if (last < first * 0.8 && avg < 50) {
      tierIdx -= 1;
      reasons.push('-1 tier (declining score trend)');
    }
  }

  const level = clampTier(tierIdx);
  return { level, reason: reasons.join('; ') };
};

/**
 * getRecommendedDifficulty(user)
 * Accepts the full Mongoose user doc, returns new level string.
 */
const getRecommendedDifficulty = (user) => calculateDifficulty(user).level;

/**
 * applyDifficultyUpdate(user, gameResult)
 * Mutates user fields in-place based on a completed game result.
 * gameResult: { accuracy, responseTimeMs, scorePercent, won }
 */
const applyDifficultyUpdate = (user, gameResult) => {
  const { accuracy = 0, responseTimeMs = 0, scorePercent = 0, won = false } = gameResult;

  // Update accuracy (rolling average weighted 70/30)
  user.accuracyPercentage = Math.round(
    user.accuracyPercentage * 0.7 + accuracy * 0.3
  );

  // Update average response time (rolling average)
  if (responseTimeMs > 0) {
    user.averageResponseTime = Math.round(
      (user.averageResponseTime || responseTimeMs) * 0.7 + responseTimeMs * 0.3
    );
  }

  // Streak: +1 for win, reset to negative if loss
  if (won) {
    user.correctAnswersStreak = (user.correctAnswersStreak || 0) + 1;
  } else {
    user.correctAnswersStreak = Math.min(0, (user.correctAnswersStreak || 0) - 1);
  }

  // Append to recent scores (keep last 10)
  user.recentGameScores = [...(user.recentGameScores || []), scorePercent].slice(-10);

  // Recalculate and persist difficulty
  const { level } = calculateDifficulty(user);
  user.difficultyLevel = level;
};

module.exports = { getRecommendedDifficulty, calculateDifficulty, applyDifficultyUpdate };

