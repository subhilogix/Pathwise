import type { User, LearningPath, Course, FeedbackEvent } from '../types';

export interface HealthStatus {
  ok: boolean;
  geminiConfigured: boolean;
  dbConnected: boolean;
  geminiModel?: string;
  timestamp?: string;
}

export interface ChatResponse {
  reply: string;
  suggestedOptions: string[];
  extractedProfile: Partial<User>;
}

export interface GeneratePathResponse {
  user: User;
  learningPath: LearningPath;
  generatedCourses: Course[];
}

export interface AdaptPathResponse {
  updatedPath: LearningPath;
  updatedUser: User;
  actionMessage: string;
}

export interface AssistantResponse {
  reply: string;
  confirmationAction?: {
    label: string;
    type: string;
    payload: any;
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // JSON parse failed, use status text
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  return handleResponse<HealthStatus>(res);
}

export async function sendChatMessage(
  messages: { role: 'user' | 'model'; text: string }[],
  currentProfile: Partial<User>
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, currentProfile })
  });
  return handleResponse<ChatResponse>(res);
}

export async function generateLearningPathAPI(user: User): Promise<GeneratePathResponse> {
  const res = await fetch('/api/generate-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  return handleResponse<GeneratePathResponse>(res);
}

export async function fetchUserData(userId: string): Promise<{
  user: User | null;
  learningPath: LearningPath | null;
  feedbackLog: FeedbackEvent[];
  allCourses: Course[];
}> {
  const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
  return handleResponse(res);
}

export async function updateItemStatusAPI(
  courseId: string,
  userId: string,
  status: string
): Promise<void> {
  const res = await fetch(`/api/items/${encodeURIComponent(courseId)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, status })
  });
  await handleResponse(res);
}

export async function adaptPathAPI(
  userId: string,
  itemId: string,
  feedback: string,
  fallbackUser?: User,
  fallbackPath?: LearningPath
): Promise<AdaptPathResponse> {
  const res = await fetch('/api/adapt-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      itemId,
      feedback,
      user: fallbackUser,
      learningPath: fallbackPath
    })
  });
  return handleResponse<AdaptPathResponse>(res);
}

export async function askAssistantAPI(
  query: string,
  userId?: string,
  fallbackUser?: User,
  fallbackPath?: LearningPath
): Promise<AssistantResponse> {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      userId,
      user: fallbackUser,
      learningPath: fallbackPath
    })
  });
  return handleResponse<AssistantResponse>(res);
}
