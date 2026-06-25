const isDev = import.meta.env.DEV;
const prodApiUrl = import.meta.env.VITE_API_URL || '';

export const API_URL = isDev ? '' : prodApiUrl;
export const SOCKET_URL = isDev ? 'http://localhost:5000' : (prodApiUrl || '');
