import apiClient from './client';

export interface WrongQuestion {
  id: string;
  course_id: string;
  lesson_id: string;
  lesson_title: string;
  question: string;
  options?: string[];
  correct_index?: number;
  correct_indices?: number[];
  selected_index?: number;
  selected_indices?: number[];
  user_answer?: string;
  correct_answer?: string;
  quiz_type: string;
  explanation: string;
  exam_point_title: string;
  priority: string;
  resolved: boolean;
  created_at: number;
}

export async function getWrongQuestions(courseId?: string): Promise<{ wrongQuestions: WrongQuestion[] }> {
  const params = courseId ? { courseId } : {};
  const res = await apiClient.get('/wrong-questions', { params });
  return res.data;
}

export async function addWrongQuestion(data: Partial<WrongQuestion>): Promise<{ wrongQuestion: { id: string } }> {
  const res = await apiClient.post('/wrong-questions', data);
  return res.data;
}

export async function resolveWrongQuestion(id: string): Promise<void> {
  await apiClient.put(`/wrong-questions/${id}/resolve`);
}

export async function deleteWrongQuestion(id: string): Promise<void> {
  await apiClient.delete(`/wrong-questions/${id}`);
}