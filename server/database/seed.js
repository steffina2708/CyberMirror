const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Scenario = require('../models/Scenario');
const Badge = require('../models/Badge');
const User = require('../models/User');
const scenarios = require('./scenarios.json');
const { seedBadges } = require('../utils/generateBadge');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Scenario.deleteMany({});
    await Badge.deleteMany({});
    console.log('🗑️  Cleared existing scenarios and badges');

    // Seed scenarios
    const inserted = await Scenario.insertMany(scenarios);
    console.log(`✅ Seeded ${inserted.length} scenarios`);

    // Seed badges
    await seedBadges();

    // Create demo admin user (optional)
    const existingAdmin = await User.findOne({ email: 'admin@cybermirror.io' });
    if (!existingAdmin) {
      await User.create({
        username: 'admin',
        email: 'admin@cybermirror.io',
        password: 'Admin@123',
        role: 'admin',
        totalScore: 9999,
        level: 10,
        scenariosCompleted: 50,
      });
      console.log('✅ Created demo admin user: admin@cybermirror.io / Admin@123');
    }

    // Create demo player user
    const existingDemo = await User.findOne({ email: 'demo@cybermirror.io' });
    if (!existingDemo) {
      await User.create({
        username: 'byte_force',
        email: 'demo@cybermirror.io',
        password: 'Demo@123',
        totalScore: 450,
        level: 4,
        scenariosCompleted: 8,
        correctAnswers: 22,
        totalAnswers: 30,
      });
      console.log('✅ Created demo player: demo@cybermirror.io / Demo@123');
    }

    console.log('\n🛡️  CyberMirror database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo Accounts:');
    console.log('  Player: demo@cybermirror.io / Demo@123');
    console.log('  Admin:  admin@cybermirror.io / Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
