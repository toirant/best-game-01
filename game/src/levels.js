/**
 * levels.js — the three levels of PRISM BREAK: their brick layouts, names and
 * palettes. One character per brick in each row string:
 *   '.' empty        '1' prism brick (1 hit)   '2' hardened brick (2 hits)
 *   '3' steel brick (unbreakable)              '4' sunstone gem (bonus points)
 */

export const LEVELS = [
  {
    name: 'FIRST LIGHT',
    subtitle: 'Warm up — shatter every prism',
    // 8 rows x 10 columns, a gentle chevron that teaches the bounce.
    grid: [
      '..........',
      '.11111111.',
      '.11111111.',
      '..111111..',
      '..111111..',
      '...1111...',
      '...1441...',
      '..........',
    ],
    // Row colours, top to bottom (rows without bricks reuse the last colour).
    rowColors: ['#ff5d8f', '#ff8a5c', '#ffc53d', '#7ee787', '#4cc9f0'],
    accent: '#ff8a5c',
    glow: '#ff5d8f',
    ballSpeed: 430,
  },
  {
    name: 'DEEP CURRENT',
    subtitle: 'Steel in the stream — go around it',
    // 9 rows x 11 columns, steel ribs with gem pockets.
    grid: [
      '...........',
      '.111111111.',
      '.122222221.',
      '.131111131.',
      '..1114111..',
      '..1111111..',
      '...12221...',
      '...11111...',
      '...........',
    ],
    rowColors: ['#4cc9f0', '#43e8d8', '#7ee787', '#b8f135', '#4cc9f0'],
    accent: '#43e8d8',
    glow: '#4cc9f0',
    ballSpeed: 470,
  },
  {
    name: 'NOVA SPIRE',
    subtitle: 'The spire falls only from the top',
    // 10 rows x 12 columns, a diamond spire of hardened brick around a gem core.
    grid: [
      '............',
      '.....11.....',
      '....1221....',
      '...122221...',
      '..12244221..',
      '..12222221..',
      '.11122222111.',
      '.11111111111.',
      '.31111111113.',
      '............',
    ],
    rowColors: ['#b5179e', '#c77dff', '#7b2fbe', '#ff5d8f', '#e0aaff'],
    accent: '#c77dff',
    glow: '#b5179e',
    ballSpeed: 510,
  },
];

/** How many breakable bricks a level holds (steel excluded). */
export function breakableCount(level) {
  let n = 0;
  for (const row of level.grid) {
    for (const ch of row) {
      if (ch === '1' || ch === '2' || ch === '4') n++;
    }
  }
  return n;
}
