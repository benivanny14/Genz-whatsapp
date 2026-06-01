import api from '../utils/axios';

const callService = {
  getCallLogs: async (limit = 50) => {
    const { data } = await api.get(`/api/calls?limit=${limit}`);
    return data;
  },

  createCallLog: async (payload) => {
    const { data } = await api.post('/api/calls', payload);
    return data;
  },

  deleteCallLog: async (id) => {
    const { data } = await api.delete(`/api/calls/${id}`);
    return data;
  },

  clearCallLogs: async () => {
    const { data } = await api.delete('/api/calls/clear');
    return data;
  }
};

export default callService;
