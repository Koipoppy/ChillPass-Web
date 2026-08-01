import apiClient from './client';

export interface ChatMessage {
  id: string;
  user_id: string;
  course_id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function getMessages(courseId?: string): Promise<{ messages: ChatMessage[] }> {
  const params = courseId ? { courseId } : {};
  const res = await apiClient.get('/chat/messages', { params });
  return res.data;
}

export async function sendMessage(role: string, content: string, courseId?: string): Promise<{ message: ChatMessage }> {
  const res = await apiClient.post('/chat/messages', { role, content, courseId });
  return res.data;
}

export async function clearMessages(courseId?: string): Promise<void> {
  const params = courseId ? { courseId } : {};
  await apiClient.delete('/chat/messages', { params });
}

export async function aiChat(messages: { role: string; content: string }[]): Promise<any> {
  const res = await apiClient.post('/ai/chat', { messages });
  return res.data;
}

export function createAiStream(messages: { role: string; content: string }[]): EventSource {
  const token = localStorage.getItem('auth_token');
  const base = import.meta.env.VITE_API_BASE || '/api';
  const url = `${base}/ai/stream`;
  
  // 使用 fetch 的流式读取
  const controller = new AbortController();
  
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ messages }),
    signal: controller.signal,
  }).then(response => {
    if (!response.ok) throw new Error('Stream request failed');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        lines.forEach(line => {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              window.dispatchEvent(new CustomEvent('ai-stream-chunk', { detail: content }));
            }
          } catch (e) {}
        });
        read();
      });
    }
    read();
  });

  return { abort: () => controller.abort() } as any;
}