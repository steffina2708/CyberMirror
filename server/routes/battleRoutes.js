const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBattleHistory, getBattleStats } = require('../controllers/battleController');

// GET /api/battle/history  — authenticated user's match history
router.get('/history', protect, getBattleHistory);

// GET /api/battle/stats    — aggregated W/L/D & XP
router.get('/stats',   protect, getBattleStats);

/* NOTE: room creation and joining are handled via Socket.IO events
   (create_invite_room / join_invite_room / start_ai_match).
   These REST stubs satisfy the spec and can be extended later.     */
router.post('/create-room', protect, (_req, res) =>
  res.json({ message: 'Send  create_invite_room  event via Socket.IO /battle namespace.' })
);
router.post('/join-room', protect, (_req, res) =>
  res.json({ message: 'Send  join_invite_room  event via Socket.IO /battle namespace.' })
);

module.exports = router;
