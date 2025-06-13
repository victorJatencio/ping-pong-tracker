import api from './config';

export const matchesService = {
  // Get all matches
  getMatches: async (params = {}) => {
    const response = await api.get('/matches', { params });
    return response.data;
  },

  // Get match by ID
  getMatch: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  // Create new match
  createMatch: async (matchData) => {
    const response = await api.post('/matches', matchData);
    return response.data;
  },

  // Update match
  updateMatch: async (id, matchData) => {
    const response = await api.put(`/matches/${id}`, matchData);
    return response.data;
  },

  // Delete match
  deleteMatch: async (id) => {
    const response = await api.delete(`/matches/${id}`);
    return response.data;
  }
};