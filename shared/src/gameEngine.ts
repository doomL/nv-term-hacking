import {
  BRACKET_CLOSE,
  BRACKET_OPEN,
  DIFFICULTY_SETTINGS,
  GARBAGE_CHARS,
  MAX_ATTEMPTS,
  MIN_WORD_GAP,
  type BracketPair,
  type BracketType,
  type Difficulty,
  type GameConfig,
  type GameState,
  type GuessResult,
} from './types.js';
import { getWordList, normalizeGameLanguage } from './wordLists.js';

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

function getWordsForLength(
  length: number,
  count: number,
  rng: SeededRandom,
  language: ReturnType<typeof normalizeGameLanguage>,
): string[] {
  const pool = getWordList(language, length);
  const shuffled = rng.shuffle([...pool]);
  const words: string[] = [];
  for (const w of shuffled) {
    if (words.length >= count) break;
    if (!words.includes(w)) words.push(w);
  }
  while (words.length < count) {
    const base = rng.pick(pool);
    words.push(base.slice(0, length).padEnd(length, 'X'));
  }
  return words.slice(0, count);
}

function generateMemoryAddress(row: number, rng: SeededRandom): string {
  const hex = rng.int(0x1000, 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `0x${hex}`;
}

function embedWordsInGrid(
  gridSize: number,
  colsPerRow: number,
  words: string[],
  rng: SeededRandom,
  minGap = MIN_WORD_GAP,
): { grid: string[]; wordPositions: Map<string, number> } {
  const flat: string[] = Array(gridSize).fill('');
  for (let i = 0; i < gridSize; i++) {
    flat[i] = rng.pick(GARBAGE_CHARS.split(''));
  }

  const wordPositions = new Map<string, number>();
  const wordLen = words[0]?.length ?? 6;
  const occupied = new Set<number>();
  const maxRow = Math.floor(gridSize / colsPerRow) - 1;
  const shuffledWords = rng.shuffle([...words]);

  for (const word of shuffledWords) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const row = rng.int(0, maxRow);
      const col = rng.int(0, colsPerRow - wordLen);
      const startIndex = row * colsPerRow + col;

      let blocked = false;
      for (let i = -minGap; i < wordLen + minGap; i++) {
        const idx = startIndex + i;
        if (idx < 0 || idx >= gridSize) {
          blocked = true;
          break;
        }
        if (occupied.has(idx)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (let i = 0; i < wordLen; i++) {
        flat[startIndex + i] = word[i];
        occupied.add(startIndex + i);
      }
      wordPositions.set(word, startIndex);
      placed = true;
    }
  }

  return { grid: flat, wordPositions };
}

function wordCellSet(wordPositions: Map<string, number>, wordLen: number): Set<number> {
  const cells = new Set<number>();
  for (const [, pos] of wordPositions) {
    for (let i = 0; i < wordLen; i++) cells.add(pos + i);
  }
  return cells;
}

/** Every matching open/close in the grid, including adjacent pairs like (). */
function discoverBracketPairs(
  flatGrid: string[],
  wordPositions: Map<string, number>,
  wordLen: number,
): BracketPair[] {
  const wordCells = wordCellSet(wordPositions, wordLen);
  const pairs: BracketPair[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < flatGrid.length; start++) {
    const open = flatGrid[start];
    if (!BRACKET_OPEN.includes(open as BracketType)) continue;
    const closeChar = BRACKET_CLOSE[open];

    for (let end = start + 1; end < flatGrid.length; end++) {
      if (flatGrid[end] !== closeChar) continue;

      let blocked = false;
      for (let k = start + 1; k < end; k++) {
        if (wordCells.has(k)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const key = `${start}:${end}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        id: `bracket-${start}-${end}`,
        open: open as BracketType,
        close: closeChar as BracketType,
        startIndex: start,
        endIndex: end,
        used: false,
      });
      break;
    }
  }

  return pairs;
}

function generateBrackets(
  gridSize: number,
  count: number,
  wordPositions: Map<string, number>,
  wordLen: number,
  rng: SeededRandom,
): BracketPair[] {
  const pairs: BracketPair[] = [];
  const occupied = new Set<number>();

  for (const [, pos] of wordPositions) {
    for (let i = 0; i < wordLen; i++) occupied.add(pos + i);
  }

  for (let p = 0; p < count; p++) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const open = rng.pick(BRACKET_OPEN);
      const close = BRACKET_CLOSE[open];
      const minSpan = 0;
      const maxSpan = 8;
      const span = rng.int(minSpan, maxSpan);
      const start = rng.int(0, gridSize - span - 2);
      const end = start + span + 1;

      let conflict = false;
      for (let i = start; i <= end; i++) {
        if (occupied.has(i)) { conflict = true; break; }
      }
      for (const existing of pairs) {
        if (start <= existing.endIndex && end >= existing.startIndex) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      pairs.push({
        id: `bracket-${p}`,
        open,
        close,
        startIndex: start,
        endIndex: end,
        used: false,
      });
      for (let i = start; i <= end; i++) occupied.add(i);
      break;
    }
  }

  return pairs;
}

export function createGame(config: GameConfig): GameState & { brackets: BracketPair[] } {
  const seed = config.seed ?? Date.now();
  const rng = new SeededRandom(seed);
  const settings = DIFFICULTY_SETTINGS[config.difficulty];
  const language = normalizeGameLanguage(config.language);
  const wordLen = rng.int(settings.wordLength.min, settings.wordLength.max);
  const wordCount = rng.int(settings.wordCount.min, settings.wordCount.max);
  const gridSize = settings.gridRows * settings.colsPerRow;

  const words = getWordsForLength(wordLen, wordCount, rng, language);
  const password = rng.pick(words);

  const { grid: flatGrid, wordPositions } = embedWordsInGrid(
    gridSize,
    settings.colsPerRow,
    words,
    rng,
  );
  const bracketCount = rng.int(settings.bracketPairs.min, settings.bracketPairs.max);
  const planted = generateBrackets(gridSize, bracketCount, wordPositions, wordLen, rng);
  for (const bracket of planted) {
    flatGrid[bracket.startIndex] = bracket.open;
    flatGrid[bracket.endIndex] = bracket.close;
  }

  for (let i = 0; i < flatGrid.length; i++) {
    if (!/[a-zA-Z<>\[\]{}()]/.test(flatGrid[i]) || flatGrid[i] === undefined || flatGrid[i] === '') {
      flatGrid[i] = rng.pick(GARBAGE_CHARS.split(''));
    }
  }

  let brackets = discoverBracketPairs(flatGrid, wordPositions, wordLen);
  let plantAttempt = 0;
  while (brackets.length < settings.bracketPairs.min && plantAttempt < 40) {
    plantAttempt++;
    const extra = generateBrackets(gridSize, 1, wordPositions, wordLen, rng);
    if (extra.length === 0) break;
    for (const bracket of extra) {
      flatGrid[bracket.startIndex] = bracket.open;
      flatGrid[bracket.endIndex] = bracket.close;
    }
    brackets = discoverBracketPairs(flatGrid, wordPositions, wordLen);
  }

  const positions: Record<string, number> = {};
  for (const [word, pos] of wordPositions) positions[word] = pos;

  const grid = flatGrid.join('');

  return {
    id: `game-${seed}`,
    seed,
    difficulty: config.difficulty,
    grid,
    words,
    password,
    wordPositions: positions,
    attemptsLeft: MAX_ATTEMPTS,
    maxAttempts: MAX_ATTEMPTS,
    removedWords: new Set(),
    usedBrackets: new Set(),
    status: 'playing',
    lastMessage: '',
    startTime: Date.now(),
    brackets,
  };
}

export function calculateLikeness(guess: string, password: string): number {
  let count = 0;
  const len = Math.min(guess.length, password.length);
  for (let i = 0; i < len; i++) {
    if (guess[i] === password[i]) count++;
  }
  return count;
}

export function formatGridDisplay(
  grid: string,
  colsPerRow: number,
  startRow: number,
  rowCount: number,
  rng: SeededRandom,
): string[] {
  const lines: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const row = startRow + r;
    const addr = generateMemoryAddress(row, rng);
    const start = row * colsPerRow;
    const content = grid.slice(start, start + colsPerRow).padEnd(colsPerRow, '.');
    lines.push(`${addr}  ${content}`);
  }
  return lines;
}

export function guessWord(state: GameState, word: string): GuessResult {
  const newState: GameState = {
    ...state,
    removedWords: new Set(state.removedWords),
    usedBrackets: new Set(state.usedBrackets),
  };

  if (state.status !== 'playing') {
    return { state: newState };
  }

  if (newState.removedWords.has(word)) {
    newState.lastMessage = 'DUD REMOVED';
    return { state: newState };
  }

  if (word === state.password) {
    newState.status = 'won';
    newState.endTime = Date.now();
    newState.lastMessage = 'ACCESS GRANTED';
    return { state: newState };
  }

  newState.attemptsLeft--;
  const likeness = calculateLikeness(word, state.password);
  const wordLength = state.password.length;
  newState.lastMessage = `${likeness}/${wordLength} correct.`;

  if (newState.attemptsLeft <= 0) {
    newState.status = 'locked';
    newState.endTime = Date.now();
    newState.lastMessage = 'TERMINAL LOCKED';
  }

  return { state: newState, likeness, wordLength };
}

export function activateBracket(
  state: GameState & { brackets: BracketPair[] },
  bracketId: string,
): GuessResult {
  const newState: GameState = {
    ...state,
    removedWords: new Set(state.removedWords),
    usedBrackets: new Set(state.usedBrackets),
  };

  if (state.status !== 'playing') return { state: newState };
  if (newState.usedBrackets.has(bracketId)) return { state: newState };

  const bracket = state.brackets.find((b) => b.id === bracketId && !b.used);
  if (!bracket) return { state: newState };

  bracket.used = true;
  newState.usedBrackets.add(bracketId);

  const isReplenish = new SeededRandom(state.seed + bracketId.length).next() > 0.5;

  if (isReplenish) {
    newState.attemptsLeft = MAX_ATTEMPTS;
    newState.lastMessage = 'ATTEMPTS REPLENISHED';
    return { state: newState, bracketEffect: 'replenish' };
  }

  const activeWords = state.words.filter(
    (w) => w !== state.password && !newState.removedWords.has(w),
  );
  if (activeWords.length > 0) {
    const rng = new SeededRandom(state.seed + newState.usedBrackets.size);
    const removed = rng.pick(activeWords);
    newState.removedWords.add(removed);
    newState.lastMessage = 'DUD REMOVED';
    return { state: newState, bracketEffect: 'dud', removedWord: removed };
  }

  newState.attemptsLeft = MAX_ATTEMPTS;
  newState.lastMessage = 'ATTEMPTS REPLENISHED';
  return { state: newState, bracketEffect: 'replenish' };
}

export function serializeGameState(state: GameState & { brackets?: BracketPair[] }) {
  return {
    ...state,
    removedWords: Array.from(state.removedWords),
    usedBrackets: Array.from(state.usedBrackets),
    brackets: state.brackets?.map((b) => ({ ...b })),
  };
}

export function deserializeGameState(raw: ReturnType<typeof serializeGameState>): GameState & { brackets: BracketPair[] } {
  return {
    ...raw,
    removedWords: new Set(raw.removedWords),
    usedBrackets: new Set(raw.usedBrackets),
    brackets: raw.brackets ?? [],
  };
}

export { DIFFICULTY_SETTINGS, MAX_ATTEMPTS } from './types.js';
