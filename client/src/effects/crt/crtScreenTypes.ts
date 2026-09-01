import type { GamePaintState } from './gameScreenPainter.js';
import type { MenuPaintState } from './menuScreenPainter.js';
import type { TextPaintState } from './textScreenPainter.js';

export type CrtScreenState =
  | ({ type: 'game' } & GamePaintState)
  | ({ type: 'menu' } & MenuPaintState)
  | ({ type: 'text' } & TextPaintState);

export type { GamePaintState, MenuPaintState, TextPaintState };
