export const CRT_COLORS = {
  primary: { fill: '#4f9a76', glow: 'rgba(28,236,132,0.35)' },
  dim: { fill: '#3a6b54', glow: 'transparent' },
  accent: { fill: '#ffba5e', glow: 'rgba(255,150,52,0.85)' },
  selected: { fill: '#bdf8d2', glow: 'rgba(28,236,132,0.98)' },
  selectedBracket: { fill: '#1cec84', glow: 'rgba(28,236,132,1)' },
  error: { fill: '#ff6b6b', glow: 'rgba(255,100,100,0.9)' },
  bracketIdle: { fill: '#ffba5e', glow: 'rgba(255,150,52,0.75)' },
  title: { fill: '#8df0b4', glow: 'rgba(28,236,132,0.75)' },
};

export function setCrtColor(
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

export function drawCrtText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: { fill: string; glow: string },
  fontSize: number,
  glowScale = 0.38,
) {
  setCrtColor(ctx, color, true, fontSize, glowScale);
  ctx.fillText(text, x, y);
  setCrtColor(ctx, color, false, fontSize, 0);
  ctx.fillText(text, x, y);
}

export function drawPhosphorBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number,
  innerPad = 0,
) {
  ctx.save();
  ctx.shadowColor = 'rgba(28,236,132,0.85)';
  ctx.shadowBlur = h * 0.55;
  ctx.fillStyle = `rgba(28, 236, 132, ${(0.18 + intensity * 0.22).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);
  const inset = Math.max(0, innerPad);
  ctx.fillStyle = `rgba(141, 240, 180, ${(0.06 + intensity * 0.1).toFixed(3)})`;
  ctx.fillRect(
    x + 1 + inset,
    y + 1 + inset,
    Math.max(0, w - 2 - inset * 2),
    Math.max(0, h - 2 - inset * 2),
  );
  ctx.restore();
}

export function crtFont(size: number) {
  return `600 ${size.toFixed(2)}px ${CRT_FONT}`;
}

export function measureCrtText(ctx: CanvasRenderingContext2D, text: string, fontSize: number) {
  ctx.font = crtFont(fontSize);
  return ctx.measureText(text).width;
}

export const CRT_FONT =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

export function drawDoomCoHeader(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  width: number,
  fontSize: number,
  rightText?: string,
) {
  drawCrtText(ctx, 'DoomCo TermLink v2.3.0', startX, y, CRT_COLORS.dim, fontSize);
  if (rightText) {
    const rightWidth = ctx.measureText(rightText).width;
    drawCrtText(
      ctx,
      rightText,
      startX + width - rightWidth,
      y,
      CRT_COLORS.accent,
      fontSize,
    );
  }
}

export function measureLayout(width: number, height: number, lineCount: number) {
  const portraitMobile = height > width * 1.05 && width < 1100;
  const usableHeight = height * (portraitMobile ? 0.76 : 0.88);
  const lineHeight = usableHeight / Math.max(lineCount, 1);
  const fontSize = Math.max(9, Math.min(lineHeight * 0.78, width / (portraitMobile ? 34 : 42)));
  const charWidth = fontSize * 0.6;
  return { lineHeight, fontSize, charWidth, startX: width * (portraitMobile ? 0.08 : 0.06) };
}
