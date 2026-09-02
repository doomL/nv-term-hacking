import { useEffect, useState } from 'react';

const TOUCH_UI_QUERY = '(pointer: coarse), (max-width: 900px)';

export function useTouchUi(): boolean {
  const [touchUi, setTouchUi] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TOUCH_UI_QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(TOUCH_UI_QUERY);
    const update = () => setTouchUi(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return touchUi;
}
