import api from './api';

const simulationService = {
  getAllScenarios: async () => {
    const res = await api.get('/simulations/scenarios');
    return res.data;
  },

  getScenarioById: async (id) => {
    const res = await api.get(`/simulations/scenarios/${id}`);
    const data = res.data;

    if (!data || !data.scenario) {
      throw new Error('Invalid scenario response from server');
    }
    if (!Array.isArray(data.scenario.steps) || data.scenario.steps.length === 0) {
      throw new Error('This scenario has no steps configured yet');
    }

    return data;
  },

  startSession: async (scenarioId) => {
    const res = await api.post('/simulations/start', { scenarioId });
    return res.data;
  },
  submitDecision: async (sessionId, stepIndex, choiceIndex) => {
    const res = await api.post('/simulations/decision', { sessionId, stepIndex, choiceIndex });
    return res.data;
  },
  completeSession: async (sessionId) => {
    const res = await api.post('/simulations/complete', { sessionId });
    return res.data;
  },
  getSessionResult: async (sessionId) => {
    const res = await api.get(`/simulations/results/${sessionId}`);
    return res.data;
  },
  getUserHistory: async () => {
    const res = await api.get('/simulations/history');
    return res.data;
  },
};

export default simulationService;
