/**
 * playerSkillAnalyzer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Intelligent Player Skill Analyzer for CyberMirror
 *
 * Analyzes player performance across five weighted dimensions and produces:
 *   • A 0–100 composite skill score
 *   • A named skill tier (Newbie → Expert Cyber Guardian)
 *   • Detected strengths and weaknesses per category
 *   • A recommended difficulty for the AI Scenario Generator
 *
 * Public API
 *   analyzePlayerSkill(playerStats)          → SkillProfile  (pure, no DB)
 *   updatePlayerSkillProfile(playerId, game) → Promise<SkillProfile>
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const User = require('../models/User');

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION — all tunable constants in one place
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Weighted formula coefficients (must sum to 1.0)
 *   accuracy            → 0.40
 *   speed               → 0.20
 *   completion rate     → 0.15
 *   difficulty perf.    → 0.15
 *   consistency         → 0.10
 */
const WEIGHTS = {
  accuracy:    0.40,
  speed:       0.20,
  completion:  0.15,
  difficulty:  0.15,
  consistency: 0.10,
};

/**
 * Skill tiers ordered from lowest to highest.
 * Each tier defines the MINIMUM skillScore required to reach it.
 */
const SKILL_TIERS = [
  {
    name:                  'Newbie Defender',
    emoji:                 '🟢',
    minScore:              0,
    maxScore:              39,
    recommendedDifficulty: 'beginner',
    description:           'Still learning the fundamentals of cybersecurity.',
  },
  {
    name:                  'Learner Defender',
    emoji:                 '🟡',
    minScore:              40,
    maxScore:              59,
    recommendedDifficulty: 'intermediate',
    description:           'Improving steadily — some weak spots remain.',
  },
  {
    name:                  'Skilled Defender',
    emoji:                 '🟠',
    minScore:              60,
    maxScore:              74,
    recommendedDifficulty: 'intermediate',
    description:           'Handles most common threats with confidence.',
  },
  {
    name:                  'Advanced Defender',
    emoji:                 '🔵',
    minScore:              75,
    maxScore:              89,
    recommendedDifficulty: 'advanced',
    description:           'Proficient across multiple attack categories.',
  },
  {
    name:                  'Expert Cyber Guardian',
    emoji:                 '🟣',
    minScore:              90,
    maxScore:              100,
    recommendedDifficulty: 'expert',
    description:           'Elite operator — masters all threat categories.',
  },
];

/**
 * Cybersecurity category labels used for strength/weakness reporting.
 * Keys map to the `categoryStats` field on the User model.
 */
const CATEGORIES = {
  phishing:          'Phishing Email Detection',
  website:           'Fake Login Page Analysis',
  ransomware:        'Ransomware Incident Response',
  socialEngineering: 'Social Engineering Awareness',
  networkDefense:    'Network Defence & Triage',
  passwordSecurity:  'Password Security Practices',
};

/**
 * Response-time thresholds (milliseconds per question).
 * Used to convert raw avg-response-time to a 0–100 speed score.
 */
const SPEED = {
  elite:   2_500,   // ≤ 2.5 s  → 100 pts
  fast:    5_000,   // ≤ 5 s    → ~80 pts
  average: 10_000,  // ≤ 10 s   → ~60 pts
  slow:    18_000,  // ≤ 18 s   → ~35 pts
  // > 18 s → low score
};

/* ═══════════════════════════════════════════════════════════════════════════
   PURE HELPER CALCULATORS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Clamp a value to [0, 100].
 * @param {number} v
 * @returns {number}
 */
const clamp100 = (v) => Math.min(100, Math.max(0, v));

/**
 * Convert average response time (ms) to a 0–100 speed score.
 * Uses a piecewise linear interpolation between defined thresholds.
 *
 * @param {number} avgMs  Average milliseconds per answer (0 = unknown)
 * @returns {number}      Speed score 0–100
 */
function calcSpeedScore(avgMs) {
  if (!avgMs || avgMs <= 0) return 50; // no data → neutral

  if (avgMs <= SPEED.elite)   return 100;
  if (avgMs <= SPEED.fast)    return lerp(100, 80, avgMs, SPEED.elite,   SPEED.fast);
  if (avgMs <= SPEED.average) return lerp(80,  60, avgMs, SPEED.fast,    SPEED.average);
  if (avgMs <= SPEED.slow)    return lerp(60,  30, avgMs, SPEED.average, SPEED.slow);
  return lerp(30, 0, avgMs, SPEED.slow, SPEED.slow * 2); // very slow → approaches 0
}

/**
 * Linear interpolation between two output values across an input range.
 * @param {number} y1   Output at x1
 * @param {number} y2   Output at x2
 * @param {number} x    Current input
 * @param {number} x1   Range start
 * @param {number} x2   Range end
 * @returns {number}
 */
function lerp(y1, y2, x, x1, x2) {
  const t = (x - x1) / (x2 - x1);
  return clamp100(y1 + (y2 - y1) * Math.min(1, Math.max(0, t)));
}

/**
 * Calculate session completion rate as a 0–100 score.
 *
 * @param {number} completed  Scenarios fully completed
 * @param {number} abandoned  Scenarios abandoned mid-way
 * @returns {number}
 */
function calcCompletionScore(completed, abandoned) {
  const total = completed + abandoned;
  if (!total) return 50; // no data → neutral
  return clamp100(Math.round((completed / total) * 100));
}

/**
 * Calculate difficulty-weighted performance score (0–100).
 * Higher difficulties are worth more weight in the final score.
 *
 * Difficulty weight multipliers:
 *   easy × 0.5 · medium × 0.75 · hard × 1.25 · expert × 2.0
 *
 * @param {object} difficultyStats  { easy, medium, hard, expert }
 *   Each entry: { played: number, won: number }
 * @returns {number}
 */
function calcDifficultyScore(difficultyStats = {}) {
  const config = {
    easy:   { weight: 0.50 },
    medium: { weight: 0.75 },
    hard:   { weight: 1.25 },
    expert: { weight: 2.00 },
  };

  let weightedSum  = 0;
  let totalWeight  = 0;

  for (const [tier, cfg] of Object.entries(config)) {
    const stats = difficultyStats[tier] || { played: 0, won: 0 };
    if (stats.played > 0) {
      const winRate    = (stats.won / stats.played) * 100;
      weightedSum     += winRate * cfg.weight;
      totalWeight     += cfg.weight;
    }
  }

  if (!totalWeight) return 50; // no data → neutral
  return clamp100(Math.round(weightedSum / totalWeight));
}

/**
 * Calculate consistency score from recent game scores (0–100).
 * A consistent player has low variance in their scores.
 *
 * Low std-dev  → high consistency → high score
 * High std-dev → erratic play    → lower score
 *
 * @param {number[]} recentScores  Array of recent scores (0–100 normalised)
 * @returns {number}
 */
function calcConsistencyScore(recentScores = []) {
  if (recentScores.length < 2) return 50; // insufficient data

  const mean   = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
  const stdDev = Math.sqrt(
    recentScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recentScores.length
  );

  // stdDev = 0  → perfect consistency → 100
  // stdDev = 50 → very erratic       → 0
  return clamp100(Math.round(100 - (stdDev / 50) * 100));
}

/**
 * Determine the SkillTier object for a given composite score.
 * @param {number} score  0–100
 * @returns {object}  SKILL_TIERS entry
 */
function resolveTier(score) {
  // Walk tiers from highest to lowest; return first match ≤ score
  for (let i = SKILL_TIERS.length - 1; i >= 0; i--) {
    if (score >= SKILL_TIERS[i].minScore) return SKILL_TIERS[i];
  }
  return SKILL_TIERS[0];
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRENGTH / WEAKNESS DETECTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Analyse per-category stats and return ranked strengths and weaknesses.
 *
 * @param {object} categoryStats
 *   { [categoryKey]: { played, won, avgResponseMs? } }
 *
 * @returns {{ strengths: string[], weaknesses: string[] }}
 *   Human-readable category labels, best/worst first.
 */
function detectStrengthsAndWeaknesses(categoryStats = {}) {
  /** @type {Array<{ key: string, winRate: number, label: string }>} */
  const ranked = [];

  for (const [key, stats] of Object.entries(categoryStats)) {
    if (!stats || stats.played < 2) continue; // not enough data
    const winRate = clamp100(Math.round((stats.won / stats.played) * 100));
    const label   = CATEGORIES[key] || key;
    ranked.push({ key, winRate, label });
  }

  if (!ranked.length) {
    return { strengths: [], weaknesses: [] };
  }

  // Sort descending by win rate
  ranked.sort((a, b) => b.winRate - a.winRate);

  const TOP_N    = 2; // return top-N in each direction
  const WEAK_THR = 55; // win rate below this → flagged as weak
  const STR_THR  = 70; // win rate above this → flagged as strong

  const strengths  = ranked.filter(r => r.winRate >= STR_THR).slice(0, TOP_N).map(r => r.label);
  const weaknesses = ranked.filter(r => r.winRate <  WEAK_THR).slice(-TOP_N).reverse().map(r => r.label);

  // Always return at least one entry if data exists
  if (!strengths.length  && ranked.length) strengths.push(ranked[0].label);
  if (!weaknesses.length && ranked.length) weaknesses.push(ranked[ranked.length - 1].label);

  return { strengths, weaknesses };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORTED FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * analyzePlayerSkill — pure calculation, no DB access.
 *
 * @param {object} playerStats
 * @param {number}  playerStats.totalAttempts          Total questions answered
 * @param {number}  playerStats.correctAnswers          Correct answers
 * @param {number}  playerStats.averageResponseTime     Avg ms per answer
 * @param {number}  playerStats.scenariosCompleted      Completed simulations
 * @param {number}  playerStats.scenariosAbandoned      Abandoned simulations
 * @param {object}  playerStats.difficultyStats         { easy, medium, hard, expert } each { played, won }
 * @param {number[]} [playerStats.recentGameScores]     Last N normalised scores
 * @param {object}  [playerStats.categoryStats]         Per-category { played, won }
 *
 * @returns {{
 *   skillScore:             number,
 *   skillTier:              string,
 *   tierEmoji:              string,
 *   tierDescription:        string,
 *   recommendedDifficulty:  string,
 *   strengths:              string[],
 *   weaknesses:             string[],
 *   breakdown: {
 *     accuracyScore:      number,
 *     speedScore:         number,
 *     completionScore:    number,
 *     difficultyScore:    number,
 *     consistencyScore:   number,
 *   }
 * }}
 */
function analyzePlayerSkill(playerStats = {}) {
  const {
    totalAttempts        = 0,
    correctAnswers       = 0,
    averageResponseTime  = 0,
    scenariosCompleted   = 0,
    scenariosAbandoned   = 0,
    difficultyStats      = {},
    recentGameScores     = [],
    categoryStats        = {},
  } = playerStats;

  /* ── 1. Accuracy (0–100) ────────────────────────────────────── */
  const accuracyScore = totalAttempts > 0
    ? clamp100(Math.round((correctAnswers / totalAttempts) * 100))
    : 50; // neutral when no data

  /* ── 2. Speed (0–100) ───────────────────────────────────────── */
  const speedScore = calcSpeedScore(averageResponseTime);

  /* ── 3. Completion rate (0–100) ─────────────────────────────── */
  const completionScore = calcCompletionScore(scenariosCompleted, scenariosAbandoned);

  /* ── 4. Difficulty-weighted performance (0–100) ─────────────── */
  const difficultyScore = calcDifficultyScore(difficultyStats);

  /* ── 5. Consistency from recent scores (0–100) ──────────────── */
  const consistencyScore = calcConsistencyScore(recentGameScores);

  /* ── Composite weighted skill score ─────────────────────────── */
  const rawScore =
    (accuracyScore    * WEIGHTS.accuracy)   +
    (speedScore       * WEIGHTS.speed)      +
    (completionScore  * WEIGHTS.completion) +
    (difficultyScore  * WEIGHTS.difficulty) +
    (consistencyScore * WEIGHTS.consistency);

  const skillScore = clamp100(Math.round(rawScore));

  /* ── Tier & difficulty recommendation ───────────────────────── */
  const tier = resolveTier(skillScore);

  /* ── Strength / weakness detection ──────────────────────────── */
  const { strengths, weaknesses } = detectStrengthsAndWeaknesses(categoryStats);

  return {
    skillScore,
    skillTier:             tier.name,
    tierEmoji:             tier.emoji,
    tierDescription:       tier.description,
    recommendedDifficulty: tier.recommendedDifficulty,
    strengths,
    weaknesses,
    breakdown: {
      accuracyScore,
      speedScore,
      completionScore,
      difficultyScore,
      consistencyScore,
    },
  };
}

/**
 * updatePlayerSkillProfile — fetches user, merges new game stats, persists.
 *
 * newGameStats shape:
 * {
 *   questionsAttempted:  number,   // questions in this session
 *   correctAnswers:      number,
 *   responseTimeMs:      number,   // avg ms for this session
 *   completed:           boolean,  // did the player finish the scenario?
 *   difficulty:          string,   // 'easy' | 'medium' | 'hard' | 'expert'
 *   won:                 boolean,  // did the player pass?
 *   scorePercent:        number,   // 0–100 normalised session score
 *   category:            string,   // e.g. 'phishing'
 * }
 *
 * @param {string} playerId   Mongoose ObjectId string
 * @param {object} newGameStats
 * @returns {Promise<object>}  The fresh SkillProfile + saved user fields
 */
async function updatePlayerSkillProfile(playerId, newGameStats = {}) {
  const user = await User.findById(playerId);
  if (!user) throw new Error(`Player not found: ${playerId}`);

  const {
    questionsAttempted = 0,
    correctAnswers:    sessionCorrect = 0,
    responseTimeMs     = 0,
    completed          = false,
    difficulty         = 'easy',
    won                = false,
    scorePercent       = 0,
    category           = null,
  } = newGameStats;

  /* ── Merge cumulative counters ──────────────────────────────── */
  const newTotalAttempts  = (user.totalAttempts  || 0) + questionsAttempted;
  const newCorrectAnswers = (user.correctAnswers || 0) + sessionCorrect;
  const newCompleted      =  user.scenariosCompleted + (completed ? 1 : 0);
  const newAbandoned      = (user.scenariosAbandoned || 0) + (completed ? 0 : 1);

  /* ── Rolling average response time (70/30 weight) ───────────── */
  const prevTime = user.averageResponseTime || 0;
  const newAvgTime = prevTime === 0
    ? responseTimeMs
    : Math.round(prevTime * 0.7 + responseTimeMs * 0.3);

  /* ── Maintain recent score history (last 10 sessions) ───────── */
  const recentScores = [...(user.recentGameScores || []), scorePercent].slice(-10);

  /* ── Difficulty stats per tier ──────────────────────────────── */
  // Read existing or initialise
  const difficultyStats = user.difficultyStats || {
    easy:   { played: 0, won: 0 },
    medium: { played: 0, won: 0 },
    hard:   { played: 0, won: 0 },
    expert: { played: 0, won: 0 },
  };

  // Normalise the incoming difficulty label
  const diffKey = difficulty === 'beginner'     ? 'easy'
                : difficulty === 'intermediate' ? 'medium'
                : difficulty;

  if (difficultyStats[diffKey]) {
    difficultyStats[diffKey].played += 1;
    if (won) difficultyStats[diffKey].won += 1;
  }

  /* ── Per-category stats ─────────────────────────────────────── */
  const categoryStats = user.categoryStats || {};

  if (category && CATEGORIES[category] !== undefined || category) {
    if (!categoryStats[category]) {
      categoryStats[category] = { played: 0, won: 0, avgResponseMs: 0 };
    }
    const cs = categoryStats[category];
    cs.played += 1;
    if (won) cs.won += 1;
    // Rolling average response time per category
    cs.avgResponseMs = cs.played === 1
      ? responseTimeMs
      : Math.round(cs.avgResponseMs * 0.7 + responseTimeMs * 0.3);
  }

  /* ── Re-run skill analysis with merged data ─────────────────── */
  const profile = analyzePlayerSkill({
    totalAttempts:       newTotalAttempts,
    correctAnswers:      newCorrectAnswers,
    averageResponseTime: newAvgTime,
    scenariosCompleted:  newCompleted,
    scenariosAbandoned:  newAbandoned,
    difficultyStats,
    recentGameScores:    recentScores,
    categoryStats,
  });

  /* ── Persist updated fields to User document ────────────────── */
  user.totalAttempts        = newTotalAttempts;
  user.correctAnswers       = newCorrectAnswers;
  user.accuracyPercentage   = profile.breakdown.accuracyScore;
  user.averageResponseTime  = newAvgTime;
  user.scenariosCompleted   = newCompleted;
  user.scenariosAbandoned   = newAbandoned;
  user.recentGameScores     = recentScores;
  user.difficultyStats      = difficultyStats;
  user.categoryStats        = categoryStats;
  user.skillScore           = profile.skillScore;
  user.skillTier            = profile.skillTier;
  // Keep adaptiveDifficulty service in sync
  user.difficultyLevel      = profile.recommendedDifficulty === 'beginner'     ? 'easy'
                            : profile.recommendedDifficulty === 'intermediate' ? 'medium'
                            : profile.recommendedDifficulty;

  await user.save();

  return {
    ...profile,
    playerId,
    updatedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  analyzePlayerSkill,
  updatePlayerSkillProfile,
  // Exposed helpers for testing and external composition
  calcSpeedScore,
  calcCompletionScore,
  calcDifficultyScore,
  calcConsistencyScore,
  detectStrengthsAndWeaknesses,
  resolveTier,
  SKILL_TIERS,
  CATEGORIES,
  WEIGHTS,
};
