import { SeededRandom, type BracketPair, type GameState } from '@nv-hacking/shared';
import { getDisplayChar } from '@nv-hacking/shared';
import { drawDoomCoHeader } from './crtPaintCommon.js';

export interface GamePaintState {
  gameState: GameState & { brackets?: BracketPair[] };
  selection: { start: number; end: number } | null;
  selectionBlink: boolean;
  headerLine: string;
  attemptsLine: string;
  messages: string[];
  colsPerRow: number;
  totalRows: number;
}

const COLORS = {
  primary: { fill: '#4f9a76', glow: 'rgba(28,236,132,0.35)' },
  dim: { fill: '#3a6b54', glow: 'transparent' },
  accent: { fill: '#ffba5e', glow: 'rgba(255,150,52,0.85)' },
  /** Bright CRT phosphor — selected char / word */
  selected: { fill: '#bdf8d2', glow: 'rgba(28,236,132,0.98)' },
  /** Dimmed phase of the selection blink — still clearly distinct from primary, never invisible */
  selectedDim: { fill: '#7fd6a6', glow: 'rgba(28,236,132,0.55)' },
  selectedBracket: { fill: '#1cec84', glow: 'rgba(28,236,132,1)' },
  error: { fill: '#ff6b6b', glow: 'rgba(255,100,100,0.9)' },
  bracketIdle: { fill: '#ffba5e', glow: 'rgba(255,150,52,0.75)' },
};

function generateAddress(row: number, seed: number): string {
  const rng = new SeededRandom(seed + row * 7919);
  return `0x${rng.int(0x1000, 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

function setColor(
  ctx: CanvasRenderingContext2D,
  color: { fill: string; glow: string },
  glow: boolean,
  fontSize: number,
  glowScale = 0.38,
) {
  ctx.fillStyle = color.fill;
  ctx.shadowColor = glow ? color.glow : 'transparent';
  ctx.shadowBlur = glow ? fontSize * glowScale : 0;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: { fill: string; glow: string },
  fontSize: number,
  glowScale = 0.38,
) {
  setColor(ctx, color, true, fontSize, glowScale);
  ctx.fillText(text, x, y);
  setColor(ctx, color, false, fontSize, 0);
  ctx.fillText(text, x, y);
}

function drawPhosphorBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number,
) {
  ctx.save();
  ctx.shadowColor = 'rgba(28,236,132,0.85)';
  ctx.shadowBlur = h * 0.55;
  ctx.fillStyle = `rgba(28, 236, 132, ${(0.18 + intensity * 0.22).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(141, 240, 180, ${(0.06 + intensity * 0.1).toFixed(3)})`;
  ctx.fillRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
  ctx.restore();
}

type PaintSegment = {
  char: string;
  selected: boolean;
  gridIndex: number | null;
};

/** Orange accent garbage — deterministic per cell, like the ThreeUI terminal "OK" highlights. */
function isAccentGarbage(index: number, char: string, seed: number): boolean {
  if (/[a-zA-Z]/.test(char)) return false;
  if (/[()[\]{}<>]/.test(char)) return true;
  const rng = new SeededRandom(seed + index * 6271);
  return rng.next() < 0.13;
}

function buildRowSegments(
  gameState: GameState & { brackets?: BracketPair[] },
  row: number,
  colsPerRow: number,
  selection: { start: number; end: number } | null,
): PaintSegment[] {
  const rowStart = row * colsPerRow;
  const segments: PaintSegment[] = [];

  for (let col = 0; col < colsPerRow; col++) {
    const index = rowStart + col;
    const inSelection = Boolean(selection && index >= selection.start && index <= selection.end);

    const char = getDisplayChar(
      gameState.grid,
      index,
      gameState.removedWords,
      gameState.wordPositions,
      gameState.words,
    );
    segments.push({ char, selected: inSelection, gridIndex: index });
  }

  return segments;
}

export function paintGameScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: GamePaintState,
): void {
  const { gameState, selection, selectionBlink, headerLine, attemptsLine, messages, colsPerRow, totalRows } = data;
  const ADDR_W = 6;
  const GAP = 2;
  const maxContentCols = ADDR_W + GAP + colsPerRow + 2;
  const footerRows = Math.max(2, messages.length + 1);
  const gridRows = totalRows;
  const portraitMobile = height > width * 1.05 && width < 1100;
  const headerTitleRows = portraitMobile ? 2 : 1;
  const totalLineRows = headerTitleRows + 1 + gridRows + footerRows;

  const usableHeight = height * (portraitMobile ? 0.76 : 0.88);
  const topPad = height * (portraitMobile ? 0.04 : 0.06);
  const lineHeight = usableHeight / totalLineRows;
  const fontSize = Math.max(7, Math.min(lineHeight * 0.78, width / (maxContentCols * 0.58)));
  const font = `600 ${fontSize.toFixed(2)}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#03100a';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = font;

  const charWidth = ctx.measureText('M').width || fontSize * 0.6;
  const contentWidth = (ADDR_W + GAP + colsPerRow + 2) * charWidth;
  const startX = Math.max(8, Math.floor((width - contentWidth) / 2));
  let y = topPad;

  if (portraitMobile) {
    drawText(ctx, headerLine, startX, y, COLORS.dim, fontSize);
    y += lineHeight * 0.92;
    const attemptsWidth = ctx.measureText(attemptsLine).width;
    drawText(ctx, attemptsLine, startX + contentWidth - attemptsWidth, y, COLORS.accent, fontSize, 0.45);
    y += lineHeight * 0.92;
  } else {
    drawDoomCoHeader(ctx, startX, y, contentWidth, fontSize, attemptsLine);
    y += lineHeight;
  }

  drawText(ctx, '─'.repeat(Math.min(colsPerRow + 10, 54)), startX, y, COLORS.dim, fontSize);
  y += lineHeight * 0.85;

  // The selection highlight is always visible — selectionBlink only toggles between
  // full brightness and a dimmed phosphor glow, so the cursor is never fully invisible
  // (previously it vanished for half the blink cycle, which made moving hard to track).
  const showSelection = Boolean(selection);
  const blockH = lineHeight * 0.88;

  for (let row = 0; row < gridRows; row++) {
    const addr = generateAddress(row, gameState.seed);
    let addrX = startX;
    for (let i = 0; i < addr.length; i++) {
      const ch = addr[i];
      const accent = i >= 2 && isAccentGarbage(row * 1000 + i, ch, gameState.seed);
      drawText(ctx, ch, addrX, y, accent ? COLORS.accent : COLORS.dim, fontSize, accent ? 0.42 : 0.2);
      addrX += charWidth;
    }

    const segments = buildRowSegments(gameState, row, colsPerRow, showSelection ? selection : null);
    const charsX = startX + (ADDR_W + GAP) * charWidth;
    const rowBlockY = y + fontSize * 0.04;

    if (showSelection && selection) {
      let x = charsX;
      for (const seg of segments) {
        if (seg.selected) {
          drawPhosphorBlock(ctx, x - 1, rowBlockY, charWidth + 2, blockH, selectionBlink ? 1 : 0.42);
        }
        x += charWidth;
      }
    }

    let x = charsX;
    for (const seg of segments) {
      let color = COLORS.primary;

      if (seg.selected && showSelection) {
        color = selectionBlink ? COLORS.selected : COLORS.selectedDim;
      } else if (seg.gridIndex !== null) {
        const inIdleBracket = gameState.brackets?.some(
          (b) => !b.used && seg.gridIndex! >= b.startIndex && seg.gridIndex! <= b.endIndex,
        );
        if (inIdleBracket) {
          color = COLORS.bracketIdle;
        } else if (isAccentGarbage(seg.gridIndex, seg.char, gameState.seed)) {
          color = COLORS.accent;
        }
      }

      const glow =
        seg.selected && showSelection
          ? selectionBlink
            ? 0.62
            : 0.4
          : color === COLORS.accent
            ? 0.48
            : 0.28;
      drawText(ctx, seg.char, x, y, color, fontSize, glow);
      x += charWidth;
    }

    y += lineHeight;
  }

  y += lineHeight * 0.25;
  for (const msg of messages) {
    drawText(
      ctx,
      msg,
      startX,
      y,
      msg.includes('LOCKED') ? COLORS.error : COLORS.selected,
      fontSize,
      0.45,
    );
    y += lineHeight;
  }
}
