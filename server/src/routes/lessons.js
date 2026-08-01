const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now, parseJsonField } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取关卡列表
router.get('/courses/:courseId/lessons', (req, res) => {
  try {
    const db = getDb();
    const lessons = db.prepare('SELECT id, course_id, exam_point_id, order_num, title, priority, status, coins, completed_at FROM lessons WHERE course_id = ? AND user_id = ? ORDER BY order_num').all(req.params.courseId, req.user.id);
    res.json({ lessons });
  } catch (err) {
    console.error('[Lessons] 获取关卡列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个关卡内容
router.get('/courses/:courseId/lessons/:id', (req, res) => {
  try {
    const db = getDb();
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ? AND user_id = ?').get(req.params.id, req.params.courseId, req.user.id);
    if (!lesson) return res.status(404).json({ error: '关卡不存在' });

    res.json({
      lesson: {
        ...lesson,
        keyPoints: parseJsonField(lesson.key_points, []),
        examples: parseJsonField(lesson.examples, []),
        quiz: parseJsonField(lesson.quiz, []),
      }
    });
  } catch (err) {
    console.error('[Lessons] 获取关卡内容失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 完成关卡
router.put('/courses/:courseId/lessons/:id/complete', (req, res) => {
  try {
    const db = getDb();
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ? AND user_id = ?').get(req.params.id, req.params.courseId, req.user.id);
    if (!lesson) return res.status(404).json({ error: '关卡不存在' });
    if (lesson.status === 'completed') return res.json({ message: '已完成的关卡' });

    const timestamp = now();
    const reward = lesson.coins || 30;

    // 更新当前关卡为已完成
    db.prepare('UPDATE lessons SET status = ?, completed_at = ? WHERE id = ?').run('completed', timestamp, req.params.id);
    // 解锁下一关
    db.prepare('UPDATE lessons SET status = ? WHERE course_id = ? AND user_id = ? AND order_num = ? AND status = ?').run('available', req.params.courseId, req.user.id, lesson.order_num + 1, 'locked');
    // 更新进度
    const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
    if (progress) {
      db.prepare('UPDATE progress SET completed_lessons = completed_lessons + 1, chill_coins = chill_coins + ?, updated_at = ? WHERE course_id = ? AND user_id = ?').run(reward, timestamp, req.params.courseId, req.user.id);
    }

    res.json({ message: '关卡完成', reward });
  } catch (err) {
    console.error('[Lessons] 完成关卡失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 跳关
router.put('/courses/:courseId/lessons/:id/skip', (req, res) => {
  try {
    const db = getDb();
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ? AND user_id = ?').get(req.params.id, req.params.courseId, req.user.id);
    if (!lesson) return res.status(404).json({ error: '关卡不存在' });
    if (lesson.status === 'completed' || lesson.status === 'available') return res.status(400).json({ error: '该关卡已解锁或已完成' });

    const cost = lesson.coins || 30;
    const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
    if (!progress || progress.chill_coins < cost) {
      return res.status(400).json({ error: 'Chill币不足', required: cost, current: progress ? progress.chill_coins : 0 });
    }

    db.prepare('UPDATE lessons SET status = ? WHERE id = ?').run('available', req.params.id);
    db.prepare('UPDATE progress SET chill_coins = chill_coins - ?, updated_at = ? WHERE course_id = ? AND user_id = ?').run(cost, now(), req.params.courseId, req.user.id);

    res.json({ message: '跳关成功', cost });
  } catch (err) {
    console.error('[Lessons] 跳关失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 生成关卡内容（占位，依赖 AI 服务）
router.post('/courses/:courseId/lessons/generate', (req, res) => {
  res.json({ message: '关卡生成请求已接收', generating: true });
});

module.exports = router;
