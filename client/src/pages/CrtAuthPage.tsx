import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CrtFullscreen } from '../components/CrtFullscreen';
import { CrtTerminal } from '../effects/crt/CrtTerminal';
import { CrtTouchDpad } from '../components/CrtTouchDpad';
import { CrtMobileHint } from '../components/CrtMobileHint';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useTouchUi } from '../hooks/useTouchUi';
import { getCrtMenuFooterLines } from '../utils/crtMenuFooter';
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
  const touchUi = useTouchUi();

  const fields = mode === 'login'
    ? ['username', 'password', 'submit']
    : ['username', 'email', 'password', 'submit'];

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const activeFieldKey = fields[fieldIndex];
  const isTextField = activeFieldKey === 'username' || activeFieldKey === 'email' || activeFieldKey === 'password';

  const currentFieldValue = () => {
    if (activeFieldKey === 'username') return username;
    if (activeFieldKey === 'email') return email;
    if (activeFieldKey === 'password') return password;
    return '';
  };

  const setCurrentFieldValue = (value: string) => {
    if (activeFieldKey === 'username') setUsername(value);
    if (activeFieldKey === 'email') setEmail(value);
    if (activeFieldKey === 'password') setPassword(value);
  };

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
      footerLines: getCrtMenuFooterLines(t, touchUi, [t('menu.back')]),
    };
  }, [t, mode, username, email, password, fieldIndex, error, fields.length, touchUi]);

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
      // Character input and Backspace are handled by the hidden text input below
      // (see hiddenInputRef) — it's what lets mobile browsers show the on-screen
      // keyboard at all, since a plain focusable <div> never triggers it.
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fieldIndex, fields, navigate, mode, login, register, username, email, password, t, playSfx, unlock]);

  // Keep the hidden input focused whenever the selected field is a text field, so the
  // mobile keyboard stays up as the user moves between username/email/password with
  // the D-pad or arrow keys, and shows up in the first place on initial load.
  useEffect(() => {
    if (isTextField) {
      hiddenInputRef.current?.focus();
    } else {
      hiddenInputRef.current?.blur();
      containerRef.current?.focus();
    }
  }, [isTextField, mode]);

  const { onTouchStart, onTouchEnd } = useSwipeNavigation({
    onUp: () => {
      unlock();
      playSfx('navigate');
      setFieldIndex((i) => Math.max(0, i - 1));
    },
    onDown: () => {
      unlock();
      playSfx('navigate');
      setFieldIndex((i) => Math.min(fields.length - 1, i + 1));
    },
    onTap: () => {
      unlock();
      if (fieldIndex === fields.length - 1) {
        playSfx('confirm');
        submit();
      } else if (isTextField) {
        hiddenInputRef.current?.focus();
      }
    },
  });

  return (
    <CrtFullscreen>
      <div
        className="crt-fullscreen"
        ref={containerRef}
        tabIndex={0}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (isTextField) hiddenInputRef.current?.focus();
        }}
      >
        <input
          ref={hiddenInputRef}
          className="crt-auth-hidden-input"
          value={currentFieldValue()}
          onChange={(e) => setCurrentFieldValue(e.target.value)}
          onKeyDown={(e) => {
            // Let Enter submit/advance the same way the physical keyboard does;
            // stopPropagation isn't needed since the window listener above no
            // longer touches character keys.
            if (e.key === 'Enter') {
              e.preventDefault();
              unlock();
              if (fieldIndex === fields.length - 1) {
                playSfx('confirm');
                submit();
              } else {
                playSfx('navigate');
                setFieldIndex((i) => Math.min(fields.length - 1, i + 1));
              }
            }
          }}
          type={activeFieldKey === 'password' ? 'password' : 'text'}
          inputMode={activeFieldKey === 'email' ? 'email' : 'text'}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete={activeFieldKey === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : activeFieldKey}
          spellCheck={false}
          aria-label={activeFieldKey}
          tabIndex={-1}
        />
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
