import api from './api';

const aiService = {
  /**
   * POST /api/ai/generate-scenario
   * Analyses the player's skill, generates a tailored AI scenario,
   * persists it, and returns the scenarioId + full profile.
   *
   * @param {string} [category='mixed']  'phishing' | 'website' | 'ransomware' | 'mixed'
   * @returns {Promise<{ scenarioId, scenario, skillProfile, personalisedFeedback, isAIGenerated, isFallback }>}
   */
  generateScenario: async (category = 'mixed') => {
    const res = await api.post('/ai/generate-scenario', { category });
    return res.data;
  },

  /**
   * POST /api/ai/session-complete
   * Sends post-game stats for adaptive learning recalculation.
   *
   * @param {object} stats
   * @returns {Promise<{ profile, personalisedFeedback, message }>}
   */
  completeSession: async (stats) => {
    const res = await api.post('/ai/session-complete', stats);
    return res.data;
  },

  /**
   * GET /api/ai/profile
   * Returns full skill breakdown, tier progression, and personalised tips.
   *
   * @returns {Promise<{ profile, personalisedFeedback, progression, allTiers }>}
   */
  getProfile: async () => {
    const res = await api.get('/ai/profile');
    return res.data;
  },
};

export default aiService;
