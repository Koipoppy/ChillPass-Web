const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取聊天消息
router.get('/messages', (req, res) => {
  try {
    const db = getDb();
    const { courseId } = req.query;
    let messages;
    if (courseId) {
      messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? AND course_id = ? ORDER BY timestamp ASC').all(req.user.id, courseId);
    } else {
      messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? AND course_id IS NULL ORDER BY timestamp ASC').all(req.user.id);
    }
    res.json({ messages });
  } catch (err) {
    console.error('[Chat] 获取消息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 发送消息
router.post('/messages', (req, res) => {
  try {
    const { role, content, courseId } = req.body;
    if (!role || !content) return res.status(400).json({ error: '消息内容不能为空' });

    const db = getDb();
    const id = generateId();
    const timestamp = now();
    db.prepare('INSERT INTO chat_messages (id, user_id, course_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, courseId || null, role, content, timestamp);
    
    res.status(201).json({ message: { id, role, content, courseId: courseId || null, timestamp } });
  } catch (err) {
    console.error('[Chat] 发送消息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 清空聊天记录
router.delete('/messages', (req, res) => {
  try {
    const db = getDb();
    const { courseId } = req.query;
    if (courseId) {
      db.prepare('DELETE FROM chat_messages WHERE user_id = ? AND course_id = ?').run(req.user.id, courseId);
    } else {
      db.prepare('DELETE FROM chat_messages WHERE user_id = ? AND course_id IS NULL').run(req.user.id);
    }
    res.json({ message: '已清空' });
  } catch (err) {
    console.error('[Chat] 清空消息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
