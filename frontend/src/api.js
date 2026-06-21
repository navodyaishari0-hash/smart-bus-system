import axios from 'axios';

const isDev = import.meta.env.DEV;

const api = axios.create({
  baseURL: isDev ? '' : (window._API_URL || '/api'),
  headers: { 'Content-Type': 'application/json' }
});

export default api;
