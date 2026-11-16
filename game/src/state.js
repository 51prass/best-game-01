// The game state and its one step: everything the night does in 1/60 s. The state holds
// the wave, the creatures, the shards, the beam and its heat, the hearts and the score;
// stepState moves it all forward and reports the events the main loop turns into sound
// and screen changes. The renderer only reads this state, never writes it.

import {
  BEAM, BREACH_GRACE, FIELD, HEART, HEARTS_MAX, HEARTS_START, LAMP, LAST_WAVE,
} from './config.js';
import {
  createBurst, createCreature, createFloater, createShard, damageCreature,
  reachedHeart, spawnPoint, updateCreature, updateFloaters, updateShard,
  updateSparks,
} from './entities.js';
import { buildSpawnQueue, spawnInterval, waveTotal } from './waves.js';
import { buyUpgrade } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export const EVENT_KILL = 1;
export const EVENT_BREACH = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_SHARD = 32;

/** A fresh night: wave 1 unstarted, three hearts, an un-upgraded lamp. */
export function createState(rng) {
  const state = {
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    wave: 0,
    score: 0,
    shards: 0,
    hearts: HEARTS_START,
    maxHearts: HEARTS_START,
    kills: 0,
    best: 0,
    aimX: FIELD.width / 2,
    aimY: FIELD.height / 3,
    aimAngle: -Math.PI / 2,
    firing: false,
    beamHalf: BEAM.halfAngle,
    beamDps: BEAM.damagePerSecond,
    coolRate: BEAM.coolPerSecond,
    heat: 0,
    overheated: false,
    beamOn: false,
    levels: {},
    creatures: [],
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 1,
    waveRemaining: 0,
    shardsFlying: [],
    sparks: [],
    floaters: [],
    banner: '',
    bannerTime: 0,
    breachGrace: 0,
    endless: false,
    won: false,
    shake: 0,
    attractTimer: 0,
  };
  return state;
}

/** Start over from the title screen's fresh night, keeping the best score. */
export function resetState(state, best) {
  const rng = state.rng;
  const fresh = createState(rng);
  fresh.best = best;
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
}

/** Open wave `n`: build its queue, reset the spawn clock, raise the banner. */
export function startWave(state, n) {
  state.wave = n;
  // A new wave starts clean: the title screen's wandering creatures, stray shards and
  // sparks do not carry over into the fight.
  state.creatures = [];
  state.shardsFlying = [];
  state.sparks = [];
  state.floaters = [];
  state.spawnQueue = buildSpawnQueue(n, state.rng);
  state.spawnInterval = spawnInterval(n);
  state.spawnTimer = 0.6;
  state.waveRemaining = waveTotal(n);
  state.screen = SCREEN_PLAY;
  state.banner = n <= LAST_WAVE ? `WAVE ${n}` : `WAVE ${n} — ENDLESS`;
  state.bannerTime = 1.6;
}

/** The wave is over: every creature is gone and the queue is empty. */
export function waveCleared(state) {
  return state.spawnQueue.length === 0 && state.creatures.length === 0;
}

/** Buy an upgrade from the shop; returns true when the purchase landed. */
export function purchase(state, id) {
  return buyUpgrade(state, id);
}

/** The beam's cone test: is this point inside the light, and how far along it? */
export function inBeam(state, x, y) {
  const dx = x - LAMP.x;
  const dy = y - LAMP.y;
  const dist = Math.hypot(dx, dy);
  if (dist > BEAM.range || dist < 10) return dist < 10 ? 0 : -1;
  let diff = Math.atan2(dy, dx) - state.aimAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= state.beamHalf ? dist : -1;
}

function killCreature(state, creature, events) {
  creature.dead = true;
  state.kills += 1;
  state.score += creature.def.score;
  state.floaters.push(createFloater(creature.x, creature.y - 14, `+${creature.def.score}`, '#ffd76a'));
  state.sparks.push(...createBurst(creature.x, creature.y, 12, '#ffd76a', state.rng));
  for (let i = 0; i < creature.def.shards; i += 1) {
    state.shardsFlying.push(createShard(creature.x, creature.y, state.rng));
  }
  if (creature.type === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const wisp = createCreature('wisp', creature.x + state.rng.range(-14, 14), creature.y + state.rng.range(-14, 14), state.rng);
      state.creatures.push(wisp);
    }
  }
  return events | EVENT_KILL;
}

function breachCreature(state, creature, events) {
  creature.dead = true;
  state.sparks.push(...createBurst(creature.x, creature.y, 16, '#3a2430', state.rng));
  state.sparks.push(...createBurst(creature.x, creature.y, 8, '#ff5d6c', state.rng));
  if (state.breachGrace <= 0) {
    state.hearts -= 1;
    state.breachGrace = BREACH_GRACE;
    state.shake = 0.45;
    state.floaters.push(createFloater(HEART.x, HEART.y - 60, 'THE LIGHT DIMS', '#ff5d6c'));
    events |= EVENT_BREACH;
  }
  return events;
}

/**
 * Advance the night by dt seconds. `input` carries aim, firing and one-shot actions are
 * handled by the main loop, not here. Returns the event flags for this step.
 */
export function stepState(state, input, dt, audio) {
  let events = 0;
  state.time += dt;
  if (state.bannerTime > 0) state.bannerTime -= dt;
  if (state.breachGrace > 0) state.breachGrace -= dt;
  if (state.shake > 0) state.shake -= dt;

  // The aim follows the pointer; the beam angle follows the aim.
  state.aimX = input.aim.x;
  state.aimY = input.aim.y;
  state.aimAngle = Math.atan2(state.aimY - LAMP.y, state.aimX - LAMP.x);

  updateFloaters(state.floaters, dt);
  updateSparks(state.sparks, dt);

  // Shards fly home to the lamp and are banked on arrival.
  for (let i = state.shardsFlying.length - 1; i >= 0; i -= 1) {
    const shard = state.shardsFlying[i];
    updateShard(shard, dt, LAMP);
    if (shard.collected) {
      state.shardsFlying.splice(i, 1);
      state.shards += 1;
      events |= EVENT_SHARD;
      if (audio) audio.shard(state.time);
    }
  }

  if (state.screen === SCREEN_TITLE) {
    // Attract mode: creatures drift in from the dark and dissolve at the island, so the
    // title screen is alive without ever costing a heart.
    state.attractTimer -= dt;
    if (state.attractTimer <= 0 && state.creatures.length < 7) {
      state.attractTimer = state.rng.range(1.2, 2.4);
      const point = spawnPoint(state.rng);
      state.creatures.push(createCreature(state.rng.pick(['crawler', 'skitterer', 'splitter']), point.x, point.y, state.rng));
    }
    for (let i = state.creatures.length - 1; i >= 0; i -= 1) {
      const creature = state.creatures[i];
      updateCreature(creature, dt);
      if (reachedHeart(creature)) {
        state.sparks.push(...createBurst(creature.x, creature.y, 10, '#7fe3d0', state.rng));
        state.creatures.splice(i, 1);
      }
    }
    return events;
  }

  if (state.screen !== SCREEN_PLAY) return events;

  // Spawn the wave's queue on its timer.
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = state.spawnInterval;
      const type = state.spawnQueue.shift();
      const point = spawnPoint(state.rng);
      state.creatures.push(createCreature(type, point.x, point.y, state.rng));
    }
  }

  // The beam: heat rises while it burns, falls while it rests; an overheated lamp
  // refuses to fire until it has cooled back down.
  state.firing = input.firing;
  if (state.overheated) {
    state.heat = Math.max(0, state.heat - state.coolRate * dt);
    if (state.heat <= BEAM.rearmAt) state.overheated = false;
  } else if (state.firing) {
    state.heat += BEAM.heatPerSecond * dt;
    if (state.heat >= BEAM.overheatAt) {
      state.heat = BEAM.overheatAt;
      state.overheated = true;
    }
  } else {
    state.heat = Math.max(0, state.heat - state.coolRate * dt);
  }
  state.beamOn = state.firing && !state.overheated;
  if (state.beamOn && audio) audio.zap(state.time);

  // Burn whatever the beam touches.
  if (state.beamOn) {
    for (const creature of state.creatures) {
      if (creature.dead) continue;
      if (inBeam(state, creature.x, creature.y) >= 0) {
        if (damageCreature(creature, state.beamDps * dt)) {
          events = killCreature(state, creature, events);
          if (audio) audio.kill();
        }
      }
    }
  }

  // Walk the horde; a creature that reaches the heart costs a heart.
  for (let i = state.creatures.length - 1; i >= 0; i -= 1) {
    const creature = state.creatures[i];
    if (creature.dead) {
      state.creatures.splice(i, 1);
      continue;
    }
    updateCreature(creature, dt);
    if (reachedHeart(creature)) events = breachCreature(state, creature, events);
  }
  state.creatures = state.creatures.filter((c) => !c.dead);
  state.waveRemaining = state.spawnQueue.length + state.creatures.length;

  if (state.hearts <= 0) {
    state.screen = SCREEN_LOSE;
    if (audio) audio.lose();
    return events | EVENT_LOSE;
  }

  if (waveCleared(state)) {
    if (state.wave >= LAST_WAVE && !state.endless) {
      state.won = true;
      state.screen = SCREEN_WIN;
      if (audio) audio.win();
      return events | EVENT_WIN;
    }
    state.screen = SCREEN_UPGRADE;
    state.banner = 'WAVE CLEARED';
    state.bannerTime = 1.2;
    return events | EVENT_WAVE_CLEAR;
  }
  return events;
}

/** Open endless mode after a win: the night goes on past wave 10, harder each time. */
export function continueEndless(state) {
  state.endless = true;
  state.won = false;
  startWave(state, LAST_WAVE + 1);
}
