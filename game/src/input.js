// Keyboard input for Costa Palma. Held keys steer and drive; one-shot presses
// (enter car, punch, shoot, horn, menus) are queued as flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.

export const ACT_ENTER = 1;
export const ACT_PUNCH = 2;
export const ACT_SHOOT = 4;
export const ACT_HORN = 8;
export const ACT_PAUSE = 16;
export const ACT_BOARD = 32;
export const ACT_MAP = 64;
export const ACT_GARAGE = 128;
export const ACT_RELOAD = 256;

const HELD = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight',
]);

export function createInput() {
  const held = new Set();
  let actions = 0;

  function press(code, event) {
    if (event.repeat) return;
    if (code === 'KeyE') actions |= ACT_ENTER;
    else if (code === 'KeyF') actions |= ACT_PUNCH;
    else if (code === 'Space') actions |= ACT_SHOOT;
    else if (code === 'KeyH') actions |= ACT_HORN;
    else if (code === 'KeyP' || code === 'Escape') actions |= ACT_PAUSE;
    else if (code === 'Tab') actions |= ACT_BOARD;
    else if (code === 'KeyM') actions |= ACT_MAP;
    else if (code === 'KeyG') actions |= ACT_GARAGE;
    else if (code === 'KeyR') actions |= ACT_RELOAD;
  }

  window.addEventListener('keydown', (event) => {
    if (HELD.has(event.code)) held.add(event.code);
    press(event.code, event);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); });

  const has = (a, b) => held.has(a) || held.has(b);
  return {
    /** True while the given key code is held down. */
    isHeld(code) { return held.has(code); },
    /** Forward/back/left/right as -1, 0 or 1, from WASD or arrows. */
    drive() {
      return {
        fwd: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
        strafe: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
        run: has('ShiftLeft', 'ShiftRight'),
      };
    },
    /** The one-shot presses since the last call, as ACT_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
