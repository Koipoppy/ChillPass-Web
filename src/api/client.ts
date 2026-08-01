import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动附加 JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 时跳转登录页
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // 不在登录页时跳转
      if (!window.location.hash.includes('#/login') && !window.location.hash.includes('#/register')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
