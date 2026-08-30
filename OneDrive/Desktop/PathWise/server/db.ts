import Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// SQLite database file in the project root
const dbPath = path.resolve(process.cwd(), 'pathwise.db');
export const sqlite = new Database(dbPath);

// Enable WAL mode for high concurrency and performance
sqlite.pragma('journal_mode = WAL');

// Optional Supabase cloud client
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY && process.env.SUPABASE_URL !== 'https://your-project.supabase.co') {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('⚡ Supabase Cloud Client configured');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

let isDbReady = false;

export function isDatabaseConnected(): boolean {
  return isDbReady;
}

export function getDatabaseType(): string {
  if (supabase) return 'Supabase + SQLite';
  return 'SQLite (pathwise.db)';
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    // Initialize SQLite tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        experience_level TEXT NOT NULL,
        goal TEXT NOT NULL,
        goal_tags TEXT NOT NULL DEFAULT '[]',
        time_budget_hours_per_week INTEGER NOT NULL DEFAULT 10,
        completed_courses TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS user_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        proficiency INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, skill),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        domain TEXT NOT NULL,
        type TEXT NOT NULL,
        skills_taught TEXT NOT NULL DEFAULT '[]',
        prerequisite_skills TEXT NOT NULL DEFAULT '[]',
        difficulty TEXT NOT NULL,
        estimated_hours INTEGER NOT NULL DEFAULT 10,
        provider TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS learning_paths (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        goal_snapshot TEXT NOT NULL,
        generated_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS stages (
        id TEXT PRIMARY KEY,
        path_id TEXT NOT NULL,
        stage_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        milestone TEXT NOT NULL,
        FOREIGN KEY(path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS path_items (
        id TEXT PRIMARY KEY,
        stage_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'locked',
        reason TEXT NOT NULL,
        order_index REAL NOT NULL DEFAULT 0,
        FOREIGN KEY(stage_id) REFERENCES stages(id) ON DELETE CASCADE,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS feedback_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        path_item_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')),
        resulting_action TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        options TEXT DEFAULT '[]',
        timestamp TEXT DEFAULT (datetime('now'))
      );
    `);

    isDbReady = true;
    console.log(`✅ Database schema initialized successfully (${getDatabaseType()})`);
    return true;
  } catch (err: any) {
    console.error('❌ Database initialization error:', err.message);
    isDbReady = false;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Database Repository Methods (ACID Transactions in SQLite)
// ---------------------------------------------------------------------------

export async function dbSaveUser(user: any): Promise<void> {
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, name, email, experience_level, goal, goal_tags, time_budget_hours_per_week, completed_courses, updated_at)
    VALUES (@id, @name, @email, @experience_level, @goal, @goal_tags, @time_budget_hours_per_week, @completed_courses, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      experience_level = excluded.experience_level,
      goal = excluded.goal,
      goal_tags = excluded.goal_tags,
      time_budget_hours_per_week = excluded.time_budget_hours_per_week,
      completed_courses = excluded.completed_courses,
      updated_at = datetime('now')
  `);

  const insertSkill = sqlite.prepare(`
    INSERT INTO user_skills (user_id, skill, proficiency)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, skill) DO UPDATE SET proficiency = excluded.proficiency
  `);

  const saveTx = sqlite.transaction(() => {
    insertUser.run({
      id: user.id,
      name: user.name || 'Learner',
      email: user.email || 'learner@pathwise.edu',
      experience_level: user.experience_level || 'beginner',
      goal: user.goal || 'Learn Software Engineering',
      goal_tags: JSON.stringify(user.goal_tags || ['Software Engineering']),
      time_budget_hours_per_week: user.time_budget_hours_per_week || 10,
      completed_courses: JSON.stringify(user.completed_courses || [])
    });

    if (user.skill_vector && Array.isArray(user.skill_vector)) {
      for (const sv of user.skill_vector) {
        insertSkill.run(user.id, sv.skill, sv.proficiency);
      }
    }
  });

  saveTx();

  // If Supabase is connected, sync user as well
  if (supabase) {
    supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      experience_level: user.experience_level,
      goal: user.goal,
      goal_tags: user.goal_tags,
      time_budget_hours_per_week: user.time_budget_hours_per_week,
      completed_courses: user.completed_courses
    }).then();
  }
}

export async function dbGetUser(userId: string): Promise<any | null> {
  const row: any = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) return null;

  const skills: any[] = sqlite.prepare('SELECT skill, proficiency FROM user_skills WHERE user_id = ?').all(userId);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    experience_level: row.experience_level,
    goal: row.goal,
    goal_tags: JSON.parse(row.goal_tags || '[]'),
    time_budget_hours_per_week: row.time_budget_hours_per_week,
    completed_courses: JSON.parse(row.completed_courses || '[]'),
    skill_vector: skills
  };
}

export async function dbSaveCourse(course: any): Promise<void> {
  const stmt = sqlite.prepare(`
    INSERT INTO courses (id, title, description, domain, type, skills_taught, prerequisite_skills, difficulty, estimated_hours, provider)
    VALUES (@id, @title, @description, @domain, @type, @skills_taught, @prerequisite_skills, @difficulty, @estimated_hours, @provider)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      domain = excluded.domain,
      type = excluded.type,
      skills_taught = excluded.skills_taught,
      prerequisite_skills = excluded.prerequisite_skills,
      difficulty = excluded.difficulty,
      estimated_hours = excluded.estimated_hours,
      provider = excluded.provider
  `);

  stmt.run({
    id: course.id,
    title: course.title,
    description: course.description,
    domain: course.domain,
    type: course.type,
    skills_taught: JSON.stringify(course.skills_taught || []),
    prerequisite_skills: JSON.stringify(course.prerequisite_skills || []),
    difficulty: course.difficulty,
    estimated_hours: course.estimated_hours || 10,
    provider: course.provider || 'PathWise Verified'
  });
}

export async function dbSaveLearningPath(path: any, courses: any[]): Promise<void> {
  const insertCourse = sqlite.prepare(`
    INSERT INTO courses (id, title, description, domain, type, skills_taught, prerequisite_skills, difficulty, estimated_hours, provider)
    VALUES (@id, @title, @description, @domain, @type, @skills_taught, @prerequisite_skills, @difficulty, @estimated_hours, @provider)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      domain = excluded.domain,
      type = excluded.type,
      skills_taught = excluded.skills_taught,
      prerequisite_skills = excluded.prerequisite_skills,
      difficulty = excluded.difficulty,
      estimated_hours = excluded.estimated_hours,
      provider = excluded.provider
  `);

  const insertPath = sqlite.prepare(`
    INSERT INTO learning_paths (id, user_id, goal_snapshot, generated_at, updated_at)
    VALUES (@id, @user_id, @goal_snapshot, @generated_at, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      goal_snapshot = excluded.goal_snapshot,
      updated_at = datetime('now')
  `);

  const deleteStages = sqlite.prepare('DELETE FROM stages WHERE path_id = ?');
  const insertStage = sqlite.prepare(`
    INSERT INTO stages (id, path_id, stage_index, title, milestone)
    VALUES (@id, @path_id, @stage_index, @title, @milestone)
  `);

  const insertItem = sqlite.prepare(`
    INSERT INTO path_items (id, stage_id, course_id, status, reason, order_index)
    VALUES (@id, @stage_id, @course_id, @status, @reason, @order_index)
  `);

  const tx = sqlite.transaction(() => {
    // 1. Save courses
    for (const c of courses) {
      insertCourse.run({
        id: c.id,
        title: c.title,
        description: c.description,
        domain: c.domain,
        type: c.type,
        skills_taught: JSON.stringify(c.skills_taught || []),
        prerequisite_skills: JSON.stringify(c.prerequisite_skills || []),
        difficulty: c.difficulty,
        estimated_hours: c.estimated_hours || 10,
        provider: c.provider || 'PathWise Verified'
      });
    }

    // 2. Save path
    insertPath.run({
      id: path.id,
      user_id: path.user_id,
      goal_snapshot: path.goal_snapshot,
      generated_at: path.generated_at || new Date().toISOString()
    });

    // 3. Clear old stages
    deleteStages.run(path.id);

    // 4. Save stages and path items
    for (let sIdx = 0; sIdx < path.stages.length; sIdx++) {
      const stage = path.stages[sIdx];
      const stageId = `stage-${path.id}-${sIdx}`;

      insertStage.run({
        id: stageId,
        path_id: path.id,
        stage_index: sIdx,
        title: stage.title,
        milestone: stage.milestone
      });

      for (let iIdx = 0; iIdx < stage.items.length; iIdx++) {
        const item = stage.items[iIdx];
        const itemId = `item-${stageId}-${iIdx}-${item.course_id}`;

        insertItem.run({
          id: itemId,
          stage_id: stageId,
          course_id: item.course_id,
          status: item.status || 'locked',
          reason: item.reason,
          order_index: item.order_index ?? iIdx
        });
      }
    }
  });

  tx();

  // If Supabase is connected, sync learning path as well
  if (supabase) {
    supabase.from('learning_paths').upsert({
      id: path.id,
      user_id: path.user_id,
      goal_snapshot: path.goal_snapshot,
      generated_at: path.generated_at || new Date().toISOString()
    }).then();
  }
}

export async function dbGetLearningPath(userId: string): Promise<any | null> {
  const pathRow: any = sqlite.prepare(
    'SELECT * FROM learning_paths WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(userId);

  if (!pathRow) return null;

  const stageRows: any[] = sqlite.prepare(
    'SELECT * FROM stages WHERE path_id = ? ORDER BY stage_index ASC'
  ).all(pathRow.id);

  const stages = [];
  for (const stage of stageRows) {
    const itemRows: any[] = sqlite.prepare(`
      SELECT pi.*, c.title, c.description, c.domain, c.type, c.skills_taught, c.prerequisite_skills, c.difficulty, c.estimated_hours, c.provider
      FROM path_items pi
      JOIN courses c ON pi.course_id = c.id
      WHERE pi.stage_id = ?
      ORDER BY pi.order_index ASC
    `).all(stage.id);

    stages.push({
      title: stage.title,
      milestone: stage.milestone,
      items: itemRows.map(r => ({
        course_id: r.course_id,
        status: r.status,
        reason: r.reason,
        order_index: r.order_index
      }))
    });
  }

  return {
    id: pathRow.id,
    user_id: pathRow.user_id,
    goal_snapshot: pathRow.goal_snapshot,
    generated_at: pathRow.generated_at,
    stages
  };
}

export async function dbGetAllCourses(): Promise<any[]> {
  const rows: any[] = sqlite.prepare('SELECT * FROM courses ORDER BY title ASC').all();
  return rows.map(r => ({
    ...r,
    skills_taught: JSON.parse(r.skills_taught || '[]'),
    prerequisite_skills: JSON.parse(r.prerequisite_skills || '[]')
  }));
}

export async function dbUpdateItemStatus(userId: string, courseId: string, newStatus: string): Promise<void> {
  const tx = sqlite.transaction(() => {
    // Find path_item by joining through stages and learning_paths
    const item: any = sqlite.prepare(`
      SELECT pi.id
      FROM path_items pi
      JOIN stages s ON pi.stage_id = s.id
      JOIN learning_paths lp ON s.path_id = lp.id
      WHERE lp.user_id = ? AND pi.course_id = ?
    `).get(userId, courseId);

    if (item) {
      sqlite.prepare('UPDATE path_items SET status = ? WHERE id = ?').run(newStatus, item.id);
    }

    if (newStatus === 'completed') {
      const userRow: any = sqlite.prepare('SELECT completed_courses FROM users WHERE id = ?').get(userId);
      if (userRow) {
        const completed: string[] = JSON.parse(userRow.completed_courses || '[]');
        if (!completed.includes(courseId)) {
          completed.push(courseId);
          sqlite.prepare('UPDATE users SET completed_courses = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(JSON.stringify(completed), userId);
        }
      }
    }
  });

  tx();

  if (supabase) {
    supabase.from('path_items').update({ status: newStatus }).match({ course_id: courseId }).then();
  }
}

export async function dbLogFeedback(event: any): Promise<void> {
  const evtId = event.id || `evt-${Date.now()}`;
  const timestamp = event.timestamp || new Date().toISOString();

  sqlite.prepare(`
    INSERT INTO feedback_events (id, user_id, path_item_id, feedback_type, timestamp, resulting_action)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    evtId,
    event.user_id,
    event.path_item_id,
    event.feedback_type,
    timestamp,
    event.resulting_action
  );

  if (supabase) {
    supabase.from('feedback_events').upsert({
      id: evtId,
      user_id: event.user_id,
      path_item_id: event.path_item_id,
      feedback_type: event.feedback_type,
      timestamp,
      resulting_action: event.resulting_action
    }).then();
  }
}

export async function dbGetFeedbackLogs(userId: string): Promise<any[]> {
  return sqlite.prepare(
    'SELECT * FROM feedback_events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50'
  ).all(userId);
}
