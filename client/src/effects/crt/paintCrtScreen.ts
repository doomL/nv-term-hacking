import { paintGameScreen } from './gameScreenPainter.js';
import { paintMenuScreen } from './menuScreenPainter.js';
import { paintTextScreen } from './textScreenPainter.js';
import type { CrtScreenState } from './crtScreenTypes.js';

export function paintCrtScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrtScreenState,
  selectionBlink: boolean,
) {
  switch (state.type) {
    case 'game':
      paintGameScreen(ctx, width, height, { ...state, selectionBlink });
      break;
    case 'menu':
      paintMenuScreen(ctx, width, height, { ...state, selectionBlink });
      break;
    case 'text':
      paintTextScreen(ctx, width, height, { ...state, selectionBlink });
      break;
  }
}
