// Input: keyboard (WASD/arrows + E) and mouse (click a station to walk there and use it).
// One file, one job: it turns key presses and clicks into a move vector, an interact
// pulse, and a walk target the main loop steers toward.
import { STATIONS, stationApproach } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

export function createInput(canvas) {
  const keys = new Set();
  let interactQueued = false;
  let confirmQueued = false;
  let pauseQueued = false;
  let muteQueued = false;
  let walkTarget = null;
  let walkStation = null;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function onKeyDown(event) {
    const key = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (key === 'e' || key === ' ') {
      if (!event.repeat) interactQueued = true;
      keys.add('interact');
    }
    if (key === 'enter') confirmQueued = true;
    if (key === 'p' || key === 'escape') pauseQueued = true;
    if (key === 'm') muteQueued = true;
    keys.add(key);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
    keys.delete('interact');
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 960,
      y: ((event.clientY - rect.top) / rect.height) * 600,
    };
  }

  function onClick(event) {
    const point = canvasPoint(event);
    // Clicking a station walks the chef to it and uses it on arrival.
    for (const station of STATIONS) {
      if (point.x >= station.x - 6 && point.x <= station.x + station.w + 6 && point.y >= station.y - 6 && point.y <= station.y + station.h + 6) {
        walkStation = station;
        walkTarget = stationApproach(station);
        return;
      }
    }
    // Clicking the floor just walks there.
    walkStation = null;
    walkTarget = point;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onClick);

  return {
    /** Move vector for this frame: keys win, otherwise the walk target steers. */
    move(player) {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 || y !== 0) {
        walkTarget = null;
        walkStation = null;
        return { x, y };
      }
      if (walkTarget !== null) {
        const dx = walkTarget.x - player.x;
        const dy = walkTarget.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          walkTarget = null;
          if (walkStation !== null) {
            const station = walkStation;
            walkStation = null;
            return { x: 0, y: 0, arrivedAt: station };
          }
          return { x: 0, y: 0 };
        }
        return { x: dx / dist, y: dy / dist };
      }
      return { x: 0, y: 0 };
    },
    interactPressed() {
      const pressed = interactQueued;
      interactQueued = false;
      return pressed;
    },
    confirmPressed() {
      const pressed = confirmQueued || interactQueued;
      confirmQueued = false;
      interactQueued = false;
      return pressed;
    },
    pausePressed() {
      const pressed = pauseQueued;
      pauseQueued = false;
      return pressed;
    },
    mutePressed() {
      const pressed = muteQueued;
      muteQueued = false;
      return pressed;
    },
    clearWalk() {
      walkTarget = null;
      walkStation = null;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onClick);
    },
  };
}
