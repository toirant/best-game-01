/**
 * powerups.js — the falling capsules bricks drop and what they do. Each type
 * has a letter, a colour and a one-line job, so the player reads it at a
 * glance while it falls. A powerup is caught when it touches the paddle.
 */

export const POWERUP_TYPES = {
  W: { label: 'W', name: 'WIDE', color: '#4cc9f0', desc: 'Wider paddle' },
  M: { label: 'M', name: 'MULTIBALL', color: '#ff5d8f', desc: 'Two extra balls' },
  L: { label: 'L', name: 'LASER', color: '#ffc53d', desc: 'Laser paddle — click to fire' },
  S: { label: 'S', name: 'SLOW', color: '#7ee787', desc: 'Slow ball' },
  '+': { label: '+', name: 'EXTRA LIFE', color: '#e0aaff', desc: 'One more life' },
};

/** Weighted drop table: most drops are the common four, extra life is rare. */
const DROP_TABLE = ['W', 'W', 'M', 'M', 'L', 'S', 'S', 'W', 'M', 'L', 'S', '+'];

/** Pick a powerup type with a rng function. */
export function rollPowerup(rng) {
  return DROP_TABLE[Math.floor(rng() * DROP_TABLE.length)];
}

/** A falling powerup capsule. */
export class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vy = 150;
    this.r = 14;
    this.spin = 0;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.spin += dt * 3;
  }

  /** True when the capsule overlaps the paddle's catch zone. */
  caughtBy(paddle) {
    return (
      this.y + this.r >= paddle.y &&
      this.y - this.r <= paddle.y + paddle.h &&
      this.x >= paddle.x - this.r &&
      this.x <= paddle.x + paddle.w + this.r
    );
  }

  draw(ctx) {
    const def = POWERUP_TYPES[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.spin) * 0.12);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(10, 14, 30, 0.92)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, -12, 32, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.color;
    ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, 0, 1);
    ctx.restore();
  }
}

/** A laser bolt fired from the paddle. */
export class Bolt {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = -760;
    this.w = 5;
    this.h = 18;
  }

  update(dt) {
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = '#ffc53d';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.roundRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 2);
    ctx.fill();
    ctx.restore();
  }
}
