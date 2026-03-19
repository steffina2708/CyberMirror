const express = require('express');
const router = express.Router();
const { getAllScenarios, getScenarioById } = require('../controllers/simulationController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/scenarios
router.get('/', protect, getAllScenarios);

// GET /api/scenarios/:id
router.get('/:id', protect, getScenarioById);

module.exports = router;
