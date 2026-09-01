import { useEffect, useRef } from 'react';
import { createGameCrtRenderer, CRT_DEFAULTS, type CrtOptions } from './gameCrtRenderer';
import { crtStyle } from './crtRenderer';
import type { CrtScreenState } from './crtScreenTypes';
import './threeui.css';

export type CrtTerminalProps = Partial<CrtOptions> & {
  className?: string;
  getScreenData: () => CrtScreenState;
};

export function CrtTerminal({ className = '', getScreenData, ...props }: CrtTerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getScreenDataRef = useRef(getScreenData);
  const optionsRef = useRef({ ...CRT_DEFAULTS, ...props });
  optionsRef.current = { ...CRT_DEFAULTS, ...props };
  getScreenDataRef.current = getScreenData;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const renderer = createGameCrtRenderer(
      host,
      canvas,
      () => optionsRef.current,
      () => getScreenDataRef.current(),
    );

    let frame = 0;
    let visible = true;

    const resize = () => {
      renderer.resize();
      renderer.render(performance.now());
    };

    const tick = (now: number) => {
      renderer.render(now);
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !frame) frame = requestAnimationFrame(tick);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    const mobileMq = window.matchMedia('(max-width: 900px), (pointer: coarse)');
    const onViewportChange = () => resize();
    mobileMq.addEventListener('change', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);

    resizeObserver.observe(host);
    intersection.observe(host);
    resize();
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      mobileMq.removeEventListener('change', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
      renderer.dispose();
    };
  }, []);

  const options = optionsRef.current;
  const style = crtStyle('terminal');

  return (
    <div
      ref={hostRef}
      className={`threeui-background crt crt-hacking crt-terminal${className ? ` ${className}` : ''}`}
      style={{
        background: style.background,
        opacity: options.opacity,
        filter: `hue-rotate(${options.hue}deg) saturate(${options.saturation}) brightness(${options.brightness})`,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

/** @deprecated use CrtTerminal */
export const GameCrtTerminal = CrtTerminal;
