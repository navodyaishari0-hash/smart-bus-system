const apiUrl = import.meta.env.VITE_API_URL || '';

export const API_URL = apiUrl;
export const SOCKET_URL = apiUrl || 'http://localhost:5000';
