/* ═══════════════════════════════════════════════════════════════
   TournamentMatch.js — individual bracket match record
   ═══════════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');

const playerSlotSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, default: 'TBD' },
  score:    { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  isBye:    { type: Boolean, default: false },  // advance without opponent
}, { _id: false });

const tournamentMatchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  roundNumber:  { type: Number, required: true },
  matchNumber:  { type: Number, required: true },   // position within the round
  bracketSlot:  { type: String },                   // e.g. "R2-M3" for display

  player1: { type: playerSlotSchema, default: () => ({}) },
  player2: { type: playerSlotSchema, default: () => ({}) },

  winnerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  winnerUsername: { type: String, default: null },

  status: {
    type: String,
    enum: ['pending', 'ready', 'live', 'completed', 'bye', 'walkover'],
    default: 'pending',
  },

  /* Socket room used for this specific match */
  battleRoomId: { type: String, default: null },

  /* Anti-cheat: server-recorded times */
  startedAt:    { type: Date },
  completedAt:  { type: Date },
  durationMs:   { type: Number, default: 0 },

  /* Link to raw BattleRoom document if played via PvP engine */
  battleRoomRef: { type: mongoose.Schema.Types.ObjectId, ref: 'BattleRoom', default: null },

  /* XP awarded this match */
  winnerXP:  { type: Number, default: 0 },
  loserXP:   { type: Number, default: 0 },
}, { timestamps: true });

/* Compound index to fetch all matches in a tournament round quickly */
tournamentMatchSchema.index({ tournamentId: 1, roundNumber: 1 });

module.exports = mongoose.model('TournamentMatch', tournamentMatchSchema);
