import type { Course, LearningPath, PathItem } from './types';

// Topological sorting helper
export function topologicalSort(courses: Course[]): Course[] {
  const result: Course[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const courseMap = new Map<string, Course>();
  courses.forEach(c => courseMap.set(c.id, c));

  function visit(courseId: string) {
    if (temp.has(courseId)) {
      return; // Cycle detected
    }
    if (!visited.has(courseId)) {
      temp.add(courseId);
      const course = courseMap.get(courseId);
      if (course && course.prerequisite_skills) {
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

// Recalculate locks for path items based on completed course IDs and prerequisite skills
export function updatePathLocksAndCompleted(
  path: LearningPath,
  completedCourseIds: string[],
  allCourses: Course[] = []
): LearningPath {
  const completedSet = new Set(completedCourseIds);
  const newlyUnlockedSkills = new Set<string>();
  const courseMap = new Map<string, Course>();
  allCourses.forEach(c => courseMap.set(c.id, c));

  const skippedSet = new Set<string>();
  path.stages.forEach(stage => {
    stage.items.forEach(item => {
      if (item.status === 'skipped') {
        skippedSet.add(item.course_id);
      }
    });
  });

  const checkPrereqs = (course?: Course): boolean => {
    if (!course || !course.prerequisite_skills || course.prerequisite_skills.length === 0) {
      return true;
    }

    return course.prerequisite_skills.every(prereq => {
      const completedTeaches = Array.from(completedSet).some(completedId => {
        const c = courseMap.get(completedId);
        return c?.skills_taught?.includes(prereq) || false;
      });

      const skippedTeaches = Array.from(skippedSet).some(skippedId => {
        const c = courseMap.get(skippedId);
        return c?.skills_taught?.includes(prereq) || false;
      });

      return completedTeaches || skippedTeaches || newlyUnlockedSkills.has(prereq);
    });
  };

  let isFirstItem = true;

  const updatedStages = path.stages.map(stage => {
    const updatedItems = stage.items.map(item => {
      const course = courseMap.get(item.course_id);
      let newStatus = item.status;

      if (completedSet.has(item.course_id)) {
        newStatus = 'completed';
        if (course?.skills_taught) {
          course.skills_taught.forEach(s => newlyUnlockedSkills.add(s));
        }
      } else if (item.status === 'skipped') {
        newStatus = 'skipped';
        if (course?.skills_taught) {
          course.skills_taught.forEach(s => newlyUnlockedSkills.add(s));
        }
      } else {
        const prereqsMet = checkPrereqs(course);
        if (prereqsMet || isFirstItem) {
          if (item.status === 'locked' || item.status === 'available') {
            newStatus = 'available';
          }
        } else {
          newStatus = 'locked';
        }
      }

      isFirstItem = false;

      return {
        ...item,
        status: newStatus as PathItem['status']
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
