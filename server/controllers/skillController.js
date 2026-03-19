'use strict';

const { analyzePlayerSkill, updatePlayerSkillProfile, SKILL_TIERS } = require('../services/playerSkillAnalyzer');
const { generateScenario } = require('../services/aiScenarioService');
const User = require('../models/User');

/**
 * GET /api/skill
 * Returns the current skill profile for the authenticated user.
 * Re-computes from stored stats so it is always fresh.
 */
const getSkillProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const profile = analyzePlayerSkill({
      totalAttempts:       user.totalAttempts       || 0,
      correctAnswers:      user.correctAnswers       || 0,
      averageResponseTime: user.averageResponseTime  || 0,
      scenariosCompleted:  user.scenariosCompleted   || 0,
      scenariosAbandoned:  user.scenariosAbandoned   || 0,
      difficultyStats:     user.difficultyStats      || {},
      recentGameScores:    user.recentGameScores      || [],
      categoryStats:       user.categoryStats         || {},
    });

    res.json({
      profile,
      meta: {
        allTiers: SKILL_TIERS.map(t => ({
          name:  t.name,
          emoji: t.emoji,
          range: `${t.minScore}–${t.maxScore}`,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/skill/update
 * Called after a game session ends.
 * Merges new game stats, re-runs analysis, persists results.
 *
 * Body:
 * {
 *   questionsAttempted: number,
 *   correctAnswers:     number,
 *   responseTimeMs:     number,
 *   completed:          boolean,
 *   difficulty:         string,
 *   won:                boolean,
 *   scorePercent:       number,
 *   category:           string,
 * }
 */
const recordGameAndUpdateSkill = async (req, res, next) => {
  try {
    const profile = await updatePlayerSkillProfile(req.user._id.toString(), req.body);
    res.json({ profile });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/skill/next-scenario
 * Generates an AI scenario tuned to the player's current skill level.
 * Query param: category  'phishing' | 'website' | 'ransomware' | 'mixed' (default)
 */
const getNextAdaptiveScenario = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const skillScore = user.skillScore ?? 0;
    const category   = req.query.category ?? 'mixed';

    const scenario = generateScenario(skillScore, category);
    res.json({ scenario });
  } catch (e) {
    next(e);
  }
};

module.exports = { getSkillProfile, recordGameAndUpdateSkill, getNextAdaptiveScenario };
