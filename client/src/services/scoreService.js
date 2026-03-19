import api from './api';

const scoreService = {
  getUserScore: async () => {
    const res = await api.get('/scores/me');
    return res.data;
  },
  getLeaderboard: async () => {
    const res = await api.get('/scores/leaderboard');
    return res.data;
  },
  getUserBadges: async () => {
    const res = await api.get('/scores/badges');
    return res.data;
  },
  getPerformance: async () => {
    const res = await api.get('/users/performance');
    return res.data.performance;
  },
};

export default scoreService;
