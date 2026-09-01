import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createGame,
  guessWord,
  activateBracket,
  calculateScore,
  DIFFICULTY_SETTINGS,
  moveCursorSelectable,
  normalizeGameLanguage,
  resolveHighlightAt,
  type Difficulty,
  type GameState,
  type BracketPair,
  type HighlightRegion,
} from '@nv-hacking/shared';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { CrtFullscreen } from './CrtFullscreen';
import { CrtTouchDpad } from './CrtTouchDpad';
import { useAudio } from '../context/AudioContext';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import '../effects/crt/threeui.css';
import './CrtFullscreen.css';

interface TerminalGameProps {
  difficulty: Difficulty;
  language?: string;
  onExit: () => void;
  onGameEnd?: (score: number, won: boolean, timeMs: number, attemptsLeft: number) => void;
  externalState?: GameState & { brackets: BracketPair[] };
  onGuess?: (word: string) => void;
  onBracket?: (bracketId: string) => void;
  readOnly?: boolean;
}

export function TerminalGame({
  difficulty,
  language = 'it',
  onExit,
  onGameEnd,
  externalState,
  onGuess,
  onBracket,
  readOnly,
}: TerminalGameProps) {
  const { t } = useTranslation();
  const { playSfx, unlock } = useAudio();
  const [localState, setLocalState] = useState(() =>
    createGame({ difficulty, language: normalizeGameLanguage(language) }),
  );
  const [message, setMessage] = useState('');
  const [showWait, setShowWait] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const gameState = externalState ?? localState;
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const colsPerRow = settings.colsPerRow;
  const totalRows = settings.gridRows;
  const gridSize = colsPerRow * totalRows;
  const brackets = 'brackets' in gameState ? gameState.brackets : localState.brackets;

  const highlight: HighlightRegion = useMemo(
    () => resolveHighlightAt(cursorIndex, { ...gameState, brackets }),
    [cursorIndex, gameState, brackets],
  );

  const selection = useMemo(
    () => ({ start: highlight.start, end: highlight.end }),
    [highlight],
  );

  useEffect(() => {
    setCursorIndex((i) => Math.min(i, gridSize - 1));
  }, [gridSize]);

  useEffect(() => {
    if (!externalState && gameState.status !== 'playing') {
      const timeMs = (gameState.endTime ?? Date.now()) - gameState.startTime;
      const score = calculateScore(gameState);
      onGameEnd?.(score, gameState.status === 'won', timeMs, gameState.attemptsLeft);
    }
  }, [gameState.status, externalState, onGameEnd, gameState]);

  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    if (prevStatusRef.current === 'playing' && gameState.status === 'won') playSfx('granted');
    if (prevStatusRef.current === 'playing' && gameState.status === 'locked') playSfx('locked');
    prevStatusRef.current = gameState.status;
  }, [gameState.status, playSfx]);

  const messages = useMemo(() => {
    const lines: string[] = [];
    if (showWait) lines.push(`>${t('game.pleaseWait')}`);
    else if (message) lines.push(`>${message}`);
    if (gameState.status === 'won') lines.push(`>${t('game.accessGranted')}`);
    if (gameState.status === 'locked') lines.push(`>${t('game.terminalLocked')}`);
    return lines;
  }, [showWait, message, gameState.status, t]);

  const getScreenData = useCallback((): CrtScreenState => ({
    type: 'game',
    gameState: { ...gameState, brackets },
    selection: gameState.status === 'playing' ? selection : null,
    selectionBlink: true,
    headerLine: 'DoomCo TermLink v2.3.0',
    attemptsLine: `${gameState.attemptsLeft}/${gameState.maxAttempts}`,
    messages,
    colsPerRow,
    totalRows,
  }), [gameState, brackets, selection, messages, colsPerRow, totalRows]);

  const navigate = useCallback(
    (deltaCol: number, deltaRow: number) => {
      if (readOnly || gameState.status !== 'playing') return;
      unlock();
      playSfx('navigate');
      setCursorIndex((i) =>
        moveCursorSelectable(i, deltaCol, deltaRow, colsPerRow, totalRows, {
          ...gameState,
          brackets,
        }),
      );
    },
    [readOnly, gameState, brackets, colsPerRow, totalRows, playSfx, unlock],
  );

  const confirmSelection = useCallback(() => {
    if (readOnly || gameState.status !== 'playing') return;
    unlock();
    playSfx('confirm');

    if (highlight.kind === 'word') {
      if (gameState.removedWords.has(highlight.word)) return;

      if (onGuess) {
        playSfx('wait');
        onGuess(highlight.word);
        return;
      }

      setShowWait(true);
      playSfx('wait');
      setTimeout(() => {
        const result = guessWord(localState, highlight.word);
        setLocalState({ ...localState, ...result.state, brackets: localState.brackets });
        setMessage(result.state.lastMessage);
        setShowWait(false);
        if (result.state.status === 'playing') playSfx('error');
      }, 600);
      return;
    }

    if (highlight.kind === 'bracket') {
      if (onBracket) {
        onBracket(highlight.id);
        playSfx('bracket');
        return;
      }

      const result = activateBracket(localState, highlight.id);
      setLocalState({ ...localState, ...result.state, brackets: localState.brackets });
      setMessage(result.state.lastMessage);
      playSfx('bracket');
    }
  }, [readOnly, gameState, highlight, onGuess, onBracket, localState, playSfx, unlock]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'playing') {
        if (e.key === 'Escape') {
          playSfx('back');
          onExit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigate(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigate(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate(0, 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          confirmSelection();
          break;
        case 'Escape':
          e.preventDefault();
          playSfx('back');
          onExit();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState.status, navigate, confirmSelection, onExit, playSfx]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const canConfirm = highlight.kind === 'word' || highlight.kind === 'bracket';

  return (
    <CrtFullscreen>
      <div
        className="crt-fullscreen"
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label={t('game.selectWord')}
      >
        <CrtTerminal getScreenData={getScreenData} brightness={1.1} opacity={1} />
        <CrtTouchDpad
          mode="game"
          backLabel={t('menu.backButton')}
          onBack={() => {
            playSfx('back');
            onExit();
          }}
          {...(gameState.status === 'playing'
            ? {
                onUp: () => navigate(0, -1),
                onDown: () => navigate(0, 1),
                onLeft: () => navigate(-1, 0),
                onRight: () => navigate(1, 0),
                onOk: confirmSelection,
                okDisabled: !canConfirm,
              }
            : {})}
        />
      </div>
    </CrtFullscreen>
  );
}
