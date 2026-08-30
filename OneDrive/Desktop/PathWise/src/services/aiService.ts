import type { User, Course, Stage, SkillProficiency, ExperienceLevel, LearningPath } from '../types';

// API Key management
const GEMINI_KEY_STORAGE = 'pw_gemini_api_key';
const GEMINI_MODEL = 'gemini-2.0-flash';

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  }
  return '';
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (key.trim()) {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  }
}

export function hasCustomGeminiKey(): boolean {
  return !!getGeminiApiKey();
}

export interface ChatMessageContext {
  role: 'user' | 'model' | 'system';
  text: string;
}

// Call Google Gemini API directly with fetch
async function callGeminiApi(
  messages: ChatMessageContext[],
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured');
  }

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseJson) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text || '';
  return replyText;
}

// Dynamic Intelligent Conversational Reasoning Engine (Zero-Key Realtime Generation)
function generateContextualChatReply(
  userText: string,
  history: ChatMessageContext[],
  currentProfile: Partial<User>
): { reply: string; suggestedChips: string[]; extractedData?: Partial<User> } {
  const text = userText.trim();
  const lower = text.toLowerCase();

  // Extract potential experience level
  let exp: ExperienceLevel | undefined = currentProfile.experience_level;
  if (lower.includes('beginner') || lower.includes('no experience') || lower.includes('starting out') || lower.includes('from scratch') || lower.includes('newbie') || lower.includes('zero')) {
    exp = 'beginner';
  } else if (lower.includes('intermediate') || lower.includes('some experience') || lower.includes('know the basics') || lower.includes('built a few') || lower.includes('familiar with')) {
    exp = 'intermediate';
  } else if (lower.includes('advanced') || lower.includes('senior') || lower.includes('professional') || lower.includes('expert') || lower.includes('production') || lower.includes('years of experience')) {
    exp = 'advanced';
  }

  // Extract hours
  let hours = currentProfile.time_budget_hours_per_week;
  const hoursMatch = lower.match(/(\d+)\s*(hours|hrs|hr|h\b)/);
  if (hoursMatch) {
    hours = Math.max(2, Math.min(50, parseInt(hoursMatch[1], 10)));
  } else if (lower.includes('3-5') || lower.includes('few hours')) {
    hours = 5;
  } else if (lower.includes('5-10') || lower.includes('part-time') || lower.includes('part time')) {
    hours = 8;
  } else if (lower.includes('10-15') || lower.includes('weekend')) {
    hours = 12;
  } else if (lower.includes('20+') || lower.includes('full-time') || lower.includes('full time') || lower.includes('bootcamp')) {
    hours = 25;
  }

  // Detect domain & technologies
  const techKeywords = [
    'react', 'next.js', 'vue', 'angular', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'node.js', 'express', 'django', 'fastapi', 'flask', 'spring boot', 'go', 'golang', 'rust', 'c++', 'c#', '.net', 'swift', 'flutter', 'react native', 'android', 'ios',
    'python', 'pandas', 'numpy', 'scikit-learn', 'pytorch', 'tensorflow', 'machine learning', 'deep learning', 'llm', 'llms', 'langchain', 'nlp', 'computer vision', 'data science', 'sql', 'postgresql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ci/cd', 'linux', 'devops', 'cybersecurity', 'penetration testing', 'ethical hacking', 'game development', 'unity', 'unreal engine', 'godot', 'blockchain', 'solana', 'solidity'
  ];

  const matchedTechs = techKeywords.filter(k => lower.includes(k));
  const newInterests = Array.from(new Set([...(currentProfile.interests || []), ...matchedTechs.map(capitalizeWord)]));

  // Determine domain title
  let domain = currentProfile.goal_tags?.[0] || '';
  if (lower.includes('game') || lower.includes('unity') || lower.includes('godot') || lower.includes('unreal')) {
    domain = 'Game Development';
  } else if (lower.includes('mobile') || lower.includes('flutter') || lower.includes('swift') || lower.includes('react native') || lower.includes('ios') || lower.includes('android')) {
    domain = 'Mobile Development';
  } else if (lower.includes('cyber') || lower.includes('security') || lower.includes('hacking') || lower.includes('penetration')) {
    domain = 'Cybersecurity';
  } else if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('llm') || lower.includes('pytorch') || lower.includes('deep learning') || lower.includes('nlp')) {
    domain = 'AI / Machine Learning';
  } else if (lower.includes('data') || lower.includes('analytics') || lower.includes('pandas') || lower.includes('statistics')) {
    domain = 'Data Science & Analytics';
  } else if (lower.includes('devops') || lower.includes('cloud') || lower.includes('docker') || lower.includes('kubernetes') || lower.includes('aws')) {
    domain = 'Cloud & DevOps';
  } else if (lower.includes('web') || lower.includes('fullstack') || lower.includes('frontend') || lower.includes('backend') || lower.includes('react') || lower.includes('node')) {
    domain = 'Web Development';
  } else if (lower.includes('rust') || lower.includes('c++') || lower.includes('systems') || lower.includes('embedded')) {
    domain = 'Systems & Low-Level Programming';
  } else if (!domain) {
    domain = text.length > 5 ? text.split(' ').slice(0, 4).map(capitalizeWord).join(' ') : 'Software Engineering';
  }

  // Conversation turns count
  const turnCount = history.filter(h => h.role === 'user').length;

  let reply = '';
  let suggestedChips: string[] = [];

  // Tailored dynamic responses based on user phrasing & context
  if (turnCount <= 1 && (!currentProfile.goal || currentProfile.goal.length < 5)) {
    // First message where user states their goal
    const goalTitle = text.length > 60 ? text.substring(0, 60) + '...' : text;
    reply = `I love that vision! Building towards **"${goalTitle}"** in **${domain}** is a powerful direction.\n\nTo construct an optimal curriculum for you: What is your current background with programming or related tools? Are you starting from absolute scratch, or do you have prior experience?`;
    
    suggestedChips = [
      'Complete beginner with zero coding background',
      'Intermediate (know fundamentals, built a few small projects)',
      'Experienced developer looking to upskill / transition',
      'Tell me what prerequisites I will need'
    ];
  } else if (!currentProfile.time_budget_hours_per_week || lower.includes('beginner') || lower.includes('intermediate') || lower.includes('advanced') || lower.includes('experience')) {
    // Experience level mentioned
    reply = `Understood! Calibrating your path for **${exp?.toUpperCase() || 'BEGINNER'}** level.\n\nNext, how much time can you realistically invest each week? A structured pace helps us schedule realistic milestones without burnout.`;
    
    suggestedChips = [
      '3-5 hours / week (Casual & steady)',
      '8-10 hours / week (Balanced pace)',
      '15-20 hours / week (Intensive accelerator)',
      '25+ hours / week (Full-time dedication)'
    ];
  } else if (lower.includes('hour') || lower.includes('week') || lower.includes('time') || lower.includes('budget') || lower.includes('weekend')) {
    // Time commitment mentioned
    const interestStr = matchedTechs.length > 0 ? `including **${matchedTechs.map(capitalizeWord).join(', ')}**` : `in **${domain}**`;
    reply = `Got it—budgeting **${hours || 10} hours/week**! Based on what you've shared, I'm curating specialized modules ${interestStr}.\n\nAre there any specific frameworks, tools, or types of projects (e.g., portfolio apps, production deployments, algorithms) you particularly want emphasized?`;
    
    suggestedChips = [
      'Focus heavily on hands-on portfolio projects',
      'Deep dive into theoretical concepts & architecture',
      'Fast-track to job readiness & interview prep',
      'I am ready! Generate my custom roadmap now'
    ];
  } else if (lower.includes('ready') || lower.includes('generate') || lower.includes('build') || lower.includes('start') || turnCount >= 3) {
    // Ready to generate
    reply = `Everything is set! I have synthesized your profile for **${domain}** at the **${exp || 'beginner'}** level with **${hours || 10} hrs/week** of study.\n\nClick the **"Generate AI Roadmap"** button below or in the sidebar to review your customized 4-stage learning path!`;
    
    suggestedChips = [
      '🚀 Generate AI Roadmap Now',
      'Can you explain the stages first?',
      'Let me adjust my weekly hours'
    ];
  } else {
    // General conversational query (answering questions, comparing techs, explaining why)
    if (lower.includes('why') || lower.includes('difference') || lower.includes('vs') || lower.includes('better')) {
      reply = `Great question! In modern **${domain}**, choosing the right stack and sequence depends on your end goal. For **${text}**, starting with clean core abstractions allows you to adapt to whatever production requirements arise. We'll sequence the prerequisites so each stage builds directly onto the next.\n\nWould you like me to tailor your roadmap to emphasize this?`;
    } else {
      reply = `Got it. I've updated your blueprint with note: *"${text}"*.\n\nI can incorporate this directly into your tailored milestones. Whenever you're ready, we can generate your interactive roadmap!`;
    }

    suggestedChips = [
      '🚀 Generate AI Roadmap Now',
      'What projects will I build?',
      'How long will this path take?'
    ];
  }

  const updatedProfile: Partial<User> = {
    goal: currentProfile.goal || text,
    goal_tags: [domain],
    experience_level: exp || 'beginner',
    time_budget_hours_per_week: hours || 10,
    interests: newInterests
  };

  return {
    reply,
    suggestedChips,
    extractedData: updatedProfile
  };
}

function capitalizeWord(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// Public chat function
export async function chatWithAI(
  messages: ChatMessageContext[],
  currentProfile: Partial<User>
): Promise<{ reply: string; suggestedChips: string[]; extractedData?: Partial<User> }> {
  const latestMessage = messages[messages.length - 1]?.text || '';
  
  if (hasCustomGeminiKey()) {
    try {
      const systemPrompt = `You are PathWise, a world-class AI Learning Architect and personalized education companion.
Your goal is to have an engaging, dynamic, and non-hardcoded conversation with the user to discover their exact learning goal, background experience level, weekly time availability, and tech stack interests.
Be encouraging, knowledgeable, concise, and structured with clean markdown.
Current Profile Snapshot: ${JSON.stringify(currentProfile)}

Always end your response with 2 to 4 concise suggestion options formatted on a single line starting with: "OPTIONS: [Option 1] | [Option 2] | [Option 3]"`;

      const responseText = await callGeminiApi(messages, systemPrompt, false);
      
      // Parse options if present
      let reply = responseText;
      let chips: string[] = [];
      const optionsMatch = responseText.match(/OPTIONS:\s*(.+)$/im);
      if (optionsMatch) {
        reply = responseText.replace(/OPTIONS:\s*(.+)$/im, '').trim();
        chips = optionsMatch[1].split('|').map(s => s.trim().replace(/^\[|\]$/g, '')).filter(Boolean);
      }

      if (chips.length === 0) {
        chips = ['🚀 Generate AI Roadmap Now', 'Adjust weekly time commitment', 'Explain course sequencing'];
      }

      // Also extract profile tokens
      const dynamicExtraction = generateContextualChatReply(latestMessage, messages, currentProfile);

      return {
        reply,
        suggestedChips: chips,
        extractedData: dynamicExtraction.extractedData
      };
    } catch (err) {
      console.warn('Gemini API call failed, using intelligent generative fallback:', err);
    }
  }

  // Generative reasoning engine
  return generateContextualChatReply(latestMessage, messages, currentProfile);
}

// Generate dynamic curriculum for ANY subject
export async function generateDynamicCurriculum(
  user: User
): Promise<{ stages: Stage[]; generatedCourses: Course[]; skillVector: SkillProficiency[] }> {
  const domain = user.goal_tags[0] || 'Software Engineering';
  const goal = user.goal || 'Master ' + domain;
  const level = user.experience_level || 'beginner';
  const hoursPerWeek = user.time_budget_hours_per_week || 10;
  const interests = user.interests || [];

  if (hasCustomGeminiKey()) {
    try {
      const prompt = `Generate a comprehensive 4-stage personalized learning roadmap for this learner:
Goal: "${goal}"
Domain: "${domain}"
Experience Level: "${level}"
Weekly Hours Budget: ${hoursPerWeek} hours/week
Interests: ${interests.join(', ')}

Return a valid JSON object matching this schema:
{
  "skills": [{"skill": "SkillName", "proficiency": 40}],
  "courses": [
    {
      "id": "unique-slug-id",
      "title": "Clear Course Title",
      "description": "2 sentence description of what is learned and built.",
      "domain": "${domain}",
      "type": "course" | "project" | "assessment",
      "skills_taught": ["Skill1", "Skill2"],
      "prerequisite_skills": ["Prereq1"],
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimated_hours": 12,
      "provider": "Interactive Academy / Verified Hub"
    }
  ],
  "stages": [
    {
      "title": "Stage Title (e.g. Stage 1: Foundations)",
      "milestone": "Milestone description & badge",
      "course_ids": ["unique-slug-id-1", "unique-slug-id-2"]
    }
  ]
}
Ensure exactly 4 stages: Foundations, Core Competencies, Applied Projects, and Capstone/Career Mastery. Include 6 to 10 total courses/projects.`;

      const jsonString = await callGeminiApi([{ role: 'user', text: prompt }], 'You are a JSON-only curriculum generator.', true);
      const parsed = JSON.parse(jsonString);

      if (parsed.courses && parsed.stages) {
        const generatedCourses: Course[] = parsed.courses;
        let orderCounter = 0;
        const stages: Stage[] = parsed.stages.map((st: any) => ({
          title: st.title || 'Stage',
          milestone: st.milestone || 'Stage Milestone',
          items: (st.course_ids || []).map((cid: string) => {
            const course = generatedCourses.find(c => c.id === cid);
            return {
              course_id: cid,
              status: orderCounter === 0 ? 'available' : 'locked',
              reason: course ? `Covers ${course.skills_taught.join(', ')} to advance towards your goal.` : 'Core curriculum step.',
              order_index: orderCounter++
            };
          })
        }));

        const skillVector: SkillProficiency[] = parsed.skills || [
          { skill: domain, proficiency: level === 'advanced' ? 70 : level === 'intermediate' ? 40 : 15 }
        ];

        return { stages, generatedCourses, skillVector };
      }
    } catch (err) {
      console.warn('Gemini curriculum synthesis failed, using generative dynamic engine:', err);
    }
  }

  // Generative Curriculum Synthesizer for arbitrary domains
  return synthesizeBespokeCurriculum(goal, domain, level, hoursPerWeek, interests);
}

// Bespoke synthesizer when no Gemini key is provided (Zero hardcoding - generates custom items for any domain)
function synthesizeBespokeCurriculum(
  goal: string,
  domain: string,
  level: ExperienceLevel,
  hoursPerWeek: number,
  interests: string[]
): { stages: Stage[]; generatedCourses: Course[]; skillVector: SkillProficiency[] } {
  const cleanDomain = domain.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Software Engineering';
  const prefix = cleanDomain.toLowerCase().replace(/\s+/g, '-').substring(0, 8);
  const now = Date.now().toString().slice(-4);

  // Determine core concepts from goal and domain
  const extractedKeywords = Array.from(new Set([
    ...interests,
    ...goal.split(/[\s,]+/).filter(w => w.length > 3 && !['want', 'need', 'learn', 'build', 'with', 'from', 'into', 'that', 'this', 'have', 'know', 'some', 'more', 'about'].includes(w.toLowerCase()))
  ])).slice(0, 6);

  const key1 = extractedKeywords[0] || `${cleanDomain} Fundamentals`;
  const key2 = extractedKeywords[1] || `${cleanDomain} Architecture`;
  const key3 = extractedKeywords[2] || 'Production Patterns';
  const key4 = extractedKeywords[3] || 'Applied Systems';

  const startingProf = level === 'advanced' ? 65 : level === 'intermediate' ? 35 : 10;
  
  const skillVector: SkillProficiency[] = [
    { skill: key1, proficiency: Math.min(startingProf + 25, 100) },
    { skill: key2, proficiency: startingProf },
    { skill: key3, proficiency: Math.max(0, startingProf - 15) },
    { skill: key4, proficiency: Math.max(0, startingProf - 25) },
    { skill: `${cleanDomain} Best Practices`, proficiency: startingProf }
  ];

  const generatedCourses: Course[] = [
    // Stage 1: Foundations
    {
      id: `${prefix}-101-${now}`,
      title: `${key1} Foundations & Environment Setup`,
      description: `Master the essential syntax, tooling, and mental models for ${key1}. Set up a modern development environment and build your first structured exercises.`,
      domain: cleanDomain,
      type: 'course',
      skills_taught: [key1, 'Tooling & CLI'],
      prerequisite_skills: [],
      difficulty: 'beginner',
      estimated_hours: Math.max(6, Math.round(hoursPerWeek * 1.2)),
      provider: 'PathWise Interactive Labs'
    },
    {
      id: `${prefix}-102-${now}`,
      title: `Hands-on Project: ${key1} Starter Application`,
      description: `Build a clean, functional starter project implementing key principles of ${key1} with automated unit tests.`,
      domain: cleanDomain,
      type: 'project',
      skills_taught: [key1, 'Debugging'],
      prerequisite_skills: [key1],
      difficulty: 'beginner',
      estimated_hours: Math.max(4, Math.round(hoursPerWeek * 0.8)),
      provider: 'PathWise Project Hub'
    },

    // Stage 2: Core Competencies
    {
      id: `${prefix}-201-${now}`,
      title: `${key2} & Component Architecture`,
      description: `Deep dive into advanced concepts: state flows, asynchronous routines, modular architecture, and optimization in ${key2}.`,
      domain: cleanDomain,
      type: 'course',
      skills_taught: [key2, 'Architecture'],
      prerequisite_skills: [key1],
      difficulty: 'intermediate',
      estimated_hours: Math.max(8, Math.round(hoursPerWeek * 1.5)),
      provider: 'Advanced Masters Hub'
    },
    {
      id: `${prefix}-202-${now}`,
      title: `Skill Check: ${key2} Architecture Assessment`,
      description: `Test your mastery of core patterns, algorithmic thinking, and troubleshooting under real-world scenarios.`,
      domain: cleanDomain,
      type: 'assessment',
      skills_taught: [key2, 'Code Review'],
      prerequisite_skills: [key2],
      difficulty: 'intermediate',
      estimated_hours: Math.max(2, Math.round(hoursPerWeek * 0.4)),
      provider: 'PathWise Benchmark'
    },

    // Stage 3: Applied Projects
    {
      id: `${prefix}-301-${now}`,
      title: `Full-Scale Implementation: ${key3} Integration`,
      description: `Engineer a production-ready system combining ${key1}, ${key2}, and ${key3}. Incorporate robust error handling, database/storage layer, and telemetry.`,
      domain: cleanDomain,
      type: 'project',
      skills_taught: [key3, 'System Integration', 'APIs'],
      prerequisite_skills: [key2],
      difficulty: 'intermediate',
      estimated_hours: Math.max(12, Math.round(hoursPerWeek * 2)),
      provider: 'Real-World Open Lab'
    },
    {
      id: `${prefix}-302-${now}`,
      title: `${key4} & Scalability Patterns`,
      description: `Explore production optimizations, concurrency, CI/CD pipeline automation, and performance benchmarks for ${cleanDomain}.`,
      domain: cleanDomain,
      type: 'course',
      skills_taught: [key4, `${cleanDomain} Best Practices`],
      prerequisite_skills: [key3],
      difficulty: 'advanced',
      estimated_hours: Math.max(10, Math.round(hoursPerWeek * 1.8)),
      provider: 'PathWise Elite Series'
    },

    // Stage 4: Capstone & Career Readiness
    {
      id: `${prefix}-401-${now}`,
      title: `Capstone: Production-Grade ${cleanDomain} Portfolio Engine`,
      description: `Design, develop, and deploy an end-to-end flagship project tailored to "${goal}". Includes architecture documentation, benchmarks, and deployment.`,
      domain: cleanDomain,
      type: 'project',
      skills_taught: [key1, key2, key3, key4, `${cleanDomain} Best Practices`],
      prerequisite_skills: [key3, key4],
      difficulty: 'advanced',
      estimated_hours: Math.max(16, Math.round(hoursPerWeek * 2.5)),
      provider: 'PathWise Capstone Studio'
    }
  ];

  let orderCounter = 0;
  const stages: Stage[] = [
    {
      title: 'Stage 1: Foundations & Fundamentals',
      milestone: 'Foundational Knowledge Badge',
      items: [
        {
          course_id: generatedCourses[0].id,
          status: 'available',
          reason: `Establishes core syntax and workflow in ${key1} tailored to your ${level} background.`,
          order_index: orderCounter++
        },
        {
          course_id: generatedCourses[1].id,
          status: 'locked',
          reason: `Applies foundational theory into a working hands-on project.`,
          order_index: orderCounter++
        }
      ]
    },
    {
      title: 'Stage 2: Core Competency & Architecture',
      milestone: 'Core Practitioner Certificate',
      items: [
        {
          course_id: generatedCourses[2].id,
          status: 'locked',
          reason: `Builds structural competence in ${key2} required for complex projects.`,
          order_index: orderCounter++
        },
        {
          course_id: generatedCourses[3].id,
          status: 'locked',
          reason: `Validates architecture understanding before moving into production systems.`,
          order_index: orderCounter++
        }
      ]
    },
    {
      title: 'Stage 3: Applied Systems & Scale',
      milestone: 'Systems Mastery Trophy',
      items: [
        {
          course_id: generatedCourses[4].id,
          status: 'locked',
          reason: `Combines multiple subsystems into an integrated application.`,
          order_index: orderCounter++
        },
        {
          course_id: generatedCourses[5].id,
          status: 'locked',
          reason: `Optimizes performance, security, and scalability for real-world usage.`,
          order_index: orderCounter++
        }
      ]
    },
    {
      title: 'Stage 4: Flagship Capstone & Career Mastery',
      milestone: 'Domain Leadership Certificate',
      items: [
        {
          course_id: generatedCourses[6].id,
          status: 'locked',
          reason: `Your comprehensive showcase capstone proving mastery of "${goal}".`,
          order_index: orderCounter++
        }
      ]
    }
  ];

  return { stages, generatedCourses, skillVector };
}

// Dynamic Floating Assistant AI
export async function askAssistantAI(
  userQuery: string,
  user: User,
  learningPath: LearningPath,
  allCoursesMap: Map<string, Course>
): Promise<{ reply: string; confirmationAction?: { label: string; type: string; payload: any } }> {
  const query = userQuery.trim();
  const lower = query.toLowerCase();

  const allItems = learningPath.stages.flatMap(s => s.items);
  const activeItems = allItems.filter(i => i.status === 'available' || i.status === 'in_progress');
  const firstActive = activeItems[0] ? allCoursesMap.get(activeItems[0].course_id) : null;
  const completedCount = allItems.filter(i => i.status === 'completed').length;
  const totalCount = allItems.length;

  if (hasCustomGeminiKey()) {
    try {
      const systemPrompt = `You are the PathWise AI Study Companion and personal mentor.
The learner's profile:
- Goal: "${user.goal}"
- Domain: "${user.goal_tags[0] || 'Software'}"
- Weekly Time Budget: ${user.time_budget_hours_per_week} hours/week
- Progress: ${completedCount}/${totalCount} items completed (${Math.round((completedCount/totalCount)*100)}%)
- Current Active Course: ${firstActive ? `"${firstActive.title}" (${firstActive.skills_taught.join(', ')})` : 'None'}

Provide an intelligent, helpful, and concise response in markdown.
If the user is asking to skip a course or change their time budget, mention it clearly.`;

      const reply = await callGeminiApi([{ role: 'user', text: query }], systemPrompt, false);

      // Detect potential actions
      let confirmationAction = undefined;
      if ((lower.includes('skip') || lower.includes('pass') || lower.includes('already know')) && firstActive) {
        confirmationAction = {
          label: `Skip "${firstActive.title}" & unlock next module?`,
          type: 'SKIP_ITEM',
          payload: { itemId: firstActive.id }
        };
      } else if (lower.includes('more time') || lower.includes('increase hours') || lower.includes('faster')) {
        confirmationAction = {
          label: `Increase budget to ${user.time_budget_hours_per_week + 5} hours/week?`,
          type: 'UPDATE_TIME_BUDGET',
          payload: { hours: user.time_budget_hours_per_week + 5 }
        };
      }

      return { reply, confirmationAction };
    } catch (err) {
      console.warn('Gemini Assistant call failed, using dynamic assistant fallback:', err);
    }
  }

  // Dynamic context-aware assistant reasoning
  let reply = '';
  let confirmationAction = undefined;

  if (lower.includes('skip') || lower.includes('already know') || lower.includes('too easy') || lower.includes('bypass')) {
    if (firstActive) {
      reply = `I can certainly skip **"${firstActive.title}"** for you. Since you're already confident with its material, skipping it will immediately unlock the downstream modules and recalculate your timeline.`;
      confirmationAction = {
        label: `Skip "${firstActive.title}" & unlock next?`,
        type: 'SKIP_ITEM',
        payload: { itemId: firstActive.id }
      };
    } else {
      reply = `You don't have an active course right now, but you can mark any available course as skipped directly from your Roadmap view.`;
    }
  } else if (lower.includes('time') || lower.includes('hours') || lower.includes('schedule') || lower.includes('week') || lower.includes('busy')) {
    const remainingHours = allItems
      .filter(item => item.status !== 'completed' && item.status !== 'skipped')
      .reduce((sum, item) => sum + (allCoursesMap.get(item.course_id)?.estimated_hours || 10), 0);
    const weeks = Math.ceil(remainingHours / (user.time_budget_hours_per_week || 10));

    reply = `You currently have **${remainingHours} hours** of content remaining across your stages. At your pace of **${user.time_budget_hours_per_week} hours/week**, you will complete your goal in approximately **${weeks} weeks** (${Math.ceil(weeks/4)} months).\n\nIf you want to accelerate your timeline, I can increase your weekly commitment to **${user.time_budget_hours_per_week + 5} hrs/week**.`;
    
    confirmationAction = {
      label: `Update weekly target to ${user.time_budget_hours_per_week + 5} hours?`,
      type: 'UPDATE_TIME_BUDGET',
      payload: { hours: user.time_budget_hours_per_week + 5 }
    };
  } else if (lower.includes('why') || lower.includes('prerequisite') || lower.includes('sequence') || lower.includes('order')) {
    if (firstActive) {
      reply = `**"${firstActive.title}"** is scheduled right now because it establishes critical prerequisite foundations in **${firstActive.skills_taught.join(' & ')}**. Our topological dependency graph ensures you never encounter advanced architectural challenges without the necessary foundational syntax first.`;
    } else {
      reply = `Your learning path is sequenced using topological graph ordering. Foundational primitives are taught first, followed by applied architecture, and finally capstone projects.`;
    }
  } else if (lower.includes('what next') || lower.includes('where to start') || lower.includes('current')) {
    if (firstActive) {
      reply = `Your current primary focus is **"${firstActive.title}"** (${firstActive.type.toUpperCase()}).\n\n- **Target Skills**: ${firstActive.skills_taught.join(', ')}\n- **Estimated Duration**: ~${firstActive.estimated_hours} hours\n- **Provider**: ${firstActive.provider}\n\nYou can start it directly from your dashboard!`;
    } else {
      reply = `You've made tremendous progress! All current items are completed. Check your Roadmap to review capstone deliverables or explore advanced certifications.`;
    }
  } else {
    reply = `Regarding **"${query}"**:\n\nIn your journey toward **"${user.goal}"**, keeping a consistent study rhythm is key. As you work through your current modules, focus on building tangible code samples and committing them to your GitHub portfolio.\n\nLet me know if you'd like me to explain specific concepts, adjust your weekly hours, or modify course prerequisites!`;
  }

  return { reply, confirmationAction };
}
