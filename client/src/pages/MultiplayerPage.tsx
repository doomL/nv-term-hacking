import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { TerminalGame } from '../components/TerminalGame';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { deserializeGameState, type BracketPair } from '@nv-hacking/shared';
import type { GameState } from '@nv-hacking/shared';
import { api } from '../services/api';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import type { TextLine } from '../effects/crt/textScreenPainter';
import '../components/CrtFullscreen.css';

interface RoomPlayer {
  odId: string;
  username: string;
  ready: boolean;
  finished: boolean;
  score: number;
  status: string;
}

interface RoomInfo {
  id: string;
  difficulty: string;
  status: string;
  winnerId?: string;
  players: RoomPlayer[];
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function MultiplayerPage() {
  const { t } = useTranslation();
  const { difficulty, language } = useSettings();
  const { user } = useAuth();
  const { playSfx, unlock } = useAudio();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const guestName = useMemo(() => `Guest_${Math.random().toString(36).slice(2, 6)}`, []);

  const [phase, setPhase] = useState<'lobby' | 'waiting' | 'playing' | 'finished'>('lobby');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<(GameState & { brackets: BracketPair[] }) | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [mySocketId, setMySocketId] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [typingCode, setTypingCode] = useState(false);

  const username = user?.username ?? guestName;
  const playSfxRef = useRef(playSfx);
  playSfxRef.current = playSfx;

  useEffect(() => {
    const socket = io(SOCKET_URL || undefined, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setMySocketId(socket.id!));
    socket.on('room:joined', ({ room: r, gameState: gs }) => {
      setRoom(r);
      setPhase('waiting');
      if (gs) setGameState(deserializeGameState(gs));
    });
    socket.on('room:updated', ({ room: r }) => setRoom(r));
    socket.on('game:start', ({ room: r, gameState: gs }) => {
      setRoom(r);
      setPhase('playing');
      if (gs) setGameState(deserializeGameState({ ...gs, brackets: gs.brackets ?? [] }));
    });
    socket.on('game:update', ({ gameState: gs, result }) => {
      if (gs) {
        setGameState((prev) => {
          if (prev && gs.attemptsLeft < prev.attemptsLeft && gs.status === 'playing') {
            playSfxRef.current('error');
          }
          return deserializeGameState({ ...gs, brackets: gs.brackets ?? [] });
        });
      }
      if (result?.message) setMessage(result.message);
    });
    socket.on('game:end', ({ room: r, password }) => {
      setRoom(r);
      setPhase('finished');
      if (password) setMessage(`Password: ${password}`);
      playSfxRef.current(r.winnerId === socket.id ? 'granted' : 'locked');
    });
    socket.on('error', ({ message: msg }) => setError(msg));
    return () => {
      void socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    setError('');
    socketRef.current?.emit('room:create', { username, difficulty, language, userId: user?.id });
  };

  const joinRoom = () => {
    setError('');
    if (!joinCode.trim()) return;
    socketRef.current?.emit('room:join', {
      code: joinCode.trim().toUpperCase(),
      username,
      userId: user?.id,
    });
  };

  const setReady = () => socketRef.current?.emit('room:ready');

  const leaveRoom = () => {
    socketRef.current?.emit('room:leave');
    setPhase('lobby');
    setRoom(null);
    setGameState(null);
    setTypingCode(false);
    setMenuIndex(0);
  };

  const handleGuess = useCallback((word: string) => {
    socketRef.current?.emit('game:guess', { word });
  }, []);

  const handleBracket = useCallback((bracketId: string) => {
    socketRef.current?.emit('game:bracket', { bracketId });
  }, []);

  const handleSaveScore = async () => {
    if (!user || !room) return;
    const me = room.players.find((p) => p.odId === mySocketId);
    if (!me || me.score <= 0) return;
    try {
      await api.saveScore({
        difficulty: room.difficulty,
        score: me.score,
        timeMs: 0,
        attemptsLeft: 0,
        won: true,
        mode: '1v1',
      });
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  const lobbyItems = useMemo(
    () => [
      { id: 'create', label: t('multiplayer.create') },
      { id: 'join', label: t('multiplayer.join') },
      { id: 'back', label: t('nav.home') },
    ],
    [t],
  );

  const getLobbyScreen = useCallback((): CrtScreenState => ({
    type: 'menu',
    selectedIndex: menuIndex,
    selectionBlink: true,
    title: t('home.multiplayer'),
    subtitle: t('home.multiplayerDesc'),
    items: lobbyItems,
    statusLines: [
      ...(typingCode || menuIndex === 1 ? [`> ${t('multiplayer.roomCode')}: ${joinCode}${typingCode ? '_' : ''}`] : []),
      ...(error ? [`! ${error}`] : []),
    ],
    footerLines: [t('menu.navHint'), t('menu.enterHint'), t('menu.back')],
  }), [menuIndex, lobbyItems, t, typingCode, joinCode, error]);

  const getWaitingScreen = useCallback((): CrtScreenState => {
    if (!room) return getLobbyScreen();
    const lines: TextLine[] = room.players.map((p) => ({
      text: `  ${p.username.padEnd(14)} ${p.ready ? 'READY' : '...'}`,
      tone: 'primary',
    }));
    if (room.players.length < 2) {
      lines.push({ text: `> ${t('multiplayer.waiting')}`, tone: 'dim' });
    }
    const allLines: TextLine[] = [
      { text: `> ${t('multiplayer.shareCode')}`, tone: 'dim' },
      ...lines,
      ...(room.players.length === 2
        ? [{ text: '[>] READY', tone: 'selected' as const }]
        : []),
      { text: '    LEAVE', tone: 'primary' },
    ];
    return {
      type: 'text',
      selectionBlink: true,
      title: `${t('multiplayer.roomCode')}: ${room.id}`,
      lines: allLines,
      footerLines: [t('menu.enterHint'), t('menu.back')],
    };
  }, [room, t, getLobbyScreen]);

  const activateLobby = () => {
    const id = lobbyItems[menuIndex]?.id;
    unlock();
    if (id === 'create') {
      playSfx('confirm');
      createRoom();
    } else if (id === 'join') {
      if (typingCode && joinCode.trim()) {
        playSfx('confirm');
        joinRoom();
      } else {
        playSfx('confirm');
        setTypingCode(true);
      }
    } else if (id === 'back') {
      playSfx('back');
      navigate('/');
    }
  };

  useEffect(() => {
    if (phase !== 'lobby') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (typingCode) {
        if (e.key === 'Escape') { playSfx('back'); setTypingCode(false); return; }
        if (e.key === 'Backspace') { setJoinCode((c) => c.slice(0, -1)); return; }
        if (e.key === 'Enter') { unlock(); playSfx('confirm'); joinRoom(); return; }
        if (/^[a-zA-Z0-9]$/.test(e.key)) setJoinCode((c) => (c + e.key).toUpperCase().slice(0, 6));
        return;
      }
      if (e.key === 'ArrowUp') { unlock(); playSfx('navigate'); setMenuIndex((i) => Math.max(0, i - 1)); }
      if (e.key === 'ArrowDown') { unlock(); playSfx('navigate'); setMenuIndex((i) => Math.min(lobbyItems.length - 1, i + 1)); }
      if (e.key === 'Enter') activateLobby();
      if (e.key === 'Escape') { playSfx('back'); navigate('/'); }
    };
    window.addEventListener('keydown', onKeyDown);
    containerRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, typingCode, menuIndex, lobbyItems, joinCode, navigate]);

  if (phase === 'lobby') {
    return (
      <CrtFullscreen>
        <div className="crt-fullscreen" ref={containerRef} tabIndex={0}>
          <CrtTerminal getScreenData={getLobbyScreen} brightness={1.1} opacity={1} />
          <CrtTouchDpad
            mode="menu"
            backLabel={t('menu.backButton')}
            onBack={() => {
              if (typingCode) {
                playSfx('back');
                setTypingCode(false);
              } else {
                playSfx('back');
                navigate('/');
              }
            }}
            onUp={() => { unlock(); playSfx('navigate'); setMenuIndex((i) => Math.max(0, i - 1)); }}
            onDown={() => { unlock(); playSfx('navigate'); setMenuIndex((i) => Math.min(lobbyItems.length - 1, i + 1)); }}
            onOk={activateLobby}
          />
        </div>
      </CrtFullscreen>
    );
  }

  if (phase === 'waiting' && room) {
    return (
      <CrtFullscreen>
        <div
          className="crt-fullscreen"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { playSfx('back'); leaveRoom(); }
            if (e.key === 'Enter' && room.players.length === 2) { unlock(); playSfx('confirm'); setReady(); }
          }}
        >
          <CrtTerminal getScreenData={getWaitingScreen} brightness={1.1} opacity={1} />
          <CrtTouchDpad
            mode="menu"
            backLabel={t('menu.backButton')}
            onBack={() => { playSfx('back'); leaveRoom(); }}
            onOk={() => { unlock(); playSfx('confirm'); room.players.length === 2 && setReady(); }}
          />
        </div>
      </CrtFullscreen>
    );
  }

  if (phase === 'finished' && room) {
    const me = room.players.find((p) => p.odId === mySocketId);
    const won = room.winnerId === mySocketId;
    const getScreen = (): CrtScreenState => ({
      type: 'text',
      selectionBlink: true,
      title: won ? t('multiplayer.won') : t('multiplayer.lost'),
      lines: [
        ...(me ? [{ text: `> ${t('game.score')}: ${me.score}`, tone: 'accent' as const }] : []),
        ...(message ? [{ text: `> ${message}`, tone: 'primary' as const }] : []),
        ...(saved ? [{ text: `> ${t('game.scoreSaved')}`, tone: 'accent' as const }] : []),
        { text: '[>] ' + t('game.newGame'), tone: 'selected' as const },
        { text: '    ' + t('nav.home'), tone: 'primary' as const },
      ],
      footerLines: [t('menu.enterHint'), t('menu.back')],
    });

    return (
      <CrtFullscreen>
        <div
          className="crt-fullscreen"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              unlock();
              playSfx('confirm');
              if (user && won && !saved) handleSaveScore();
              else { leaveRoom(); }
            }
            if (e.key === 'Escape') { playSfx('back'); navigate('/'); }
          }}
        >
          <CrtTerminal getScreenData={getScreen} brightness={1.1} opacity={1} />
          <CrtTouchDpad
            backLabel={t('menu.backButton')}
            onBack={() => { playSfx('back'); navigate('/'); }}
            onOk={() => {
              unlock();
              playSfx('confirm');
              if (user && won && !saved) handleSaveScore();
              else leaveRoom();
            }}
          />
        </div>
      </CrtFullscreen>
    );
  }

  if (phase === 'playing' && gameState) {
    return (
      <TerminalGame
        difficulty={difficulty}
        externalState={gameState}
        onGuess={handleGuess}
        onBracket={handleBracket}
        onExit={leaveRoom}
      />
    );
  }

  return null;
}
