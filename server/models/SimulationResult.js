const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  stepIndex: Number,
  choiceIndex: Number,
  isCorrect: Boolean,
  pointsEarned: Number,
});

const simulationResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    default: function () { return this.user; },
  },
  scenarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scenario',
    required: true,
    default: function () { return this.scenario; },
  },
  selectedOption: { type: Number, required: true, default: -1 },
  correct: { type: Boolean, required: true, default: false },
  pointsEarned: { type: Number, required: true, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scenario: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: true },
  scenarioTitle: String,
  category: String,
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 100 },
  correctAnswers: { type: Number, default: 0 },
  totalSteps: Number,
  decisions: [decisionSchema],
  passed: { type: Boolean, default: false },
  newBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('SimulationResult', simulationResultSchema);
