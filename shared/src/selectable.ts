import type { BracketPair, GameState } from './types.js';

export type HighlightRegion =
  | { kind: 'char'; index: number; start: number; end: number }
  | { kind: 'word'; word: string; id: string; start: number; end: number }
  | { kind: 'bracket'; id: string; start: number; end: number };

/** Resolve what to illuminate at the current cursor (char, whole word, or bracket block). */
export function resolveHighlightAt(
  cursorIndex: number,
  state: GameState & { brackets?: BracketPair[] },
): HighlightRegion {
  for (const word of state.words) {
    if (state.removedWords.has(word)) continue;
    const start = state.wordPositions[word];
    if (start === undefined) continue;
    const end = start + word.length - 1;
    if (cursorIndex >= start && cursorIndex <= end) {
      return { kind: 'word', word, id: `word:${word}`, start, end };
    }
  }

  if (state.brackets) {
    let best: HighlightRegion | null = null;
    let bestSpan = Infinity;
    for (const bracket of state.brackets) {
      if (bracket.used || state.usedBrackets.has(bracket.id)) continue;
      if (cursorIndex >= bracket.startIndex && cursorIndex <= bracket.endIndex) {
        const span = bracket.endIndex - bracket.startIndex;
        if (span < bestSpan) {
          bestSpan = span;
          best = {
            kind: 'bracket',
            id: bracket.id,
            start: bracket.startIndex,
            end: bracket.endIndex,
          };
        }
      }
    }
    if (best) return best;
  }

  return { kind: 'char', index: cursorIndex, start: cursorIndex, end: cursorIndex };
}

export function moveCursor(
  index: number,
  deltaCol: number,
  deltaRow: number,
  colsPerRow: number,
  totalRows: number,
): number {
  let row = Math.floor(index / colsPerRow);
  let col = index % colsPerRow;
  col += deltaCol;
  row += deltaRow;

  while (col < 0) {
    col += colsPerRow;
    row--;
  }
  while (col >= colsPerRow) {
    col -= colsPerRow;
    row++;
  }
  while (row < 0) row += totalRows;
  while (row >= totalRows) row -= totalRows;

  return row * colsPerRow + col;
}

/**
 * Char-by-char on garbage; whole word/bracket highlights but ← → exit the block in one step
 * instead of crawling through letters already covered by the selection.
 */
export function moveCursorSelectable(
  index: number,
  deltaCol: number,
  deltaRow: number,
  colsPerRow: number,
  totalRows: number,
  state: GameState & { brackets?: BracketPair[] },
): number {
  const region = resolveHighlightAt(index, state);

  if (deltaCol !== 0 && deltaRow === 0 && region.start !== region.end) {
    const anchor = deltaCol > 0 ? region.end : region.start;
    return moveCursor(anchor, deltaCol, 0, colsPerRow, totalRows);
  }

  return moveCursor(index, deltaCol, deltaRow, colsPerRow, totalRows);
}

export function getDisplayChar(
  grid: string,
  index: number,
  removedWords: Set<string>,
  wordPositions: Record<string, number>,
  words: string[],
): string {
  for (const word of words) {
    if (!removedWords.has(word)) continue;
    const pos = wordPositions[word];
    if (pos !== undefined && index >= pos && index < pos + word.length) {
      return '.';
    }
  }
  return grid[index] ?? '.';
}
