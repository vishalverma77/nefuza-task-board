import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/azure',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});
