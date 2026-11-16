// A small seeded random source (mulberry32) so a seed always replays the same night:
// the same spawns, the same wobble, the same stars. The live game seeds from the clock;
// the screenshot scenes seed from a fixed number.

export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    /** A float in [0, 1). */
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * this.next();
    },
    /** A random integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    /** One element of an array, picked uniformly. */
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
