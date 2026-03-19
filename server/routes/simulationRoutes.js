const express = require('express');
const router = express.Router();
const {
  getAllScenarios, getScenarioById, startSession,
  submitAnswer, submitDecision, completeSession, getSessionResult, getSimulationHistory,
  generateAiScenario,
} = require('../controllers/simulationController');
const { protect } = require('../middleware/authMiddleware');

// AI-generated scenario — must be declared before '/scenarios/:id' to avoid route shadowing
router.get('/scenarios/generate', protect, generateAiScenario);

router.get('/scenarios', protect, getAllScenarios);
router.get('/scenarios/:id', protect, getScenarioById);
router.post('/start', protect, startSession);
router.post('/answer', protect, submitAnswer);
router.post('/decision', protect, submitDecision);
router.post('/complete', protect, completeSession);
router.get('/results/:sessionId', protect, getSessionResult);
router.get('/history', protect, getSimulationHistory);

module.exports = router;
