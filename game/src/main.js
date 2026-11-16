// Boot and the one loop: input is read every frame, the night advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, upgrade, paused, win and lose.
//
// ?seed=N fixes the night's pattern. ?shot=title|play|upgrade|win (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. ?debug=1 exposes a small test handle on window.__lumen.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_BUY_1, ACTION_BUY_2, ACTION_BUY_3, ACTION_BUY_4, ACTION_CONFIRM,
  ACTION_ENDLESS, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import { createCreature } from './entities.js';
import {
  EVENT_BREACH, EVENT_KILL, EVENT_LOSE, EVENT_WAVE_CLEAR, EVENT_WIN,
  SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE,
  SCREEN_WIN, continueEndless, createState, purchase, resetState, startWave,
  stepState,
} from './state.js';
import {
  UPGRADE_CONTINUE, WIN_ENDLESS, WIN_RESTART, createRenderer, upgradeCardRect,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const debug = params.get('debug') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const state = createState(rng);
const renderer = createRenderer(canvas, createRandom(seed ^ 0x9e3779b9));
const input = createInput(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function inside(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function runShot(name) {
  const screen = stageShot(name, state);
  state.screen = screen;
  let painted = 0;
  function paint() {
    renderer.draw(state, state.screen, readBest(), state.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startNight() {
    audio.unlock();
    resetState(state, best);
    startWave(state, 1);
    screen = SCREEN_PLAY;
    audio.horn();
    announce('Playing. Wave 1. Three hearts.');
  }

  function endNight(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    announce(won
      ? `Victory. Score ${state.score}. Best ${best}.`
      : `The light goes out. Score ${state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      state.muted = muted;
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startNight();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startNight();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const buyActions = [
        [ACTION_BUY_1, 'wide'],
        [ACTION_BUY_2, 'power'],
        [ACTION_BUY_3, 'sink'],
        [ACTION_BUY_4, 'heart'],
      ];
      for (const [flag, id] of buyActions) {
        if (actions & flag) {
          if (purchase(state, id)) audio.buy();
          else audio.denied();
        }
      }
      if (actions & ACTION_CONFIRM) {
        if (input.confirmFromMouse) {
          // A click: buy the card it landed on, or begin the next wave.
          for (let i = 0; i < 4; i += 1) {
            if (inside(input.aim, upgradeCardRect(i))) {
              const id = ['wide', 'power', 'sink', 'heart'][i];
              if (purchase(state, id)) audio.buy();
              else audio.denied();
              return;
            }
          }
          if (inside(input.aim, UPGRADE_CONTINUE)) {
            startWave(state, state.wave + 1);
            screen = SCREEN_PLAY;
            audio.horn();
            announce(`Wave ${state.wave}.`);
          }
        } else {
          startWave(state, state.wave + 1);
          screen = SCREEN_PLAY;
          audio.horn();
          announce(`Wave ${state.wave}.`);
        }
      }
      return;
    }
    if (screen === SCREEN_WIN) {
      if (actions & ACTION_ENDLESS) {
        continueEndless(state);
        screen = SCREEN_PLAY;
        audio.horn();
        announce('Endless night. Wave 11.');
        return;
      }
      if (actions & ACTION_CONFIRM && input.confirmFromMouse) {
        if (inside(input.aim, WIN_ENDLESS)) {
          continueEndless(state);
          screen = SCREEN_PLAY;
          audio.horn();
          announce('Endless night. Wave 11.');
        } else if (inside(input.aim, WIN_RESTART)) {
          startNight();
        }
      }
      return;
    }
    if (screen === SCREEN_LOSE) {
      if (actions & ACTION_CONFIRM) startNight();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      stepState(state, { aim: input.aim, firing: false }, STEP, null);
      return;
    }
    const events = stepState(state, input, STEP, audio);
    if (events & EVENT_WIN) endNight(true);
    else if (events & EVENT_LOSE) endNight(false);
    else if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_UPGRADE;
      announce(`Wave ${state.wave} cleared. ${state.shards} shards. Spend them, then begin wave ${state.wave + 1}.`);
    } else if (events & EVENT_BREACH) {
      announce(state.hearts === 1 ? 'A creature reached the light. 1 heart left.' : `A creature reached the light. ${state.hearts} hearts left.`);
    } else if (events & EVENT_KILL && state.kills % 25 === 0) {
      announce(`${state.kills} creatures burned. Score ${state.score}.`);
    }
    if (state.screen === SCREEN_UPGRADE) screen = SCREEN_UPGRADE;
  }

  function frame(nowMs) {
    requestAnimationFrame(frame);
    const now = nowMs / 1000;
    accumulator += Math.min((nowMs - last) / 1000, MAX_FRAME);
    last = nowMs;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best, now);
  }

  // Leaving the tab pauses a running game rather than letting the dark advance unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('LUMEN, Keeper of the Last Light. Click or press Space to begin.');
  requestAnimationFrame(frame);
}

if (debug) {
  // A small test handle, only when the page is opened with ?debug=1: lets a headless
  // play-test drive the night without a real pointer.
  window.__lumen = {
    state,
    screen: () => state.screen,
    spawn(type, x, y) {
      state.creatures.push(createCreature(type, x, y, rng));
    },
    grantShards(n) {
      state.shards += n;
    },
    startWave(n) {
      startWave(state, n);
    },
  };
}

if (shot) runShot(shot);
else runGame();
