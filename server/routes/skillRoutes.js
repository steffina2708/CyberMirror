'use strict';

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSkillProfile,
  recordGameAndUpdateSkill,
  getNextAdaptiveScenario,
} = require('../controllers/skillController');

// GET  /api/skill               → current skill profile
router.get('/',               protect, getSkillProfile);

// POST /api/skill/update        → record game + recalculate skill
router.post('/update',        protect, recordGameAndUpdateSkill);

// GET  /api/skill/next-scenario → AI scenario matched to skill
router.get('/next-scenario',  protect, getNextAdaptiveScenario);

module.exports = router;
