const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  totalScore: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  scenariosCompleted: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalAnswers: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  accuracyPercentage: { type: Number, default: 0 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  // ── Gamification fields ──────────────────────────────────────
  totalXP:         { type: Number, default: 0 },
  gamesCompleted:  { type: Number, default: 0 },
  labsCompleted:   { type: Number, default: 0 },
  earnedBadges: [{
    id:          { type: String },
    name:        { type: String },
    icon:        { type: String },
    desc:        { type: String },
    unlockedAt:  { type: Date, default: Date.now },
  }],  // ── Adaptive Difficulty fields ───────────────────────────────────
  difficultyLevel:       { type: String, enum: ['easy','medium','hard','expert'], default: 'easy' },
  recentGameScores:      { type: [Number], default: [] },
  correctAnswersStreak:  { type: Number, default: 0 },
  averageResponseTime:   { type: Number, default: 0 },   // ms
  // ── Multiplayer stats ──────────────────────────────────────────
  multiplayerWins:       { type: Number, default: 0 },
  multiplayerLosses:     { type: Number, default: 0 },
  // ── Player Skill Analyzer fields ────────────────────────────────
  skillScore:            { type: Number, default: 0 },    // 0–100 composite
  skillTier:             { type: String, default: 'Newbie Defender' },
  scenariosAbandoned:    { type: Number, default: 0 },
  difficultyStats: {
    easy:   { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
    medium: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
    hard:   { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
    expert: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 } },
  },
  // categoryStats: free-form map  { [categoryKey]: { played, won, avgResponseMs } }
  categoryStats:         { type: mongoose.Schema.Types.Mixed, default: {} },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.virtual('winRate').get(function () {
  if (!this.totalAnswers) return 0;
  return Math.round((this.correctAnswers / this.totalAnswers) * 100);
});

// Disable virtuals in JSON serialization to avoid property descriptor conflicts
userSchema.set('toJSON', { virtuals: false });

module.exports = mongoose.model('User', userSchema);
