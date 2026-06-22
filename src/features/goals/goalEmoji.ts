import type { GoalSummary } from '../../types/goal';

const mentorEmoji: Partial<Record<GoalSummary['mentorProfileId'], string>> = {
  business_project: '💼',
  creative_skill: '🎨',
  fitness: '🏋️',
  language_learning: '🗣️',
  martial_arts: '🥋',
  music: '🎹',
  programming: '💻',
  puzzle_logic: '🧩',
  school_exam: '📚',
};

const keywordEmojiRules: Array<{ emoji: string; keywords: string[] }> = [
  { emoji: '🧩', keywords: ['rubik', 'cube', 'кубик', 'рубик', 'puzzle', 'chess', 'головолом', 'шахмат'] },
  { emoji: '💻', keywords: ['code', 'coding', 'program', 'web', 'app', 'react', 'javascript', 'python', 'сайт', 'код', 'программ'] },
  { emoji: '🏋️', keywords: ['fitness', 'gym', 'workout', 'strength', 'shape', 'спорт', 'зал', 'трен', 'форма'] },
  { emoji: '🍳', keywords: ['cook', 'cooking', 'recipe', 'bake', 'готов', 'кулинар', 'рецепт'] },
  { emoji: '🗣️', keywords: ['language', 'english', 'korean', 'speaking', 'ielts', 'язык', 'англий', 'говор'] },
  { emoji: '🎹', keywords: ['music', 'piano', 'guitar', 'sing', 'song', 'музык', 'пианино', 'гитар', 'петь'] },
  { emoji: '📚', keywords: ['study', 'exam', 'math', 'school', 'test', 'учеб', 'экзамен', 'матем', 'школ'] },
  { emoji: '💼', keywords: ['business', 'startup', 'shop', 'pitch', 'sales', 'бизнес', 'стартап', 'проект'] },
];

export function getGoalEmoji(goal: GoalSummary): string {
  const text = `${goal.title} ${goal.description}`.toLowerCase();
  const keywordMatch = keywordEmojiRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  );

  return keywordMatch?.emoji ?? mentorEmoji[goal.mentorProfileId] ?? '🎯';
}
