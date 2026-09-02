import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TerminalGame } from '../components/TerminalGame';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { api } from '../services/api';
import { createGame, normalizeGameLanguage } from '@nv-hacking/shared';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { CrtMobileHint } from '../components/CrtMobileHint';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useTouchUi } from '../hooks/useTouchUi';
import { getCrtMenuFooterLines } from '../utils/crtMenuFooter';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import '../components/CrtFullscreen.css';

export function PlayPage() {
  const { t } = useTranslation();
  const { difficulty, language } = useSettings();
  const { user } = useAuth();
  const { playSfx, unlock } = useAudio();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(true);
  const [gameKey, setGameKey] = useState(0);
  const [endResult, setEndResult] = useState<{
    score: number;
    won: boolean;
    timeMs: number;
    attemptsLeft: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchUi = useTouchUi();

  const handleGameEnd = useCallback(
    (score: number, won: boolean, timeMs: number, attemptsLeft: number) => {
      setEndResult({ score, won, timeMs, attemptsLeft });
      setPlaying(false);
    },
    [],
  );

  const handleSaveScore = async () => {
    if (!user || !endResult?.won) return;
    try {
      await api.saveScore({
        difficulty,
        score: endResult.score,
        timeMs: endResult.timeMs,
        attemptsLeft: endResult.attemptsLeft,
        won: endResult.won,
        mode: 'solo',
      });
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  const handleNewGame = () => {
    setEndResult(null);
    setSaved(false);
    setPlaying(true);
    setSelectedIndex(0);
    setGameKey((k) => k + 1);
    createGame({ difficulty, language: normalizeGameLanguage(language) });
  };

  // Mirrors the `actions` array built below (save? + new + menu) — kept separate so the
  // swipe hook (a hook, so it must run unconditionally on every render) doesn't need the
  // end-screen-only JSX below to compute it.
  const endActionsCount = (user && endResult?.won && !saved ? 1 : 0) + 2;
  const endScreenSwipe = useSwipeNavigation({
    onUp: () => {
      unlock();
      playSfx('navigate');
      setSelectedIndex((i) => Math.max(0, i - 1));
    },
    onDown: () => {
      unlock();
      playSfx('navigate');
      setSelectedIndex((i) => Math.min(endActionsCount - 1, i + 1));
    },
    onTap: () => {
      unlock();
      playSfx('confirm');
      const actions = [
        ...(user && endResult?.won && !saved ? ['save'] : []),
        'new',
        'menu',
      ];
      const action = actions[selectedIndex];
      if (action === 'save') handleSaveScore();
      else if (action === 'new') handleNewGame();
      else if (action === 'menu') navigate('/');
    },
  });

  if (!playing && endResult) {
    const actions = [
      ...(user && endResult.won && !saved ? [{ id: 'save', label: t('game.saveScore') }] : []),
      { id: 'new', label: t('game.newGame') },
      { id: 'menu', label: t('nav.home') },
    ];

    const getScreenData = (): CrtScreenState => ({
      type: 'text',
      selectionBlink: true,
      title: endResult.won ? t('game.accessGranted') : t('game.terminalLocked'),
      lines: [
        ...(endResult.won
          ? [
              { text: `> ${t('game.score')}: ${endResult.score}`, tone: 'accent' as const },
              { text: `> ${t('game.time')}: ${(endResult.timeMs / 1000).toFixed(1)}s`, tone: 'primary' as const },
            ]
          : []),
        ...(saved ? [{ text: `> ${t('game.scoreSaved')}`, tone: 'accent' as const }] : []),
        ...actions.map((a, i) => ({
          text: `${i === selectedIndex ? '[>]' : '   '} ${a.label}`,
          tone: (i === selectedIndex ? 'selected' : 'primary') as 'selected' | 'primary',
        })),
      ],
      footerLines: getCrtMenuFooterLines(t, touchUi, [t('menu.back')]),
    });

    const activate = () => {
      const action = actions[selectedIndex]?.id;
      unlock();
      playSfx('confirm');
      if (action === 'save') handleSaveScore();
      else if (action === 'new') handleNewGame();
      else if (action === 'menu') navigate('/');
    };

    return (
      <CrtFullscreen>
        <div
          className="crt-fullscreen"
          tabIndex={0}
          onTouchStart={endScreenSwipe.onTouchStart}
          onTouchEnd={endScreenSwipe.onTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              unlock();
              playSfx('navigate');
              setSelectedIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === 'ArrowDown') {
              unlock();
              playSfx('navigate');
              setSelectedIndex((i) => Math.min(actions.length - 1, i + 1));
            }
            if (e.key === 'Enter') activate();
            if (e.key === 'Escape') {
              playSfx('back');
              navigate('/');
            }
          }}
        >
          <CrtTerminal getScreenData={getScreenData} brightness={1.1} opacity={1} />
          <CrtMobileHint />
          <CrtTouchDpad
            mode="menu"
            backLabel={t('menu.backButton')}
            onBack={() => {
              playSfx('back');
              navigate('/');
            }}
          />
        </div>
      </CrtFullscreen>
    );
  }

  return (
    <TerminalGame
      key={`${gameKey}-${language}`}
      difficulty={difficulty}
      language={language}
      onExit={() => navigate('/')}
      onGameEnd={handleGameEnd}
    />
  );
}
