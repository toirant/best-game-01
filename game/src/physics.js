/**
 * physics.js — the pure collision helpers for PRISM BREAK. The ball is a
 * circle; bricks and the paddle are rectangles. Nothing here touches the DOM
 * or the game state, so the shot stager can reuse it for scripted play.
 */

/** Clamp a value into [min, max]. */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Which side of a rectangle a circle overlaps, from the closest point on the
 * rectangle to the circle's centre: 'top' | 'bottom' | 'left' | 'right', or
 * null when they do not touch. A corner hit reports the axis with the deeper
 * penetration, which keeps the ball from tunnelling through brick corners.
 */
export function circleRectSide(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  if (dx * dx + dy * dy > r * r) return null;
  // Inside the rectangle: push out along the shallowest axis.
  if (dx === 0 && dy === 0) {
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const m = Math.min(left, right, top, bottom);
    if (m === top) return 'top';
    if (m === bottom) return 'bottom';
    if (m === left) return 'left';
    return 'right';
  }
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

/** Reflect a velocity off a side: horizontal sides flip vy, vertical flip vx. */
export function reflect(vx, vy, side) {
  if (side === 'top' || side === 'bottom') return [vx, -vy];
  if (side === 'left' || side === 'right') return [-vx, vy];
  return [vx, vy];
}

/**
 * The rebound angle off the paddle: where the ball strikes across the paddle
 * steers it, from -60 degrees at the left edge to +60 at the right. A flat
 * centre hit goes straight up, so the player always has a safe return.
 */
export function paddleRebound(ballX, paddle, speed) {
  const t = clamp((ballX - paddle.x) / paddle.w, 0, 1);
  const angle = (t - 0.5) * 2 * (Math.PI / 3);
  return [Math.sin(angle) * speed, -Math.cos(angle) * speed];
}
