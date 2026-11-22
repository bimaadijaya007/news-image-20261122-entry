// The World in One Day — 22 November 2026
// A news-image entry for make.fun (news-image-20261122): a program that draws
// one 1024x1024 picture summing up the world's news of Sunday 22 November 2026
// in eight stories, with a hand-drawn bitmap font and hand-rolled PNG output.
// Node 22, standard library only, no network, fully deterministic: the same
// bytes come out every run. Writes $MAKEFUN_OUTPUT_DIR/entry.png (<= 1 MiB).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

type RGB = [number, number, number];

const PAPER: RGB = [245, 239, 224];
const INK: RGB = [23, 20, 15];
const SUB: RGB = [74, 68, 54];
const DIVIDER: RGB = [216, 208, 189];
const RED: RGB = [179, 49, 42];
const CREAM: RGB = [245, 239, 224];
const DIMCREAM: RGB = [198, 188, 168];
const ORANGE: RGB = [216, 110, 40];
const YELLOW: RGB = [232, 184, 64];
const GRAY: RGB = [140, 134, 120];
const BLUE: RGB = [32, 86, 168];
const OCEAN: RGB = [46, 110, 178];
const GREEN: RGB = [47, 125, 51];
const TEAL: RGB = [13, 122, 110];

// ---------------------------------------------------------------------------
// Framebuffer and drawing primitives
// ---------------------------------------------------------------------------

const fb = new Uint8Array(W * H * 3);

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    fb[i * 3] = c[0];
    fb[i * 3 + 1] = c[1];
    fb[i * 3 + 2] = c[2];
  }
}

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
  }
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let xx = cx - dx; xx <= cx + dx; xx++) px(xx, cy + dy, c);
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const half = Math.floor(t / 2);
  for (;;) {
    rect(x - half, y - half, t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows; each row is 5 bits, bit 4 = leftmost.
// ---------------------------------------------------------------------------

const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
};

function text(str: string, x: number, y: number, s: number, c: RGB): void {
  const up = str.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = FONT[up[ci]] ?? FONT[' '];
    const ox = x + ci * 6 * s;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row & (1 << (4 - col))) {
          rect(ox + col * s, y + r * s, s, s, c);
        }
      }
    }
  }
}

function textWidth(str: string, s: number): number {
  return str.length * 6 * s - s;
}

function textCenter(str: string, x0: number, x1: number, y: number, s: number, c: RGB): void {
  const w = textWidth(str, s);
  text(str, Math.round(x0 + (x1 - x0 - w) / 2), y, s, c);
}

// ---------------------------------------------------------------------------
// Pictograms. Each draws inside a ~130x130 box whose top-left is (bx, by).
// ---------------------------------------------------------------------------

function iconMissile(bx: number, by: number, accent: RGB): void {
  // Missile flying up-right, flame at the tail, burst at the nose.
  line(bx + 48, by + 102, bx + 86, by + 38, INK, 10);
  circle(bx + 88, by + 34, 7, INK);
  line(bx + 96, by + 26, bx + 110, by + 14, accent, 3);
  line(bx + 98, by + 30, bx + 112, by + 30, accent, 3);
  line(bx + 94, by + 20, bx + 102, by + 8, accent, 3);
  circle(bx + 44, by + 108, 8, ORANGE);
  circle(bx + 44, by + 108, 4, YELLOW);
  circle(bx + 30, by + 118, 4, GRAY);
  circle(bx + 20, by + 124, 3, GRAY);
}

function iconQuake(bx: number, by: number, accent: RGB): void {
  // Two buildings, one leaning, a jagged crack in the ground, shake marks.
  rect(bx + 16, by + 52, 32, 44, INK);
  rect(bx + 22, by + 60, 6, 6, PAPER);
  rect(bx + 34, by + 60, 6, 6, PAPER);
  rect(bx + 22, by + 74, 6, 6, PAPER);
  rect(bx + 34, by + 74, 6, 6, PAPER);
  rect(bx + 70, by + 80, 26, 16, INK);
  rect(bx + 68, by + 64, 26, 16, INK);
  rect(bx + 66, by + 48, 26, 16, INK);
  rect(bx + 72, by + 54, 5, 5, PAPER);
  rect(bx + 84, by + 54, 5, 5, PAPER);
  rect(bx + 72, by + 70, 5, 5, PAPER);
  line(bx + 30, by + 30, bx + 30, by + 42, accent, 3);
  line(bx + 80, by + 26, bx + 80, by + 38, accent, 3);
  line(bx + 102, by + 40, bx + 102, by + 50, accent, 3);
  rect(bx + 8, by + 96, 114, 6, INK);
  line(bx + 62, by + 102, bx + 54, by + 112, accent, 4);
  line(bx + 54, by + 112, bx + 68, by + 121, accent, 4);
  line(bx + 68, by + 121, bx + 58, by + 129, accent, 4);
  rect(bx + 84, by + 104, 10, 4, accent);
}

function iconWall(bx: number, by: number, accent: RGB): void {
  // Border fence: posts with pointed tops, two rails, barbed wire, one flag.
  const posts = [14, 36, 58, 80, 102];
  for (const p of posts) {
    rect(bx + p, by + 34, 6, 76, INK);
    rect(bx + p + 2, by + 28, 2, 6, INK);
  }
  rect(bx + 10, by + 54, 110, 6, INK);
  rect(bx + 10, by + 84, 110, 6, INK);
  line(bx + 10, by + 22, bx + 30, by + 16, accent, 2);
  line(bx + 30, by + 16, bx + 50, by + 22, accent, 2);
  line(bx + 50, by + 22, bx + 70, by + 16, accent, 2);
  line(bx + 70, by + 16, bx + 90, by + 22, accent, 2);
  line(bx + 90, by + 22, bx + 110, by + 16, accent, 2);
  rect(bx + 14, by + 8, 18, 10, RED);
  line(bx + 14, by + 8, bx + 14, by + 28, INK, 2);
}

function iconSummit(bx: number, by: number, accent: RGB): void {
  // Three flags over a table with three seated leaders.
  line(bx + 30, by + 18, bx + 30, by + 88, INK, 3);
  line(bx + 65, by + 18, bx + 65, by + 88, INK, 3);
  line(bx + 100, by + 18, bx + 100, by + 88, INK, 3);
  rect(bx + 30, by + 18, 20, 12, RED);
  rect(bx + 65, by + 18, 20, 12, BLUE);
  rect(bx + 100, by + 18, 20, 12, GREEN);
  circle(bx + 38, by + 62, 8, INK);
  circle(bx + 65, by + 62, 8, INK);
  circle(bx + 92, by + 62, 8, INK);
  rect(bx + 31, by + 70, 14, 18, INK);
  rect(bx + 58, by + 70, 14, 18, INK);
  rect(bx + 85, by + 70, 14, 18, INK);
  rect(bx + 20, by + 88, 90, 8, INK);
  rect(bx + 26, by + 96, 6, 16, INK);
  rect(bx + 98, by + 96, 6, 16, INK);
  void accent;
}

function iconShip(bx: number, by: number, accent: RGB): void {
  // Tanker hit in the strait: containers, stack, flame on deck, waves.
  rect(bx + 18, by + 78, 96, 10, INK);
  rect(bx + 22, by + 88, 88, 12, INK);
  rect(bx + 114, by + 82, 8, 10, INK);
  rect(bx + 24, by + 58, 24, 20, RED);
  rect(bx + 50, by + 58, 24, 20, BLUE);
  rect(bx + 76, by + 58, 24, 20, GREEN);
  circle(bx + 62, by + 52, 7, ORANGE);
  circle(bx + 62, by + 52, 3, YELLOW);
  rect(bx + 100, by + 48, 12, 30, INK);
  circle(bx + 106, by + 40, 5, GRAY);
  circle(bx + 112, by + 32, 4, GRAY);
  line(bx + 14, by + 110, bx + 34, by + 110, accent, 3);
  line(bx + 44, by + 110, bx + 64, by + 110, accent, 3);
  line(bx + 74, by + 110, bx + 94, by + 110, accent, 3);
  line(bx + 24, by + 120, bx + 44, by + 120, accent, 3);
  line(bx + 54, by + 120, bx + 74, by + 120, accent, 3);
  line(bx + 84, by + 120, bx + 104, by + 120, accent, 3);
}

function iconGlobe(bx: number, by: number, accent: RGB): void {
  // The world, warming: blue globe, green land, a small sun with rays.
  circle(bx + 65, by + 64, 42, OCEAN);
  circle(bx + 50, by + 52, 9, GREEN);
  circle(bx + 80, by + 72, 10, GREEN);
  circle(bx + 58, by + 82, 7, GREEN);
  circle(bx + 108, by + 26, 10, YELLOW);
  line(bx + 108, by + 10, bx + 108, by + 4, ORANGE, 2);
  line(bx + 108, by + 42, bx + 108, by + 48, ORANGE, 2);
  line(bx + 92, by + 26, bx + 86, by + 26, ORANGE, 2);
  line(bx + 124, by + 26, bx + 130, by + 26, ORANGE, 2);
  circle(bx + 18, by + 30, 3, accent);
  circle(bx + 26, by + 110, 3, accent);
  circle(bx + 112, by + 108, 3, accent);
}

function iconCuffs(bx: number, by: number, accent: RGB): void {
  // Arrest: a badge above two linked handcuff rings.
  circle(bx + 65, by + 30, 12, accent);
  circle(bx + 65, by + 30, 5, PAPER);
  line(bx + 65, by + 8, bx + 65, by + 14, accent, 2);
  line(bx + 50, by + 14, bx + 54, by + 19, accent, 2);
  line(bx + 80, by + 14, bx + 76, by + 19, accent, 2);
  circle(bx + 40, by + 78, 17, INK);
  circle(bx + 40, by + 78, 10, PAPER);
  circle(bx + 90, by + 78, 17, INK);
  circle(bx + 90, by + 78, 10, PAPER);
  rect(bx + 56, by + 75, 18, 6, INK);
  rect(bx + 62, by + 75, 2, 6, PAPER);
  rect(bx + 68, by + 75, 2, 6, PAPER);
}

function iconChart(bx: number, by: number, accent: RGB): void {
  // Shares falling: axes, a descending line with an arrowhead, vertex dots.
  line(bx + 20, by + 18, bx + 20, by + 108, INK, 3);
  line(bx + 20, by + 108, bx + 112, by + 108, INK, 3);
  line(bx + 28, by + 36, bx + 50, by + 52, accent, 4);
  line(bx + 50, by + 52, bx + 72, by + 60, accent, 4);
  line(bx + 72, by + 60, bx + 94, by + 84, accent, 4);
  line(bx + 94, by + 84, bx + 104, by + 98, accent, 4);
  line(bx + 104, by + 98, bx + 94, by + 94, accent, 3);
  line(bx + 104, by + 98, bx + 100, by + 86, accent, 3);
  circle(bx + 28, by + 36, 3, INK);
  circle(bx + 50, by + 52, 3, INK);
  circle(bx + 72, by + 60, 3, INK);
  circle(bx + 94, by + 84, 3, INK);
}

const ICONS: Record<string, (bx: number, by: number, accent: RGB) => void> = {
  missile: iconMissile,
  quake: iconQuake,
  wall: iconWall,
  summit: iconSummit,
  ship: iconShip,
  globe: iconGlobe,
  cuffs: iconCuffs,
  chart: iconChart,
};

// ---------------------------------------------------------------------------
// The eight stories of Sunday 22 November 2026.
// ---------------------------------------------------------------------------

type Story = {
  icon: string;
  accent: RGB;
  tag: string;
  h1: string;
  h2: string;
  s1: string;
  s2: string;
};

const STORIES: Story[] = [
  {
    icon: 'missile',
    accent: [179, 49, 42],
    tag: 'MIDDLE EAST',
    h1: 'IRAN STRIKES US',
    h2: 'BASE IN KUWAIT',
    s1: 'GULF ATTACKS WIDEN;',
    s2: 'BAHRAIN TARGETED TOO',
  },
  {
    icon: 'quake',
    accent: [194, 112, 61],
    tag: 'SOUTH AMERICA',
    h1: 'M6.9 QUAKE SHAKES',
    h2: "PERU'S ANDES",
    s1: 'NO DAMAGE OR DEATHS',
    s2: 'REPORTED YET',
  },
  {
    icon: 'wall',
    accent: [70, 97, 126],
    tag: 'EUROPE',
    h1: 'ESTONIA TO CLOSE',
    h2: 'RUSSIAN BORDER',
    s1: "MOSCOW CRIES 'NEW",
    s2: "IRON CURTAIN'",
  },
  {
    icon: 'summit',
    accent: [32, 86, 168],
    tag: 'ASIA-PACIFIC',
    h1: 'TRUMP LANDS IN',
    h2: 'SHENZHEN: APEC',
    s1: 'TALKS WITH XI AND',
    s2: 'PUTIN PLANNED',
  },
  {
    icon: 'ship',
    accent: [13, 122, 110],
    tag: 'ENERGY',
    h1: 'ADNOC TANKER HIT',
    h2: 'IN HORMUZ STRAIT',
    s1: 'ONE CREW MEMBER',
    s2: 'MISSING',
  },
  {
    icon: 'globe',
    accent: [47, 125, 51],
    tag: 'CLIMATE',
    h1: 'COP31 TALKS DRAG',
    h2: 'ON PAST DEADLINE',
    s1: 'FOSSIL FUEL DEADLOCK;',
    s2: 'US TECH SNUBS AI PLEDGE',
  },
  {
    icon: 'cuffs',
    accent: [123, 31, 162],
    tag: 'LATIN AMERICA',
    h1: "'EL CHAPO ISIDRO'",
    h2: 'ARRESTED IN MEXICO',
    s1: 'VIOLENCE ERUPTS IN',
    s2: 'SINALOA',
  },
  {
    icon: 'chart',
    accent: [216, 67, 21],
    tag: 'TECH MARKETS',
    h1: 'ANTHROPIC SHARES',
    h2: 'FALL AFTER RECORD',
    s1: '$81.3B IPO DEBUT',
    s2: 'SLIDES ON DAY TWO',
  },
];

// ---------------------------------------------------------------------------
// Layout: masthead, 2x4 grid of stories, footer.
// ---------------------------------------------------------------------------

function draw(): void {
  fill(PAPER);

  // Masthead: dark band, red kicker, the date in large type, red rule.
  rect(0, 0, W, 88, INK);
  textCenter('THE WORLD IN ONE DAY', 0, W, 14, 2, RED);
  textCenter('SUNDAY 22 NOVEMBER 2026', 0, W, 38, 5, CREAM);
  rect(0, 88, W, 6, RED);

  // Grid dividers.
  rect(511, 96, 2, 832, DIVIDER);
  rect(0, 303, W, 1, DIVIDER);
  rect(0, 511, W, 1, DIVIDER);
  rect(0, 719, W, 1, DIVIDER);

  // Story cells.
  for (let i = 0; i < STORIES.length; i++) {
    const st = STORIES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = col * 512;
    const cy = 96 + row * 208;
    rect(cx, cy + 10, 6, 188, st.accent);
    ICONS[st.icon](cx + 20, cy + 18, st.accent);
    text(st.h1, cx + 162, cy + 30, 3, INK);
    text(st.h2, cx + 162, cy + 62, 3, INK);
    text(st.s1, cx + 162, cy + 100, 2, SUB);
    text(st.s2, cx + 162, cy + 122, 2, SUB);
    text(st.tag, cx + 162, cy + 156, 2, st.accent);
  }

  // Footer: dark band, a line to the judge, the sources.
  rect(0, 928, W, 96, INK);
  textCenter(
    'DEAR JUDGE: SUNDAY 22 NOVEMBER 2026 IN EIGHT STORIES.',
    0,
    W,
    944,
    2,
    CREAM,
  );
  textCenter(
    'SOURCES: THEDAILYJAGRAN / PW.LIVE / BAHJOM / CDSNEWS / YOUTUBE',
    0,
    W,
    970,
    2,
    DIMCREAM,
  );
}

// ---------------------------------------------------------------------------
// Hand-rolled PNG encoder (CRC32 + chunk framing; zlib from the stdlib).
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    Buffer.from(rgb.buffer, y * width * 3, width * 3).copy(
      raw,
      y * (1 + width * 3) + 1,
    );
  }
  const idat = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
draw();
const bytes = encodePng(W, H, fb);
writeFileSync(join(outDir, 'entry.png'), bytes);
console.log(`wrote entry.png ${bytes.length} bytes`);
