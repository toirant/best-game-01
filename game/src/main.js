/**
 * main.js — PRISM BREAK: boot, the fixed-step game loop, the state machine
 * (title / serve / play / paused / clear / victory / gameover), scoring,
 * collisions, powerups and the deterministic screenshot stages.
 *
 * A complete neon breakout: move the paddle with mouse or arrow keys, launch
 * the ball, shatter every prism across three levels. Clear level 3 and the
 * spectrum is yours.
 */

import { makeRng } from './rng.js';
import { LEVELS, breakableCount } from './levels.js';
import { SoundBank } from './audio.js';
import { Input, CANVAS_W, CANVAS_H } from './input.js';
import { clamp, circleRectSide, reflect, paddleRebound } from './physics.js';
import { Particles } from './particles.js';
import { Powerup, Bolt, rollPowerup, POWERUP_TYPES } from './powerups.js';
import {
  createBackground,
  brickLayout,
  drawGame,
  drawTitle,
  drawServe,
  drawPaused,
  drawClear,
  drawVictory,
  drawGameOver,
} from './render.js';

const STEP = 1 / 60;
const PADDLE_Y = 648;
const PADDLE_H = 16;
const PADDLE_W = 120;
const PADDLE_WIDE = 184;
const BALL_R = 9;
const WALL_TOP = 78;

/** A best score kept across visits, guarded for browsers that block storage. */
function loadBest() {
  try {
    return Number(window.localStorage.getItem('prism-break-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('prism-break-best', String(score));
  } catch {
    /* storage unavailable: the score still counts for this run */
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.particles = new Particles();
    this.rng = Math.random;
    this.state = 'title';
    this.time = 0;
    this.best = loadBest();
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.bestCombo = 0;
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.bricks = [];
    this.bricksLeft = 0;
    this.brokenCount = 0;
    this.balls = [];
    this.bolts = [];
    this.powerups = [];
    this.paddle = { x: CANVAS_W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
    this.wideUntil = 0;
    this.laserUntil = 0;
    this.laserCooldown = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.saves = 0;
    this.losses = 0;
    this.clearStats = null;
    this.stars = 0;
    this.buttons = {};
    this.background = null;
    this.pausedFrom = null;
    this.loadLevel(0, true);
  }

  /** Build a level's bricks from its grid, with the level's palette. */
  loadLevel(index, first = false) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const lay = brickLayout(this.level);
    this.bricks = [];
    this.level.grid.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        const color = this.level.rowColors[Math.min(r, this.level.rowColors.length - 1)];
        this.bricks.push({
          x: lay.x0 + c * (lay.w + lay.gap),
          y: lay.y0 + r * (lay.h + lay.gap),
          w: lay.w,
          h: lay.h,
          kind: ch === '2' ? 'tough' : ch === '3' ? 'steel' : ch === '4' ? 'gem' : 'normal',
          hp: ch === '2' ? 2 : 1,
          color,
          alive: true,
        });
      }
    });
    this.bricksLeft = breakableCount(this.level);
    this.brokenCount = 0;
    this.balls = [];
    this.bolts = [];
    this.powerups = [];
    this.paddle.w = PADDLE_W;
    this.wideUntil = 0;
    this.laserUntil = 0;
    this.levelTime = 0;
    this.background = createBackground(this.level, makeRng(1000 + index * 77));
    this.serveBall();
    if (!first) this.state = 'serve';
  }

  /** Put one ball on the paddle, ready to launch. */
  serveBall() {
    this.balls = [
      {
        x: this.paddle.x + this.paddle.w / 2,
        y: this.paddle.y - BALL_R - 1,
        vx: 0,
        vy: 0,
        r: BALL_R,
        trail: [],
        stuck: true,
      },
    ];
  }

  /** The ball's target speed: the level's base, rising as bricks fall. */
  ballSpeed() {
    return this.level.ballSpeed * (1 + Math.min(0.25, this.brokenCount * 0.004));
  }

  launch() {
    const ball = this.balls.find((b) => b.stuck);
    if (!ball) return;
    const angle = (this.rng() - 0.5) * 0.9;
    const speed = this.ballSpeed();
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    ball.stuck = false;
    this.state = 'play';
    this.sound.blip(440, 0.08, 'triangle', 0.2, 0, 660);
  }

  /** The combo multiplier: +1 every 8 consecutive brick hits, capped at x5. */
  multiplier() {
    return 1 + Math.min(4, Math.floor(this.combo / 8));
  }

  addScore(base, x, y) {
    const pts = base * this.multiplier();
    this.score += pts;
    this.particles.popup(x, y, `+${pts}`, '#ffffff');
  }

  hitBrick(ball, brick, side) {
    const [vx, vy] = reflect(ball.vx, ball.vy, side);
    ball.vx = vx;
    ball.vy = vy;
    if (brick.kind === 'steel') {
      this.sound.tough();
      this.particles.spark(ball.x, ball.y, '#9aa3bd', 4);
      return;
    }
    brick.hp -= 1;
    if (brick.hp > 0) {
      this.sound.tough();
      this.particles.burst(ball.x, ball.y, brick.color, 5, 140);
      return;
    }
    brick.alive = false;
    this.brokenCount += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.particles.burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 14);
    this.particles.kick(2);
    if (brick.kind === 'gem') {
      this.sound.gem();
      this.addScore(250, brick.x + brick.w / 2, brick.y);
    } else {
      this.sound.brick(this.combo);
      this.addScore(50, brick.x + brick.w / 2, brick.y);
      if (this.rng() < 0.16) {
        this.powerups.push(new Powerup(brick.x + brick.w / 2, brick.y + brick.h / 2, rollPowerup(this.rng)));
      }
    }
    if (brick.kind !== 'gem') this.bricksLeft -= 1;
    if (this.bricksLeft <= 0) this.levelCleared();
  }

  levelCleared() {
    const bonus = 500 + this.lives * 100;
    this.score += bonus;
    const accuracy = this.saves + this.losses === 0 ? 100 : Math.round((this.saves / (this.saves + this.losses)) * 100);
    this.clearStats = {
      score: this.score,
      time: Math.round(this.levelTime),
      accuracy,
      bricks: this.brokenCount,
      bestCombo: this.multiplier(),
      bonus,
    };
    this.state = 'clear';
    this.sound.levelClear();
    this.particles.rain(90, [this.level.accent, '#ffd23d', '#ffffff', '#ff5d8f']);
  }

  loseBall(ball) {
    this.balls.splice(this.balls.indexOf(ball), 1);
    this.losses += 1;
    if (this.balls.length > 0) return;
    this.combo = 0;
    this.lives -= 1;
    this.particles.kick(8);
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.sound.gameOver();
      if (this.score > this.best) {
        this.best = this.score;
        saveBest(this.best);
      }
      return;
    }
    this.sound.loseLife();
    this.serveBall();
    this.state = 'serve';
  }

  applyPowerup(type) {
    const def = POWERUP_TYPES[type];
    this.sound.powerup();
    this.particles.popup(this.paddle.x + this.paddle.w / 2, this.paddle.y - 24, def.name, def.color);
    if (type === 'W') {
      this.wideUntil = this.time + 12;
      this.paddle.w = PADDLE_WIDE;
    } else if (type === 'M') {
      const src = this.balls[0];
      if (src) {
        for (const da of [-0.5, 0.5]) {
          const speed = Math.hypot(src.vx, src.vy) || this.ballSpeed();
          const a = Math.atan2(src.vy, src.vx) + da;
          this.balls.push({
            x: src.x,
            y: src.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: BALL_R,
            trail: [],
            stuck: false,
          });
        }
      }
    } else if (type === 'L') {
      this.laserUntil = this.time + 10;
    } else if (type === 'S') {
      for (const b of this.balls) {
        b.vx *= 0.7;
        b.vy *= 0.7;
      }
    } else if (type === '+') {
      this.lives = Math.min(this.lives + 1, 5);
    }
  }

  fireLaser() {
    if (this.laserUntil <= this.time || this.laserCooldown > this.time) return;
    this.laserCooldown = this.time + 0.22;
    this.bolts.push(new Bolt(this.paddle.x + 12, this.paddle.y - 8));
    this.bolts.push(new Bolt(this.paddle.x + this.paddle.w - 12, this.paddle.y - 8));
    this.sound.laser();
  }

  startRun() {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.bestCombo = 0;
    this.totalTime = 0;
    this.saves = 0;
    this.losses = 0;
    this.stars = 0;
    this.loadLevel(0, true);
    this.state = 'serve';
    this.sound.unlock();
    this.sound.startMusic();
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'victory';
      this.stars = this.score >= 12000 ? 3 : this.score >= 8000 ? 2 : 1;
      this.sound.victory();
      this.particles.rain(140, ['#ffd23d', '#ff5d8f', '#4cc9f0', '#7ee787', '#ffffff']);
      if (this.score > this.best) {
        this.best = this.score;
        saveBest(this.best);
      }
      return;
    }
    this.loadLevel(this.levelIndex + 1);
  }

  /** Move the paddle: mouse when it moved last, keys otherwise. */
  movePaddle(dt) {
    const steer = this.input.steer();
    if (steer !== 0) {
      this.input.mouseActive = false;
      this.paddle.x += steer * 640 * dt;
    } else if (this.input.mouseActive && this.input.mouseInside) {
      this.paddle.x = this.input.mouseX - this.paddle.w / 2;
    }
    this.paddle.x = clamp(this.paddle.x, 8, CANVAS_W - this.paddle.w - 8);
    if (this.wideUntil > 0 && this.time > this.wideUntil) {
      this.paddle.w = PADDLE_W;
      this.wideUntil = 0;
    }
  }

  update(dt) {
    this.time += dt;
    if (this.state === 'play' || this.state === 'serve') {
      this.levelTime += dt;
      this.totalTime += dt;
    }
    this.particles.update(dt);
    if (this.state === 'title') {
      // A quiet attract mode: the ball drifts behind the title.
      this.movePaddle(dt);
      return;
    }
    if (this.state !== 'play' && this.state !== 'serve') return;

    this.movePaddle(dt);

    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = this.paddle.x + this.paddle.w / 2;
        ball.y = this.paddle.y - BALL_R - 1;
        continue;
      }
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
        this.sound.wall();
      } else if (ball.x + ball.r > CANVAS_W) {
        ball.x = CANVAS_W - ball.r;
        ball.vx = -Math.abs(ball.vx);
        this.sound.wall();
      }
      if (ball.y - ball.r < WALL_TOP) {
        ball.y = WALL_TOP + ball.r;
        ball.vy = Math.abs(ball.vy);
        this.sound.wall();
      }

      // Paddle.
      if (ball.vy > 0) {
        const side = circleRectSide(ball.x, ball.y, ball.r, this.paddle);
        if (side === 'top') {
          const speed = this.ballSpeed();
          const [vx, vy] = paddleRebound(ball.x, this.paddle, speed);
          ball.vx = vx;
          ball.vy = vy;
          ball.y = this.paddle.y - ball.r - 0.5;
          this.saves += 1;
          this.sound.paddle();
          this.particles.spark(ball.x, this.paddle.y, '#ffffff', 5);
        }
      }

      // Bricks: one hit per ball per step.
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        const side = circleRectSide(ball.x, ball.y, ball.r, brick);
        if (side !== null) {
          this.hitBrick(ball, brick, side);
          break;
        }
      }

      // Fell past the paddle.
      if (ball.y - ball.r > CANVAS_H) {
        this.loseBall(ball);
        if (this.state !== 'play') return;
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.update(dt);
      let dead = bolt.y < WALL_TOP - 20;
      if (!dead) {
        for (const brick of this.bricks) {
          if (!brick.alive) continue;
          if (bolt.x >= brick.x && bolt.x <= brick.x + brick.w && bolt.y >= brick.y && bolt.y <= brick.y + brick.h) {
            dead = true;
            if (brick.kind === 'steel') {
              this.sound.tough();
            } else {
              this.hitBrick({ vx: 0, vy: -1, x: bolt.x, y: bolt.y, r: 2 }, brick, 'bottom');
            }
            break;
          }
        }
      }
      if (dead) this.bolts.splice(i, 1);
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update(dt);
      if (p.caughtBy(this.paddle)) {
        this.applyPowerup(p.type);
        this.powerups.splice(i, 1);
      } else if (p.y > CANVAS_H + 20) {
        this.powerups.splice(i, 1);
      }
    }
  }

  /** One frame: consume input, step, draw. */
  frame(pressed, clicked) {
    // Global keys.
    if (pressed.has('m')) {
      this.sound.setMuted(!this.sound.muted);
    }
    if (pressed.has('p') || pressed.has('escape')) {
      if (this.state === 'play' || this.state === 'serve') {
        this.pausedFrom = this.state;
        this.state = 'paused';
      } else if (this.state === 'paused') {
        this.state = this.pausedFrom || 'play';
      }
    }
    if (pressed.has('r')) {
      if (this.state !== 'title') this.startRun();
    }

    const clickOn = (key) => {
      const b = this.buttons[key];
      return b && this.input.mouseX >= b.x && this.input.mouseX <= b.x + b.w && this.input.mouseY >= b.y && this.input.mouseY <= b.y + b.h;
    };

    switch (this.state) {
      case 'title': {
        if (clicked || pressed.has(' ') || pressed.has('enter')) {
          if (!clicked || clickOn('start')) this.startRun();
        }
        this.update(STEP);
        drawTitle(this.ctx, this);
        break;
      }
      case 'serve': {
        if (clicked || pressed.has(' ')) this.launch();
        this.update(STEP);
        drawServe(this.ctx, this);
        break;
      }
      case 'play': {
        if (clicked || pressed.has(' ')) this.fireLaser();
        this.update(STEP);
        drawGame(this.ctx, this);
        break;
      }
      case 'paused': {
        if (clicked || pressed.has('p') || pressed.has('escape') || pressed.has(' ')) {
          this.state = this.pausedFrom || 'play';
        }
        drawPaused(this.ctx, this);
        break;
      }
      case 'clear': {
        this.particles.update(STEP);
        if ((clicked && clickOn('next')) || pressed.has(' ') || pressed.has('enter')) {
          this.nextLevel();
          if (this.state === 'serve') drawServe(this.ctx, this);
          else if (this.state === 'victory') drawVictory(this.ctx, this);
          else drawClear(this.ctx, this);
          break;
        }
        drawClear(this.ctx, this);
        break;
      }
      case 'victory': {
        this.particles.update(STEP);
        if ((clicked && clickOn('again')) || pressed.has(' ') || pressed.has('enter')) {
          this.startRun();
          drawServe(this.ctx, this);
          break;
        }
        drawVictory(this.ctx, this);
        break;
      }
      case 'gameover': {
        this.particles.update(STEP);
        if ((clicked && clickOn('again')) || pressed.has(' ') || pressed.has('enter')) {
          this.startRun();
          drawServe(this.ctx, this);
          break;
        }
        drawGameOver(this.ctx, this);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Stage a deterministic screenshot scene (?shot=title|play|clear|victory)
   * with a seeded RNG and fixed simulated time, render one frame and stop.
   * No wall clock, no user input: the same seed renders the same frame.
   */
  stageShot(scene, seed) {
    this.rng = makeRng(seed);
    // Victory is staged on the final level, so the HUD behind the overlay
    // reads LEVEL 3 with no prisms left, not a fresh level 1.
    this.loadLevel(scene === 'victory' ? 2 : 0, true);
    this.time = 12.4;
    if (scene === 'title') {
      this.state = 'title';
      this.best = 8450;
      drawTitle(this.ctx, this);
    } else if (scene === 'play') {
      this.state = 'play';
      this.score = 3450;
      this.combo = 14;
      this.bestCombo = 14;
      this.lives = 3;
      this.levelTime = 32;
      // Break a natural-looking cluster of bricks.
      let broken = 0;
      for (const b of this.bricks) {
        if (b.kind === 'normal' && this.rng() < 0.42 && broken < 22) {
          b.alive = false;
          broken += 1;
        }
      }
      this.bricksLeft -= broken;
      this.brokenCount = broken;
      this.paddle.x = 600;
      const speed = this.ballSpeed();
      this.balls = [
        { x: 512, y: 470, vx: speed * 0.55, vy: -speed * 0.83, r: BALL_R, trail: this.trailFor(512, 470, speed * 0.55, -speed * 0.83), stuck: false },
        { x: 768, y: 380, vx: -speed * 0.7, vy: -speed * 0.7, r: BALL_R, trail: this.trailFor(768, 380, -speed * 0.7, -speed * 0.7), stuck: false },
      ];
      this.powerups.push(new Powerup(700, 300, 'M'));
      this.particles.burst(420, 190, '#ff8a5c', 12);
      this.particles.burst(860, 150, '#ffc53d', 10);
      this.particles.popup(420, 170, '+100', '#ffffff');
      this.particles.popup(860, 130, '+100', '#ffffff');
      drawGame(this.ctx, this);
    } else if (scene === 'clear') {
      this.state = 'clear';
      this.score = 4200;
      this.bricksLeft = 0;
      for (const b of this.bricks) b.alive = false;
      this.clearStats = { score: 4200, time: 48, accuracy: 82, bricks: 46, bestCombo: 3, bonus: 700 };
      this.particles.rain(60, [this.level.accent, '#ffd23d', '#ffffff', '#ff5d8f']);
      for (const c of this.particles.confetti) c.y = 40 + this.rng() * 420;
      drawClear(this.ctx, this);
    } else if (scene === 'victory') {
      this.state = 'victory';
      this.score = 15800;
      this.best = 15800;
      this.stars = 3;
      this.totalTime = 214;
      this.bricksLeft = 0;
      this.particles.rain(80, ['#ffd23d', '#ff5d8f', '#4cc9f0', '#7ee787', '#ffffff']);
      for (const c of this.particles.confetti) c.y = 30 + this.rng() * 500;
      drawVictory(this.ctx, this);
    } else {
      this.state = 'title';
      drawTitle(this.ctx, this);
    }
    window.__shotReady = true;
  }

  /** A fake motion trail behind a staged ball, for the play screenshot. */
  trailFor(x, y, vx, vy) {
    const trail = [];
    for (let i = 8; i >= 1; i--) {
      trail.push({ x: x - vx * 0.016 * i, y: y - vy * 0.016 * i });
    }
    return trail;
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__game = game;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || 7);
    game.stageShot(shot, seed);
    return;
  }
  let acc = 0;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    // Consume input only on a frame that actually steps the game. On a
    // display above 60 Hz (or with an uncapped frame rate) most animation
    // frames accumulate less than one step; consuming the pressed keys on
    // those frames would swallow the press before any step ever saw it.
    if (acc < STEP) {
      requestAnimationFrame(loop);
      return;
    }
    const pressed = game.input.consumePressed();
    const clicked = game.input.clicked;
    game.input.clicked = false;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      // Input is handled once per animation frame, on the first step only,
      // so one press never fires twice across the steps of the same frame.
      if (guard === 0) game.frame(pressed, clicked);
      else game.frame(new Set(), false);
      acc -= STEP;
      guard++;
    }
    if (guard === 5) acc = 0;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', boot);
