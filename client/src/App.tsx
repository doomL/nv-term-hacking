import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AudioProvider } from './context/AudioContext';
import { CrtMenuPage } from './pages/CrtMenuPage';
import { PlayPage } from './pages/PlayPage';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { CrtAuthPage } from './pages/CrtAuthPage';
import { CrtLeaderboardPage } from './pages/CrtLeaderboardPage';
import './styles/global.css';

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AudioProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<CrtMenuPage />} />
              <Route path="/play" element={<PlayPage />} />
              <Route path="/multiplayer" element={<MultiplayerPage />} />
              <Route path="/login" element={<CrtAuthPage mode="login" />} />
              <Route path="/register" element={<CrtAuthPage mode="register" />} />
              <Route path="/leaderboard" element={<CrtLeaderboardPage />} />
            </Routes>
          </BrowserRouter>
        </AudioProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
