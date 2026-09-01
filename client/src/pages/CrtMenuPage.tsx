import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useAudio } from '../context/AudioContext';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import type { Difficulty } from '@nv-hacking/shared';
import '../components/CrtFullscreen.css';

const DIFFICULTIES: Difficulty[] = ['novice', 'advanced', 'expert', 'veryHard'];
const LANGUAGES = ['it', 'en'] as const;

export function CrtMenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { difficulty, setDifficulty, language, setLanguage } = useSettings();
  const { enabled: audioEnabled, toggleEnabled, playSfx, unlock } = useAudio();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const list = [
      { id: 'solo', label: t('home.solo'), hint: t('home.soloDesc') },
      { id: 'multi', label: t('home.multiplayer'), hint: t('home.multiplayerDesc') },
      { id: 'board', label: t('home.leaderboard'), hint: t('home.leaderboardDesc') },
      user
        ? { id: 'logout', label: t('nav.logout'), hint: user.username }
        : { id: 'login', label: t('nav.login'), hint: t('auth.noAccount') },
      ...(user ? [] : [{ id: 'register', label: t('nav.register'), hint: t('auth.hasAccount') }]),
      {
        id: 'lang',
        label: `${t('settings.language')}: ${language === 'it' ? t('settings.italian') : t('settings.english')}`,
        hint: t('menu.cycleSetting'),
      },
      {
        id: 'diff',
        label: `${t('difficulty.label')}: ${t(`difficulty.${difficulty}`)}`,
        hint: t('menu.cycleSetting'),
      },
      {
        id: 'audio',
        label: `${t('settings.audio')}: ${audioEnabled ? t('settings.audioOn') : t('settings.audioOff')}`,
        hint: t('menu.cycleSetting'),
      },
    ];
    return list;
  }, [t, user, language, difficulty, audioEnabled]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, items.length - 1));
  }, [items.length]);

  const activate = useCallback(
    (id: string) => {
      switch (id) {
        case 'solo':
          playSfx('confirm');
          navigate('/play');
          break;
        case 'multi':
          playSfx('confirm');
          navigate('/multiplayer');
          break;
        case 'board':
          playSfx('confirm');
          navigate('/leaderboard');
          break;
        case 'login':
          playSfx('confirm');
          navigate('/login');
          break;
        case 'register':
          playSfx('confirm');
          navigate('/register');
          break;
        case 'logout':
          playSfx('confirm');
          logout();
          break;
        case 'lang': {
          const idx = LANGUAGES.indexOf(language as (typeof LANGUAGES)[number]);
          setLanguage(LANGUAGES[(idx + 1) % LANGUAGES.length]);
          playSfx('confirm');
          break;
        }
        case 'diff': {
          const idx = DIFFICULTIES.indexOf(difficulty);
          setDifficulty(DIFFICULTIES[(idx + 1) % DIFFICULTIES.length]);
          playSfx('confirm');
          break;
        }
        case 'audio':
          toggleEnabled();
          playSfx('confirm');
          break;
        default:
          break;
      }
    },
    [navigate, logout, language, setLanguage, difficulty, setDifficulty, playSfx, toggleEnabled],
  );

  const getScreenData = useCallback((): CrtScreenState => ({
    type: 'menu',
    selectedIndex,
    selectionBlink: true,
    title: t('app.title'),
    subtitle: t('app.subtitle'),
    items,
    headerRight: user?.username,
    footerLines: [t('menu.navHint'), t('menu.enterHint')],
  }), [selectedIndex, items, t, user]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          unlock();
          playSfx('navigate');
          setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          unlock();
          playSfx('navigate');
          setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          unlock();
          activate(items[selectedIndex]?.id ?? '');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items, selectedIndex, activate, playSfx, unlock]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <CrtFullscreen>
      <div className="crt-fullscreen" ref={containerRef} tabIndex={0}>
        <CrtTerminal getScreenData={getScreenData} brightness={1.1} opacity={1} />
        <CrtTouchDpad
          mode="menu"
          onUp={() => {
            unlock();
            playSfx('navigate');
            setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
          }}
          onDown={() => {
            unlock();
            playSfx('navigate');
            setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
          }}
          onOk={() => {
            unlock();
            activate(items[selectedIndex]?.id ?? '');
          }}
        />
      </div>
    </CrtFullscreen>
  );
}
