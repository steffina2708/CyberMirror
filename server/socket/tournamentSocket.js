/* ═══════════════════════════════════════════════════════════════
   tournamentSocket.js — Real-time tournament event layer
   Namespace: /tournament
   ═══════════════════════════════════════════════════════════════
   Events client → server:
     tournament_lobby_join   { tournamentId }
     tournament_lobby_leave  { tournamentId }

   Events server → client:
     tournament_update       { tournamentId, status, currentRound, participantCount }
     match_ready             { matchId, tournamentId, roundNumber, opponent,
                               question, totalQuestions, durationMs }
     tournament_completed    { tournamentId, winnerUsername, finalScores }
     bracket_updated         { tournamentId, rounds }
   ═══════════════════════════════════════════════════════════════ */

let Tournament, TournamentMatch;
try { Tournament      = require('../models/Tournament'); }      catch { Tournament = null; }
try { TournamentMatch = require('../models/TournamentMatch'); } catch { TournamentMatch = null; }

const initTournamentServer = (io) => {
  const tNS = io.of('/tournament');

  tNS.on('connection', (socket) => {

    /* ── Join tournament lobby room to receive updates ──────── */
    socket.on('tournament_lobby_join', ({ tournamentId } = {}) => {
      if (tournamentId) socket.join(`t:${tournamentId}`);
    });

    socket.on('tournament_lobby_leave', ({ tournamentId } = {}) => {
      if (tournamentId) socket.leave(`t:${tournamentId}`);
    });
  });

  /* ── Public broadcast helpers (used by controller/cron) ──── */
  tNS.broadcastTournamentUpdate = (tournamentId, payload) => {
    tNS.to(`t:${tournamentId}`).emit('tournament_update', payload);
  };

  tNS.broadcastBracketUpdate = (tournamentId, rounds) => {
    tNS.to(`t:${tournamentId}`).emit('bracket_updated', { tournamentId, rounds });
  };

  tNS.broadcastTournamentComplete = (tournamentId, payload) => {
    tNS.to(`t:${tournamentId}`).emit('tournament_completed', payload);
  };

  tNS.notifyMatchReady = (socketId, payload) => {
    tNS.to(socketId).emit('match_ready', payload);
  };
};

module.exports = { initTournamentServer };
