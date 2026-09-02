import {
  CRT_COLORS,
  CRT_FONT,
  drawCrtText,
  drawDoomCoHeader,
  drawPhosphorBlock,
  measureLayout,
} from './crtPaintCommon.js';

export interface TextLine {
  text: string;
  tone?: 'primary' | 'dim' | 'accent' | 'selected' | 'error';
}

export interface TextPaintState {
  selectionBlink: boolean;
  title: string;
  lines: TextLine[];
  selectableLines?: number[];
  selectedIndex?: number;
  footerLines: string[];
  headerRight?: string;
}

const TONE_MAP = {
  primary: CRT_COLORS.primary,
  dim: CRT_COLORS.dim,
  accent: CRT_COLORS.accent,
  selected: CRT_COLORS.selected,
  error: CRT_COLORS.error,
};

export function paintTextScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: TextPaintState,
) {
  const lineCount = 3 + data.lines.length + data.footerLines.length;
  const { lineHeight, fontSize, charWidth, startX } = measureLayout(width, height, lineCount);
  const contentWidth = width * 0.88;
  const blink = data.selectionBlink ? 1 : 0.08;

  const footerStartY = height - lineHeight * (data.footerLines.length + 0.8);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#03100a';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `600 ${fontSize.toFixed(2)}px ${CRT_FONT}`;

  let y = height * 0.05;
  drawDoomCoHeader(ctx, startX, y, contentWidth, fontSize, data.headerRight);
  y += lineHeight * 1.2;

  drawCrtText(ctx, data.title, startX, y, CRT_COLORS.title, fontSize, 0.55);
  y += lineHeight * 1.2;
  drawCrtText(ctx, '─'.repeat(Math.min(48, Math.floor(contentWidth / charWidth))), startX, y, CRT_COLORS.dim, fontSize);
  y += lineHeight;

  data.lines.forEach((line, index) => {
    if (y + lineHeight > footerStartY - lineHeight * 0.25) return;
    const selectable = data.selectableLines?.includes(index);
    const selected = selectable && data.selectedIndex === index;
    const color = selected
      ? (data.selectionBlink ? CRT_COLORS.selected : TONE_MAP[line.tone ?? 'primary'])
      : TONE_MAP[line.tone ?? 'primary'];
    const textWidth = line.text.length * charWidth;

    if (selected) {
      drawPhosphorBlock(ctx, startX - 4, y - 2, textWidth + 10, lineHeight * 1.05, blink);
    }

    drawCrtText(ctx, line.text, startX, y, color, fontSize, selected ? 0.55 : 0.3);
    y += lineHeight;
  });

  y = footerStartY;
  for (const line of data.footerLines) {
    drawCrtText(ctx, line, startX, y, CRT_COLORS.dim, fontSize * 0.9, 0.2);
    y += lineHeight * 0.85;
  }
}
