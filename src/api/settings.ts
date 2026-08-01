import apiClient from './client';

export async function getSettings(): Promise<{ settings: Record<string, any> }> {
  const res = await apiClient.get('/settings');
  return res.data;
}

export async function updateSettings(data: Record<string, any>): Promise<void> {
  await apiClient.put('/settings', data);
}