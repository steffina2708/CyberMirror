const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, default: '🏆' },
  condition: {
    type: { type: String, enum: ['score', 'scenarios', 'streak', 'category', 'accuracy'] },
    value: Number,
    category: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
