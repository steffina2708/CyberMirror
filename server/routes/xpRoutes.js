const express = require('express');
const router  = express.Router();
const { awardXP, getProgress } = require('../controllers/xpController');
const { protect } = require('../middleware/authMiddleware');

router.post('/award',    protect, awardXP);
router.get('/progress',  protect, getProgress);

module.exports = router;
