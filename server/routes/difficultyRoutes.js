const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDifficulty, updateDifficulty } = require('../controllers/difficultyController');

router.get('/',        protect, getDifficulty);
router.post('/update', protect, updateDifficulty);

module.exports = router;
