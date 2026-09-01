import { startVaultMusic, stopVaultMusic } from './vaultMusic';
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

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private unlocked = false;
  private musicOn = false;
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';

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
      return;
    }
    if (this.unlocked) void this.unlock();
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || this.unlocked) return;
    if (ctx.state === 'suspended') await ctx.resume();
    this.unlocked = true;
    if (this.enabled && !this.musicOn) this.startMusic();
  }

  startMusic() {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus || this.musicOn || !this.enabled) return;
    this.musicOn = true;
    startVaultMusic(ctx, this.musicBus);
  }

  stopMusic() {
    if (!this.musicOn) return;
    this.musicOn = false;
    stopVaultMusic();
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
