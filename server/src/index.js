const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase } = require('./db/database');
const { getLocalIp } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 服务端健康检查（放在 API 路由之前，避免被 auth 中间件拦截）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.2.3', timestamp: Date.now() });
});

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api', require('./routes/examPoints'));
app.use('/api', require('./routes/lessons'));
app.use('/api', require('./routes/progress'));
app.use('/api/files', require('./routes/files'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/wrong-questions', require('./routes/wrongQuestions'));
app.use('/api/athena', require('./routes/athena'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));

// 生产环境：静态文件服务
const distDir = path.join(__dirname, '../../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA 路由回退
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API 端点不存在' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log(`[Server] 静态文件目录: ${distDir}`);
} else {
  console.log('[Server] 未找到 dist 目录，仅提供 API 服务（开发模式）');
}

// 初始化数据库
initDatabase();

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('');
  console.log('  ============================================');
  console.log('                                             ');
  console.log('   ChillPass 服务端 v1.2.3 已启动             ');
  console.log('                                             ');
  console.log(`   本地访问:  http://localhost:${PORT}        `);
  console.log(`   局域网访问: http://${localIp}:${PORT}      `);
  console.log('                                             ');
  console.log('   按 Ctrl+C 停止服务器                      ');
  console.log('                                             ');
  console.log('  ============================================');
  console.log('');
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Server] 错误:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB）' });
  }
  res.status(500).json({ error: '服务器内部错误' });
});
