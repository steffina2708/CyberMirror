const mongoose = require('mongoose');

const choiceSchema = new mongoose.Schema({
  text:        { type: String, required: true },
  isCorrect:   { type: Boolean, required: true, default: false },
  points:      { type: Number, default: 20 },
  feedback:    { type: String },          // primary feedback field
  explanation: { type: String },          // kept for backward compatibility
});

const stepSchema = new mongoose.Schema({
  question:    { type: String, default: '' },
  title:       { type: String },
  type:        { type: String, enum: ['text', 'email', 'browser', 'chat'], default: 'text' },
  description: { type: String },
  emailData: {
    from: String, to: String, subject: String, body: String,
  },
  browserData: {
    url: String, siteName: String, description: String,
    formFields: [{ label: String, placeholder: String }],
    submitLabel: String,
  },
  choices: [choiceSchema],
});

const scenarioSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['phishing', 'social-engineering', 'fake-login', 'malware', 'ransomware'],
    required: true,
  },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'easy' },
  steps:       [stepSchema],
  maxScore:    { type: Number, default: 100 },
  isActive:      { type: Boolean, default: true },
  timesPlayed:   { type: Number, default: 0 },
  isAIGenerated: { type: Boolean, default: false },
  aiMetadata:    { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

// Auto-derive question on each step if missing.
// Uses async middleware (no next parameter) — compatible with Mongoose 6+
// Note: insertMany bypasses hooks, so reseedScenarios.js also normalises
// data directly before calling insertMany.
scenarioSchema.pre('validate', async function () {
  if (Array.isArray(this.steps)) {
    this.steps.forEach(step => {
      if (!step.question) {
        step.question = step.description || step.title || 'Untitled Question';
      }
    });
  }
});

// Auto-computed total points: sum of best choice per step
scenarioSchema.virtual('totalPoints').get(function () {
  if (!this.steps || this.steps.length === 0) return 0;
  return this.steps.reduce((total, step) => {
    const stepMax = (step.choices || []).reduce(
      (best, c) => (c.isCorrect ? Math.max(best, c.points || 0) : best), 0
    );
    return total + stepMax;
  }, 0);
});

scenarioSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Scenario', scenarioSchema);
