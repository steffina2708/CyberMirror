'use strict';

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateAIScenario, completeAISession, getAIProfile } = require('../controllers/aiController');

// POST /api/ai/generate-scenario  → analyse player + generate + persist → returns scenarioId
router.post('/generate-scenario', protect, generateAIScenario);

// POST /api/ai/session-complete   → adaptive learning update after AI session ends
router.post('/session-complete',  protect, completeAISession);

// GET  /api/ai/profile            → full skill profile + tips + tier progression
router.get('/profile',            protect, getAIProfile);

module.exports = router;
