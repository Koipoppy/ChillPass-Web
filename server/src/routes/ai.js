const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// 非流式 AI 对话
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'deepseek-chat' } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: '无效的消息格式' });

    // 从用户设置中获取 API Key
    const db = getDb();
    const setting = db.prepare('SELECT data FROM user_settings WHERE user_id = ?').get(req.user.id);
    const settings = setting ? JSON.parse(setting.data) : {};
    const apiKey = settings.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: '请先在设置中配置 DeepSeek API Key' });
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: false })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[AI] 对话失败:', err);
    res.status(500).json({ error: 'AI 调用失败' });
  }
});

// 流式 AI 对话（SSE）
router.post('/stream', async (req, res) => {
  try {
    const { messages, model = 'deepseek-chat' } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: '无效的消息格式' });

    const db = getDb();
    const setting = db.prepare('SELECT data FROM user_settings WHERE user_id = ?').get(req.user.id);
    const settings = setting ? JSON.parse(setting.data) : {};
    const apiKey = settings.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: '请先在设置中配置 DeepSeek API Key' });
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: true })
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.write('data: [DONE]\n\n'); res.end(); break; }
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        res.write(line + '\n\n');
      }
    }
  } catch (err) {
    console.error('[AI] 流式对话失败:', err);
    if (!res.headersSent) res.status(500).json({ error: 'AI 调用失败' });
    else { res.write('data: [ERROR]\n\n'); res.end(); }
  }
});

// AI 评阅
router.post('/grade', async (req, res) => {
  try {
    const { question, answer, userAnswer, model = 'deepseek-chat' } = req.body;
    const db = getDb();
    const setting = db.prepare('SELECT data FROM user_settings WHERE user_id = ?').get(req.user.id);
    const settings = setting ? JSON.parse(setting.data) : {};
    const apiKey = settings.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) return res.status(400).json({ error: '请先配置 API Key' });

    const prompt = `请评阅以下答案：\n题目：${question}\n参考答案：${answer}\n用户答案：${userAnswer}\n请给出评分（百分制）和评语。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '评阅失败' });
  }
});

module.exports = router;
