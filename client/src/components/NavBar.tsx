import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import type { Difficulty } from '@nv-hacking/shared';
import './NavBar.css';

export function NavBar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { difficulty, setDifficulty, language, setLanguage } = useSettings();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        {t('app.title')}
      </Link>

      <div className="navbar-controls">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label={t('settings.language')}
          className="navbar-select"
        >
          <option value="it">{t('settings.italian')}</option>
          <option value="en">{t('settings.english')}</option>
        </select>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          aria-label={t('difficulty.label')}
          className="navbar-select"
        >
          <option value="novice">{t('difficulty.novice')}</option>
          <option value="advanced">{t('difficulty.advanced')}</option>
          <option value="expert">{t('difficulty.expert')}</option>
          <option value="veryHard">{t('difficulty.veryHard')}</option>
        </select>
      </div>

      <div className="navbar-links">
        <Link to="/">{t('nav.home')}</Link>
        <Link to="/leaderboard">{t('nav.leaderboard')}</Link>
        {user ? (
          <>
            <span className="navbar-user">{user.username}</span>
            <button type="button" onClick={() => { logout(); navigate('/'); }}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login">{t('nav.login')}</Link>
            <Link to="/register">{t('nav.register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
}
