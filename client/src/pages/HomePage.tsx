import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './HomePage.css';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="home-page">
      <header className="home-header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
      </header>

      <div className="home-cards">
        <Link to="/play" className="home-card">
          <span className="home-card-icon">&gt;_</span>
          <h2>{t('home.solo')}</h2>
          <p>{t('home.soloDesc')}</p>
        </Link>

        <Link to="/multiplayer" className="home-card">
          <span className="home-card-icon">[1v1]</span>
          <h2>{t('home.multiplayer')}</h2>
          <p>{t('home.multiplayerDesc')}</p>
        </Link>

        <Link to="/leaderboard" className="home-card">
          <span className="home-card-icon">#1</span>
          <h2>{t('home.leaderboard')}</h2>
          <p>{t('home.leaderboardDesc')}</p>
        </Link>
      </div>
    </main>
  );
}
