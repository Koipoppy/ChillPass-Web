const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${generateId()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.pptx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 上传文件
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未选择文件' });
    const { courseId } = req.body;

    const db = getDb();
    const id = generateId();
    const file = {
      id, name: req.file.originalname, ext: path.extname(req.file.originalname).toLowerCase(),
      size: req.file.size, storage_path: req.file.filename, uploaded_at: now(),
    };

    if (courseId) {
      const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(courseId, req.user.id);
      if (!course) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: '课程不存在' });
      }
      db.prepare('INSERT INTO course_files (id, course_id, user_id, name, ext, size, storage_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(file.id, courseId, req.user.id, file.name, file.ext, file.size, file.storage_path, file.uploaded_at);
      db.prepare('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?').run('uploaded', now(), courseId);
    } else {
      db.prepare('INSERT INTO course_files (id, course_id, user_id, name, ext, size, storage_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(file.id, '', req.user.id, file.name, file.ext, file.size, file.storage_path, file.uploaded_at);
    }

    res.status(201).json({ file: { id: file.id, name: file.name, ext: file.ext, size: file.size } });
  } catch (err) {
    console.error('[Files] 上传文件失败:', err);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 删除文件
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const file = db.prepare('SELECT * FROM course_files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: '文件不存在' });

    const filePath = path.join(uploadDir, file.storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM course_files WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[Files] 删除文件失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// 下载文件
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const file = db.prepare('SELECT * FROM course_files WHERE id = ?').get(req.params.id);
    if (!file) return res.status(404).json({ error: '文件不存在' });

    const filePath = path.join(uploadDir, file.storage_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已丢失' });

    res.download(filePath, file.name);
  } catch (err) {
    console.error('[Files] 下载文件失败:', err);
    res.status(500).json({ error: '下载失败' });
  }
});

module.exports = router;
