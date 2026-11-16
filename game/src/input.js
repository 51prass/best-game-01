// Mouse and keyboard, read once per frame. The mouse aims the beam in logical field
// coordinates (the canvas is scaled to the window, so client pixels are mapped back);
// holding the button or Space fires. Keys queue one-shot actions the main loop consumes:
// confirm, pause, restart, mute, endless, and the four upgrade keys.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_ENDLESS = 16;
export const ACTION_BUY_1 = 32;
export const ACTION_BUY_2 = 64;
export const ACTION_BUY_3 = 128;
export const ACTION_BUY_4 = 256;

export function createInput(canvas) {
  let mouseX = FIELD.width / 2;
  let mouseY = FIELD.height / 4;
  let mouseDown = false;
  let spaceDown = false;
  let queued = 0;
  /** True when the most recent confirm came from the mouse (a click), not a key. */
  let confirmFromMouse = false;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / Math.max(1, rect.width);
    const scaleY = FIELD.height / Math.max(1, rect.height);
    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;
  }

  function onKeyDown(event) {
    const key = event.key;
    if (key === ' ') {
      spaceDown = true;
      queued |= ACTION_CONFIRM;
      confirmFromMouse = false;
      event.preventDefault();
    } else if (key === 'Enter') {
      queued |= ACTION_CONFIRM;
      confirmFromMouse = false;
    } else if (key === 'p' || key === 'P' || key === 'Escape') {
      queued |= ACTION_PAUSE;
    } else if (key === 'r' || key === 'R') {
      queued |= ACTION_RESTART;
    } else if (key === 'm' || key === 'M') {
      queued |= ACTION_MUTE;
    } else if (key === 'e' || key === 'E') {
      queued |= ACTION_ENDLESS;
    } else if (key === '1') {
      queued |= ACTION_BUY_1;
    } else if (key === '2') {
      queued |= ACTION_BUY_2;
    } else if (key === '3') {
      queued |= ACTION_BUY_3;
    } else if (key === '4') {
      queued |= ACTION_BUY_4;
    }
  }

  function onKeyUp(event) {
    if (event.key === ' ') spaceDown = false;
  }

  function onMouseDown(event) {
    toLogical(event);
    mouseDown = true;
    queued |= ACTION_CONFIRM;
    confirmFromMouse = true;
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onMouseMove(event) {
    toLogical(event);
  }

  canvas.addEventListener('pointerdown', onMouseDown);
  window.addEventListener('pointerup', onMouseUp);
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    /** The aim point, in logical field coordinates. */
    get aim() {
      return { x: mouseX, y: mouseY };
    },
    /** True while the beam should burn: mouse held or Space held. */
    get firing() {
      return mouseDown || spaceDown;
    },
    /** One-shot actions since the last read; reading clears them. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    /** Was the latest confirm a mouse click (true) or a key press (false)? */
    get confirmFromMouse() {
      return confirmFromMouse;
    },
    /** Let the autopilot (screenshots, tests) steer without a real pointer. */
    steer(x, y, firing) {
      mouseX = x;
      mouseY = y;
      mouseDown = firing;
    },
    queue(action) {
      queued |= action;
    },
  };
}
