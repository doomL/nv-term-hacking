import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import type { CrtScreenState } from '../effects/crt/crtScreenTypes';
import type { TextLine } from '../effects/crt/textScreenPainter';
import '../components/CrtFullscreen.css';

type AuthMode = 'login' | 'register';

interface CrtAuthPageProps {
  mode: AuthMode;
}

export function CrtAuthPage({ mode }: CrtAuthPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { playSfx, unlock } = useAudio();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldIndex, setFieldIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fields = mode === 'login'
    ? ['username', 'password', 'submit']
    : ['username', 'email', 'password', 'submit'];

  const getScreenData = useCallback((): CrtScreenState => {
    const lines: TextLine[] = [
      { text: `> ${t('auth.username')}: ${fieldIndex === 0 ? `${username}_` : username}`, tone: fieldIndex === 0 ? 'selected' : 'primary' },
    ];
    if (mode === 'register') {
      lines.push({
        text: `> ${t('auth.email')}: ${fieldIndex === 1 ? `${email}_` : email}`,
        tone: fieldIndex === 1 ? 'selected' : 'primary',
      });
    }
    const passIdx = mode === 'login' ? 1 : 2;
    lines.push({
      text: `> ${t('auth.password')}: ${'*'.repeat(password.length)}${fieldIndex === passIdx ? '_' : ''}`,
      tone: fieldIndex === passIdx ? 'selected' : 'primary',
    });
    lines.push({
      text: `${fieldIndex === fields.length - 1 ? '[>]' : '   '} ${mode === 'login' ? t('auth.login') : t('auth.register')}`,
      tone: fieldIndex === fields.length - 1 ? 'selected' : 'primary',
    });
    if (error) lines.push({ text: `! ${error}`, tone: 'error' });

    return {
      type: 'text',
      selectionBlink: true,
      title: mode === 'login' ? t('auth.login') : t('auth.register'),
      lines,
      footerLines: [t('menu.navHint'), t('menu.enterHint'), t('menu.back')],
    };
  }, [t, mode, username, email, password, fieldIndex, error, fields.length]);

  const submit = async () => {
    setError('');
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      navigate('/');
    } catch {
      playSfx('error');
      setError(mode === 'login' ? t('auth.loginError') : t('auth.registerError'));
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playSfx('back');
        navigate('/');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        unlock();
        playSfx('navigate');
        setFieldIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        unlock();
        playSfx('navigate');
        setFieldIndex((i) => Math.min(fields.length - 1, i + 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        unlock();
        if (fieldIndex === fields.length - 1) {
          playSfx('confirm');
          submit();
        }
        return;
      }
      if (fieldIndex === fields.length - 1) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const key = fields[fieldIndex];
        if (key === 'username') setUsername((v) => v.slice(0, -1));
        if (key === 'email') setEmail((v) => v.slice(0, -1));
        if (key === 'password') setPassword((v) => v.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const key = fields[fieldIndex];
        if (key === 'username') setUsername((v) => v + e.key);
        if (key === 'email') setEmail((v) => v + e.key);
        if (key === 'password') setPassword((v) => v + e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fieldIndex, fields, navigate, mode, login, register, username, email, password, t, playSfx, unlock]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <CrtFullscreen>
      <div className="crt-fullscreen" ref={containerRef} tabIndex={0}>
        <CrtTerminal getScreenData={getScreenData} brightness={1.1} opacity={1} />
        <CrtTouchDpad
          mode="menu"
          backLabel={t('menu.backButton')}
          onBack={() => {
            playSfx('back');
            navigate('/');
          }}
          onUp={() => {
            unlock();
            playSfx('navigate');
            setFieldIndex((i) => Math.max(0, i - 1));
          }}
          onDown={() => {
            unlock();
            playSfx('navigate');
            setFieldIndex((i) => Math.min(fields.length - 1, i + 1));
          }}
          onOk={() => {
            unlock();
            if (fieldIndex === fields.length - 1) {
              playSfx('confirm');
              submit();
            }
          }}
        />
      </div>
    </CrtFullscreen>
  );
}
