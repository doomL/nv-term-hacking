import {
  resumeFalloutRadioPlayback,
  setFalloutRadioPlayBlockedListener,
  setFalloutRadioPlayUnblockedListener,
  startFalloutRadio,
  stopFalloutRadio,
} from './falloutRadio';
import * as sfx from './sfx';

export type SfxName =
  | 'navigate'
  | 'confirm'
  | 'error'
  | 'granted'
  | 'locked'
  | 'bracket'
  | 'wait'
  | 'back';

const STORAGE_KEY = 'nv-audio-enabled';

export type AutoplayBlockedListener = (blocked: boolean) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private unlocked = false;
  private musicOn = false;
  private pausedByHidden = false;
  private autoplayBlocked = false;
  private autoplayBlockedListener: AutoplayBlockedListener | null = null;
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';

  constructor() {
    setFalloutRadioPlayBlockedListener(() => {
      this.musicOn = false;
      this.setAutoplayBlocked(true);
    });
    setFalloutRadioPlayUnblockedListener(() => {
      this.setAutoplayBlocked(false);
    });
  }

  setAutoplayBlockedListener(listener: AutoplayBlockedListener | null): void {
    this.autoplayBlockedListener = listener;
    if (listener) listener(this.autoplayBlocked);
  }

  private setAutoplayBlocked(blocked: boolean): void {
    if (this.autoplayBlocked === blocked) return;
    this.autoplayBlocked = blocked;
    this.autoplayBlockedListener?.(blocked);
  }

  /** Attempt BGM as soon as the app loads (menu mount / provider boot). */
  attemptAutoplayOnLoad(): void {
    if (!this.enabled) return;
    this.ensureContext();
    this.startMusic();
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.28;
      this.sfxBus.gain.value = 0.45;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    if (!on) {
      this.stopMusic();
      this.setAutoplayBlocked(false);
      return;
    }
    this.ensureContext();
    this.startMusic();
    if (this.unlocked) void this.unlock();
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
    if (!this.enabled) return;
    this.setAutoplayBlocked(false);
    if (!this.musicOn) this.startMusic();
    else if (this.musicBus) resumeFalloutRadioPlayback(ctx, this.musicBus);
  }

  handleDocumentHidden() {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
    if (this.musicOn) {
      this.pausedByHidden = true;
      this.stopMusic();
    }
  }

  handleDocumentVisible() {
    if (!this.enabled) {
      this.pausedByHidden = false;
      return;
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    if (this.pausedByHidden) {
      this.pausedByHidden = false;
      this.startMusic();
    }
  }

  startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus || this.musicOn || !this.enabled) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.musicOn = true;
    startFalloutRadio(ctx, this.musicBus);
  }

  stopMusic() {
    if (!this.musicOn) return;
    this.musicOn = false;
    stopFalloutRadio();
  }

  play(name: SfxName) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus || !this.enabled) return;
    if (ctx.state === 'suspended') void ctx.resume();

    switch (name) {
      case 'navigate':
        sfx.playNavigate(ctx, this.sfxBus);
        break;
      case 'confirm':
        sfx.playConfirm(ctx, this.sfxBus);
        break;
      case 'error':
        sfx.playError(ctx, this.sfxBus);
        break;
      case 'granted':
        sfx.playGranted(ctx, this.sfxBus);
        break;
      case 'locked':
        sfx.playLocked(ctx, this.sfxBus);
        break;
      case 'bracket':
        sfx.playBracket(ctx, this.sfxBus);
        break;
      case 'wait':
        sfx.playWait(ctx, this.sfxBus);
        break;
      case 'back':
        sfx.playBack(ctx, this.sfxBus);
        break;
      default:
        break;
    }
  }
}

let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
