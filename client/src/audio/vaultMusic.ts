/**
 * Fallout-style AM radio loop — lo-fi big band / Ink Spots crooner vibe.
 * Muted brass lead, piano comp, walking bass, brushed snare, vinyl hiss.
 */

type Scheduled = { stop: () => void };

let active: Scheduled | null = null;

const BPM = 104;
const BEAT = 60 / BPM;

/** F major / swing progression (I – vi – ii – V) */
const CHORDS: Array<{ freqs: number[]; root: number; beats: number }> = [
  { freqs: [174.61, 261.63, 349.23, 440], root: 174.61, beats: 4 }, // F6
  { freqs: [220, 261.63, 329.63, 392], root: 220, beats: 4 },       // Am7
  { freqs: [146.83, 220, 261.63, 349.23], root: 146.83, beats: 4 }, // Dm7
  { freqs: [196, 246.94, 293.66, 392], root: 196, beats: 4 },       // G7
];

/** Crooner-style lead (F major pentatonic + passing tones) */
const MELODY: Array<{ freq: number; beat: number; len: number }> = [
  { freq: 349.23, beat: 0, len: 0.75 },
  { freq: 392, beat: 0.75, len: 0.25 },
  { freq: 440, beat: 1, len: 1.5 },
  { freq: 392, beat: 2.5, len: 0.5 },
  { freq: 349.23, beat: 3, len: 0.5 },
  { freq: 329.63, beat: 3.5, len: 0.5 },
  { freq: 349.23, beat: 4, len: 1 },
  { freq: 392, beat: 5, len: 1 },
  { freq: 440, beat: 6, len: 0.75 },
  { freq: 493.88, beat: 6.75, len: 0.25 },
  { freq: 523.25, beat: 7, len: 1 },
  { freq: 440, beat: 8, len: 0.75 },
  { freq: 392, beat: 8.75, len: 0.25 },
  { freq: 349.23, beat: 9, len: 1.5 },
  { freq: 329.63, beat: 10.5, len: 0.5 },
  { freq: 293.66, beat: 11, len: 0.5 },
  { freq: 349.23, beat: 11.5, len: 0.5 },
  { freq: 261.63, beat: 12, len: 2 },
  { freq: 293.66, beat: 14, len: 1 },
  { freq: 329.63, beat: 15, len: 1 },
];

function connectRadioChain(ctx: AudioContext, destination: AudioNode): GainNode {
  const input = ctx.createGain();
  input.gain.value = 1;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;
  hp.Q.value = 0.6;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  lp.Q.value = 0.5;

  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 900;
  mid.gain.value = 3;
  mid.Q.value = 1.2;

  const out = ctx.createGain();
  out.gain.value = 0.85;

  input.connect(hp);
  hp.connect(mid);
  mid.connect(lp);
  lp.connect(out);
  out.connect(destination);

  return input;
}

function scheduleVinyl(ctx: AudioContext, bus: GainNode, start: number, duration: number) {
  const len = Math.floor(ctx.sampleRate * 0.06);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.35;

  let t = start;
  while (t < start + duration) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.004 + Math.random() * 0.004;
    src.connect(g);
    g.connect(bus);
    src.start(t);
    src.stop(t + 0.06);
    t += 0.18 + Math.random() * 0.25;
  }
}

function schedulePiano(ctx: AudioContext, bus: GainNode, start: number, freqs: number[], duration: number) {
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const atk = start + i * 0.012;
    g.gain.setValueAtTime(0.0001, atk);
    g.gain.linearRampToValueAtTime(0.045 - i * 0.006, atk + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, atk + duration * 0.55);
    osc.connect(g);
    g.connect(bus);
    osc.start(atk);
    osc.stop(atk + duration * 0.6);
  });
}

function scheduleBass(ctx: AudioContext, bus: GainNode, start: number, root: number) {
  const pattern = [1, 1.5, 2, 2.75, 3.5, 4];
  pattern.forEach((b, i) => {
    const t = start + b * BEAT;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = root * (i % 2 === 0 ? 1 : 1.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 0.7);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + BEAT * 0.75);
  });
}

function scheduleBrush(ctx: AudioContext, bus: GainNode, start: number) {
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.022, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(hp);
  hp.connect(g);
  g.connect(bus);
  src.start(start);
  src.stop(start + 0.06);
}

function scheduleTrumpet(ctx: AudioContext, bus: GainNode, start: number, freq: number, duration: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, start);
  filter.frequency.linearRampToValueAtTime(2200, start + 0.04);
  filter.frequency.exponentialRampToValueAtTime(500, start + duration);
  filter.Q.value = 2;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(0.07, start + 0.03);
  g.gain.setValueAtTime(0.06, start + duration * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(filter);
  filter.connect(g);
  g.connect(bus);
  osc.start(start);
  osc.stop(start + duration + 0.05);

  const hum = ctx.createOscillator();
  const hg = ctx.createGain();
  hum.type = 'sine';
  hum.frequency.value = freq / 2;
  hg.gain.setValueAtTime(0.0001, start);
  hg.gain.linearRampToValueAtTime(0.025, start + 0.05);
  hg.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  hum.connect(hg);
  hg.connect(bus);
  hum.start(start);
  hum.stop(start + duration + 0.05);
}

function scheduleHarmony(ctx: AudioContext, bus: GainNode, start: number, freq: number, duration: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq * 0.5;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(0.018, start + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(bus);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function startVaultMusic(ctx: AudioContext, bus: GainNode) {
  stopVaultMusic();

  const radioIn = connectRadioChain(ctx, bus);

  let cancelled = false;
  const loopBeats = CHORDS.reduce((n, c) => n + c.beats, 0);
  const loopDuration = loopBeats * BEAT;
  let nextLoopAt = ctx.currentTime + 0.15;

  const timers: ReturnType<typeof setTimeout>[] = [];

  function scheduleLoop(loopStart: number) {
    if (cancelled) return;

    scheduleVinyl(ctx, radioIn, loopStart, loopDuration);

    let cursor = loopStart;
    CHORDS.forEach((chord) => {
      const dur = chord.beats * BEAT;
      schedulePiano(ctx, radioIn, cursor, chord.freqs, dur);
      scheduleBass(ctx, radioIn, cursor, chord.root);
      cursor += dur;
    });

    for (let beat = 0; beat < loopBeats; beat++) {
      const t = loopStart + beat * BEAT;
      if (beat % 2 === 1) scheduleBrush(ctx, radioIn, t);
      if (beat % 4 === 2) scheduleBrush(ctx, radioIn, t + BEAT * 0.5);
    }

    MELODY.forEach(({ freq, beat, len }) => {
      const t = loopStart + beat * BEAT;
      const dur = len * BEAT;
      scheduleTrumpet(ctx, radioIn, t, freq, dur);
      scheduleHarmony(ctx, radioIn, t + BEAT * 0.02, freq, dur * 0.95);
    });
  }

  function queueNext() {
    if (cancelled) return;
    scheduleLoop(nextLoopAt);
    nextLoopAt += loopDuration;
    const ms = Math.max(0, (nextLoopAt - ctx.currentTime - 0.25) * 1000);
    timers.push(setTimeout(queueNext, ms));
  }

  queueNext();

  active = {
    stop: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    },
  };
}

export function stopVaultMusic() {
  active?.stop();
  active = null;
}
