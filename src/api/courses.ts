import apiClient from './client';

export interface CourseFile {
  id: string;
  name: string;
  ext: string;
  size: number;
  uploaded_at: number;
}

export interface Course {
  id: string;
  name: string;
  files: CourseFile[];
  status: string;
  raw_text?: string;
  exam_date?: string;
  created_at: number;
  updated_at: number;
}

export interface ExamPoint {
  id: string;
  title: string;
  priority: string;
  description: string;
  keyFormulas?: string[];
  pageRefs?: string[];
  sourceFile?: string;
  sort_order: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  exam_point_id: string;
  order_num: number;
  title: string;
  priority: string;
  status: string;
  coins: number;
  completed_at?: number;
  key_points?: string;
  explanation?: string;
  examples?: string;
  quiz?: string;
}

export interface Progress {
  totalLessons: number;
  completedLessons: number;
  chillCoins: number;
  currentStreak: number;
}

export interface CourseBundle {
  course: Course;
  examPoints: ExamPoint[];
  lessons: Lesson[];
  progress: Progress;
  rawText: string;
  generatingLessons: boolean;
  generationProgress: { current: number; total: number };
}

export async function getCourses(): Promise<{ courses: CourseBundle[] }> {
  const res = await apiClient.get('/courses');
  return res.data;
}

export async function createCourse(name: string): Promise<CourseBundle> {
  const res = await apiClient.post('/courses', { name });
  return res.data;
}

export async function renameCourse(id: string, name: string): Promise<void> {
  await apiClient.put(`/courses/${id}`, { name });
}

export async function deleteCourse(id: string): Promise<void> {
  await apiClient.delete(`/courses/${id}`);
}

export async function setExamDate(id: string, examDate: string): Promise<void> {
  await apiClient.put(`/courses/${id}/exam-date`, { examDate });
}

export async function exportCourse(id: string): Promise<CourseBundle> {
  const res = await apiClient.get(`/courses/${id}/export`);
  return res.data;
}

export async function importCourse(data: any): Promise<{ courseId: string }> {
  const res = await apiClient.post('/courses/import', data);
  return res.data;
}

export async function getExamPoints(courseId: string): Promise<{ examPoints: ExamPoint[] }> {
  const res = await apiClient.get(`/courses/${courseId}/exam-points`);
  return res.data;
}

export async function getLessons(courseId: string): Promise<{ lessons: Lesson[] }> {
  const res = await apiClient.get(`/courses/${courseId}/lessons`);
  return res.data;
}

export async function getLessonDetail(courseId: string, lessonId: string): Promise<{ lesson: Lesson }> {
  const res = await apiClient.get(`/courses/${courseId}/lessons/${lessonId}`);
  return res.data;
}

export async function completeLesson(courseId: string, lessonId: string): Promise<{ reward: number }> {
  const res = await apiClient.put(`/courses/${courseId}/lessons/${lessonId}/complete`);
  return res.data;
}

export async function skipLesson(courseId: string, lessonId: string): Promise<void> {
  await apiClient.put(`/courses/${courseId}/lessons/${lessonId}/skip`);
}

export async function getProgress(courseId: string): Promise<{ progress: Progress }> {
  const res = await apiClient.get(`/courses/${courseId}/progress`);
  return res.data;
}

export async function reportStudyTime(courseId: string, minutes: number): Promise<{ coinsAwarded: number }> {
  const res = await apiClient.post(`/courses/${courseId}/progress/study-time`, { minutes });
  return res.data;
}
