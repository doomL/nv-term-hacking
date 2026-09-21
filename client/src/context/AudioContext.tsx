import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { getAudioEngine, type SfxName } from '../audio/audioEngine';

interface AudioContextValue {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  toggleEnabled: () => void;
  playSfx: (name: SfxName) => void;
  unlock: () => void;
  autoplayBlocked: boolean;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getAudioEngine(), []);
  const [enabled, setEnabledState] = useState(engine.enabled);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const { t } = useTranslation();

  const unlock = useCallback(() => {
    engine.unlock();
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
    engine.setAutoplayBlockedListener(setAutoplayBlocked);
    return () => engine.setAutoplayBlockedListener(null);
  }, [engine]);

  useEffect(() => {
    engine.attemptAutoplayOnLoad();
  }, [engine]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) engine.handleDocumentHidden();
      else engine.handleDocumentVisible();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [engine]);

  useEffect(() => {
    const onInteract = () => unlock();
    window.addEventListener('pointerdown', onInteract);
    window.addEventListener('keydown', onInteract);
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, [unlock]);

  const dismissAutoplayOverlay = useCallback(() => {
    unlock();
  }, [unlock]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      toggleEnabled,
      playSfx,
      unlock,
      autoplayBlocked,
    }),
    [enabled, setEnabled, toggleEnabled, playSfx, unlock, autoplayBlocked],
  );

  return (
    <AudioCtx.Provider value={value}>
      {children}
      {autoplayBlocked && enabled ? (
        <div
          className="crt-autoplay-boot"
          role="button"
          tabIndex={0}
          aria-live="polite"
          onPointerDown={dismissAutoplayOverlay}
          onKeyDown={(e) => {
            e.preventDefault();
            dismissAutoplayOverlay();
          }}
        >
          <div className="crt-autoplay-boot__vignette" aria-hidden />
          <div className="crt-autoplay-boot__scanlines" aria-hidden />
          <p className="crt-autoplay-boot__prompt">{t('settings.autoplayGesture')}</p>
        </div>
      ) : null}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
