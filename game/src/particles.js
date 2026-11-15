/**
 * particles.js — the juice: shard bursts when a brick breaks, spark trails
 * behind the ball, floating score popups, confetti for level clears and a
 * decaying screen shake. Everything is pooled by plain arrays; dead entries
 * are swapped out so the frame never allocates in the hot loop.
 */

export class Particles {
  constructor() {
    this.shards = [];
    this.texts = [];
    this.confetti = [];
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  /** A burst of coloured shards from (x, y). */
  burst(x, y, color, count, speed = 260) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.shards.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        size: 2 + Math.random() * 5,
        color,
        life: 0.45 + Math.random() * 0.4,
        age: 0,
        spin: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI,
      });
    }
  }

  /** A short spark at the paddle or a wall. */
  spark(x, y, color, count = 6) {
    this.burst(x, y, color, count, 160);
  }

  /** A floating "+50" style popup that rises and fades. */
  popup(x, y, text, color = '#ffffff') {
    this.texts.push({ x, y, text, color, age: 0, life: 0.9 });
  }

  /** A rain of confetti across the top of the screen. */
  rain(count, colors) {
    for (let i = 0; i < count; i++) {
      this.confetti.push({
        x: Math.random() * 1280,
        y: -20 - Math.random() * 160,
        vx: (Math.random() - 0.5) * 60,
        vy: 90 + Math.random() * 140,
        size: 4 + Math.random() * 6,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 10,
        age: 0,
        life: 3,
      });
    }
  }

  /** Kick the screen shake; it decays on its own. */
  kick(amount) {
    this.shake = Math.min(this.shake + amount, 14);
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 30);
    this.shakeX = (Math.random() - 0.5) * this.shake;
    this.shakeY = (Math.random() - 0.5) * this.shake;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const p = this.shards[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.shards[i] = this.shards[this.shards.length - 1];
        this.shards.pop();
        continue;
      }
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= 42 * dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      if (c.age >= c.life || c.y > 760) this.confetti.splice(i, 1);
    }
  }

  /** Draw shards, popups and confetti; call after the world, before the HUD. */
  draw(ctx) {
    for (const p of this.shards) {
      const a = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    for (const c of this.confetti) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (c.life - c.age) / 0.5);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = 1 - t.age / t.life;
      ctx.globalAlpha = a;
      ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.shards.length = 0;
    this.texts.length = 0;
    this.confetti.length = 0;
    this.shake = 0;
  }
}
