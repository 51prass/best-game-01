// The four upgrades, bought with light shards between waves. Levels live on the state
// (state.levels[id]); the costs and caps live in config. Buying applies the effect to the
// state's beam numbers at once, so nothing else has to look a level up.

import { UPGRADES } from './config.js';

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}

/** The shard cost of the next level of `id`, or null when it is already maxed. */
export function nextCost(state, id) {
  const def = upgradeById(id);
  if (!def) return null;
  const level = state.levels[id] ?? 0;
  if (level >= def.max) return null;
  return def.costs[level];
}

/** Can the keeper afford the next level of `id` right now? */
export function canBuy(state, id) {
  const cost = nextCost(state, id);
  return cost !== null && state.shards >= cost;
}

/** Buy the next level of `id`: spend the shards, raise the level, apply the effect. */
export function buyUpgrade(state, id) {
  const def = upgradeById(id);
  const cost = nextCost(state, id);
  if (!def || cost === null || state.shards < cost) return false;
  state.shards -= cost;
  state.levels[id] = (state.levels[id] ?? 0) + 1;
  if (id === 'wide') state.beamHalf += 0.045;
  if (id === 'power') state.beamDps *= 1.3;
  if (id === 'sink') state.coolRate *= 1.45;
  if (id === 'heart') {
    state.maxHearts += 1;
    state.hearts = Math.min(state.maxHearts, state.hearts + 1);
  }
  return true;
}

/** Every upgrade with its current level, next cost and affordability, for the shop UI. */
export function shopList(state) {
  return UPGRADES.map((def) => {
    const level = state.levels[def.id] ?? 0;
    return {
      def,
      level,
      maxed: level >= def.max,
      cost: level >= def.max ? null : def.costs[level],
      affordable: level < def.max && state.shards >= def.costs[level],
    };
  });
}
