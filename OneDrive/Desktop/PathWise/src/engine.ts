import type { User, Course, LearningPath, Stage, ExperienceLevel, FeedbackType } from './types';
import { MOCK_COURSES, SKILLS_BY_DOMAIN } from './mockData';


// Simulated LLM Goal Parser
export function parseGoalWithAI(goalText: string): {
  inferredDomain: string;
  inferredSkills: string[];
  experienceLevel: ExperienceLevel;
  interests: string[];
  timeBudget: number;
} {
  const goalLower = goalText.toLowerCase();

  // 1. Infer Domain
  let inferredDomain = 'Web Dev'; // default
  if (goalLower.includes('data') || goalLower.includes('statistic') || goalLower.includes('pandas') || goalLower.includes('analyst')) {
    inferredDomain = 'Data Science';
  } else if (goalLower.includes('ai') || goalLower.includes('ml') || goalLower.includes('learning') || goalLower.includes('pytorch') || goalLower.includes('llm') || goalLower.includes('gpt') || goalLower.includes('transformer')) {
    inferredDomain = 'AI/ML';
  } else if (goalLower.includes('devops') || goalLower.includes('cloud') || goalLower.includes('docker') || goalLower.includes('kubernetes') || goalLower.includes('aws') || goalLower.includes('terraform') || goalLower.includes('linux')) {
    inferredDomain = 'Cloud/DevOps';
  }

  // 2. Infer Skills and Interests
  const interests: string[] = [];
  const inferredSkills: string[] = [];

  if (inferredDomain === 'Web Dev') {
    if (goalLower.includes('react') || goalLower.includes('frontend')) {
      interests.push('Frontend', 'UI/UX');
      inferredSkills.push('React', 'HTML', 'CSS');
    }
    if (goalLower.includes('backend') || goalLower.includes('node') || goalLower.includes('express')) {
      interests.push('Backend', 'APIs');
      inferredSkills.push('Node.js', 'Express.js', 'SQL');
    }
    if (goalLower.includes('fullstack') || goalLower.includes('full stack')) {
      interests.push('Full-Stack');
      inferredSkills.push('React', 'Node.js', 'SQL');
    }
  } else if (inferredDomain === 'Data Science') {
    if (goalLower.includes('python')) interests.push('Python Programming');
    if (goalLower.includes('viz') || goalLower.includes('visualization') || goalLower.includes('dashboard')) {
      interests.push('Data Viz');
    }
    interests.push('Analytics');
  } else if (inferredDomain === 'AI/ML') {
    if (goalLower.includes('agent') || goalLower.includes('llm') || goalLower.includes('gpt') || goalLower.includes('chatbot')) {
      interests.push('Generative AI', 'LLMs');
    }
    if (goalLower.includes('vision') || goalLower.includes('image')) {
      interests.push('Computer Vision');
    }
    interests.push('Neural Networks');
  } else if (inferredDomain === 'Cloud/DevOps') {
    if (goalLower.includes('docker') || goalLower.includes('kubernetes') || goalLower.includes('k8s')) {
      interests.push('Containers', 'Orchestration');
    }
    if (goalLower.includes('terraform') || goalLower.includes('iac')) {
      interests.push('Infrastructure as Code');
    }
    interests.push('Cloud Architecture');
  }

  // 3. Infer Experience Level
  let experienceLevel: ExperienceLevel = 'beginner';
  if (goalLower.includes('already know') || goalLower.includes('experience') || goalLower.includes('intermediate') || goalLower.includes('professional')) {
    experienceLevel = 'intermediate';
  }
  if (goalLower.includes('advanced') || goalLower.includes('senior') || goalLower.includes('expert') || goalLower.includes('years of experience')) {
    experienceLevel = 'advanced';
  }

  // 4. Inferred Time Budget
  let timeBudget = 10; // default 10 hours/week
  const hoursMatch = goalLower.match(/(\d+)\s*(hour|hr)/);
  if (hoursMatch) {
    timeBudget = parseInt(hoursMatch[1], 10);
  }

  return {
    inferredDomain,
    inferredSkills,
    experienceLevel,
    interests,
    timeBudget
  };
}

// Generate Explanations for Recommended Courses
export function generateExplanation(
  course: Course,
  goal: string,
  experienceLevel: ExperienceLevel
): string {
  const primarySkill = course.skills_taught[0] || 'course skills';
  return `Recommended because it teaches ${primarySkill}, which aligns with your goal of "${goal}" and matches your ${experienceLevel} skill level.`;
}

// Perform Topological Sort on Courses
function topologicalSort(courses: Course[]): Course[] {
  const result: Course[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const courseMap = new Map<string, Course>();
  courses.forEach(c => courseMap.set(c.id, c));

  function visit(courseId: string) {
    if (temp.has(courseId)) {
      // Cyclic dependency detected, just return to prevent infinite loop
      return;
    }
    if (!visited.has(courseId)) {
      temp.add(courseId);
      const course = courseMap.get(courseId);
      if (course) {
        // Find other courses in our list that teach the prerequisite skills of this course
        const prereqCourses = courses.filter(other => 
          other.id !== courseId &&
          other.skills_taught.some(skill => course.prerequisite_skills.includes(skill))
        );
        prereqCourses.forEach(prereq => visit(prereq.id));
      }
      temp.delete(courseId);
      visited.add(courseId);
      const c = courseMap.get(courseId);
      if (c) result.push(c);
    }
  }

  courses.forEach(c => visit(c.id));
  return result;
}

// Generate a brand new Learning Path
export function generateLearningPath(user: User): LearningPath {
  // 1. Identify Domain and Gaps
  const domain = user.goal_tags[0] || 'Web Dev';
  const domainSkills = SKILLS_BY_DOMAIN[domain] || [];

  // User gaps: skills in this domain where user has < 60 proficiency (or doesn't have)
  const gaps = domainSkills.filter(skill => {
    const prof = user.skill_vector.find(sv => sv.skill === skill)?.proficiency || 0;
    return prof < 60;
  });

  // 2. Filter courses matching the domain
  const domainCourses = MOCK_COURSES.filter(c => c.domain === domain);

  // Group by type
  const courses = domainCourses.filter(c => c.type === 'course');
  const projects = domainCourses.filter(c => c.type === 'project');
  const assessments = domainCourses.filter(c => c.type === 'assessment');

  // Filter courses that address skill gaps or are foundational
  // We want a subset of courses (not all 15) to make the path digestible, say ~5-8 items total
  let selectedCourses = courses.filter(c => {
    // Keep it if it teaches a gap, or matches user difficulty preference
    const teachesGap = c.skills_taught.some(s => gaps.includes(s));
    const difficultyMatch = c.difficulty === user.experience_level || 
                           (user.experience_level === 'intermediate' && c.difficulty === 'beginner') ||
                           (user.experience_level === 'advanced');
    return teachesGap || difficultyMatch;
  });

  // Sort them topologically so prerequisites come first
  selectedCourses = topologicalSort(selectedCourses);

  // Filter projects & assessments based on difficulty
  const selectedProjects = projects.filter(p => {
    if (user.experience_level === 'beginner') return p.difficulty !== 'advanced';
    if (user.experience_level === 'intermediate') return true;
    return p.difficulty === 'advanced' || p.difficulty === 'intermediate';
  });

  const selectedAssessments = assessments.filter(a => {
    if (user.experience_level === 'beginner') return a.difficulty !== 'advanced';
    return true;
  });

  // 3. Distribute into 4 stages: Foundations, Core, Applied, Career-Ready
  const stages: Stage[] = [
    { title: 'Foundations', items: [], milestone: 'Get Started Certificate' },
    { title: 'Core Skills', items: [], milestone: 'Core Competency Badge' },
    { title: 'Applied Projects', items: [], milestone: 'Portfolio Expansion' },
    { title: 'Career-Ready', items: [], milestone: 'Domain Mastery Certificate' }
  ];

  let orderCounter = 0;

  // Foundations Stage
  const foundationCourses = selectedCourses.filter(c => c.difficulty === 'beginner');
  foundationCourses.forEach(c => {
    stages[0].items.push({
      course_id: c.id,
      status: 'locked', // will update locks later
      reason: generateExplanation(c, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  });
  // Add a beginner project if available
  const begProj = selectedProjects.find(p => p.difficulty === 'beginner');
  if (begProj) {
    stages[0].items.push({
      course_id: begProj.id,
      status: 'locked',
      reason: generateExplanation(begProj, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  }

  // Core Skills Stage
  const coreCourses = selectedCourses.filter(c => c.difficulty === 'intermediate');
  coreCourses.forEach(c => {
    stages[1].items.push({
      course_id: c.id,
      status: 'locked',
      reason: generateExplanation(c, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  });
  // Add intermediate assessment
  const intAssess = selectedAssessments.find(a => a.difficulty === 'intermediate');
  if (intAssess) {
    stages[1].items.push({
      course_id: intAssess.id,
      status: 'locked',
      reason: generateExplanation(intAssess, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  }

  // Applied Projects Stage
  const advCourses = selectedCourses.filter(c => c.difficulty === 'advanced');
  advCourses.forEach(c => {
    stages[2].items.push({
      course_id: c.id,
      status: 'locked',
      reason: generateExplanation(c, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  });
  const intProj = selectedProjects.find(p => p.difficulty === 'intermediate');
  if (intProj) {
    stages[2].items.push({
      course_id: intProj.id,
      status: 'locked',
      reason: generateExplanation(intProj, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  }

  // Career-Ready Stage
  const advProj = selectedProjects.find(p => p.difficulty === 'advanced');
  if (advProj) {
    stages[3].items.push({
      course_id: advProj.id,
      status: 'locked',
      reason: generateExplanation(advProj, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  }
  const advAssess = selectedAssessments.find(a => a.difficulty === 'advanced');
  if (advAssess) {
    stages[3].items.push({
      course_id: advAssess.id,
      status: 'locked',
      reason: generateExplanation(advAssess, user.goal, user.experience_level),
      order_index: orderCounter++
    });
  }

  // Ensure every stage has at least one item (if catalog is sparse, clone or move items)
  stages.forEach((stage, idx) => {
    if (stage.items.length === 0) {
      // fallback: find any course in the domain that fits
      const fallbackCourse = domainCourses[Math.min(idx, domainCourses.length - 1)];
      if (fallbackCourse) {
        stage.items.push({
          course_id: fallbackCourse.id,
          status: 'locked',
          reason: `Recommended as a structural component of the ${stage.title} stage.`,
          order_index: orderCounter++
        });
      }
    }
  });

  const path: LearningPath = {
    id: `path-${Date.now()}`,
    user_id: user.id,
    goal_snapshot: user.goal,
    generated_at: new Date().toISOString(),
    stages
  };

  // Run updateLocks to set initial statuses
  return updatePathLocksAndCompleted(path, user.completed_courses);
}

// Recalculate locks for path items based on completed courses
export function updatePathLocksAndCompleted(
  path: LearningPath,
  completedCourseIds: string[]
): LearningPath {
  const completedSet = new Set(completedCourseIds);
  const newlyUnlockedSkills = new Set<string>();

  // Map courses to check pre-reqs
  const courseMap = new Map<string, Course>();
  MOCK_COURSES.forEach(c => courseMap.set(c.id, c));

  // Keep track of which items are skipped
  const skippedSet = new Set<string>();
  path.stages.forEach(stage => {
    stage.items.forEach(item => {
      if (item.status === 'skipped') {
        skippedSet.add(item.course_id);
      }
    });
  });

  // Helper to check if a course's prerequisites are met
  const checkPrereqs = (course: Course): boolean => {
    if (!course.prerequisite_skills || course.prerequisite_skills.length === 0) {
      return true;
    }

    // Check if the user has completed courses that teach these skills, or if the skills are taught by skipped/completed items
    return course.prerequisite_skills.every(prereq => {
      // Does a completed course teach this?
      const completedTeaches = Array.from(completedSet).some(completedId => {
        const c = courseMap.get(completedId);
        return c?.skills_taught.includes(prereq) || false;
      });

      // Does a skipped course teach this? (We let users skip, so we treat skipped as "passed" for unlocking downstream)
      const skippedTeaches = Array.from(skippedSet).some(skippedId => {
        const c = courseMap.get(skippedId);
        return c?.skills_taught.includes(prereq) || false;
      });

      // Or did a previously completed stage unlock it?
      return completedTeaches || skippedTeaches || newlyUnlockedSkills.has(prereq);
    });
  };

  // Traverse stages in order, unlocking items whose prerequisites are met
  const updatedStages = path.stages.map(stage => {
    const updatedItems = stage.items.map(item => {
      const course = courseMap.get(item.course_id);
      if (!course) return item;

      let newStatus = item.status;

      if (completedSet.has(item.course_id)) {
        newStatus = 'completed';
        course.skills_taught.forEach(s => newlyUnlockedSkills.add(s));
      } else if (item.status === 'skipped') {
        newStatus = 'skipped';
        // Add skills of skipped items so we don't break downstream flow
        course.skills_taught.forEach(s => newlyUnlockedSkills.add(s));
      } else {
        const prereqsMet = checkPrereqs(course);
        if (prereqsMet) {
          if (item.status === 'locked') {
            newStatus = 'available';
          }
        } else {
          newStatus = 'locked';
        }
      }

      return {
        ...item,
        status: newStatus
      };
    });

    return {
      ...stage,
      items: updatedItems
    };
  });

  return {
    ...path,
    stages: updatedStages
  };
}

// Adapt learning path based on user feedback
export function adaptPath(
  path: LearningPath,
  user: User,
  itemId: string,
  feedback: FeedbackType
): {
  updatedPath: LearningPath;
  updatedUser: User;
  actionMessage: string;
} {
  const courseMap = new Map<string, Course>();
  MOCK_COURSES.forEach(c => courseMap.set(c.id, c));

  const targetCourse = courseMap.get(itemId);
  if (!targetCourse) {
    return { updatedPath: path, updatedUser: user, actionMessage: 'Course not found.' };
  }

  let actionMessage = '';
  let updatedCompleted = [...user.completed_courses];
  let updatedUser = { ...user };

  // Clone stages
  let newStages = path.stages.map(stage => ({
    ...stage,
    items: stage.items.map(item => ({ ...item }))
  }));

  if (feedback === 'skip') {
    // Set status to skipped
    newStages = newStages.map(stage => ({
      ...stage,
      items: stage.items.map(item => {
        if (item.course_id === itemId) {
          return { ...item, status: 'skipped' as const };
        }
        return item;
      })
    }));
    actionMessage = `Skipped "${targetCourse.title}". Downstream prerequisites will remain accessible.`;
  } else if (feedback === 'too_easy') {
    // 1. Mark current item as skipped or completed (we mark completed to grant skills, or skipped)
    // Let's mark as completed so the user gets the skills and we swap it for a harder one or next in queue.
    if (!updatedCompleted.includes(itemId)) {
      updatedCompleted.push(itemId);
    }
    actionMessage = `Marked "${targetCourse.title}" as complete because it was too easy.`;

    // 2. Try to find a higher difficulty alternative in same domain and skill set
    const domainCourses = MOCK_COURSES.filter(c => c.domain === targetCourse.domain && c.id !== itemId);
    const harderAlternative = domainCourses.find(c => 
      c.difficulty === 'advanced' && 
      c.skills_taught.some(s => targetCourse.skills_taught.includes(s)) &&
      !updatedCompleted.includes(c.id)
    );

    if (harderAlternative) {
      // Find the stage containing our item, and insert the harder alternative right after it
      newStages = newStages.map(stage => {
        const itemIdx = stage.items.findIndex(item => item.course_id === itemId);
        if (itemIdx !== -1) {
          const updatedItems = [...stage.items];
          // Replace it or append the harder alternative
          const alreadyHasAlt = stage.items.some(item => item.course_id === harderAlternative.id);
          if (!alreadyHasAlt) {
            updatedItems.splice(itemIdx + 1, 0, {
              course_id: harderAlternative.id,
              status: 'locked',
              reason: `Added as a advanced alternative to ${targetCourse.title} (too easy).`,
              order_index: stage.items[itemIdx].order_index + 0.5
            });
            actionMessage += ` Added advanced course "${harderAlternative.title}".`;
          }
          return { ...stage, items: updatedItems };
        }
        return stage;
      });
    }

    // 3. Adjust user experience level preference
    if (updatedUser.experience_level === 'beginner') {
      updatedUser.experience_level = 'intermediate';
    } else if (updatedUser.experience_level === 'intermediate') {
      updatedUser.experience_level = 'advanced';
    }
  } else if (feedback === 'too_hard') {
    // 1. Find a lower difficulty course that teaches prerequisite or foundational skills
    const domainCourses = MOCK_COURSES.filter(c => c.domain === targetCourse.domain && c.id !== itemId);
    const prerequisiteSkills = targetCourse.prerequisite_skills;

    let foundationalCourse = domainCourses.find(c => 
      c.difficulty === 'beginner' &&
      !updatedCompleted.includes(c.id) &&
      c.skills_taught.some(s => prerequisiteSkills.includes(s))
    );

    // If no specific prereq skill match, look for a simpler course in the domain
    if (!foundationalCourse) {
      foundationalCourse = domainCourses.find(c => 
        c.difficulty === 'beginner' &&
        !updatedCompleted.includes(c.id)
      );
    }

    if (foundationalCourse) {
      // Insert foundational course before the too-hard course
      newStages = newStages.map(stage => {
        const itemIdx = stage.items.findIndex(item => item.course_id === itemId);
        if (itemIdx !== -1) {
          const updatedItems = [...stage.items];
          const alreadyHasFoundational = stage.items.some(item => item.course_id === foundationalCourse!.id);
          if (!alreadyHasFoundational) {
            updatedItems.splice(itemIdx, 0, {
              course_id: foundationalCourse!.id,
              status: 'available',
              reason: `Foundational course added because "${targetCourse.title}" felt too hard.`,
              order_index: stage.items[itemIdx].order_index - 0.5
            });
            actionMessage = `Added foundational course "${foundationalCourse!.title}" to prepare for "${targetCourse.title}".`;
          } else {
            actionMessage = `Foundational course "${foundationalCourse!.title}" is already in your path. Please review it first!`;
          }
          return { ...stage, items: updatedItems };
        }
        return stage;
      });
    } else {
      actionMessage = `"${targetCourse.title}" is marked as too hard. We recommend taking it slow!`;
    }

    // Adjust user experience level preference
    if (updatedUser.experience_level === 'advanced') {
      updatedUser.experience_level = 'intermediate';
    } else if (updatedUser.experience_level === 'intermediate') {
      updatedUser.experience_level = 'beginner';
    }
  } else if (feedback === 'not_relevant') {
    // Remove the course from the stage
    newStages = newStages.map(stage => {
      const filtered = stage.items.filter(item => item.course_id !== itemId);
      return {
        ...stage,
        items: filtered
      };
    });
    actionMessage = `Removed "${targetCourse.title}" as it is not relevant to your current goals.`;
  } else if (feedback === 'loved_it') {
    actionMessage = `Glad you liked "${targetCourse.title}"! We will prioritize similar resources.`;
  }

  updatedUser.completed_courses = updatedCompleted;

  // Create temporary path to re-evaluate locks
  const tempPath: LearningPath = {
    ...path,
    stages: newStages
  };

  const updatedPath = updatePathLocksAndCompleted(tempPath, updatedCompleted);

  return {
    updatedPath,
    updatedUser,
    actionMessage
  };
}
