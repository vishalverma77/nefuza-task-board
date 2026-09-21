import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    // Normalize to include /api/azure prefix without creating duplicates
    return cleanUrl.endsWith('/api/azure') ? cleanUrl : `${cleanUrl}/api/azure`;
  }
  return '/api/azure';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

