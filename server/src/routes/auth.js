const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();

// 注册
router.post('/register', (req, res) => {
  try {
    const { username, password, nickname, avatar } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应在3-20个字符之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const id = generateId();
    const timestamp = now();
    const passwordHash = bcrypt.hashSync(password, 10);
    
    db.prepare(`INSERT INTO users (id, username, password_hash, nickname, avatar, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, username, passwordHash, nickname || username, avatar || '🦊', timestamp, timestamp
    );

    const user = { id, username, nickname: nickname || username, avatar: avatar || '🦊', bio: '', is_teacher: 0 };
    const token = generateToken(user);
    
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[Auth] 注册失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now(), user.id);

    const userData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      is_teacher: user.is_teacher,
    };
    const token = generateToken(userData);
    
    res.json({ token, user: userData });
  } catch (err) {
    console.error('[Auth] 登录失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, nickname, avatar, bio, is_teacher, created_at, last_active_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user });
  } catch (err) {
    console.error('[Auth] 获取用户信息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新个人信息
router.put('/me', authenticateToken, (req, res) => {
  try {
    const { nickname, avatar, bio } = req.body;
    const db = getDb();
    
    const updates = [];
    const params = [];
    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    updates.push('last_active_at = ?');
    params.push(now());
    params.push(req.user.id);
    
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    const user = db.prepare('SELECT id, username, nickname, avatar, bio, is_teacher FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error('[Auth] 更新个人信息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 修改密码
router.put('/password', authenticateToken, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6个字符' });
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id);
    
    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('[Auth] 修改密码失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
