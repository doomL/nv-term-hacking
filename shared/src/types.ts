export type Difficulty = 'novice' | 'advanced' | 'expert' | 'veryHard';

export type BracketType = '(' | ')' | '[' | ']' | '{' | '}' | '<' | '>';

export interface BracketPair {
  id: string;
  open: BracketType;
  close: BracketType;
  startIndex: number;
  endIndex: number;
  used: boolean;
}

export interface GameConfig {
  difficulty: Difficulty;
  seed?: number;
  language?: 'en' | 'it';
}

export interface GameState {
  id: string;
  seed: number;
  difficulty: Difficulty;
  grid: string;
  words: string[];
  password: string;
  wordPositions: Record<string, number>;
  attemptsLeft: number;
  maxAttempts: number;
  removedWords: Set<string>;
  usedBrackets: Set<string>;
  status: 'playing' | 'won' | 'locked';
  lastMessage: string;
  startTime: number;
  endTime?: number;
}

export interface GuessResult {
  state: GameState;
  likeness?: number;
  wordLength?: number;
  bracketEffect?: 'dud' | 'replenish';
  removedWord?: string;
}

export interface DifficultySettings {
  wordLength: { min: number; max: number };
  wordCount: { min: number; max: number };
  gridRows: number;
  colsPerRow: number;
  bracketPairs: { min: number; max: number };
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  novice: {
    wordLength: { min: 4, max: 6 },
    wordCount: { min: 6, max: 8 },
    gridRows: 12,
    colsPerRow: 12,
    bracketPairs: { min: 2, max: 4 },
  },
  advanced: {
    wordLength: { min: 6, max: 8 },
    wordCount: { min: 8, max: 10 },
    gridRows: 14,
    colsPerRow: 12,
    bracketPairs: { min: 3, max: 5 },
  },
  expert: {
    wordLength: { min: 8, max: 10 },
    wordCount: { min: 10, max: 12 },
    gridRows: 16,
    colsPerRow: 12,
    bracketPairs: { min: 4, max: 6 },
  },
  veryHard: {
    wordLength: { min: 10, max: 12 },
    wordCount: { min: 12, max: 15 },
    gridRows: 18,
    colsPerRow: 12,
    bracketPairs: { min: 5, max: 7 },
  },
};

export const MAX_ATTEMPTS = 4;
export const GARBAGE_CHARS = '0123456789ABCDEF!@#$%^&*()_+{}[]<>.,;\':"|/\\~`-=';
/** Minimum garbage cells between any two words (Fallout-style spacing). */
export const MIN_WORD_GAP = 4;
export const BRACKET_OPEN: BracketType[] = ['(', '[', '{', '<'];
export const BRACKET_CLOSE: Record<string, BracketType> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
};

export function calculateScore(state: GameState): number {
  if (state.status !== 'won') return 0;
  const elapsed = (state.endTime ?? Date.now()) - state.startTime;
  const timeBonus = Math.max(0, 60000 - elapsed);
  const attemptBonus = state.attemptsLeft * 500;
  const diffMultiplier = { novice: 1, advanced: 1.5, expert: 2, veryHard: 3 }[state.difficulty];
  return Math.round((1000 + timeBonus / 100 + attemptBonus) * diffMultiplier);
}
