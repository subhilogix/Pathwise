import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY is not configured on the backend server. Please set your valid Gemini API key in .env');
  }
  return new GoogleGenerativeAI(apiKey);
}

export function isGeminiKeyConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return !!apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
}

export interface ChatMessageParam {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// ---------------------------------------------------------------------------
// 1. Live Conversational Intake Chat
// ---------------------------------------------------------------------------
export async function callGeminiChat(
  history: { role: 'user' | 'model'; text: string }[],
  currentProfile: any
): Promise<{ reply: string; suggestedOptions: string[]; extractedProfile: any }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `You are PathWise, a world-class AI Learning Architect and personal education advisor.
Your mission is to discover the user's specific learning ambitions, existing technical background, weekly available study hours, and preferred technologies/projects through dynamic, engaging, and intelligent dialogue.
Never use canned or generic responses. Address the user's exact words, questions, and background context directly with insightful guidance.

Current Learner Profile: ${JSON.stringify(currentProfile)}

CRITICAL RESPONSE FORMAT:
Respond with a helpful, encouraging markdown response.
At the very end of your response, you MUST output a single JSON block wrapped in \`\`\`json ... \`\`\` with this exact schema:
\`\`\`json
{
  "options": ["Option 1", "Option 2", "Option 3"],
  "extracted": {
    "goal": "summarized learning goal",
    "domain": "e.g. Game Development, AI/ML, Full-Stack Web, Embedded Systems, etc.",
    "experience_level": "beginner" | "intermediate" | "advanced",
    "time_budget_hours_per_week": 10,
    "interests": ["Tech1", "Tech2"]
  }
}
\`\`\``
  });

  const formattedContents: ChatMessageParam[] = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const result = await model.generateContent({
    contents: formattedContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  });

  const rawText = result.response.text();

  let reply = rawText;
  let suggestedOptions: string[] = [];
  let extractedProfile: any = {};

  // Try extracting json block (both closed and trailing)
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)(?:```|$)/);
  if (jsonMatch) {
    try {
      let jsonStr = jsonMatch[1].trim();
      // If trailing brackets were cut off, attempt balancing
      if (!jsonStr.endsWith('}')) {
        const openBraces = (jsonStr.match(/{/g) || []).length;
        const closeBraces = (jsonStr.match(/}/g) || []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonStr += '\n}';
        }
      }
      const parsed = JSON.parse(jsonStr);
      suggestedOptions = parsed.options || [];
      extractedProfile = parsed.extracted || {};
      reply = rawText.replace(/```json[\s\S]*?(?:```|$)/, '').trim();
    } catch {
      // Fallback regex extraction for options and extracted fields if JSON was slightly malformed
      const optionsMatch = rawText.match(/"options":\s*\[([\s\S]*?)\]/);
      if (optionsMatch) {
        const matches = optionsMatch[1].match(/"([^"]+)"/g);
        if (matches) {
          suggestedOptions = matches.map(m => m.replace(/"/g, ''));
        }
      }
      reply = rawText.replace(/```json[\s\S]*?(?:```|$)/, '').trim();
    }
  }

  if (suggestedOptions.length === 0) {
    suggestedOptions = ['🚀 Generate My Custom AI Roadmap', 'Adjust weekly time commitment', 'Explain course sequencing'];
  }

  return {
    reply,
    suggestedOptions,
    extractedProfile
  };
}

// ---------------------------------------------------------------------------
// 2. Live Dynamic Curriculum & Course Synthesis
// ---------------------------------------------------------------------------
export async function generateLiveCurriculum(
  user: any
): Promise<{ stages: any[]; generatedCourses: any[]; skillVector: any[] }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4
    }
  });

  const prompt = `Generate a complete, personalized 4-stage technical learning roadmap and custom course catalog for this learner:
Learner Goal: "${user.goal}"
Domain: "${user.goal_tags?.[0] || 'Software Engineering'}"
Experience Level: "${user.experience_level || 'beginner'}"
Weekly Time Budget: ${user.time_budget_hours_per_week || 10} hours/week
Interests / Specific Tools: ${(user.interests || []).join(', ')}

Return a strict JSON object with this exact structure:
{
  "skills": [
    { "skill": "Core Tool/Language Name", "proficiency": 35 }
  ],
  "courses": [
    {
      "id": "slug-unique-id",
      "title": "Clear, Descriptive Course / Project Title",
      "description": "2-3 sentences explaining exactly what is built and learned.",
      "domain": "${user.goal_tags?.[0] || 'Software Engineering'}",
      "type": "course" | "project" | "assessment",
      "skills_taught": ["Skill A", "Skill B"],
      "prerequisite_skills": ["Prerequisite Skill C"],
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimated_hours": 12,
      "provider": "Interactive Academy / Verified Hub"
    }
  ],
  "stages": [
    {
      "title": "Stage 1: Foundations & Core Tooling",
      "milestone": "Foundational Badge / Milestone description",
      "items": [
        {
          "course_id": "slug-unique-id",
          "reason": "Specific pedagogical rationale why this course is scheduled at this step."
        }
      ]
    }
  ]
}

REQUIREMENTS:
1. Provide exactly 4 sequential stages:
   - Stage 1: Foundations & Primitives
   - Stage 2: Core Competencies & Architecture
   - Stage 3: Applied Real-World Systems & Scale
   - Stage 4: Flagship Capstone Portfolio & Production Readiness
2. Create 6 to 10 distinct, highly relevant courses/projects tailored directly to "${user.goal}".
3. Ensure prerequisite dependencies make strict pedagogical sense (topological integrity).
4. Do NOT use placeholder values; write real, tailored content.`;

  const result = await model.generateContent(prompt);
  const jsonText = result.response.text();
  const parsed = JSON.parse(jsonText);

  if (!parsed.courses || !parsed.stages) {
    throw new Error('Gemini API returned an invalid curriculum structure');
  }

  const generatedCourses = parsed.courses;
  let globalOrder = 0;

  const stages = parsed.stages.map((st: any) => ({
    title: st.title,
    milestone: st.milestone || 'Stage Milestone',
    items: (st.items || []).map((it: any) => ({
      course_id: it.course_id,
      status: globalOrder === 0 ? 'available' : 'locked',
      reason: it.reason || `Essential step towards ${user.goal}`,
      order_index: globalOrder++
    }))
  }));

  const skillVector = parsed.skills || [
    { skill: user.goal_tags?.[0] || 'Core Concepts', proficiency: 30 }
  ];

  return {
    stages,
    generatedCourses,
    skillVector
  };
}

// ---------------------------------------------------------------------------
// 3. Live Adaptive Roadmap Rebalancing
// ---------------------------------------------------------------------------
export async function adaptLivePath(
  currentPath: any,
  user: any,
  itemId: string,
  feedback: string
): Promise<{ updatedPath: any; updatedUser: any; actionMessage: string }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const prompt = `The user gave feedback on a course item in their learning path:
User Goal: "${user.goal}"
Current Experience Level: "${user.experience_level}"
Item Feedback: Course ID "${itemId}" was marked as "${feedback}" (Options: too_easy, too_hard, not_relevant, loved_it, skip).

Current Stages & Items: ${JSON.stringify(currentPath.stages)}

Analyze this feedback and return updated stages with appropriate modifications (e.g. unlock downstream items if skipped or completed, insert an alternative prerequisite if too hard, or swap for advanced module if too easy).

Return strict JSON:
{
  "actionMessage": "Clear explanation of how the roadmap adapted to the feedback.",
  "experience_level": "beginner" | "intermediate" | "advanced",
  "stages": [ ...updated stages array... ]
}`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());

  const updatedPath = {
    ...currentPath,
    stages: parsed.stages || currentPath.stages
  };

  const updatedUser = {
    ...user,
    experience_level: parsed.experience_level || user.experience_level
  };

  return {
    updatedPath,
    updatedUser,
    actionMessage: parsed.actionMessage || `Adapted roadmap based on feedback (${feedback}).`
  };
}

// ---------------------------------------------------------------------------
// 4. Live Contextual AI Assistant
// ---------------------------------------------------------------------------
export async function askLiveAssistant(
  query: string,
  user: any,
  learningPath: any,
  allCourses: any[]
): Promise<{ reply: string; confirmationAction?: { label: string; type: string; payload: any } }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `You are PathWise AI Study Tutor, an intelligent mentor with deep awareness of the learner's live curriculum.
User: ${user.name} (Goal: "${user.goal}", Domain: "${user.goal_tags?.[0]}", Budget: ${user.time_budget_hours_per_week}h/week)
Active Roadmap Snapshot: ${JSON.stringify(learningPath?.stages || [])}
Course Catalog: ${JSON.stringify(allCourses || [])}

Provide a concise, accurate markdown explanation answering the user's exact query.
If the user asks to skip a course or change their study hours, you may suggest a confirmation action in a concluding JSON block:
\`\`\`json
{
  "action": {
    "label": "Skip 'Course Title' & unlock next?",
    "type": "SKIP_ITEM" | "UPDATE_TIME_BUDGET",
    "payload": { "itemId": "id" } or { "hours": 15 }
  }
}
\`\`\``
  });

  const result = await model.generateContent(query);
  const rawText = result.response.text();

  let reply = rawText;
  let confirmationAction = undefined;

  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action) {
        confirmationAction = parsed.action;
      }
      reply = rawText.replace(/```json[\s\S]*?```/, '').trim();
    } catch {
      // Ignore parse failure
    }
  }

  return { reply, confirmationAction };
}
