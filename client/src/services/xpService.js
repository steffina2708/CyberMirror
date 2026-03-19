import api from './api';

const xpService = {
  // Award XP after completing a game/lab/scenario
  // source: 'game' | 'lab' | 'scenario'
  // badgeIds: string[] of badge IDs to check/award
  award: async (xp, source = 'game', badgeIds = []) => {
    const { data } = await api.post('/xp/award', { xp, source, badgeIds });
    return data;
  },

  // Get full XP/badge progress for current user
  getProgress: async () => {
    const { data } = await api.get('/xp/progress');
    return data;
  },
};

export default xpService;
