import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://103.94.238.252:8003/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  login: async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.log('API Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal terhubung ke server',
      };
    }
  },
};

export default apiClient;
