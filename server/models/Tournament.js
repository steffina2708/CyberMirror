/* ═══════════════════════════════════════════════════════════════
   Tournament.js — Global tournament model
   ═══════════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');

/* ── Participant entry ────────────────────────────────────────── */
const participantSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:     { type: String, required: true },
  seed:         { type: Number, default: 0 },       // seeding rank (XP-based)
  avatar:       { type: String, default: '' },
  currentRound: { type: Number, default: 1 },
  eliminated:   { type: Boolean, default: false },
  eliminatedAt: { type: Date, default: null },
  wins:         { type: Number, default: 0 },
  losses:       { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },
}, { _id: false });

/* ── Reward tier ──────────────────────────────────────────────── */
const rewardTierSchema = new mongoose.Schema({
  place:       { type: String },  // '1st', '2nd', 'Top 4', etc.
  xpBonus:     { type: Number, default: 0 },
  badgeId:     { type: String, default: null },
  badgeName:   { type: String, default: null },
  badgeIcon:   { type: String, default: '🏆' },
  frameColor:  { type: String, default: null },
  title:       { type: String, default: null },  // e.g. "Global Cyber Champion"
}, { _id: false });

/* ── Season ───────────────────────────────────────────────────── */
const SEASONS = ['Season 1: Cyber Defense Era', 'Season 2: Hacker Wars', 'Season 3: AI Cyber Warfare'];

/* ── Main schema ──────────────────────────────────────────────── */
const tournamentSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  season:       { type: String, enum: SEASONS, default: SEASONS[0] },
  bannerColor:  { type: String, default: '#4f46e5' },  // CSS gradient hint
  icon:         { type: String, default: '🏆' },

  status: {
    type: String,
    enum: ['upcoming', 'registration', 'bracket_generated', 'live', 'completed', 'cancelled'],
    default: 'upcoming',
  },

  registrationOpensAt: { type: Date, required: true },
  registrationClosesAt:{ type: Date, required: true },
  startDate:           { type: Date, required: true },
  endDate:             { type: Date },

  maxParticipants: { type: Number, default: 64 },
  participants:    { type: [participantSchema], default: [] },

  /* Bracket metadata — round names computed from participant count */
  totalRounds:    { type: Number, default: 0 },
  currentRound:   { type: Number, default: 0 },

  rewards:        { type: [rewardTierSchema], default: [] },

  winnerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  winnerUsername: { type: String, default: null },

  /* Anti-cheat / integrity flags */
  matchDurationMs: { type: Number, default: 90_000 },  // per-match time limit
  questionsPerMatch:{ type: Number, default: 8 },

  /* Seasonal rank snapshot at end */
  seasonSnapshot:  { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

/* Fast status + date lookups */
tournamentSchema.index({ status: 1, startDate: -1 });
tournamentSchema.index({ 'participants.userId': 1 });

/* Compute totalRounds from participant count */
tournamentSchema.pre('save', function () {
  const n = this.participants.length;
  if (n >= 2) {
    this.totalRounds = Math.ceil(Math.log2(n));
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
