/**
 * render.js — every pixel PRISM BREAK draws: the starfield background, the
 * bricks, paddle and balls, the HUD, and the title / pause / clear / victory /
 * game-over screens. All drawing takes the game object, so main.js owns the
 * state and this file owns the look. Colours come from the level's palette.
 */

import { CANVAS_W, CANVAS_H } from './input.js';

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** A rounded rectangle path, for bricks, panels and buttons. */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Pre-render the background once per level: a deep gradient, soft nebula
 * blobs tinted by the level accent, and a field of twinkling stars. The live
 * frame blits this and only the twinkle layer moves.
 */
export function createBackground(level, rng) {
  const bg = document.createElement('canvas');
  bg.width = CANVAS_W;
  bg.height = CANVAS_H;
  const c = bg.getContext('2d');
  const grad = c.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#0a0d1e');
  grad.addColorStop(0.55, '#101736');
  grad.addColorStop(1, '#0b0e1a');
  c.fillStyle = grad;
  c.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < 5; i++) {
    const x = rng() * CANVAS_W;
    const y = rng() * CANVAS_H * 0.7;
    const r = 180 + rng() * 260;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, level.glow + '26');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 130; i++) {
    const x = rng() * CANVAS_W;
    const y = rng() * CANVAS_H;
    const s = rng() < 0.85 ? 1 : 2;
    c.globalAlpha = 0.25 + rng() * 0.6;
    c.fillStyle = rng() < 0.2 ? level.accent : '#ffffff';
    c.fillRect(x, y, s, s);
  }
  c.globalAlpha = 1;
  return bg;
}

/** The brick grid's geometry for a level: brick size and origin, centred. */
export function brickLayout(level) {
  const cols = level.grid[0].length;
  const rows = level.grid.length;
  const gap = 8;
  const areaW = 1160;
  const w = (areaW - gap * (cols - 1)) / cols;
  const h = 26;
  const x0 = (CANVAS_W - areaW) / 2;
  const y0 = 96;
  return { cols, rows, w, h, gap, x0, y0 };
}

/** Draw one brick: glow body, top highlight, hp pips for hardened brick. */
function drawBrick(ctx, b, time) {
  ctx.save();
  if (b.kind === 'steel') {
    ctx.fillStyle = '#2a2f45';
    rr(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#565e7d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#6b7392';
    ctx.beginPath();
    ctx.arc(b.x + 10, b.y + b.h / 2, 2.5, 0, Math.PI * 2);
    ctx.arc(b.x + b.w - 10, b.y + b.h / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.kind === 'gem') {
    const pulse = 0.75 + Math.sin(time * 4 + b.x * 0.02) * 0.25;
    ctx.shadowColor = '#ffe66d';
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = '#ffd23d';
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx + 13, cy);
    ctx.lineTo(cx, cy + 11);
    ctx.lineTo(cx - 13, cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff8d6';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = b.hp === 2 ? 16 : 9;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, shade(b.color, -0.35));
    ctx.fillStyle = grad;
    rr(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    rr(ctx, b.x + 3, b.y + 2, b.w - 6, 7, 3);
    ctx.fill();
    if (b.hp === 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      rr(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Darken a #rrggbb colour by a fraction (negative darkens). */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 + f));
  const g = Math.round(((n >> 8) & 255) * (1 + f));
  const b = Math.round((n & 255) * (1 + f));
  const cl = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

/** A heart, for the lives display. */
function drawHeart(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The in-game HUD: score, level, combo, lives and best. */
function drawHud(ctx, game) {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 24, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(String(game.score).padStart(6, '0'), 24, 50);
  // Combo badge and meter.
  if (game.combo >= 4) {
    const mult = 1 + Math.min(4, Math.floor(game.combo / 8));
    ctx.fillStyle = game.level.accent;
    ctx.font = `800 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO x${mult}`, 170, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, 170, 42, 110, 6, 3);
    ctx.fill();
    ctx.fillStyle = game.level.accent;
    rr(ctx, 170, 42, 110 * ((game.combo % 8) / 8), 6, 3);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`LEVEL ${game.levelIndex + 1} — ${game.level.name}`, CANVAS_W / 2, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText(`${game.bricksLeft} prisms left`, CANVAS_W / 2, 48);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`BEST ${String(game.best).padStart(6, '0')}`, CANVAS_W - 24, 24);
  for (let i = 0; i < Math.max(game.lives, 0); i++) {
    drawHeart(ctx, CANVAS_W - 34 - i * 26, 50, 22, '#ff5d8f');
  }
  ctx.restore();
}

/** A dim overlay panel with a title, used by the menu screens. */
function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 11, 26, 0.82)';
  rr(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** A button; returns nothing, but game.buttons records its rect for clicks. */
function button(ctx, game, key, x, y, w, h, label, accent) {
  const hover =
    game.input.mouseInside &&
    game.input.mouseX >= x &&
    game.input.mouseX <= x + w &&
    game.input.mouseY >= y &&
    game.input.mouseY <= y + h;
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = hover ? 26 : 12;
  ctx.fillStyle = hover ? accent : shade(accent, -0.15);
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0e1a';
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  game.buttons[key] = { x, y, w, h };
}

/** The full game frame: background, bricks, paddle, balls, effects, HUD. */
export function drawGame(ctx, game) {
  ctx.save();
  ctx.translate(game.particles.shakeX, game.particles.shakeY);
  ctx.drawImage(game.background, 0, 0);
  for (const b of game.bricks) {
    if (b.alive) drawBrick(ctx, b, game.time);
  }
  for (const p of game.powerups) p.draw(ctx);
  for (const bolt of game.bolts) bolt.draw(ctx);
  // Paddle: a glowing prism bar with a bright core.
  const p = game.paddle;
  ctx.save();
  ctx.shadowColor = game.level.accent;
  ctx.shadowBlur = 18;
  const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
  grad.addColorStop(0, game.level.accent);
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, game.level.accent);
  ctx.fillStyle = grad;
  rr(ctx, p.x, p.y, p.w, p.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  rr(ctx, p.x + 6, p.y + 3, p.w - 12, 4, 2);
  ctx.fill();
  if (game.laserUntil > game.time) {
    ctx.fillStyle = '#ffc53d';
    ctx.fillRect(p.x + 8, p.y - 6, 6, 6);
    ctx.fillRect(p.x + p.w - 14, p.y - 6, 6, 6);
  }
  ctx.restore();
  // Balls with motion trails.
  for (const ball of game.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      ctx.globalAlpha = (i / ball.trail.length) * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.4 + (i / ball.trail.length) * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = game.level.accent;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  game.particles.draw(ctx);
  ctx.restore();
  drawHud(ctx, game);
}

/** Title screen: logo, tagline, best score, controls, START button. */
export function drawTitle(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 18, 0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const cx = CANVAS_W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = game.level.glow;
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText('PRISM BREAK', cx, 218);
  ctx.shadowBlur = 0;
  ctx.fillStyle = game.level.accent;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('Shatter the spectrum — clear every prism, keep the ball alive', cx, 288);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 19px ${FONT}`;
  ctx.fillText('Mouse or ← → to move  •  Space / Click to launch  •  P to pause  •  M to mute', cx, 348);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(`BEST  ${String(game.best).padStart(6, '0')}`, cx, 392);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText('Catch falling capsules:  W wide  •  M multiball  •  L laser  •  S slow  •  + extra life', cx, 428);
  button(ctx, game, 'start', cx - 140, 480, 280, 62, 'START GAME', game.level.accent);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText('Three levels. One ball at a time. No mercy from the corners.', cx, 586);
  ctx.restore();
}

/** The serve banner: level name and "launch" hint, drawn over the field. */
export function drawServe(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(6, 8, 18, 0.45)';
  ctx.fillRect(0, 300, CANVAS_W, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText(`LEVEL ${game.levelIndex + 1} — ${game.level.name}`, CANVAS_W / 2, 332);
  ctx.fillStyle = game.level.accent;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(game.level.subtitle, CANVAS_W / 2, 372);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 20px ${FONT}`;
  const blink = 0.65 + Math.sin(game.time * 5) * 0.35;
  ctx.globalAlpha = blink;
  ctx.fillText('SPACE or CLICK to launch', CANVAS_W / 2, 452);
  ctx.restore();
}

/** Pause overlay. */
export function drawPaused(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 18, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText('PAUSED', CANVAS_W / 2, 330);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText('P or Click to resume  •  R to restart the level', CANVAS_W / 2, 396);
  ctx.restore();
}

/** Level-clear results panel with the run's stats and a NEXT button. */
export function drawClear(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  const w = 560;
  const h = 380;
  const x = (CANVAS_W - w) / 2;
  const y = 150;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = game.level.accent;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText('LEVEL CLEAR!', CANVAS_W / 2, y + 58);
  const s = game.clearStats;
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(`Score  ${s.score}`, CANVAS_W / 2, y + 128);
  ctx.fillText(`Time  ${s.time}s    •    Accuracy  ${s.accuracy}%`, CANVAS_W / 2, y + 166);
  ctx.fillText(`Bricks  ${s.bricks}    •    Best combo  x${s.bestCombo}`, CANVAS_W / 2, y + 204);
  ctx.fillStyle = '#ffc53d';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText(`Clear bonus  +${s.bonus}`, CANVAS_W / 2, y + 246);
  button(ctx, game, 'next', CANVAS_W / 2 - 130, y + 282, 260, 56, game.levelIndex + 1 < 3 ? 'NEXT LEVEL' : 'FINISH', '#7ee787');
  ctx.restore();
}

/** Victory screen: total score, stars, best, PLAY AGAIN. */
export function drawVictory(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 18, 0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const cx = CANVAS_W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd23d';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 72px ${FONT}`;
  ctx.fillText('SPECTRUM CLEAR!', cx, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffc53d';
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText('Every prism shattered. The light is yours.', cx, 272);
  for (let i = 0; i < 3; i++) {
    const sx = cx - 90 + i * 90;
    const sy = 340;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(i === 1 ? 0 : i === 0 ? -0.18 : 0.18);
    ctx.fillStyle = i < game.stars ? '#ffd23d' : 'rgba(255,255,255,0.18)';
    ctx.shadowColor = i < game.stars ? '#ffd23d' : 'transparent';
    ctx.shadowBlur = i < game.stars ? 18 : 0;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 34 : 15;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(`FINAL SCORE  ${String(game.score).padStart(6, '0')}`, cx, 428);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(`Best  ${String(game.best).padStart(6, '0')}    •    ${game.totalTime}s played`, cx, 468);
  button(ctx, game, 'again', cx - 140, 512, 280, 62, 'PLAY AGAIN', '#7ee787');
  ctx.restore();
}

/** Game-over screen: score, best, RETRY. */
export function drawGameOver(ctx, game) {
  drawGame(ctx, game);
  ctx.save();
  ctx.fillStyle = 'rgba(10, 6, 12, 0.62)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const cx = CANVAS_W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff5d8f';
  ctx.font = `900 72px ${FONT}`;
  ctx.fillText('GAME OVER', cx, 240);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(`The last ball slipped past on level ${game.levelIndex + 1}.`, cx, 306);
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(`SCORE  ${String(game.score).padStart(6, '0')}`, cx, 366);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(`Best  ${String(game.best).padStart(6, '0')}`, cx, 408);
  button(ctx, game, 'again', cx - 140, 462, 280, 62, 'TRY AGAIN', '#ff5d8f');
  ctx.restore();
}
