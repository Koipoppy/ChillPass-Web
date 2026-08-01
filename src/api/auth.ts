import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
  avatar?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  bio?: string;
  is_teacher: number;
  created_at?: number;
  last_active_at?: number;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
}

export async function getMe(): Promise<{ user: UserInfo }> {
  const res = await apiClient.get('/auth/me');
  return res.data;
}

export async function updateProfile(data: Partial<Pick<UserInfo, 'nickname' | 'avatar' | 'bio'>>): Promise<{ user: UserInfo }> {
  const res = await apiClient.put('/auth/me', data);
  return res.data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/auth/password', { oldPassword, newPassword });
}

export function saveAuth(token: string, user: UserInfo) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getStoredUser(): UserInfo | null {
  try {
    const data = localStorage.getItem('auth_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}
