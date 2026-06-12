import axios from 'axios';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://192.168.1.14:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  console.log('API Request:', {
    method: config.method,
    url: `${config.baseURL}${config.url}`,
    data: config.data,
  });

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', {
      baseURL: error?.config?.baseURL,
      url: error?.config?.url,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    return Promise.reject(error);
  }
);

export default apiClient;