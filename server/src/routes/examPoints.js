const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取考点列表
router.get('/courses/:courseId/exam-points', (req, res) => {
  try {
    const db = getDb();
    const points = db.prepare('SELECT * FROM exam_points WHERE course_id = ? AND user_id = ? ORDER BY sort_order').all(req.params.courseId, req.user.id);
    res.json({ examPoints: points.map(ep => ({
      ...ep, keyFormulas: JSON.parse(ep.key_formulas || '[]'), pageRefs: JSON.parse(ep.page_refs || '[]')
    })) });
  } catch (err) {
    console.error('[ExamPoints] 获取考点失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新考点
router.put('/courses/:courseId/exam-points/:id', (req, res) => {
  try {
    const { title, priority, description } = req.body;
    const db = getDb();
    const point = db.prepare('SELECT * FROM exam_points WHERE id = ? AND course_id = ? AND user_id = ?').get(req.params.id, req.params.courseId, req.user.id);
    if (!point) return res.status(404).json({ error: '考点不存在' });

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE exam_points SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('[ExamPoints] 更新考点失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
