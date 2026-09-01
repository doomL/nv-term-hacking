import type { ReactNode } from 'react';
import './CrtFullscreen.css';

interface CrtFullscreenProps {
  children?: ReactNode;
  className?: string;
}

export function CrtFullscreen({ children, className = '' }: CrtFullscreenProps) {
  return (
    <div className={`crt-fullscreen ${className}`.trim()}>
      {children}
    </div>
  );
}
