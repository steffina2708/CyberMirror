const User = require('../models/User');

const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ totalScore: -1 })
      .limit(10);

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      _id: u._id,
      username: u.username,
      totalScore: u.totalScore,
      totalXP: u.totalXP || 0,
      level: u.level || 1,
      scenariosCompleted: u.scenariosCompleted || 0,
      gamesCompleted: u.gamesCompleted || 0,
      labsCompleted: u.labsCompleted || 0,
      earnedBadges: u.earnedBadges || [],
      avatar: u.avatar || '',
    }));

    res.json({ leaderboard });
  } catch (err) {
    err.statusCode = 500;
    err.message = 'Failed to load leaderboard';
    next(err);
  }
};

module.exports = { getLeaderboard };
