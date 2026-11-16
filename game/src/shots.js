// The screenshot scenes behind ?shot=title|play|upgrade|win. Each one plays the real
// rules forward from a fresh night for a fixed number of steps, steered by a simple
// autopilot (aim at the nearest creature, burn while one is in the beam, buy the best
// affordable upgrade between waves), so the frame is what a real game looks like and the
// same seed always gives the same frame. The win scene's keeper fights with a fully
// upgraded lamp, the way a player who survived nine waves would.

import { FIELD, STEP } from './config.js';
import {
  SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN,
  continueEndless, createState, inBeam, purchase, startWave, stepState,
} from './state.js';
import { UPGRADES } from './config.js';

const TITLE_SECONDS = 6;
/** The play scene waits for a busy frame: the beam lit and at least this many creatures
 * in view, at least 5 s into wave 2, and never longer than 20 s. */
const PLAY_VISIBLE_CREATURES = 3;
const MAX_STEPS = 240000;

/** Aim the beam at the nearest creature and fire while one is in the cone. A lazy
 * pilot only fires once the horde has walked close to the light, so the field fills
 * up before the burning starts — the busy frame the play scene wants. */
function autopilotInput(state, lazy = false) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const creature of state.creatures) {
    const dist = Math.hypot(creature.x - 640, creature.y - 560);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = creature;
    }
  }
  if (!nearest) return { aim: { x: FIELD.width / 2, y: 200 }, firing: false };
  if (lazy && nearestDist > 420) return { aim: { x: nearest.x, y: nearest.y }, firing: false };
  let inCone = false;
  for (const creature of state.creatures) {
    if (inBeam(state, creature.x, creature.y) >= 0) {
      inCone = true;
      break;
    }
  }
  return { aim: { x: nearest.x, y: nearest.y }, firing: inCone };
}

/** Spend shards between waves, best damage first, until nothing affordable is left. */
function autoBuy(state) {
  for (const def of UPGRADES) {
    while (purchase(state, def.id)) {
      // Keep buying the same upgrade while its next level is still affordable.
    }
  }
}

/** Run the state forward until `stop` says the scene is ready, or the step cap hits. */
function runUntil(state, stop, lazy = false) {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const input = autopilotInput(state, lazy);
    stepState(state, input, STEP, null);
    if (stop(state)) return true;
    if (state.screen === SCREEN_LOSE) return false;
  }
  return false;
}

/**
 * Stage the play scene: clear wave 1, then fight wave 2. A lazy pilot lets the horde
 * walk in close before burning, so the captured frame is busy; a strong pilot (the
 * fallback) just takes wave 2 five seconds in. Returns true when the state is a live
 * wave-2 fight worth picturing.
 */
function stagePlay(state, lazy) {
  startWave(state, 1);
  const cleared = runUntil(state, (s) => s.screen === SCREEN_UPGRADE, lazy);
  if (!cleared) return false;
  if (!lazy) autoBuy(state);
  startWave(state, 2);
  let wave2Time = 0;
  const busy = runUntil(state, (s) => {
    wave2Time += STEP;
    if (!lazy) return wave2Time >= 5;
    if (wave2Time >= 20) return true;
    if (wave2Time < 5 || !s.beamOn) return false;
    let visible = 0;
    for (const c of s.creatures) {
      if (c.x > 20 && c.x < FIELD.width - 20 && c.y > 20 && c.y < FIELD.height - 20) visible += 1;
    }
    return visible >= PLAY_VISIBLE_CREATURES;
  }, lazy);
  return busy && state.screen === SCREEN_PLAY;
}

/**
 * Set `state` to the named scene (title, play, upgrade or win; any other name is title)
 * and return the screen to draw over it.
 */
export function stageShot(name, state) {
  const fresh = createState(state.rng);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);

  if (name === 'play' || name === 'upgrade' || name === 'win') {
    if (name === 'win') {
      // A keeper who has survived nine waves: full upgrades, five hearts, a hot lamp.
      state.levels = { wide: 3, power: 3, sink: 3, heart: 2 };
      state.beamHalf += 0.045 * 3;
      state.beamDps *= 1.3 * 1.3 * 1.3;
      state.coolRate *= 1.45 * 1.45 * 1.45;
      state.maxHearts = 5;
      state.hearts = 5;
      // Score, kills and shards start at zero here: the numbers the victory screen
      // shows are the ones this staged run actually earns.
    }
    if (name === 'play') {
      if (stagePlay(state, true)) return SCREEN_PLAY;
      // The lazy keeper lost wave 2: restage it with the strong pilot instead.
      const fresh = createState(state.rng);
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, fresh);
      if (stagePlay(state, false)) return SCREEN_PLAY;
      return state.screen === SCREEN_PLAY ? SCREEN_PLAY : SCREEN_UPGRADE;
    }
    startWave(state, 1);
    // Wave 1: clear it, buying upgrades on the way when the shot wants them.
    const cleared = runUntil(state, (s) => s.screen === SCREEN_UPGRADE);
    if (name === 'upgrade') {
      if (state.screen === SCREEN_UPGRADE) return SCREEN_UPGRADE;
      // The autopilot lost wave 1 (it should not): fall back to a staged shop.
      state.screen = SCREEN_UPGRADE;
      state.shards = 34;
      state.score = 1250;
      return SCREEN_UPGRADE;
    }
    if (cleared) {
      autoBuy(state);
      startWave(state, 2);
      // Win: play waves 2..10 through, buying between each, until the dawn breaks.
      for (let wave = 2; wave <= 10; wave += 1) {
        if (state.screen === SCREEN_WIN) break;
        if (state.screen === SCREEN_UPGRADE) {
          autoBuy(state);
          startWave(state, wave);
        }
        const done = runUntil(state, (s) => s.screen === SCREEN_UPGRADE || s.screen === SCREEN_WIN || s.screen === SCREEN_LOSE);
        if (!done || state.screen === SCREEN_LOSE) break;
      }
      if (state.screen === SCREEN_WIN) return SCREEN_WIN;
      // The autopilot fell short: stage the victory frame directly on a calm sea.
      state.screen = SCREEN_WIN;
      state.won = true;
      state.creatures = [];
      state.shardsFlying = [];
      return SCREEN_WIN;
    }
    // Wave 1 never cleared (it should not happen): stage the requested screen anyway.
    if (name === 'win') {
      state.screen = SCREEN_WIN;
      state.won = true;
      state.creatures = [];
      return SCREEN_WIN;
    }
    return SCREEN_UPGRADE;
  }

  // Title: let the attract mode drift for a few seconds, then show the title.
  for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) {
    stepState(state, { aim: { x: FIELD.width / 2, y: 200 }, firing: false }, STEP, null);
  }
  return SCREEN_TITLE;
}
