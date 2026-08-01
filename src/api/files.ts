import apiClient from './client';

export async function uploadFile(file: File, courseId?: string): Promise<{ file: { id: string; name: string; ext: string; size: number } }> {
  const formData = new FormData();
  formData.append('file', file);
  if (courseId) formData.append('courseId', courseId);
  const res = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteFile(id: string): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

export function getFileUrl(id: string): string {
  const base = import.meta.env.VITE_API_BASE || '/api';
  return `${base}/files/${id}`;
}
