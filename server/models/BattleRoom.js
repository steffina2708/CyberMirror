/* ═══════════════════════════════════════════════════════════════
   BattleRoom — persistent record of every completed PvP match
   ═══════════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');

const playerResultSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:     { type: String, required: true },
  score:        { type: Number, default: 0 },
  accuracy:     { type: Number, default: 0 },    // 0–100 %
  avgResponseMs:{ type: Number, default: 0 },
  totalAnswered:{ type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  outcome:      { type: String, enum: ['win', 'loss', 'draw', 'disconnect'], default: 'loss' },
  isAI:         { type: Boolean, default: false },
  xpEarned:     { type: Number, default: 0 },
}, { _id: false });

const battleRoomSchema = new mongoose.Schema({
  roomId:         { type: String, required: true, unique: true },
  mode:           { type: String, enum: ['quick', 'invite', 'ai'], default: 'quick' },
  inviteCode:     { type: String, default: null },
  players:        { type: [playerResultSchema], default: [] },
  winnerUsername: { type: String, default: null },
  duration:       { type: Number, default: 0 },    // actual ms
  totalQuestions: { type: Number, default: 0 },
  startedAt:      { type: Date },
  endedAt:        { type: Date },
  completed:      { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast per-user history lookups
battleRoomSchema.index({ 'players.userId': 1, createdAt: -1 });

module.exports = mongoose.model('BattleRoom', battleRoomSchema);
