import { useCallback, useRef } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

export interface SwipeHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
}

const SWIPE_THRESHOLD_PX = 32;
/** Touches starting on the on-screen D-pad/buttons already handle their own taps via onClick. */
const IGNORE_SELECTOR = '.crt-touch-layer';

/**
 * Generic swipe-to-navigate for any CRT screen — menus, auth, leaderboard, gameplay.
 * A single-finger swipe past the threshold fires the matching directional callback
 * once, same as a D-pad tap or an arrow key press.
 */
export function useSwipeNavigation(handlers: SwipeHandlers) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    if ((e.target as HTMLElement).closest?.(IGNORE_SELECTOR)) {
      startRef.current = null;
      return;
    }
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback((e: ReactTouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || (e.target as HTMLElement).closest?.(IGNORE_SELECTOR)) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;

    const { onUp, onDown, onLeft, onRight } = handlersRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) onRight?.();
      else onLeft?.();
    } else {
      if (dy > 0) onDown?.();
      else onUp?.();
    }
  }, []);

  return { onTouchStart, onTouchEnd };
}
