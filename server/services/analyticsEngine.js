const SimulationResult = require('../models/SimulationResult');

const getUserAnalytics = async (userId) => {
  const results = await SimulationResult.find({ user: userId, status: 'completed' });

  const byCategory = {};
  results.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, passed: 0, score: 0 };
    byCategory[r.category].total += 1;
    if (r.passed) byCategory[r.category].passed += 1;
    byCategory[r.category].score += r.score;
  });

  const weakCategory = Object.entries(byCategory).sort((a, b) => {
    const rateA = a[1].passed / a[1].total;
    const rateB = b[1].passed / b[1].total;
    return rateA - rateB;
  })[0]?.[0] || null;

  return { byCategory, weakCategory, totalSessions: results.length };
};

module.exports = { getUserAnalytics };
