import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { api, type LeaderboardEntry } from '../services/api';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { useAudio } from '../context/AudioContext';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import '../components/CrtFullscreen.css';

export function CrtLeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playSfx } = useAudio();
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getLeaderboard()
      .then(({ scores: s }) => setScores(s))
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, []);

  const getScreenData = useCallback((): CrtScreenState => {
    const lines = loading
      ? [{ text: '> ...', tone: 'dim' as const }]
      : scores.length === 0
        ? [{ text: `> ${t('leaderboard.noScores')}`, tone: 'dim' as const }]
        : scores.slice(0, 12).map((s, i) => ({
            text: `  ${String(i + 1).padStart(2)}  ${s.username.padEnd(12).slice(0, 12)}  ${String(s.score).padStart(6)}  ${(s.time_ms / 1000).toFixed(1)}s`,
            tone: 'primary' as const,
          }));

    return {
      type: 'text',
      selectionBlink: true,
      title: t('leaderboard.title'),
      lines: [
        { text: `${t('leaderboard.rank')}  ${t('leaderboard.player')}        ${t('leaderboard.score')}    ${t('leaderboard.time')}`, tone: 'accent' },
        ...lines,
      ],
      footerLines: [t('menu.back')],
    };
  }, [loading, scores, t]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        playSfx('back');
        navigate('/');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    containerRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, playSfx]);

  return (
    <CrtFullscreen>
      <div className="crt-fullscreen" ref={containerRef} tabIndex={0}>
        <CrtTerminal getScreenData={getScreenData} brightness={1.1} opacity={1} />
        <CrtTouchDpad
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
