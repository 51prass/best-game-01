// The wave director: what the dark sends, and when. Waves 1..10 follow the fixed table
// in config; past wave 10 the night is endless, and each wave grows from the last by a
// formula instead. A wave is a shuffled queue of creatures with a spawn timer between
// them; the wave is over when the queue is empty and nothing is left alive.

import { LAST_WAVE, SPAWN, WAVES } from './config.js';

const WAVE_TYPES = ['crawler', 'skitterer', 'brute', 'splitter'];

/** The composition of wave `n`: the table for 1..10, a growing mix past that. */
export function waveComposition(n) {
  if (n <= LAST_WAVE) return { ...WAVES[n - 1] };
  const extra = n - LAST_WAVE;
  return {
    crawler: 20 + extra * 3,
    skitterer: 16 + extra * 2,
    brute: 6 + extra,
    splitter: 8 + extra,
  };
}

/** Seconds between spawns on wave `n`. */
export function spawnInterval(n) {
  return Math.max(SPAWN.min, SPAWN.first - SPAWN.perWave * (n - 1));
}

/** Build the spawn queue for wave `n`: a shuffled list of creature types. */
export function buildSpawnQueue(n, rng) {
  const comp = waveComposition(n);
  const queue = [];
  for (const type of WAVE_TYPES) {
    for (let i = 0; i < (comp[type] ?? 0); i += 1) queue.push(type);
  }
  // Shuffle, but keep the first spawn a crawler so the wave opens gently.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  const firstCrawler = queue.indexOf('crawler');
  if (firstCrawler > 0) {
    queue.splice(firstCrawler, 1);
    queue.unshift('crawler');
  }
  return queue;
}

/** Total creatures in wave `n` (for the HUD's remaining count). */
export function waveTotal(n) {
  const comp = waveComposition(n);
  return WAVE_TYPES.reduce((sum, type) => sum + (comp[type] ?? 0), 0);
}
