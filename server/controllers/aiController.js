'use strict';

/**
 * aiController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects the Player Skill Analyzer with the AI Scenario Generator and
 * persists the resulting scenario so the existing Simulation engine can
 * play it without any frontend routing changes.
 *
 * Endpoints
 *   POST /api/ai/generate-scenario  → analyse skill, generate, persist, return
 *   POST /api/ai/session-complete   → post-game adaptive learning update
 *   GET  /api/ai/profile            → full skill breakdown + personalised tips
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Scenario    = require('../models/Scenario');
const User        = require('../models/User');
const { analyzePlayerSkill, updatePlayerSkillProfile, SKILL_TIERS } = require('../services/playerSkillAnalyzer');
const { generateScenario } = require('../services/aiScenarioService');

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Map aiScenarioService category keys → Scenario model enum values.
 * Scenario model accepts: 'phishing' | 'social-engineering' | 'fake-login' | 'malware' | 'ransomware'
 */
const CATEGORY_MAP = {
  phishing:   'phishing',
  website:    'fake-login',
  ransomware: 'ransomware',
};

/**
 * Map aiScenarioService difficulty strings → Scenario model enum values.
 * Scenario model accepts: 'easy' | 'medium' | 'hard' | 'expert'
 */
const DIFFICULTY_MAP = {
  beginner:     'easy',
  intermediate: 'medium',
  advanced:     'hard',
  expert:       'expert',
};

/**
 * Build personalised feedback tips from the player's skill profile.
 * Returns an array of 2–3 plain-English advice strings.
 *
 * @param {object} profile  Result from analyzePlayerSkill()
 * @param {object} user     Mongoose user document
 * @returns {string[]}
 */
function buildPersonalisedFeedback(profile, user) {
  const tips = [];

  // Weakness-based tips
  if (profile.weaknesses.includes('Phishing Email Detection')) {
    tips.push('💡 You frequently miss urgency-based phishing emails. Slow down and check sender domains carefully.');
  }
  if (profile.weaknesses.includes('Fake Login Page Analysis')) {
    tips.push('💡 You struggle with fake login pages. Always verify the URL in the address bar before entering credentials.');
  }
  if (profile.weaknesses.includes('Ransomware Incident Response')) {
    tips.push('💡 Your ransomware containment decisions need work. Prioritise network isolation before anything else.');
  }
  if (profile.weaknesses.includes('Social Engineering Awareness')) {
    tips.push('💡 You sometimes fall for authority-impersonation attacks. Verify requests through separate channels.');
  }

  // Speed-based tip
  if (profile.breakdown.speedScore < 40) {
    tips.push('⚡ Your response time is slow under pressure. Practice quick decision-making to improve your speed score.');
  }

  // Accuracy-based tip
  if (profile.breakdown.accuracyScore < 50) {
    tips.push('🎯 Overall accuracy below 50%. Focus on completing beginner scenarios before advancing difficulty.');
  } else if (profile.breakdown.accuracyScore >= 85) {
    tips.push('🏆 Excellent accuracy! Try expert-level scenarios to keep being challenged.');
  }

  // Consistency tip
  if (profile.breakdown.consistencyScore < 45) {
    tips.push('📊 Your performance is inconsistent. Try to maintain focus across all steps of each scenario.');
  }

  // Completion tip
  if (profile.breakdown.completionScore < 60) {
    tips.push('✅ You abandon scenarios frequently. Completing full sessions significantly boosts your skill rating.');
  }

  // Generic encouragement if no specific tips
  if (tips.length === 0) {
    tips.push(`🧠 You are performing at ${profile.skillTier} level. Keep training across all attack categories.`);
  }

  // Cap at 3 tips to avoid overwhelming the user
  return tips.slice(0, 3);
}

/**
 * Retrieve a fallback scenario from the DB when AI generation fails.
 * Picks the scenario closest to the given difficulty.
 *
 * @param {string} difficulty  'easy' | 'medium' | 'hard' | 'expert'
 * @returns {Promise<object|null>}
 */
async function getFallbackScenario(difficulty) {
  // Try exact match first, then any active scenario
  const scenario = await Scenario.findOne({ difficulty, isActive: true, isAIGenerated: false }).lean()
    || await Scenario.findOne({ isActive: true, isAIGenerated: false }).lean();
  return scenario;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTROLLER — generate
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/ai/generate-scenario
 *
 * Body: { category?: 'phishing' | 'website' | 'ransomware' | 'mixed' }
 *
 * Flow:
 *   1. Load player stats from DB
 *   2. Analyse skill profile
 *   3. Generate AI scenario (tailored to weaknesses + recommended difficulty)
 *   4. Persist scenario as a real Scenario document (isAIGenerated: true)
 *   5. Return scenario _id + full profile + personalised feedback
 *
 * Frontend uses the returned scenarioId to navigate to /simulation/:id
 * — no new routes required.
 */
const generateAIScenario = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    /* ── 1. Build stats object from user document ─────────────── */
    const playerStats = {
      totalAttempts:       user.totalAttempts       || 0,
      correctAnswers:      user.correctAnswers       || 0,
      averageResponseTime: user.averageResponseTime  || 0,
      scenariosCompleted:  user.scenariosCompleted   || 0,
      scenariosAbandoned:  user.scenariosAbandoned   || 0,
      difficultyStats:     user.difficultyStats      || {},
      recentGameScores:    user.recentGameScores      || [],
      categoryStats:       user.categoryStats         || {},
    };

    /* ── 2. Analyse skill ──────────────────────────────────────── */
    const skillProfile = analyzePlayerSkill(playerStats);

    /* ── 3. Resolve category ───────────────────────────────────── */
    const rawCategory = req.body?.category || 'mixed';

    // If the player has weaknesses, bias toward their weakest category
    let targetCategory = rawCategory;
    if (rawCategory === 'mixed' && skillProfile.weaknesses.length > 0) {
      const weakLabel = skillProfile.weaknesses[0];
      if (weakLabel.includes('Phishing'))   targetCategory = 'phishing';
      if (weakLabel.includes('Fake Login')) targetCategory = 'website';
      if (weakLabel.includes('Ransomware')) targetCategory = 'ransomware';
      // re-set to 'mixed' if no match found (targetCategory stays mixed)
      if (targetCategory === 'mixed') targetCategory = rawCategory;
    }

    /* ── 4. Generate scenario via AI engine ────────────────────── */
    let generated;
    let isFallback = false;

    try {
      generated = generateScenario(skillProfile.skillScore, targetCategory);
    } catch (genErr) {
      console.error('[AI] Generation failed, using DB fallback:', genErr.message);
      // Fallback: return a real DB scenario so UX never breaks
      const fallback = await getFallbackScenario(DIFFICULTY_MAP[skillProfile.recommendedDifficulty] || 'easy');
      if (!fallback) {
        return res.status(503).json({ message: 'AI scenario generation failed and no fallback scenario is available.' });
      }
      return res.json({
        scenarioId:      fallback._id,
        scenario:        fallback,
        skillProfile,
        personalisedFeedback: buildPersonalisedFeedback(skillProfile, user),
        isAIGenerated:   false,
        isFallback:      true,
      });
    }

    /* ── 5. Persist scenario to DB ─────────────────────────────── */
    const dbCategory   = CATEGORY_MAP[generated.category]       || 'phishing';
    const dbDifficulty = DIFFICULTY_MAP[generated.difficulty]    || 'easy';

    const scenarioDoc = await Scenario.create({
      title:         generated.title,
      description:   generated.description,
      category:      dbCategory,
      difficulty:    dbDifficulty,
      points:        generated.points,
      steps:         generated.steps,
      isActive:      true,
      isAIGenerated: true,
      aiMetadata: {
        generatedForUser:     user._id.toString(),
        skillScore:           skillProfile.skillScore,
        skillTier:            skillProfile.skillTier,
        targetCategory:       targetCategory,
        attacker:             generated.metadata?.attacker || null,
        generatedAt:          new Date().toISOString(),
      },
    });

    /* ── 6. Return ─────────────────────────────────────────────── */
    res.status(201).json({
      scenarioId:           scenarioDoc._id,
      scenario:             scenarioDoc,
      skillProfile,
      personalisedFeedback: buildPersonalisedFeedback(skillProfile, user),
      isAIGenerated:        true,
      isFallback:           false,
    });
  } catch (e) {
    next(e);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTROLLER — adaptive learning update
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/ai/session-complete
 *
 * Called by the frontend after an AI scenario session ends.
 * Runs the full adaptive learning update cycle:
 *   recalculate skill → persist → return updated profile + new tips
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
const completeAISession = async (req, res, next) => {
  try {
    const updatedProfile = await updatePlayerSkillProfile(req.user._id.toString(), req.body);

    const user = await User.findById(req.user._id).lean();
    const tips  = buildPersonalisedFeedback(updatedProfile, user || {});

    res.json({
      profile:              updatedProfile,
      personalisedFeedback: tips,
      message:              `Skill updated. You are now: ${updatedProfile.skillTier} (${updatedProfile.skillScore}/100)`,
    });
  } catch (e) {
    next(e);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTROLLER — profile overview
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/ai/profile
 *
 * Returns a rich skill profile including:
 *   - current tier + score + breakdown
 *   - strengths / weaknesses
 *   - personalised tips
 *   - all tier definitions (for progress UI)
 *   - next recommended scenario category
 */
const getAIProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
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

    // Calculate progress to next tier
    const currentTierIdx = SKILL_TIERS.findIndex(t => t.name === profile.skillTier);
    const nextTier        = SKILL_TIERS[currentTierIdx + 1] || null;
    const progressToNext  = nextTier
      ? Math.round(((profile.skillScore - SKILL_TIERS[currentTierIdx].minScore)
          / (nextTier.minScore - SKILL_TIERS[currentTierIdx].minScore)) * 100)
      : 100;

    res.json({
      profile,
      personalisedFeedback: buildPersonalisedFeedback(profile, user),
      progression: {
        currentTier:     profile.skillTier,
        nextTier:        nextTier?.name || null,
        progressToNext:  Math.min(100, Math.max(0, progressToNext)),
      },
      allTiers: SKILL_TIERS.map(t => ({
        name:        t.name,
        emoji:       t.emoji,
        range:       `${t.minScore}–${t.maxScore}`,
        description: t.description,
        isCurrent:   t.name === profile.skillTier,
      })),
    });
  } catch (e) {
    next(e);
  }
};

module.exports = { generateAIScenario, completeAISession, getAIProfile };
