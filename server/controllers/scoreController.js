const User = require('../models/User');
const Badge = require('../models/Badge');

const getUserScore = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      totalScore: user.totalScore,
      level: user.level,
      scenariosCompleted: user.scenariosCompleted,
      winRate: user.winRate,
      correctAnswers: user.correctAnswers,
      totalAnswers: user.totalAnswers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('username totalScore level scenariosCompleted correctAnswers totalAnswers')
      .sort({ totalScore: -1 })
      .limit(50);

    const leaderboard = users.map(u => ({
      _id: u._id,
      username: u.username,
      totalScore: u.totalScore,
      level: u.level,
      scenariosCompleted: u.scenariosCompleted,
      winRate: u.totalAnswers ? Math.round((u.correctAnswers / u.totalAnswers) * 100) : 0,
    }));

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserBadges = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('badges');
    res.json({ badges: user.badges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUserScore, getLeaderboard, getUserBadges };
