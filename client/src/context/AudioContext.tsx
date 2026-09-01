import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAudioEngine, type SfxName } from '../audio/audioEngine';

interface AudioContextValue {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  toggleEnabled: () => void;
  playSfx: (name: SfxName) => void;
  unlock: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getAudioEngine(), []);
  const [enabled, setEnabledState] = useState(engine.enabled);

  const unlock = useCallback(() => {
    void engine.unlock();
  }, [engine]);

  const setEnabled = useCallback(
    (on: boolean) => {
      engine.setEnabled(on);
      setEnabledState(on);
    },
    [engine],
  );

  const toggleEnabled = useCallback(() => {
    setEnabled(!engine.enabled);
  }, [engine, setEnabled]);

  const playSfx = useCallback(
    (name: SfxName) => {
      engine.play(name);
    },
    [engine],
  );

  useEffect(() => {
    const onInteract = () => unlock();
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('keydown', onInteract, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, [unlock]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      toggleEnabled,
      playSfx,
      unlock,
    }),
    [enabled, setEnabled, toggleEnabled, playSfx, unlock],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
