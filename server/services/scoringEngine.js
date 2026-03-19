const Badge = require('../models/Badge');

const calculateLevel = (totalScore) => {
  if (totalScore >= 5000) return 10;
  if (totalScore >= 3000) return 8;
  if (totalScore >= 2000) return 7;
  if (totalScore >= 1200) return 6;
  if (totalScore >= 700) return 5;
  if (totalScore >= 400) return 4;
  if (totalScore >= 200) return 3;
  if (totalScore >= 100) return 2;
  return 1;
};

const checkBadges = async (user) => {
  try {
    const allBadges = await Badge.find();
    const earned = [];

    for (const badge of allBadges) {
      if (user.badges.some(b => b.toString() === badge._id.toString())) continue;

      const { type, value, category } = badge.condition;

      let qualified = false;
      if (type === 'score' && user.totalScore >= value) qualified = true;
      if (type === 'scenarios' && user.scenariosCompleted >= value) qualified = true;
      if (type === 'accuracy' && user.winRate >= value) qualified = true;

      if (qualified) earned.push(badge);
    }

    return earned;
  } catch {
    return [];
  }
};

const calculateAdaptiveDifficulty = (userWinRate) => {
  if (userWinRate >= 80) return 'hard';
  if (userWinRate >= 60) return 'medium';
  return 'easy';
};

module.exports = { calculateLevel, checkBadges, calculateAdaptiveDifficulty };
