// ChillPass 测试账户种子脚本
// 运行: node server/scripts/seed.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { initDatabase, getDb } = require('../src/db/database');
const { generateId, now } = require('../src/utils/helpers');

initDatabase();
const db = getDb();

const testUsers = [
  { username: 'test', password: 'test', nickname: '测试用户', avatar: '🦊', is_teacher: 0 },
];

for (const u of testUsers) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
  if (existing) {
    console.log(`[Seed] 用户 "${u.username}" 已存在，跳过`);
    continue;
  }
  const id = generateId();
  const ts = now();
  const passwordHash = bcrypt.hashSync(u.password, 10);
  db.prepare(`INSERT INTO users (id, username, password_hash, nickname, avatar, bio, is_teacher, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, u.username, passwordHash, u.nickname, u.avatar, '', u.is_teacher, ts, ts
  );
  console.log(`[Seed] 已创建测试用户: ${u.username} / ${u.password}`);
}

console.log('[Seed] 完成。');
process.exit(0);