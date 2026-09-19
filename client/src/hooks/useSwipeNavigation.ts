import { useCallback, useRef } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

export interface SwipeHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  /** Short tap without a directional swipe — e.g. confirm selection on menu screens. */
  onTap?: () => void;
  /** Press-and-hold peek: hide touch chrome while the finger stays down. */
  onLookChange?: (looking: boolean) => void;
}

const SWIPE_THRESHOLD_PX = 32;
/** Cancel a pending look if the finger moves before hold completes. */
const LOOK_MOVE_CANCEL_PX = 14;
const LOOK_HOLD_MS = 450;
/** Touches starting on the on-screen D-pad/buttons already handle their own taps via onClick. */
const IGNORE_SELECTOR = '.crt-touch-layer';

/**
 * Generic swipe-to-navigate for any CRT screen — menus, auth, leaderboard, gameplay.
 * A single-finger swipe past the threshold fires the matching directional callback
 * once, same as a D-pad tap or an arrow key press.
 */
export function useSwipeNavigation(handlers: SwipeHandlers) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lookTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookingRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const clearLookTimer = useCallback(() => {
    if (lookTimerRef.current) {
      clearTimeout(lookTimerRef.current);
      lookTimerRef.current = null;
    }
  }, []);

  const setLooking = useCallback((active: boolean) => {
    if (lookingRef.current === active) return;
    lookingRef.current = active;
    handlersRef.current.onLookChange?.(active);
  }, []);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if ((e.target as HTMLElement).closest?.(IGNORE_SELECTOR)) {
        startRef.current = null;
        clearLookTimer();
        return;
      }
      const touch = e.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      clearLookTimer();
      if (handlersRef.current.onLookChange) {
        lookTimerRef.current = setTimeout(() => {
          lookTimerRef.current = null;
          setLooking(true);
        }, LOOK_HOLD_MS);
      }
    },
    [clearLookTimer, setLooking],
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const start = startRef.current;
      if (!start || lookingRef.current || !lookTimerRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > LOOK_MOVE_CANCEL_PX || Math.abs(dy) > LOOK_MOVE_CANCEL_PX) {
        clearLookTimer();
      }
    },
    [clearLookTimer],
  );

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      clearLookTimer();

      if (lookingRef.current) {
        setLooking(false);
        return;
      }

      if (!start || (e.target as HTMLElement).closest?.(IGNORE_SELECTOR)) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) {
        handlersRef.current.onTap?.();
        return;
      }

      const { onUp, onDown, onLeft, onRight } = handlersRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) onRight?.();
        else onLeft?.();
      } else {
        if (dy > 0) onDown?.();
        else onUp?.();
      }
    },
    [clearLookTimer, setLooking],
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
    clearLookTimer();
    if (lookingRef.current) setLooking(false);
  }, [clearLookTimer, setLooking]);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
