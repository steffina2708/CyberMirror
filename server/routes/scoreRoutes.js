const express = require('express');
const router = express.Router();
const { getUserScore, getLeaderboard, getUserBadges } = require('../controllers/scoreController');
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, getUserScore);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/badges', protect, getUserBadges);

module.exports = router;
