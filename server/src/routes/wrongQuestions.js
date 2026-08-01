const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now, parseJsonField } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取错题
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { courseId } = req.query;
    let questions;
    if (courseId) {
      questions = db.prepare('SELECT * FROM wrong_questions WHERE user_id = ? AND course_id = ? ORDER BY created_at DESC').all(req.user.id, courseId);
    } else {
      questions = db.prepare('SELECT * FROM wrong_questions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    }
    res.json({ wrongQuestions: questions.map(q => ({
      ...q, options: parseJsonField(q.options, []), correctIndices: parseJsonField(q.correct_indices, []), selectedIndices: parseJsonField(q.selected_indices, []), resolved: !!q.resolved
    })) });
  } catch (err) {
    console.error('[WrongQuestions] 获取错题失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 添加错题
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { courseId, lessonId, lessonTitle, question, options, correctIndex, correctIndices, selectedIndex, selectedIndices, userAnswer, correctAnswer, quizType, explanation, examPointTitle, priority } = req.body;
    if (!courseId || !question) return res.status(400).json({ error: '参数不完整' });

    const id = generateId();
    db.prepare(`INSERT INTO wrong_questions (id, course_id, user_id, lesson_id, lesson_title, question, options, correct_index, correct_indices, selected_index, selected_indices, user_answer, correct_answer, quiz_type, explanation, exam_point_title, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, courseId, req.user.id, lessonId || '', lessonTitle || '', question,
      JSON.stringify(options || []), correctIndex || null, JSON.stringify(correctIndices || []),
      selectedIndex || null, JSON.stringify(selectedIndices || []), userAnswer || '', correctAnswer || '',
      quizType || 'choice', explanation || '', examPointTitle || '', priority || 'high', now()
    );
    res.status(201).json({ wrongQuestion: { id } });
  } catch (err) {
    console.error('[WrongQuestions] 添加错题失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 标记已掌握
router.put('/:id/resolve', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE wrong_questions SET resolved = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已标记为已掌握' });
  } catch (err) {
    console.error('[WrongQuestions] 标记掌握失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除错题
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM wrong_questions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[WrongQuestions] 删除错题失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
