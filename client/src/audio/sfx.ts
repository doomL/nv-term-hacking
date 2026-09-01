function tone(
  ctx: AudioContext,
  bus: GainNode,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gain = 0.12,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(bus);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(ctx: AudioContext, bus: GainNode, start: number, duration: number, gain = 0.04) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(bus);
  src.start(start);
  src.stop(start + duration + 0.01);
}

export function playNavigate(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 920, t, 0.04, 'square', 0.05);
}

export function playConfirm(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 660, t, 0.06, 'square', 0.08);
  tone(ctx, bus, 880, t + 0.07, 0.08, 'square', 0.09);
}

export function playError(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 180, t, 0.12, 'sawtooth', 0.1);
  tone(ctx, bus, 140, t + 0.1, 0.14, 'sawtooth', 0.08);
}

export function playGranted(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(ctx, bus, f, t + i * 0.09, 0.18, 'triangle', 0.1);
  });
}

export function playLocked(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 110, t, 0.25, 'sawtooth', 0.12);
  noiseBurst(ctx, bus, t + 0.05, 0.2, 0.06);
}

export function playBracket(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 440, t, 0.08, 'triangle', 0.09);
  tone(ctx, bus, 554.37, t + 0.08, 0.1, 'triangle', 0.1);
  tone(ctx, bus, 659.25, t + 0.16, 0.14, 'triangle', 0.11);
}

export function playWait(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  noiseBurst(ctx, bus, t, 0.03, 0.035);
}

export function playBack(ctx: AudioContext, bus: GainNode) {
  const t = ctx.currentTime;
  tone(ctx, bus, 520, t, 0.05, 'square', 0.06);
  tone(ctx, bus, 390, t + 0.06, 0.07, 'square', 0.07);
}
