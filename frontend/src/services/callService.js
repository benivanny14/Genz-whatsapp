import api from '../utils/axios';

const callService = {
  getCallLogs: async (limit = 50) => {
    const { data } = await api.get(`/calls?limit=${limit}`);
    return data;
  },

  createCallLog: async (payload) => {
    const { data } = await api.post('/calls', payload);
    return data;
  },

  deleteCallLog: async (id) => {
    const { data } = await api.delete(`/calls/${id}`);
    return data;
  },

  clearCallLogs: async () => {
    const { data } = await api.delete('/calls/clear');
    return data;
  }
};

export default callService;
