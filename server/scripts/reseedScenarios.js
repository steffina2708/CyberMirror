/**
 * reseedScenarios.js
 *
 * Run once manually to replace all scenario documents with the
 * canonical seed data from database/scenarios.json.
 *
 * Usage:
 *   cd server
 *   npm run reseed
 */

'use strict';

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load .env from the server root (one level up from scripts/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Scenario = require('../models/Scenario');
const scenarioData = require('../database/scenarios.json');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not defined in .env — aborting reseed.');
  process.exit(1);
}

const reseed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // -- Validate seed data before touching the DB -------------------------
    if (!Array.isArray(scenarioData) || scenarioData.length === 0) {
      throw new Error('scenarios.json is empty or not a valid array');
    }

    const invalidScenarios = scenarioData
      .map((s, i) => {
        const errs = [];
        if (!s.title)       errs.push('missing title');
        if (!s.description) errs.push('missing description');
        if (!s.category)    errs.push('missing category');
        if (!Array.isArray(s.steps) || s.steps.length === 0) errs.push('no steps');
        return errs.length ? `[${i}] "${s.title || 'unknown'}": ${errs.join(', ')}` : null;
      })
      .filter(Boolean);

    if (invalidScenarios.length > 0) {
      throw new Error(`Seed data validation failed:\n  ${invalidScenarios.join('\n  ')}`);
    }

    console.log(`📋  ${scenarioData.length} scenarios validated — proceeding with reseed...`);

    // Normalise question fields inline before insertMany.
    // insertMany() bypasses Mongoose middleware, so we handle this directly.
    scenarioData.forEach(scenario => {
      (scenario.steps || []).forEach(step => {
        if (!step.question) {
          step.question = step.description || step.title || 'Untitled Question';
        }
      });
    });

    // -- Wipe + insert -----------------------------------------------------
    const deleted = await Scenario.deleteMany({});
    console.log(`🗑️   Deleted ${deleted.deletedCount} existing scenario(s)`);

    const inserted = await Scenario.insertMany(scenarioData, { ordered: true });
    console.log(`✅  Inserted ${inserted.length} scenario(s):`);
    inserted.forEach((s, i) =>
      console.log(`    ${i + 1}. ${s.title} (${s.steps.length} steps, difficulty: ${s.difficulty})`)
    );

    // -- Verify ------------------------------------------------------------
    const stepsTotal = inserted.reduce((n, s) => n + s.steps.length, 0);
    const stepsWithQ  = inserted.reduce(
      (n, s) => n + s.steps.filter(st => st.question).length, 0
    );
    console.log(`\n📊  Verification:`);
    console.log(`    Total steps        : ${stepsTotal}`);
    console.log(`    Steps with question: ${stepsWithQ}`);
    if (stepsWithQ < stepsTotal) {
      console.warn(`⚠️   ${stepsTotal - stepsWithQ} step(s) had no question — auto-derived via model hook`);
    }

    console.log('\n🛡️   Scenarios reseeded successfully\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌  Reseed failed:', err.message || err);
    process.exit(1);
  }
};

reseed();
