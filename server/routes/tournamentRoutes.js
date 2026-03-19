const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getActiveTournaments,
  getAllTournaments,
  getTournament,
  joinTournament,
  leaveTournament,
  generateBracketEndpoint,
  getBracket,
  completeMatch,
  getGlobalRankings,
  getMyTournamentHistory,
  createTournament,
  getMyMatches,
} = require('../controllers/tournamentController');

/* Public (auth still used for personalisation) */
router.get('/active',           protect, getActiveTournaments);
router.get('/all',              protect, getAllTournaments);
router.get('/global-rankings',  protect, getGlobalRankings);
router.get('/my-history',       protect, getMyTournamentHistory);
router.get('/brackets/:id',     protect, getBracket);
router.get('/:id/my-matches',   protect, getMyMatches);
router.get('/:id',              protect, getTournament);

/* Authenticated mutations */
router.post('/join',            protect, joinTournament);
router.post('/leave',           protect, leaveTournament);
router.post('/',                protect, createTournament);     // admin

/* Admin / cron */
router.post('/:id/generate-bracket', protect, generateBracketEndpoint);
router.post('/match/:matchId/complete', protect, completeMatch);

module.exports = router;
