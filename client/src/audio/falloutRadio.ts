/**
 * Fallout-style ambient radio — sequential MP3 playlist (tracks 01–10).
 * Picks a random starting track each cold start; then advances in order with wrap.
 * BGM plays via HTMLAudioElement (not Web Audio MediaElementSource) so it
 * stays audible when AudioContext is recreated on toggle/remount.
 */

const PLAYLIST_URL = '/bgm/fallout-radio-playlist.json';
const FALLBACK_TRACK = '/bgm/fallout-radio-full.mp3';

/** Direct element output; tuned vs Web Audio SFX bus (~0.45). */
const BGM_VOLUME = 0.55;

/** Retries for the same track URL (e.g. brief nginx 502 during redeploy). */
const TRACK_URL_RETRIES = 3;
const RETRY_DELAY_MS = 400;

const DEFAULT_TRACKS: string[] = Array.from({ length: 10 }, (_, i) =>
  `/bgm/fallout-radio-${String(i + 1).padStart(2, '0')}.mp3`,
);

let audio: HTMLAudioElement | null = null;

let tracks: string[] = [...DEFAULT_TRACKS];
let trackIndex = 0;
let useFallback = false;
let stopped = true;
let loadFailures = 0;
let playlistPromise: Promise<string[]> | null = null;
let resolvedTracks: string[] | null = null;
let playBlockedListener: (() => void) | null = null;

/** Notifies the audio engine when autoplay policy blocks HTMLAudioElement.play(). */
export function setFalloutRadioPlayBlockedListener(listener: (() => void) | null): void {
  playBlockedListener = listener;
}

function normalizeBgmPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('assets/bgm/')) return `/${trimmed.slice('assets/'.length)}`;
  if (trimmed.startsWith('bgm/')) return `/${trimmed}`;
  return `/bgm/${trimmed.replace(/^\/+/, '')}`;
}

function parsePlaylistJson(data: unknown): string[] | null {
  let raw: unknown[] | null = null;
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.tracks)) raw = obj.tracks;
    else if (Array.isArray(obj.files)) raw = obj.files;
  }
  if (!raw?.length) return null;

  const paths: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') paths.push(normalizeBgmPath(entry));
    else if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      const p = e.path ?? e.src ?? e.url ?? e.file;
      if (typeof p === 'string') paths.push(normalizeBgmPath(p));
    }
  }
  return paths.length ? paths : null;
}

async function loadPlaylistTracks(): Promise<string[]> {
  if (!playlistPromise) {
    playlistPromise = (async () => {
      try {
        const res = await fetch(PLAYLIST_URL);
        if (!res.ok) throw new Error(`playlist ${res.status}`);
        const json = (await res.json()) as unknown;
        const parsed = parsePlaylistJson(json);
        if (parsed?.length) return parsed;
      } catch {
        /* hardcoded default */
      }
      const list = [...DEFAULT_TRACKS];
      resolvedTracks = list;
      return list;
    })();
  }
  return playlistPromise.then((list) => {
    resolvedTracks = list;
    return list;
  });
}

void loadPlaylistTracks();

function isPlayBlockedError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'NotAllowedError' || err.name === 'AbortError')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = BGM_VOLUME;
  }
  return audio;
}

function clearAudioHandlers(el: HTMLAudioElement) {
  el.onended = null;
  el.onerror = null;
}

function haltPlayback(el: HTMLAudioElement) {
  clearAudioHandlers(el);
  el.pause();
  el.removeAttribute('src');
  el.load();
}

function playUrl(
  el: HTMLAudioElement,
  url: string,
  onEnded: () => void,
  onFailedPermanent: () => void,
) {
  let retriesLeft = TRACK_URL_RETRIES;

  const beginAttempt = () => {
    if (stopped) return;
    clearAudioHandlers(el);
    el.src = url;
    el.onended = onEnded;
    el.onerror = () => {
      void afterFailure('element-error');
    };
    void el.play().catch((err) => {
      if (isPlayBlockedError(err)) {
        playBlockedListener?.();
        return;
      }
      void afterFailure('play()', err);
    });
  };

  const afterFailure = async (phase: string, err?: unknown) => {
    if (stopped) return;
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      await delay(RETRY_DELAY_MS);
      if (stopped) return;
      beginAttempt();
      return;
    }
    console.warn('[fallout-radio]', 'track failed after retries', { url, phase, err });
    onFailedPermanent();
  };

  beginAttempt();
}

function playFallback() {
  if (stopped) return;
  const el = ensureAudio();
  playUrl(
    el,
    FALLBACK_TRACK,
    () => {
      if (!stopped) playFallback();
    },
    () => stopFalloutRadio(),
  );
}

function advanceAfterTrackFailure() {
  if (stopped) return;
  loadFailures += 1;
  trackIndex = (trackIndex + 1) % tracks.length;
  if (loadFailures >= tracks.length) {
    console.warn('[fallout-radio]', 'playlist exhausted, switching to fallback');
    useFallback = true;
    loadFailures = 0;
  }
  playCurrentTrack();
}

function playCurrentTrack() {
  if (stopped) return;
  if (useFallback) {
    playFallback();
    return;
  }

  const el = ensureAudio();
  const url = tracks[trackIndex] ?? DEFAULT_TRACKS[trackIndex % DEFAULT_TRACKS.length];

  playUrl(
    el,
    url,
    () => {
      if (stopped) return;
      loadFailures = 0;
      trackIndex = (trackIndex + 1) % tracks.length;
      playCurrentTrack();
    },
    () => advanceAfterTrackFailure(),
  );
}

export function resumeFalloutRadioPlayback(ctx: AudioContext, _bus: GainNode): void {
  if (stopped) return;
  const el = ensureAudio();
  if (!el.src) {
    playCurrentTrack();
    return;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  void el.play().catch((err) => {
    if (isPlayBlockedError(err)) playBlockedListener?.();
  });
}

function beginColdStartPlayback(): void {
  if (resolvedTracks?.length) {
    tracks = resolvedTracks;
    trackIndex = Math.floor(Math.random() * tracks.length);
    playCurrentTrack();
    return;
  }
  void loadPlaylistTracks().then((list) => {
    if (stopped) return;
    tracks = list.length ? list : [...DEFAULT_TRACKS];
    trackIndex = Math.floor(Math.random() * tracks.length);
    playCurrentTrack();
  });
}

export function startFalloutRadio(ctx: AudioContext, _bus: GainNode): void {
  stopFalloutRadio();
  stopped = false;
  useFallback = false;
  loadFailures = 0;

  if (ctx.state === 'suspended') void ctx.resume();
  beginColdStartPlayback();
}

export function stopFalloutRadio() {
  stopped = true;
  trackIndex = 0;
  useFallback = false;
  loadFailures = 0;
  if (audio) haltPlayback(audio);
}
