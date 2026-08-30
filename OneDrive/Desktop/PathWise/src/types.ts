export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type ResourceType = 'course' | 'project' | 'assessment';
export type ItemStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
export type FeedbackType = 'too_easy' | 'too_hard' | 'not_relevant' | 'loved_it' | 'skip';

export interface SkillProficiency {
  skill: string;
  proficiency: number; // 0 to 100
}

export interface User {
  id: string;
  name: string;
  email: string;
  experience_level: ExperienceLevel;
  interests: string[];
  goal: string;
  goal_tags: string[];
  time_budget_hours_per_week: number;
  completed_courses: string[]; // List of Course IDs
  skill_vector: SkillProficiency[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  domain: string; // e.g. 'Web Dev', 'Data Science', 'AI/ML', 'Cloud/DevOps'
  type: ResourceType;
  skills_taught: string[];
  prerequisite_skills: string[];
  difficulty: ExperienceLevel;
  estimated_hours: number;
  provider: string;
}

export interface PathItem {
  course_id: string;
  status: ItemStatus;
  reason: string;
  order_index: number;
}

export interface Stage {
  title: string;
  items: PathItem[];
  milestone: string; // A descriptive target or reward for finishing this stage
}

export interface LearningPath {
  id: string;
  user_id: string;
  goal_snapshot: string;
  generated_at: string;
  stages: Stage[];
}

export interface FeedbackEvent {
  id: string;
  user_id: string;
  path_item_id: string;
  feedback_type: FeedbackType;
  timestamp: string;
  resulting_action: string;
}
