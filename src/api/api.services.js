import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'http://103.94.238.252:8003/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('userToken');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

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
