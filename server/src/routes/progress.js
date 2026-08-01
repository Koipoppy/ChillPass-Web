const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取进度
router.get('/courses/:courseId/progress', (req, res) => {
  try {
    const db = getDb();
    const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
    const lessons = db.prepare('SELECT id, status FROM lessons WHERE course_id = ? AND user_id = ?').all(req.params.courseId, req.user.id);
    
    res.json({
      progress: progress || {
        totalLessons: lessons.length,
        completedLessons: 0,
        chillCoins: 0,
        currentStreak: 0,
      }
    });
  } catch (err) {
    console.error('[Progress] 获取进度失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 上报学习时长
router.post('/courses/:courseId/progress/study-time', (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes <= 0) return res.status(400).json({ error: '无效的学习时长' });

    const db = getDb();
    const coins = Math.floor(minutes);
    const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
    
    if (progress) {
      db.prepare('UPDATE progress SET total_study_minutes = total_study_minutes + ?, chill_coins = chill_coins + ?, updated_at = ? WHERE course_id = ? AND user_id = ?').run(coins, coins, now(), req.params.courseId, req.user.id);
    }
    
    res.json({ message: '学习时长已记录', coinsAwarded: coins });
  } catch (err) {
    console.error('[Progress] 上报学习时长失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
