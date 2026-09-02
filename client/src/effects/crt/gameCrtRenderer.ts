import { CRT_STYLES, type CrtStyle, type CrtVariant } from './crtScreens';
import { CRT_FRAGMENT_SHADER, CRT_VERTEX_SHADER } from './crtShaders';
import { paintCrtScreen } from './paintCrtScreen';
import type { CrtScreenState } from './crtScreenTypes';

export const CRT_VARIANTS = ['terminal', 'cinematic', 'blue-screen', 'nintendo', 'hacking'] as const;
export type CrtOptions = {
  variant: CrtVariant | 'hacking';
  speed: number;
  typeSpeed: number;
  motion: number;
  brightness: number;
  opacity: number;
  hue: number;
  saturation: number;
};
export const CRT_DEFAULTS: CrtOptions = {
  variant: 'hacking',
  speed: 1,
  typeSpeed: 1,
  motion: 1,
  brightness: 1,
  opacity: 1,
  hue: 0,
  saturation: 1,
};

export const crtStyle = (variant: CrtVariant | 'hacking'): CrtStyle =>
  variant === 'hacking' ? HACKING_CRT_STYLE : (CRT_STYLES[variant] ?? CRT_STYLES.terminal);

/** Leggibile ma con tubo CRT — scanline statiche + barra che scorre in verticale */
export const HACKING_CRT_STYLE: CrtStyle = {
  ...CRT_STYLES.terminal,
  curve: [0.038, 0.052],
  scanDepth: 0.28,
  grille: 0.18,
  chroma: 0.35,
  bar: 0.042,
  vignette: 0.16,
  gain: 1.5,
  halo: 0.08,
  flicker: 0.018,
  grain: 0.018,
};

const MOBILE_MQ = '(max-width: 900px), (pointer: coarse)';

function isMobileViewport(cssWidth: number, cssHeight: number): boolean {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches) return true;
  return Math.min(cssWidth, cssHeight) <= 900;
}

function styleForViewport(cssWidth: number, cssHeight: number): CrtStyle {
  if (isMobileViewport(cssWidth, cssHeight)) {
    return {
      ...HACKING_CRT_STYLE,
      curve: [0.024, 0.034],
      scanDepth: 0.2,
      grille: 0.14,
      chroma: 0.22,
      bar: 0.028,
      vignette: 0.11,
      gain: 1.54,
      halo: 0.04,
      flicker: 0.006,
      grain: 0.006,
    };
  }
  return { ...HACKING_CRT_STYLE };
}

const BLINK_PERIOD_MS = 380;

function selectionBlinkOn(now: number, startedAt: number): boolean {
  return Math.floor((now - startedAt) / BLINK_PERIOD_MS) % 2 === 0;
}

const MAX_BUFFER_WIDTH = 1920;
const MIN_BUFFER_WIDTH = 640;
const MAX_BUFFER_PIXELS = 2_400_000;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create CRT shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'CRT shader compilation failed');
  }
  return shader;
}

export function createGameCrtRenderer(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  getOptions: () => CrtOptions,
  getScreenData: () => CrtScreenState,
) {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error('CRT requires WebGL');

  const textCanvas = document.createElement('canvas');
  const textContext = textCanvas.getContext('2d');
  if (!textContext) throw new Error('CRT text canvas unavailable');

  const vertex = compile(gl, gl.VERTEX_SHADER, CRT_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create CRT program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'CRT link failed');
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uTexture = uniform('uTex');
  const uResolution = uniform('uRes');
  const uTime = uniform('uTime');
  const uMotion = uniform('uMotion');
  const uCurve = uniform('uCurve');
  const uScan = uniform('uScan');
  const uScanDepth = uniform('uScanDepth');
  const uTriad = uniform('uTriad');
  const uGrille = uniform('uGrille');
  const uChroma = uniform('uChroma');
  const uBar = uniform('uBar');
  const uFlicker = uniform('uFlicker');
  const uGrain = uniform('uGrain');
  const uNoise = uniform('uNoise');
  const uVignette = uniform('uVignette');
  const uMono = uniform('uMono');
  const uGain = uniform('uGain');
  const uHalo = uniform('uHalo');
  const uSheen = uniform('uSheen');
  const uRoom = uniform('uRoom');

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uTexture, 0);

  let width = 1;
  let height = 1;
  let cssWidth = 1;
  let cssHeight = 1;
  let textDirty = true;
  let lastBlink = -1;
  let lastScreenKey = '';
  let style = { ...HACKING_CRT_STYLE };
  const startedAt = performance.now();
  // Separate anchor for the selection blink only (not the CRT shader's time uniform):
  // reset to "just started" whenever the selected cell/word changes, so moving the
  // cursor never lands mid-blink-off — it always reappears fully bright immediately.
  let blinkAnchor = startedAt;
  let lastSelectionKey = '';

  const applyStyle = () => {
    gl.useProgram(program);
    gl.uniform2f(uCurve, style.curve[0], style.curve[1]);
    gl.uniform1f(uScanDepth, style.scanDepth);
    gl.uniform1f(uGrille, style.grille);
    gl.uniform1f(uChroma, style.chroma);
    gl.uniform1f(uBar, style.bar);
    gl.uniform1f(uFlicker, style.flicker);
    gl.uniform1f(uGrain, style.grain);
    gl.uniform1f(uNoise, style.noise);
    gl.uniform1f(uVignette, style.vignette);
    gl.uniform1f(uMono, style.mono);
    gl.uniform1f(uGain, style.gain);
    gl.uniform1f(uHalo, style.halo);
    gl.uniform3f(uSheen, style.sheen[0], style.sheen[1], style.sheen[2]);
    gl.uniform3f(uRoom, style.room[0], style.room[1], style.room[2]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };

  const drawScreen = (blinkOn: boolean) => {
    const data = getScreenData();
    paintCrtScreen(textContext, width, height, data, blinkOn);
  };

  const uploadTexture = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    textDirty = false;
  };

  const resize = () => {
    const bounds = host.getBoundingClientRect();
    cssWidth = Math.max(1, bounds.width);
    cssHeight = Math.max(1, bounds.height);

    style = {
      ...styleForViewport(cssWidth, cssHeight),
    };
    applyStyle();

    const density = Math.min(window.devicePixelRatio || 1, 2);
    let nextWidth = Math.max(MIN_BUFFER_WIDTH, Math.round(Math.min(cssWidth * density, MAX_BUFFER_WIDTH)));
    let nextHeight = Math.max(1, Math.round(nextWidth * cssHeight / cssWidth));
    if (nextWidth * nextHeight > MAX_BUFFER_PIXELS) {
      const fit = Math.sqrt(MAX_BUFFER_PIXELS / (nextWidth * nextHeight));
      nextWidth = Math.round(nextWidth * fit);
      nextHeight = Math.round(nextHeight * fit);
    }

    const screenWidth = nextWidth;
    const screenHeight = Math.max(1, Math.round(screenWidth * cssHeight / cssWidth));

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    if (textCanvas.width !== screenWidth || textCanvas.height !== screenHeight) {
      textCanvas.width = screenWidth;
      textCanvas.height = screenHeight;
      width = screenWidth;
      height = screenHeight;
      textDirty = true;
    }

    gl.useProgram(program);
    gl.viewport(0, 0, nextWidth, nextHeight);
    gl.uniform2f(uResolution, nextWidth, nextHeight);
    gl.uniform1f(uScan, Math.max(120, Math.min(cssHeight * style.scanDensity, 900)));
    gl.uniform1f(uTriad, Math.max(2, style.triadCss * nextWidth / cssWidth));
  };

  applyStyle();

  return {
    resize,
    invalidate() {
      textDirty = true;
    },
    render(now: number) {
      const data = getScreenData();
      const selectionKey =
        data.type === 'game' && data.selection ? `${data.selection.start}-${data.selection.end}` : '';
      if (selectionKey !== lastSelectionKey) {
        lastSelectionKey = selectionKey;
        blinkAnchor = now;
      }
      const blinkOn = selectionBlinkOn(now, blinkAnchor);
      const blinkKey = blinkOn ? 1 : 0;
      const screenKey = JSON.stringify(data);

      if (screenKey !== lastScreenKey || blinkKey !== lastBlink || textDirty) {
        drawScreen(blinkOn);
        lastScreenKey = screenKey;
        lastBlink = blinkKey;
        textDirty = true;
      }

      if (textDirty) uploadTexture();

      const options = getOptions();
      const seconds = (now - startedAt) * 0.001 * options.speed;
      gl.useProgram(program);
      gl.uniform1f(uTime, seconds);
      gl.uniform1f(uMotion, options.motion);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
