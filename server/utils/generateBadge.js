const Badge = require('../models/Badge');

const defaultBadges = [
  {
    name: 'First Blood',
    description: 'Completed your first simulation',
    icon: '🩸',
    condition: { type: 'scenarios', value: 1 },
  },
  {
    name: 'Phish Hunter',
    description: 'Scored 100+ total points',
    icon: '🎣',
    condition: { type: 'score', value: 100 },
  },
  {
    name: 'Cyber Rookie',
    description: 'Completed 5 simulations',
    icon: '🛡️',
    condition: { type: 'scenarios', value: 5 },
  },
  {
    name: 'Sharp Eye',
    description: 'Achieved 70%+ overall accuracy',
    icon: '👁️',
    condition: { type: 'accuracy', value: 70 },
  },
  {
    name: 'Security Expert',
    description: 'Scored 1000+ total points',
    icon: '⭐',
    condition: { type: 'score', value: 1000 },
  },
  {
    name: 'Elite Agent',
    description: 'Scored 3000+ total points',
    icon: '💎',
    condition: { type: 'score', value: 3000 },
  },
];

const seedBadges = async () => {
  for (const badge of defaultBadges) {
    await Badge.findOneAndUpdate({ name: badge.name }, badge, { upsert: true, new: true });
  }
  console.log('✅ Badges seeded');
};

module.exports = { seedBadges };
