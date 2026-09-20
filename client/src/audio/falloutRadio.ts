/**
 * Fallout-style in-game radio — sequential MP3 playlist (tracks 01–10).
 */

const PLAYLIST_URL = '/bgm/fallout-radio-playlist.json';
const FALLBACK_TRACK = '/bgm/fallout-radio-full.mp3';

const DEFAULT_TRACKS: string[] = Array.from({ length: 10 }, (_, i) =>
  `/bgm/fallout-radio-${String(i + 1).padStart(2, '0')}.mp3`,
);

let audio: HTMLAudioElement | null = null;
let mediaSource: MediaElementAudioSourceNode | null = null;
let connectedBus: GainNode | null = null;

let tracks: string[] = [...DEFAULT_TRACKS];
let trackIndex = 0;
let useFallback = false;
let stopped = true;
let loadFailures = 0;
let playlistPromise: Promise<string[]> | null = null;

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
      return [...DEFAULT_TRACKS];
    })();
  }
  return playlistPromise;
}

function isPlayBlockedError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'NotAllowedError' || err.name === 'AbortError')
  );
}

function ensureAudio(ctx: AudioContext, bus: GainNode): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
  }
  if (connectedBus !== bus || !mediaSource) {
    mediaSource?.disconnect();
    mediaSource = ctx.createMediaElementSource(audio);
    mediaSource.connect(bus);
    connectedBus = bus;
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

function playUrl(el: HTMLAudioElement, url: string, onEnded: () => void, onError: () => void) {
  clearAudioHandlers(el);
  el.src = url;
  el.onended = onEnded;
  el.onerror = onError;
  void el.play().catch((err) => {
    if (isPlayBlockedError(err)) return;
    onError();
  });
}

function playFallback(ctx: AudioContext, bus: GainNode) {
  if (stopped) return;
  const el = ensureAudio(ctx, bus);
  playUrl(
    el,
    FALLBACK_TRACK,
    () => {
      if (!stopped) playFallback(ctx, bus);
    },
    () => stopFalloutRadio(),
  );
}

function playCurrentTrack(ctx: AudioContext, bus: GainNode) {
  if (stopped) return;
  if (useFallback) {
    playFallback(ctx, bus);
    return;
  }

  const el = ensureAudio(ctx, bus);
  const url = tracks[trackIndex] ?? DEFAULT_TRACKS[trackIndex % DEFAULT_TRACKS.length];

  playUrl(
    el,
    url,
    () => {
      if (stopped) return;
      loadFailures = 0;
      trackIndex = (trackIndex + 1) % tracks.length;
      playCurrentTrack(ctx, bus);
    },
    () => {
      if (stopped) return;
      loadFailures += 1;
      trackIndex = (trackIndex + 1) % tracks.length;
      if (loadFailures >= tracks.length) {
        useFallback = true;
        loadFailures = 0;
      }
      playCurrentTrack(ctx, bus);
    },
  );
}

export async function resumeFalloutRadioPlayback(ctx: AudioContext, bus: GainNode): Promise<void> {
  if (stopped) return;
  const el = ensureAudio(ctx, bus);
  if (!el.src) {
    playCurrentTrack(ctx, bus);
    return;
  }
  if (ctx.state === 'suspended') await ctx.resume();
  try {
    await el.play();
  } catch (err) {
    if (!isPlayBlockedError(err)) {
      /* keep current track; real load/decode errors use el.onerror */
    }
  }
}

export async function startFalloutRadio(ctx: AudioContext, bus: GainNode): Promise<void> {
  stopFalloutRadio();
  stopped = false;
  useFallback = false;
  trackIndex = 0;
  loadFailures = 0;

  if (ctx.state === 'suspended') await ctx.resume();

  void loadPlaylistTracks().then((list) => {
    if (stopped) return;
    tracks = list.length ? list : [...DEFAULT_TRACKS];
    playCurrentTrack(ctx, bus);
  });
}

export function stopFalloutRadio() {
  stopped = true;
  trackIndex = 0;
  useFallback = false;
  loadFailures = 0;
  if (audio) haltPlayback(audio);
}
