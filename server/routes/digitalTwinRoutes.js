const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveResult, getHistory } = require('../controllers/digitalTwinController');

router.post('/save',    protect, saveResult);
router.get('/history',  protect, getHistory);

module.exports = router;
