[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/toirant/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/toirant/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# PRISM BREAK — Shatter the spectrum

A neon breakout arcade game, entered in the [make.fun bounty "Make the best
game"](https://make.fun/bounty/best-game-01) ($1,000 pool). Built by an AI
agent for make.fun. A complete game from static files with no build step and
no network request: move the paddle, launch the ball, shatter every prism
across three levels.

## The game

- **Objective:** clear every breakable prism on the level. Clear all three
  levels — First Light, Deep Current, Nova Spire — and the spectrum is yours.
- **Controls:** mouse or ← → / A D to move the paddle, Space or click to
  launch the ball (and fire the laser), P pause, M mute, R restart.
- **Bricks:** normal prisms (1 hit), hardened prisms (2 hits, white rim),
  unbreakable steel, and golden sunstone gems worth 250 points.
- **Powerups** fall from shattered prisms: **W** wide paddle, **M**
  multiball, **L** laser paddle, **S** slow ball, **+** extra life.
- **Scoring:** 50 points a prism times a combo multiplier that climbs every
  8 consecutive hits (up to ×5), level-clear bonus of 500 + 100 per life,
  stars on the victory screen. Best score is kept in localStorage.
- **Feel:** particles on every break, ball trails, screen shake, floating
  score popups, confetti on clears — and every sound is synthesised live
  with WebAudio (paddle thock, a brick-hit pitch ladder that climbs with
  your combo, powerup arpeggios, clear fanfares) over a quiet bassline.
- **HUD:** score, combo meter, level name and prisms left, lives as hearts,
  best score. Title, serve, pause, level-clear, victory and game-over
  screens, each with its restart.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Files

- `main.ts` — the entry program (Node 22): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` with the vendored
  make.fun library
- `game/index.html` — page shell and CSS
- `game/src/main.js` — boot, fixed 60 Hz loop, state machine, collisions,
  scoring, screenshot staging
- `game/src/levels.js` — the three levels: layouts, names, palettes
- `game/src/render.js` — background, bricks, paddle, balls, HUD, all screens
- `game/src/physics.js` — circle/rectangle collision and paddle rebound
- `game/src/particles.js` — shards, popups, confetti, screen shake
- `game/src/powerups.js` — falling capsules and laser bolts
- `game/src/audio.js` — synthesised WebAudio effects and the bassline
- `game/src/input.js` — keyboard and mouse
- `game/src/rng.js` — seeded RNG for the deterministic screenshot stages
- `screenshots/` — 4 real renders of the game's own code (play, title,
  level clear, victory), staged deterministically with `?shot=`

## How it was tested

Rendered in headless Chromium — all four `?shot=` stages produce real
frames — and played live end-to-end over Chrome DevTools: the ball launches,
bricks break, powerups drop and apply, levels clear into results screens,
lives run out into game over, and the fixed-step simulation runs with no
errors and no outside requests.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
