interface CrtTouchDpadProps {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onOk?: () => void;
  onBack?: () => void;
  backLabel?: string;
  okDisabled?: boolean;
  mode?: 'menu' | 'game';
}

export function CrtTouchDpad({
  onUp,
  onDown,
  onLeft,
  onRight,
  onOk,
  onBack,
  backLabel = '← MENU',
  okDisabled,
  mode = 'game',
}: CrtTouchDpadProps) {
  const showHorizontal = mode === 'game';
  // Menu screens use swipe + tap; only gameplay keeps the on-screen D-pad.
  const showDpad = mode === 'game' && Boolean(onUp || onDown || onLeft || onRight || onOk);

  return (
    <div className="crt-touch-layer">
      {onBack && (
        <button
          type="button"
          className={`crt-touch-back${mode === 'game' ? ' crt-touch-back--game' : ''}`}
          onClick={onBack}
          aria-label={backLabel}
        >
          {backLabel}
        </button>
      )}
      {showDpad && (
        <div className="crt-touch-dpad">
          {onUp && (
            <button type="button" className="crt-touch-btn" onClick={onUp} aria-label="Up">
              ▲
            </button>
          )}
          <div className="crt-touch-dpad-row">
            {showHorizontal && onLeft && (
              <button type="button" className="crt-touch-btn" onClick={onLeft} aria-label="Left">
                ◀
              </button>
            )}
            {onOk && (
              <button
                type="button"
                className="crt-touch-btn ok"
                onClick={onOk}
                disabled={okDisabled}
                aria-label="OK"
              >
                OK
              </button>
            )}
            {showHorizontal && onRight && (
              <button type="button" className="crt-touch-btn" onClick={onRight} aria-label="Right">
                ▶
              </button>
            )}
          </div>
          {onDown && (
            <button type="button" className="crt-touch-btn" onClick={onDown} aria-label="Down">
              ▼
            </button>
          )}
        </div>
      )}
    </div>
  );
}
