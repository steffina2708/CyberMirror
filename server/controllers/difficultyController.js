const User = require('../models/User');
const { calculateDifficulty, applyDifficultyUpdate } = require('../services/adaptiveDifficulty');

/* ── GET /api/difficulty
   Returns the authenticated user's current difficulty level and
   the stats that drove that calculation.                         */
const getDifficulty = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'difficultyLevel accuracyPercentage correctAnswersStreak averageResponseTime recentGameScores'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { level, reason } = calculateDifficulty(user);

    res.json({
      level:               level,
      accuracyPercentage:  user.accuracyPercentage  || 0,
      streak:              user.correctAnswersStreak || 0,
      avgResponseTimeMs:   user.averageResponseTime  || 0,
      recentScores:        user.recentGameScores      || [],
      reason,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch difficulty', error: err.message });
  }
};

/* ── POST /api/difficulty/update
   Called after each game/lab completion.
   Body: { accuracy, responseTimeMs, scorePercent, won }         */
const updateDifficulty = async (req, res) => {
  try {
    const { accuracy = 0, responseTimeMs = 0, scorePercent = 0, won = false } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    applyDifficultyUpdate(user, { accuracy, responseTimeMs, scorePercent, won });
    await user.save();

    res.json({
      level:              user.difficultyLevel,
      accuracyPercentage: user.accuracyPercentage,
      streak:             user.correctAnswersStreak,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update difficulty', error: err.message });
  }
};

module.exports = { getDifficulty, updateDifficulty };
