import type { GoalSummary } from '../../types/goal';

export type GoalIconTone = 'accent' | 'blue' | 'pink';

export type GoalIcon = {
  label: string;
  symbol: string;
  tone: GoalIconTone;
};

const mentorGoalIcons: Partial<Record<GoalSummary['mentorProfileId'], GoalIcon>> = {
  business_project: { label: 'Business goal', symbol: '📈', tone: 'blue' },
  creative_skill: { label: 'Creative goal', symbol: '🎨', tone: 'pink' },
  fitness: { label: 'Fitness goal', symbol: '🏃', tone: 'blue' },
  language_learning: { label: 'Language goal', symbol: '💬', tone: 'blue' },
  martial_arts: { label: 'Martial arts goal', symbol: '🥋', tone: 'accent' },
  music: { label: 'Music goal', symbol: '🎵', tone: 'pink' },
  programming: { label: 'Programming goal', symbol: '💻', tone: 'blue' },
  puzzle_logic: { label: 'Puzzle goal', symbol: '🧩', tone: 'accent' },
  school_exam: { label: 'Study goal', symbol: '📚', tone: 'blue' },
};

const keywordGoalIcons: GoalIconRule[] = [
  {
    icon: { label: 'Language goal', symbol: '💬', tone: 'blue' },
    keywords: [
      'language',
      'german',
      'deutsch',
      'english',
      'spanish',
      'french',
      'korean',
      'japanese',
      'speaking',
      'vocabulary',
      'grammar',
      'ielts',
      'toefl',
      'язык',
      'англий',
      'немец',
      'говор',
      'словар',
      'граммат',
    ],
  },
  {
    icon: { label: 'Cooking goal', symbol: '🍳', tone: 'pink' },
    keywords: ['cook', 'cooking', 'recipe', 'food', 'bake', 'kitchen', 'chef', 'готов', 'кулинар', 'рецепт', 'еда'],
  },
  {
    icon: { label: 'Music goal', symbol: '🎵', tone: 'pink' },
    keywords: ['music', 'piano', 'guitar', 'song', 'sing', 'rhythm', 'vocal', 'музык', 'пианино', 'гитар', 'песн', 'петь'],
  },
  {
    icon: { label: 'Fitness goal', symbol: '🏃', tone: 'blue' },
    keywords: ['sport', 'fitness', 'workout', 'running', 'run', 'gym', 'strength', 'йога', 'спорт', 'зал', 'трен', 'бег'],
  },
  {
    icon: { label: 'Business goal', symbol: '📈', tone: 'blue' },
    keywords: ['business', 'money', 'startup', 'sales', 'shop', 'pitch', 'marketing', 'бизнес', 'стартап', 'продаж', 'деньг'],
  },
  {
    icon: { label: 'Reading goal', symbol: '📚', tone: 'blue' },
    keywords: ['reading', 'read', 'book', 'study', 'exam', 'school', 'math', 'книг', 'читать', 'учеб', 'экзамен', 'школ'],
  },
  {
    icon: { label: 'Programming goal', symbol: '💻', tone: 'blue' },
    keywords: ['programming', 'code', 'coding', 'app', 'website', 'web', 'react', 'javascript', 'python', 'код', 'сайт', 'программ'],
  },
  {
    icon: { label: 'Health goal', symbol: '💙', tone: 'blue' },
    keywords: ['health', 'sleep', 'meditation', 'mindfulness', 'habit', 'wellness', 'сон', 'здоров', 'медитац', 'привыч'],
  },
  {
    icon: { label: 'Art goal', symbol: '🎨', tone: 'pink' },
    keywords: ['art', 'design', 'drawing', 'draw', 'paint', 'creative', 'иллюстр', 'дизайн', 'рисов', 'творч'],
  },
  {
    icon: { label: 'Travel goal', symbol: '🧭', tone: 'accent' },
    keywords: ['travel', 'trip', 'map', 'journey', 'туризм', 'путешеств', 'поезд'],
  },
  {
    icon: { label: 'Puzzle goal', symbol: '🧩', tone: 'accent' },
    keywords: ['rubik', 'cube', 'puzzle', 'chess', 'logic', 'кубик', 'рубик', 'головолом', 'шахмат', 'логик'],
  },
];

type GoalIconRule = {
  icon: GoalIcon;
  keywords: string[];
};

function getGoalSearchText(goal: GoalSummary) {
  return [
    goal.title,
    goal.description,
    goal.currentLevel,
    goal.aiAnalysis?.goalSummary,
    goal.aiAnalysis?.firstSmallAction,
    goal.todayTask?.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getGoalIcon(goal: GoalSummary | undefined): GoalIcon {
  if (!goal) {
    return { label: 'Goal', symbol: '✦', tone: 'accent' };
  }

  const text = getGoalSearchText(goal);
  const keywordMatch = keywordGoalIcons.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  );

  return keywordMatch?.icon ?? mentorGoalIcons[goal.mentorProfileId] ?? { label: 'Goal', symbol: '✦', tone: 'accent' };
}
