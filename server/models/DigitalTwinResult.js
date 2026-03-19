const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  attackType:  String,
  targetNode:  String,
  actionTaken: String,
  isCorrect:   Boolean,
  xpEarned:    Number,
  fastResponse: Boolean,
}, { _id: false });

const digitalTwinResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  simulationScore:  { type: Number, default: 0 },
  threatsHandled:   { type: Number, default: 0 },
  correctResponses: { type: Number, default: 0 },
  xpEarned:         { type: Number, default: 0 },
  finalThreatLevel: { type: Number, default: 0 },
  duration:         { type: Number, default: 60 },   // seconds
  responses:        [responseSchema],
  completedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('DigitalTwinResult', digitalTwinResultSchema);
