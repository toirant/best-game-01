/**
 * audio.js — every sound in PRISM BREAK is synthesised with WebAudio: no audio
 * files, no network. A tiny step sequencer plays a quiet bassline under the
 * game, and one-shot blips cover every action. The context is created lazily
 * on the first user gesture, so loading the page never needs sound permission.
 */

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    // A minor-key bassline that walks under the game, one step per 8th note.
    this.bassline = [110, 0, 110, 130.81, 0, 98, 0, 110, 87.31, 0, 98, 110, 0, 146.83, 130.81, 0];
    this.tempoMs = 210;
  }

  /** Create/resume the context. Call from a user gesture. Safe to call often. */
  unlock() {
    if (this.ctx === null) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** A short oscillator blip with an exponential decay envelope. */
  blip(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A filtered noise burst (hits, shatters). */
  noise(dur, vol, cutoff, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  click() {
    this.blip(660, 0.06, 'square', 0.12);
  }

  paddle() {
    this.blip(220, 0.08, 'triangle', 0.25, 0, 330);
  }

  wall() {
    this.blip(180, 0.05, 'triangle', 0.14);
  }

  /** Brick break: pitch climbs a ladder with the combo, so streaks sound hotter. */
  brick(combo) {
    const ladder = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
    const f = ladder[Math.min(combo, ladder.length - 1)];
    this.blip(f, 0.12, 'square', 0.16);
    this.blip(f * 2, 0.08, 'sine', 0.1);
    this.noise(0.08, 0.1, 3200);
  }

  tough() {
    this.blip(196, 0.07, 'square', 0.18);
    this.noise(0.05, 0.12, 1800);
  }

  gem() {
    this.blip(1046.5, 0.1, 'sine', 0.2);
    this.blip(1318.5, 0.12, 'sine', 0.2, 0.07);
    this.blip(1568, 0.16, 'sine', 0.18, 0.14);
  }

  powerup() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.blip(f, 0.12, 'triangle', 0.18, i * 0.06));
  }

  laser() {
    this.blip(1200, 0.1, 'sawtooth', 0.14, 0, 300);
  }

  loseLife() {
    const notes = [392, 311.13, 233.08, 174.61];
    notes.forEach((f, i) => this.blip(f, 0.22, 'triangle', 0.2, i * 0.12));
  }

  levelClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => this.blip(f, 0.2, 'triangle', 0.2, i * 0.09));
    this.noise(0.4, 0.06, 5000, 0.2);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568];
    notes.forEach((f, i) => this.blip(f, 0.28, 'triangle', 0.2, i * 0.13));
  }

  gameOver() {
    const notes = [330, 262, 208, 165];
    notes.forEach((f, i) => this.blip(f, 0.3, 'sawtooth', 0.12, i * 0.16));
  }

  /** Start the bassline loop. */
  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const freq = this.bassline[this.musicStep % this.bassline.length];
      this.musicStep++;
      if (freq > 0) {
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.5, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + this.tempoMs / 1000);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + this.tempoMs / 1000 + 0.02);
      }
      // A faint sparkle on every fourth step.
      if (this.musicStep % 4 === 0) {
        this.blip(2093, 0.05, 'sine', 0.03);
      }
    }, this.tempoMs);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
