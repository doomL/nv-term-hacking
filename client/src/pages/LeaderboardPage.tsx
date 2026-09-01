import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type LeaderboardEntry } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Difficulty } from '@nv-hacking/shared';
import './LeaderboardPage.css';

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [myScores, setMyScores] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<Difficulty | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(filter || undefined)
      .then(({ scores: s }) => setScores(s))
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    if (!user) return;
    api.getMyScores()
      .then(({ scores: s }) => setMyScores(s as unknown as LeaderboardEntry[]))
      .catch(() => setMyScores([]));
  }, [user]);

  const diffLabel = (d: string) => t(`difficulty.${d}` as 'difficulty.novice');

  return (
    <main className="leaderboard-page">
      <h1>{t('leaderboard.title')}</h1>

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as Difficulty | '')}
        className="lb-filter"
      >
        <option value="">{t('difficulty.label')}: All</option>
        <option value="novice">{t('difficulty.novice')}</option>
        <option value="advanced">{t('difficulty.advanced')}</option>
        <option value="expert">{t('difficulty.expert')}</option>
        <option value="veryHard">{t('difficulty.veryHard')}</option>
      </select>

      {loading ? (
        <p className="lb-loading">...</p>
      ) : scores.length === 0 ? (
        <p className="lb-empty">{t('leaderboard.noScores')}</p>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>{t('leaderboard.rank')}</th>
                <th>{t('leaderboard.player')}</th>
                <th>{t('leaderboard.score')}</th>
                <th>{t('leaderboard.difficulty')}</th>
                <th>{t('leaderboard.time')}</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.username}</td>
                  <td className="score">{s.score}</td>
                  <td>{diffLabel(s.difficulty)}</td>
                  <td>{(s.time_ms / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {user && myScores.length > 0 && (
        <>
          <h2>{t('leaderboard.myScores')}</h2>
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>{t('leaderboard.score')}</th>
                  <th>{t('leaderboard.difficulty')}</th>
                  <th>{t('leaderboard.time')}</th>
                </tr>
              </thead>
              <tbody>
                {myScores.slice(0, 10).map((s) => (
                  <tr key={s.id}>
                    <td className="score">{s.score}</td>
                    <td>{diffLabel(s.difficulty)}</td>
                    <td>{(s.time_ms / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
