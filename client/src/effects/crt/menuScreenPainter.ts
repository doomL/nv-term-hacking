import {
  CRT_COLORS,
  drawCrtText,
  drawDoomCoHeader,
  drawPhosphorBlock,
  measureCrtText,
  measureLayout,
  crtFont,
} from './crtPaintCommon.js';

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
}

export interface MenuPaintState {
  selectedIndex: number;
  selectionBlink: boolean;
  title: string;
  subtitle: string;
  items: MenuItem[];
  statusLines?: string[];
  footerLines: string[];
  headerRight?: string;
}

function measureMenuItem(
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  marker: string,
  item: MenuItem,
) {
  const hintFontSize = fontSize * 0.88;
  const labelText = `${marker} ${item.label}`;
  const labelWidth = measureCrtText(ctx, labelText, fontSize);
  const markerWidth = measureCrtText(ctx, `${marker} `, fontSize);

  let hintWidth = 0;
  if (item.hint) {
    hintWidth = measureCrtText(ctx, item.hint, hintFontSize);
  }

  const contentWidth = Math.max(labelWidth, markerWidth + hintWidth);
  const labelHeight = fontSize * 1.05;
  const hintGap = fontSize * 0.42;
  const hintHeight = item.hint ? hintFontSize * 1.12 : 0;
  const contentHeight = item.hint ? labelHeight + hintGap + hintHeight : labelHeight;

  return {
    labelText,
    markerWidth,
    hintFontSize,
    hintGap,
    contentWidth,
    contentHeight,
    labelHeight,
    hintHeight,
  };
}

export function paintMenuScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: MenuPaintState,
) {
  const lineCount = 4 + data.items.length * 2 + (data.statusLines?.length ?? 0) + data.footerLines.length;
  const { lineHeight, fontSize, charWidth, startX } = measureLayout(width, height, lineCount);
  const contentWidth = width * 0.88;
  const blink = data.selectionBlink ? 1 : 0.08;
  const padX = fontSize * 0.55;
  const padY = fontSize * 0.32;
  const innerPad = fontSize * 0.12;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#03100a';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = crtFont(fontSize);

  let y = height * 0.05;
  drawDoomCoHeader(ctx, startX, y, contentWidth, fontSize, data.headerRight);
  y += lineHeight * 1.2;

  drawCrtText(ctx, data.title, startX, y, CRT_COLORS.title, fontSize, 0.55);
  y += lineHeight;
  drawCrtText(ctx, data.subtitle, startX, y, CRT_COLORS.dim, fontSize * 0.92, 0.25);
  y += lineHeight * 1.3;

  drawCrtText(ctx, '─'.repeat(Math.min(48, Math.floor(contentWidth / charWidth))), startX, y, CRT_COLORS.dim, fontSize);
  y += lineHeight * 0.9;

  data.items.forEach((item, index) => {
    const selected = index === data.selectedIndex;
    const rowY = y;
    const marker = selected ? '[>]' : '   ';
    const layout = measureMenuItem(ctx, fontSize, marker, item);

    if (selected) {
      drawPhosphorBlock(
        ctx,
        startX - padX,
        rowY - padY,
        layout.contentWidth + padX * 2,
        layout.contentHeight + padY * 2,
        blink,
        innerPad,
      );
    }

    drawCrtText(
      ctx,
      layout.labelText,
      startX,
      rowY,
      selected ? (data.selectionBlink ? CRT_COLORS.selected : CRT_COLORS.primary) : CRT_COLORS.primary,
      fontSize,
      selected ? 0.55 : 0.28,
    );

    if (item.hint) {
      drawCrtText(
        ctx,
        item.hint,
        startX + layout.markerWidth,
        rowY + layout.labelHeight + layout.hintGap,
        selected ? CRT_COLORS.selected : CRT_COLORS.dim,
        layout.hintFontSize,
        selected ? 0.35 : 0.2,
      );
    }

    y += layout.contentHeight + padY * 2 + lineHeight * 0.22;
  });

  if (data.statusLines?.length) {
    y += lineHeight * 0.3;
    for (const line of data.statusLines) {
      drawCrtText(ctx, line, startX, y, CRT_COLORS.accent, fontSize, 0.4);
      y += lineHeight;
    }
  }

  y = height - lineHeight * (data.footerLines.length + 0.8);
  for (const line of data.footerLines) {
    drawCrtText(ctx, line, startX, y, CRT_COLORS.dim, fontSize * 0.9, 0.2);
    y += lineHeight * 0.85;
  }
}
