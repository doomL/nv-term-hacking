import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError(t('auth.loginError'));
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t('auth.login')}</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          {t('auth.username')}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          {t('auth.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button type="submit">{t('auth.login')}</button>
        <p className="auth-switch">
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
      </form>
    </main>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('auth.registerError'));
      return;
    }
    try {
      await register(username, email, password);
      navigate('/');
    } catch {
      setError(t('auth.registerError'));
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t('auth.register')}</h1>
        {error && <p className="auth-error">{error}</p>}
        <label>
          {t('auth.username')}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          {t('auth.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          {t('auth.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          {t('auth.confirmPassword')}
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </label>
        <button type="submit">{t('auth.register')}</button>
        <p className="auth-switch">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
        </p>
      </form>
    </main>
  );
}
