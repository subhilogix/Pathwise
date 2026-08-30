import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  initializeDatabase, 
  isDatabaseConnected, 
  getDatabaseType,
  dbSaveUser, 
  dbGetUser, 
  dbSaveLearningPath, 
  dbGetLearningPath, 
  dbGetAllCourses, 
  dbUpdateItemStatus, 
  dbLogFeedback, 
  dbGetFeedbackLogs 
} from './db';
import { 
  isGeminiKeyConfigured, 
  callGeminiChat, 
  generateLiveCurriculum, 
  adaptLivePath, 
  askLiveAssistant 
} from './gemini';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Health & Diagnostic Endpoint
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const geminiConfigured = isGeminiKeyConfigured();
  const dbConnected = isDatabaseConnected();

  res.json({
    ok: geminiConfigured && dbConnected,
    geminiConfigured,
    dbConnected,
    databaseType: getDatabaseType(),
    geminiModel: 'gemini-2.5-flash',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// 1. Conversational Intake Chat
// ---------------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, currentProfile } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    const result = await callGeminiChat(messages, currentProfile || {});
    res.json(result);
  } catch (err: any) {
    console.error('API /api/chat error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to communicate with live Gemini API' 
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Generate Custom Learning Path & Save to Database
// ---------------------------------------------------------------------------
app.post('/api/generate-path', async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.goal) {
      return res.status(400).json({ error: 'Missing user profile or goal' });
    }

    // Call live Gemini API
    const { stages, generatedCourses, skillVector } = await generateLiveCurriculum(user);

    const userToSave = {
      ...user,
      skill_vector: skillVector
    };

    const pathId = `path-${user.id}-${Date.now()}`;
    const learningPath = {
      id: pathId,
      user_id: user.id,
      goal_snapshot: user.goal,
      generated_at: new Date().toISOString(),
      stages
    };

    // Commit to SQLite / Supabase
    if (isDatabaseConnected()) {
      await dbSaveUser(userToSave);
      await dbSaveLearningPath(learningPath, generatedCourses);
    }

    res.json({
      user: userToSave,
      learningPath,
      generatedCourses
    });
  } catch (err: any) {
    console.error('API /api/generate-path error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to generate curriculum with live Gemini API' 
    });
  }
});

// ---------------------------------------------------------------------------
// 3. User Profile & Data Fetch
// ---------------------------------------------------------------------------
app.get('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!isDatabaseConnected()) {
      return res.status(503).json({ error: 'Database is not connected' });
    }

    const user = await dbGetUser(userId);
    const learningPath = await dbGetLearningPath(userId);
    const feedbackLog = await dbGetFeedbackLogs(userId);
    const allCourses = await dbGetAllCourses();

    res.json({
      user,
      learningPath,
      feedbackLog,
      allCourses
    });
  } catch (err: any) {
    console.error('API /api/user/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/:id', async (req, res) => {
  try {
    const { user } = req.body;
    if (!user) return res.status(400).json({ error: 'Missing user payload' });

    if (isDatabaseConnected()) {
      await dbSaveUser(user);
    }
    res.json({ success: true, user });
  } catch (err: any) {
    console.error('API PUT /api/user/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Update Course Item Status (Start, Complete, Skip)
// ---------------------------------------------------------------------------
app.post('/api/items/:courseId/status', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ error: 'Missing userId or status' });
    }

    if (isDatabaseConnected()) {
      await dbUpdateItemStatus(userId, courseId, status);
    }

    res.json({ success: true, courseId, status });
  } catch (err: any) {
    console.error('API /api/items/:id/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Live Adaptive Roadmap Rebalancing
// ---------------------------------------------------------------------------
app.post('/api/adapt-path', async (req, res) => {
  try {
    const { userId, itemId, feedback } = req.body;
    if (!userId || !itemId || !feedback) {
      return res.status(400).json({ error: 'Missing userId, itemId, or feedback' });
    }

    let user = isDatabaseConnected() ? await dbGetUser(userId) : req.body.user;
    let learningPath = isDatabaseConnected() ? await dbGetLearningPath(userId) : req.body.learningPath;

    if (!user || !learningPath) {
      return res.status(404).json({ error: 'User or Learning Path not found' });
    }

    // Call live Gemini API to adapt
    const { updatedPath, updatedUser, actionMessage } = await adaptLivePath(
      learningPath,
      user,
      itemId,
      feedback
    );

    // Save update to SQLite / Supabase
    if (isDatabaseConnected()) {
      await dbSaveUser(updatedUser);
      const allCourses = await dbGetAllCourses();
      await dbSaveLearningPath(updatedPath, allCourses);
      await dbLogFeedback({
        id: `evt-${Date.now()}`,
        user_id: userId,
        path_item_id: itemId,
        feedback_type: feedback,
        timestamp: new Date().toISOString(),
        resulting_action: actionMessage
      });
    }

    res.json({
      updatedPath,
      updatedUser,
      actionMessage
    });
  } catch (err: any) {
    console.error('API /api/adapt-path error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to adapt learning path with live Gemini API' 
    });
  }
});

// ---------------------------------------------------------------------------
// 6. Live AI Assistant Tutor Q&A
// ---------------------------------------------------------------------------
app.post('/api/assistant', async (req, res) => {
  try {
    const { query, userId, user: fallbackUser, learningPath: fallbackPath } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const user = (isDatabaseConnected() && userId) ? await dbGetUser(userId) : fallbackUser;
    const learningPath = (isDatabaseConnected() && userId) ? await dbGetLearningPath(userId) : fallbackPath;
    const allCourses = isDatabaseConnected() ? await dbGetAllCourses() : [];

    const result = await askLiveAssistant(query, user, learningPath, allCourses);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/assistant error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to query live Gemini Assistant' 
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Get All Courses
// ---------------------------------------------------------------------------
app.get('/api/courses', async (_req, res) => {
  try {
    const courses = isDatabaseConnected() ? await dbGetAllCourses() : [];
    res.json({ courses });
  } catch (err: any) {
    console.error('API /api/courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
async function start() {
  console.log('🔄 Initializing SQLite / Supabase database connection...');
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 PathWise Backend Server running on http://localhost:${PORT}`);
    console.log(`🔑 Gemini Key Configured: ${isGeminiKeyConfigured() ? 'YES' : 'NO (Check .env)'}`);
    console.log(`🗄️  Database Connected (${getDatabaseType()}): ${isDatabaseConnected() ? 'YES' : 'NO'}`);
  });
}

start();
