const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { generateId, now } = require('../utils/helpers');

const router = express.Router();

// 所有课程路由都需要认证
router.use(authenticateToken);

// 获取课程列表
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const courses = db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
    
    const result = courses.map(course => {
      const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(course.id, req.user.id);
      const examPoints = db.prepare('SELECT id, title, priority, description, source_file, sort_order FROM exam_points WHERE course_id = ? AND user_id = ? ORDER BY sort_order').all(course.id, req.user.id);
      const lessons = db.prepare('SELECT id, course_id, order_num, title, priority, status, coins, completed_at FROM lessons WHERE course_id = ? AND user_id = ? ORDER BY order_num').all(course.id, req.user.id);
      const files = db.prepare('SELECT id, name, ext, size, uploaded_at FROM course_files WHERE course_id = ?').all(course.id);
      
      return {
        course: { ...course, files },
        examPoints,
        lessons,
        progress: progress || { totalLessons: lessons.length, completedLessons: 0, chillCoins: 0, currentStreak: 0 },
        rawText: course.raw_text || '',
        generatingLessons: false,
        generationProgress: { current: 0, total: 0 },
      };
    });
    
    res.json({ courses: result });
  } catch (err) {
    console.error('[Courses] 获取课程列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建课程
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '课程名称不能为空' });
    }

    const db = getDb();
    const trimmedName = name.trim();
    
    const existing = db.prepare('SELECT id FROM courses WHERE user_id = ? AND name = ?').get(req.user.id, trimmedName);
    if (existing) {
      return res.status(409).json({ error: '已存在同名课程', courseId: existing.id });
    }

    const id = generateId();
    const timestamp = now();
    
    db.prepare('INSERT INTO courses (id, user_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, trimmedName, 'empty', timestamp, timestamp);
    
    const progressId = generateId();
    db.prepare('INSERT INTO progress (id, course_id, user_id, updated_at) VALUES (?, ?, ?, ?)').run(progressId, id, req.user.id, timestamp);
    
    res.status(201).json({
      course: { id, name: trimmedName, files: [], status: 'empty', createdAt: timestamp, updatedAt: timestamp },
      examPoints: [],
      lessons: [],
      progress: { totalLessons: 0, completedLessons: 0, chillCoins: 0, currentStreak: 0 },
      rawText: '',
      generatingLessons: false,
      generationProgress: { current: 0, total: 0 },
    });
  } catch (err) {
    console.error('[Courses] 创建课程失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新课程（重命名）
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    const db = getDb();
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!course) return res.status(404).json({ error: '课程不存在' });

    if (name && name.trim()) {
      db.prepare('UPDATE courses SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now(), req.params.id);
    }
    
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('[Courses] 更新课程失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除课程
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!course) return res.status(404).json({ error: '课程不存在' });

    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[Courses] 删除课程失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 设置考试日期
router.put('/:id/exam-date', (req, res) => {
  try {
    const { examDate } = req.body;
    const db = getDb();
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!course) return res.status(404).json({ error: '课程不存在' });

    db.prepare('UPDATE courses SET exam_date = ?, updated_at = ? WHERE id = ?').run(examDate || '', now(), req.params.id);
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('[Courses] 设置考试日期失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 导出课程
router.get('/:id/export', (req, res) => {
  try {
    const db = getDb();
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!course) return res.status(404).json({ error: '课程不存在' });

    const examPoints = db.prepare('SELECT * FROM exam_points WHERE course_id = ? AND user_id = ? ORDER BY sort_order').all(req.params.id, req.user.id);
    const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? AND user_id = ? ORDER BY order_num').all(req.params.id, req.user.id);
    const progress = db.prepare('SELECT * FROM progress WHERE course_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    const files = db.prepare('SELECT id, name, ext, size, uploaded_at, storage_path FROM course_files WHERE course_id = ?').all(req.params.id);

    const bundle = {
      course: { ...course, files, examDate: course.exam_date || undefined },
      examPoints: examPoints.map(ep => ({
        ...ep, keyFormulas: JSON.parse(ep.key_formulas || '[]'), pageRefs: JSON.parse(ep.page_refs || '[]')
      })),
      lessons: lessons.map(l => ({
        ...l, keyPoints: JSON.parse(l.key_points || '[]'), examples: JSON.parse(l.examples || '[]'), quiz: JSON.parse(l.quiz || '[]')
      })),
      progress: progress || { totalLessons: lessons.length, completedLessons: 0, chillCoins: 0, currentStreak: 0 },
      rawText: course.raw_text || '',
      generatingLessons: false,
      generationProgress: { current: 0, total: 0 },
    };

    res.json(bundle);
  } catch (err) {
    console.error('[Courses] 导出课程失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 导入课程
router.post('/import', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.course) return res.status(400).json({ error: '无效的课程数据' });

    const db = getDb();
    const newCourseId = generateId();
    const timestamp = now();

    db.prepare('INSERT INTO courses (id, user_id, name, status, raw_text, exam_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      newCourseId, req.user.id, data.course.name, 'ready', data.rawText || '', data.course.examDate || '', timestamp, timestamp
    );

    if (data.examPoints) {
      for (const ep of data.examPoints) {
        const newId = generateId();
        db.prepare('INSERT INTO exam_points (id, course_id, user_id, title, priority, description, key_formulas, page_refs, source_file, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          newId, newCourseId, req.user.id, ep.title, ep.priority, ep.description || '',
          JSON.stringify(ep.keyFormulas || []), JSON.stringify(ep.pageRefs || []), ep.sourceFile || '', ep.sort_order || 0, timestamp
        );
      }
    }

    if (data.lessons) {
      for (const l of data.lessons) {
        const newId = generateId();
        db.prepare('INSERT INTO lessons (id, course_id, user_id, exam_point_id, order_num, title, priority, status, coins, key_points, explanation, examples, quiz, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          newId, newCourseId, req.user.id, l.exam_point_id || '', l.order_num, l.title, l.priority, l.status || 'locked', l.coins || 30,
          JSON.stringify(l.keyPoints || []), l.explanation || '', JSON.stringify(l.examples || []), JSON.stringify(l.quiz || []), timestamp
        );
      }
    }

    const progressId = generateId();
    const p = data.progress || {};
    db.prepare('INSERT INTO progress (id, course_id, user_id, completed_lessons, chill_coins, current_streak, total_study_minutes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      progressId, newCourseId, req.user.id, p.completedLessons || 0, p.chillCoins || 0, p.currentStreak || 0, p.totalStudyMinutes || 0, timestamp
    );

    res.status(201).json({ courseId: newCourseId });
  } catch (err) {
    console.error('[Courses] 导入课程失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
