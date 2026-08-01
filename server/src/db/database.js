const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let db = null;

function getDbPath() {
  return path.resolve(__dirname, '../../', process.env.CHILLPASS_DB_PATH || './data/chillpass.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  runMigrations();
  console.log(`[DB] 数据库已初始化: ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('数据库未初始化');
  return db;
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL DEFAULT '',
      avatar        TEXT NOT NULL DEFAULT '🦊',
      bio           TEXT DEFAULT '',
      is_teacher    INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS courses (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'empty',
      raw_text   TEXT DEFAULT '',
      exam_date  TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);

    CREATE TABLE IF NOT EXISTS course_files (
      id          TEXT PRIMARY KEY,
      course_id   TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      ext         TEXT NOT NULL,
      size        INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_course_files_course ON course_files(course_id);

    CREATE TABLE IF NOT EXISTS exam_points (
      id          TEXT PRIMARY KEY,
      course_id   TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      priority    TEXT NOT NULL,
      description TEXT DEFAULT '',
      key_formulas TEXT DEFAULT '[]',
      page_refs   TEXT DEFAULT '[]',
      source_file TEXT DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_exam_points_course ON exam_points(course_id);

    CREATE TABLE IF NOT EXISTS lessons (
      id            TEXT PRIMARY KEY,
      course_id     TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      exam_point_id TEXT NOT NULL,
      order_num     INTEGER NOT NULL,
      title         TEXT NOT NULL,
      priority      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'locked',
      coins         INTEGER NOT NULL DEFAULT 30,
      key_points    TEXT DEFAULT '[]',
      explanation   TEXT DEFAULT '',
      examples      TEXT DEFAULT '[]',
      quiz          TEXT DEFAULT '[]',
      completed_at  INTEGER,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_point_id) REFERENCES exam_points(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);

    CREATE TABLE IF NOT EXISTS progress (
      id                  TEXT PRIMARY KEY,
      course_id           TEXT NOT NULL,
      user_id             TEXT NOT NULL,
      completed_lessons   INTEGER NOT NULL DEFAULT 0,
      chill_coins         INTEGER NOT NULL DEFAULT 0,
      current_streak      INTEGER NOT NULL DEFAULT 0,
      total_study_minutes INTEGER NOT NULL DEFAULT 0,
      last_study_date     TEXT DEFAULT '',
      updated_at          INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(course_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_progress_user_course ON progress(user_id, course_id);

    CREATE TABLE IF NOT EXISTS wrong_questions (
      id              TEXT PRIMARY KEY,
      course_id       TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      lesson_id       TEXT NOT NULL,
      lesson_title    TEXT NOT NULL,
      question        TEXT NOT NULL,
      options         TEXT DEFAULT '[]',
      correct_index   INTEGER,
      correct_indices TEXT DEFAULT '[]',
      selected_index  INTEGER,
      selected_indices TEXT DEFAULT '[]',
      user_answer     TEXT DEFAULT '',
      correct_answer  TEXT DEFAULT '',
      quiz_type       TEXT NOT NULL,
      explanation     TEXT DEFAULT '',
      exam_point_title TEXT DEFAULT '',
      priority        TEXT NOT NULL,
      resolved        INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_user ON wrong_questions(user_id, course_id);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL,
      course_id TEXT,
      role      TEXT NOT NULL,
      content   TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, course_id);

    CREATE TABLE IF NOT EXISTS athena_memories (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      category   TEXT DEFAULT '',
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_athena_memories_user ON athena_memories(user_id);

    CREATE TABLE IF NOT EXISTS athena_abilities (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL,
      auto_generated INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_athena_abilities_user ON athena_abilities(user_id);

    CREATE TABLE IF NOT EXISTS study_time (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      total_seconds     INTEGER NOT NULL DEFAULT 0,
      coins_awarded_min INTEGER NOT NULL DEFAULT 0,
      updated_at        INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      data    TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log('[DB] 数据库迁移完成');
}

module.exports = { initDatabase, getDb, getDbPath };


