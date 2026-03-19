const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUserPerformance, getUserBadges } = require('../controllers/userController');

router.get('/performance', protect, getUserPerformance);
router.get('/badges', protect, getUserBadges);

module.exports = router;