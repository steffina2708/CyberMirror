import api from './api';

const gameService = {
  // Fetch all available games metadata
  getGames: () => api.get('/games').then(r => r.data).catch(() => ({ games: [] })),

  // Submit a game score
  submitScore: (gameId, payload) =>
    api.post(`/games/${gameId}/score`, payload).then(r => r.data),

  // Get user game history
  getGameHistory: () =>
    api.get('/games/history').then(r => r.data).catch(() => ({ history: [] })),
};

export default gameService;
