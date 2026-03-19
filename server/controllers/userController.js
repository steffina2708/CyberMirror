const User = require('../models/User');


// ==============================
// GET USER PERFORMANCE
// ==============================
const getUserPerformance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('totalScore totalAttempts correctAnswers accuracyPercentage level');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      performance: {
        totalScore: user.totalScore,
        totalAttempts: user.totalAttempts,
        correctAnswers: user.correctAnswers,
        accuracyPercentage: user.accuracyPercentage,
        level: user.level,
      },
    });

  } catch (error) {
    next(error);
  }
};


// ==============================
// GET USER BADGES
// ==============================
const getUserBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('badges', 'name icon description');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      badges: user.badges || []
    });

  } catch (error) {
    next(error);
  }
};


module.exports = {
  getUserPerformance,
  getUserBadges,
};