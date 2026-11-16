// Every tuning number, colour and wave in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on the
// screen size. The lighthouse lamp sits at the top of the tower; creatures crawl in from
// the dark water at the field's edges and walk toward the island's heart.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lamp the beam fires from, and the island heart creatures must not reach. */
export const LAMP = { x: 640, y: 452 };
export const HEART = { x: 640, y: 560, radius: 58 };
export const ISLAND = { x: 640, y: 622, rx: 168, ry: 58 };

export const HEARTS_START = 3;
export const HEARTS_MAX = 5;

/** Seconds of grace after a breach during which no other breach can cost a heart. */
export const BREACH_GRACE = 0.7;

export const BEAM = {
  /** How far the light reaches, in pixels. */
  range: 980,
  /** Half-angle of the beam cone, in radians, before upgrades. */
  halfAngle: 0.14,
  /** Damage per second a creature takes while inside the beam. */
  damagePerSecond: 70,
  /** Heat gained per second of firing, and lost per second of rest. */
  heatPerSecond: 36,
  coolPerSecond: 58,
  /** Heat at which the lamp overheats, and the heat it must fall to before firing again. */
  overheatAt: 100,
  rearmAt: 28,
};

export const CREATURE_TYPES = {
  crawler: {
    name: 'Crawler', radius: 15, hp: 30, speed: 52, score: 50, shards: 1,
    body: '#1d2739', rim: '#31405c', eye: '#ff6b5e', wobble: 0.35,
  },
  skitterer: {
    name: 'Skitterer', radius: 11, hp: 16, speed: 128, score: 80, shards: 1,
    body: '#241f33', rim: '#3d3357', eye: '#8df59a', wobble: 1.6,
  },
  brute: {
    name: 'Brute', radius: 26, hp: 150, speed: 30, score: 200, shards: 4,
    body: '#2a2230', rim: '#4a3a52', eye: '#ffb347', wobble: 0.12,
  },
  splitter: {
    name: 'Splitter', radius: 18, hp: 42, speed: 68, score: 120, shards: 2,
    body: '#1c2b2e', rim: '#33544e', eye: '#7fe3d0', wobble: 0.5,
  },
  wisp: {
    name: 'Wisp', radius: 9, hp: 10, speed: 106, score: 30, shards: 0,
    body: '#232338', rim: '#3a3a5e', eye: '#c9a7ff', wobble: 1.1,
  },
};

/** Wave 1..10, in order: how many of each creature the dark sends. */
export const WAVES = [
  { crawler: 6, skitterer: 0, brute: 0, splitter: 0 },
  { crawler: 8, skitterer: 2, brute: 0, splitter: 0 },
  { crawler: 10, skitterer: 4, brute: 0, splitter: 0 },
  { crawler: 8, skitterer: 6, brute: 0, splitter: 1 },
  { crawler: 12, skitterer: 6, brute: 1, splitter: 2 },
  { crawler: 10, skitterer: 8, brute: 2, splitter: 3 },
  { crawler: 14, skitterer: 10, brute: 3, splitter: 3 },
  { crawler: 12, skitterer: 12, brute: 4, splitter: 5 },
  { crawler: 16, skitterer: 14, brute: 5, splitter: 6 },
  { crawler: 20, skitterer: 16, brute: 6, splitter: 8 },
];

export const LAST_WAVE = WAVES.length;

/** Seconds between spawns at wave 1, shrinking each wave, never below the floor. */
export const SPAWN = { first: 1.15, perWave: 0.06, min: 0.34 };

/** Upgrades bought with light shards between waves. Costs are per level, in shards. */
export const UPGRADES = [
  {
    id: 'wide', key: '1', name: 'Wider Beam', max: 3, costs: [12, 22, 36],
    desc: 'The beam cone opens wider, catching more of the dark at once.',
  },
  {
    id: 'power', key: '2', name: 'Burning Light', max: 3, costs: [12, 24, 40],
    desc: 'The light burns hotter: +30% damage to everything it touches.',
  },
  {
    id: 'sink', key: '3', name: 'Heat Sink', max: 3, costs: [10, 20, 32],
    desc: 'The lamp cools 45% faster, so the beam stays lit longer.',
  },
  {
    id: 'heart', key: '4', name: 'Extra Heart', max: 2, costs: [25, 40],
    desc: 'A spare ember for the lighthouse: +1 heart, now and at most.',
  },
];

export const PALETTE = {
  skyTop: '#04081a',
  skyBottom: '#0a1830',
  seaTop: '#0a1c33',
  seaBottom: '#04101f',
  moon: '#e9edf6',
  moonGlow: 'rgba(233, 237, 246, 0.16)',
  rock: '#141a26',
  rockRim: '#2c3850',
  tower: '#e8ddc4',
  towerShade: '#b8ab8d',
  towerBand: '#8a2f2a',
  roof: '#232c3d',
  lampGlow: '#ffd76a',
  beam: 'rgba(255, 215, 106, 0.34)',
  beamCore: 'rgba(255, 236, 170, 0.75)',
  shard: '#ffd76a',
  text: '#f2ead8',
  muted: '#93a3bd',
  panel: 'rgba(6, 14, 28, 0.86)',
  panelEdge: '#2c3850',
  heart: '#ff5d6c',
  heartEmpty: '#3a2430',
  danger: '#ff5d6c',
  good: '#8df59a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-keeper.best';
