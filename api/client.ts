import { logger } from '@/utils/logger';
import axios from 'axios';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://api.inminut.com/"

  if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL missing');
}
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
if (__DEV__) {
  logger('API Request:', {
    method: config.method,
    url: `${config.baseURL}${config.url}`,
    data: config.data,
  });
}

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
if (__DEV__) {
  logger('API Error:', {
    baseURL: error?.config?.baseURL,
    url: error?.config?.url,
    message: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
  });
}

    return Promise.reject(error);
  }
);

export default apiClient;