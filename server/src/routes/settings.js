const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// 获取设置
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const setting = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
    res.json({ settings: setting ? JSON.parse(setting.data) : {} });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新设置
router.put('/', (req, res) => {
  try {
    const db = getDb();
    const data = JSON.stringify(req.body);
    const existing = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare('UPDATE user_settings SET data = ? WHERE user_id = ?').run(data, req.user.id);
    } else {
      db.prepare('INSERT INTO user_settings (id, user_id, data) VALUES (?, ?, ?)').run(generateId(), req.user.id, data);
    }
    res.json({ message: '保存成功' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
