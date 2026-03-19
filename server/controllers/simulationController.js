const Scenario    = require('../models/Scenario');
const SimulationResult = require('../models/SimulationResult');
const User = require('../models/User');
const scoringEngine = require('../services/scoringEngine');
const { generateScenario } = require('../services/aiScenarioService');
const { updatePlayerSkillProfile } = require('../services/playerSkillAnalyzer');

// ─── AI Scenario Generator ───────────────────────────────────────────────────

/**
 * GET /api/simulations/scenarios/generate
 * Query params:
 *   skill    {number|string}  0-100 or 'beginner'|'intermediate'|'advanced'|'expert'
 *   category {string}         'phishing' | 'website' | 'ransomware' | 'mixed' (default)
 *
 * Returns a freshly generated scenario. Does NOT persist to DB by default.
 * Pass ?save=true to persist it as an active Scenario document.
 */
const generateAiScenario = async (req, res, next) => {
  try {
    const skill    = req.query.skill    ?? req.user?.difficultyLevel ?? 0;
    const category = req.query.category ?? 'mixed';
    const save     = req.query.save === 'true';

    const generated = generateScenario(skill, category);

    if (save) {
      // Persist so it appears in the normal scenario list
      const doc = await Scenario.create({
        title:       generated.title,
        description: generated.description,
        category:    generated.category,
        difficulty:  generated.difficulty,
        points:      generated.points,
        steps:       generated.steps,
        isActive:    true,
        isGenerated: true,   // custom flag — add to schema if needed
        metadata:    generated.metadata,
      });
      return res.status(201).json({ scenario: doc, generated: true });
    }

    res.json({ scenario: generated, generated: true });
  } catch (e) {
    next(e);
  }
};

// ─── Utility ──────────────────────────────────────────────────────────────────

const ownsSession = (session, userId) =>
  session.user.toString() === userId.toString();

// ─── Scenarios ────────────────────────────────────────────────────────────────

const getAllScenarios = async (req, res, next) => {
  try {
    const scenarios = await Scenario.find({ isActive: true })
      .select('-steps.choices.isCorrect -steps.choices.explanation -steps.choices.feedback');

    res.json({ scenarios });
  } catch (e) {
    next(e);
  }
};

const getScenarioById = async (req, res, next) => {
  try {
    const scenario = await Scenario.findById(req.params.id);

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found.' });
    }
    if (!scenario.steps?.length) {
      return res.status(422).json({ message: 'Scenario has no steps configured.' });
    }

    res.json({ scenario });
  } catch (e) {
    next(e);
  }
};

// ─── Session Lifecycle ────────────────────────────────────────────────────────

const startSession = async (req, res, next) => {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) {
      return res.status(400).json({ message: 'scenarioId is required.' });
    }

    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found.' });
    }

    const session = await SimulationResult.create({
      user: req.user._id,
      scenario: scenarioId,
      scenarioTitle: scenario.title,
      category: scenario.category,
      totalSteps: scenario.steps.length,
      maxScore: scenario.maxScore,
    });

    res.status(201).json({ session });
  } catch (e) {
    next(e);
  }
};

const submitDecision = async (req, res, next) => {
  try {
    const { sessionId, stepIndex, choiceIndex } = req.body;

    if (sessionId === undefined || stepIndex === undefined || choiceIndex === undefined) {
      return res.status(400).json({ message: 'sessionId, stepIndex, and choiceIndex are required.' });
    }

    const session = await SimulationResult.findById(sessionId);
    if (!session || !ownsSession(session, req.user._id)) {
      return res.status(403).json({ message: 'Session not found or access denied.' });
    }

    const scenario = await Scenario.findById(session.scenario);
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found.' });
    }

    const si = Number(stepIndex);
    const ci = Number(choiceIndex);

    if (!Number.isInteger(si) || si < 0 || si >= scenario.steps.length) {
      return res.status(400).json({ message: 'stepIndex is out of range.' });
    }

    const step = scenario.steps[si];
    if (!Array.isArray(step?.choices) || step.choices.length === 0) {
      return res.status(422).json({ message: 'Step has no choices configured.' });
    }

    if (!Number.isInteger(ci) || ci < 0 || ci >= step.choices.length) {
      return res.status(400).json({ message: 'choiceIndex is out of range.' });
    }

    const choice = step.choices[ci];
    const isCorrect = Boolean(choice.isCorrect);
    const pointsEarned = isCorrect ? Number(choice.points ?? 20) : 0;
    const feedback = choice.feedback || choice.explanation || '';

    session.decisions.push({ stepIndex: si, choiceIndex: ci, isCorrect, pointsEarned });
    session.score += pointsEarned;
    if (isCorrect) session.correctAnswers += 1;
    await session.save();

    res.json({ isCorrect, pointsEarned, feedback });
  } catch (e) {
    next(e);
  }
};

const completeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required.' });
    }

    const session = await SimulationResult.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    session.status = 'completed';
    session.passed = session.maxScore > 0 && (session.score / session.maxScore) >= 0.6;
    session.completedAt = new Date();

    const user = await User.findById(session.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Accumulate stats — totalAnswers tracks every step answered across all sessions
    user.totalScore += session.score;
    user.scenariosCompleted += 1;
    user.correctAnswers += session.correctAnswers;
    user.totalAnswers = (user.totalAnswers || 0) + (session.totalSteps || 1);
    user.totalAttempts = (user.totalAttempts || 0) + 1;
    user.accuracyPercentage = user.totalAnswers > 0
      ? Math.min(Math.round((user.correctAnswers / user.totalAnswers) * 100), 100)
      : 0;
    user.level = scoringEngine.calculateLevel(user.totalScore);

    const newBadges = await scoringEngine.checkBadges(user);
    if (newBadges.length > 0) {
      user.badges.push(...newBadges.map(b => b._id));
      session.newBadges = newBadges.map(b => b._id);
    }

    // Flush all writes in parallel
    await Promise.all([
      user.save(),
      session.save(),
      Scenario.findByIdAndUpdate(session.scenario, { $inc: { timesPlayed: 1 } }),
    ]);

    // Adaptive learning: silently update skill profile when an AI scenario is completed
    // Fire-and-forget — do not block the response if it fails
    try {
      const scenarioDoc = await Scenario.findById(session.scenario).lean();
      if (scenarioDoc?.isAIGenerated) {
        const totalSteps  = session.totalSteps || 1;
        const scorePercent = session.maxScore > 0
          ? Math.round((session.score / session.maxScore) * 100) : 0;
        await updatePlayerSkillProfile(user._id.toString(), {
          questionsAttempted: totalSteps,
          correctAnswers:     session.correctAnswers || 0,
          responseTimeMs:     user.averageResponseTime || 0,
          completed:          true,
          difficulty:         scenarioDoc.difficulty,
          won:                session.passed,
          scorePercent,
          category:           scenarioDoc.category,
        });
      }
    } catch (skillErr) {
      console.error('[Adaptive] Skill update failed (non-fatal):', skillErr.message);
    }

    // Return updated user stats so frontend can sync without a separate fetch
    const userStats = {
      _id: user._id,
      username: user.username,
      email: user.email,
      level: user.level,
      totalScore: user.totalScore,
      totalAttempts: user.totalAttempts,
      accuracyPercentage: user.accuracyPercentage,
      scenariosCompleted: user.scenariosCompleted,
      avatar: user.avatar,
    };

    res.json({ session, newBadges, user: userStats });
  } catch (e) {
    next(e);
  }
};

// ─── Results & History ────────────────────────────────────────────────────────

const getSessionResult = async (req, res, next) => {
  try {
    const result = await SimulationResult.findById(req.params.sessionId)
      .populate('newBadges', 'name icon description');

    if (!result) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!ownsSession(result, req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ result });
  } catch (e) {
    next(e);
  }
};

const getSimulationHistory = async (req, res, next) => {
  try {
    const history = await SimulationResult.find({ user: req.user._id, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(20)
      .select('scenarioTitle category score maxScore passed completedAt')
      .lean();

    res.json({ history });
  } catch (e) {
    next(e);
  }
};

// ─── Legacy Single-Answer Endpoint (route: POST /answer) ─────────────────────

const submitAnswer = async (req, res, next) => {
  try {
    const { scenarioId, selectedOption } = req.body;

    if (!scenarioId) {
      return res.status(400).json({ message: 'scenarioId is required.' });
    }

    const ci = Number(selectedOption);
    if (!Number.isInteger(ci) || ci < 0) {
      return res.status(400).json({ message: 'selectedOption must be a non-negative integer.' });
    }

    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found.' });
    }

    const choices = scenario.steps?.[0]?.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      return res.status(422).json({ message: 'Scenario has no choices configured.' });
    }
    if (ci >= choices.length) {
      return res.status(400).json({ message: 'selectedOption is out of range.' });
    }

    const choice = choices[ci];
    const correct = Boolean(choice?.isCorrect);
    const pointsEarned = correct ? Number(choice?.points ?? 20) : 0;

    // Create result record and fetch user in parallel
    const [, user] = await Promise.all([
      SimulationResult.create({
        user: req.user._id,
        scenario: scenario._id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        score: pointsEarned,
        maxScore: Number(choice?.points ?? 20),
        correctAnswers: correct ? 1 : 0,
        totalSteps: 1,
        decisions: [{ stepIndex: 0, choiceIndex: ci, isCorrect: correct, pointsEarned }],
        passed: correct,
        status: 'completed',
        completedAt: new Date(),
      }),
      User.findById(req.user._id),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.totalScore += pointsEarned;
    user.totalAnswers = (user.totalAnswers || 0) + 1;
    if (correct) user.correctAnswers += 1;
    await user.save();

    res.status(201).json({ correct, pointsEarned, totalScore: user.totalScore });
  } catch (e) {
    next(e);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateAiScenario,
  getAllScenarios,
  getScenarioById,
  startSession,
  submitAnswer,
  submitDecision,
  completeSession,
  getSessionResult,
  getSimulationHistory,
};
