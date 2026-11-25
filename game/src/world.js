// The Copper Ladle — the world: orders, stations, the chef's hands and the shift clock.
// One file, one job: every rule of the game lives here; rendering and input only read it.
import {
  BOARD,
  CHOP_SECONDS,
  FIELD,
  GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS,
  INGREDIENTS,
  INTERACT_DIST,
  MAX_ORDERS,
  ORDER_GAP_SECONDS,
  ORDER_PATIENCE,
  PLAYER,
  RECIPES,
  SHIFT_SECONDS,
  STATIONS,
  recipeById,
  stationApproach,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_READY = 8;
export const EVENT_BURNT = 16;

let nextOrderId = 1;

function newPlate() {
  return { kind: 'plate', items: [] };
}

function cloneItem(item) {
  if (item === null) return null;
  if (item.kind === 'plate') return { kind: 'plate', items: [...item.items] };
  return { id: item.id };
}

/** The same multiset of items, in any order, makes the same dish. */
export function plateMatchesRecipe(plateItems, recipeItems) {
  if (plateItems.length !== recipeItems.length) return false;
  const counts = new Map();
  for (const item of plateItems) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of recipeItems) {
    const left = counts.get(item) ?? 0;
    if (left === 0) return false;
    counts.set(item, left - 1);
  }
  return true;
}

export function findOrderForPlate(state, plateItems) {
  for (const order of state.orders) {
    const recipe = recipeById(order.recipeId);
    if (plateMatchesRecipe(plateItems, recipe.items)) return { order, recipe };
  }
  return null;
}

export function createWorld(random) {
  const world = {
    random: random ?? createRandom(1),
    state: null,
    reset() {
      this.state = {
        time: 0,
        timeLeft: SHIFT_SECONDS,
        coins: 0,
        served: 0,
        combo: 0,
        bestCombo: 0,
        orders: [],
        orderTimer: 2,
        player: { x: FIELD.width / 2, y: 330, carrying: null },
        chop: null,
        grill: [null, null],
        assemblyPlate: null,
        passPlate: null,
        shake: 0,
        flash: 0,
        popups: [],
        particles: [],
        hint: '',
        over: false,
        stars: 0,
      };
      nextOrderId = 1;
    },
    step(dt, move, interactPressed, audio) {
      const state = this.state;
      if (state.over) return EVENT_NONE;
      let events = EVENT_NONE;
      state.time += dt;
      state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2);
      for (const popup of state.popups) {
        popup.life -= dt;
        popup.y -= 34 * dt;
      }
      state.popups = state.popups.filter((popup) => popup.life > 0);
      for (const particle of state.particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);

      this.spawnOrders(dt);
      this.tickOrders(dt, audio);
      this.movePlayer(dt, move);
      this.tickChop(dt, audio);
      this.tickGrill(dt, audio);
      if (interactPressed) this.interact(audio);
      this.updateHint();
      if (audio) audio.setSizzle(state.grill.some((slot) => slot !== null && slot.stage === 'cooking'));

      if (state.timeLeft <= 0) {
        state.over = true;
        state.stars = state.coins >= 320 ? 3 : state.coins >= 210 ? 2 : state.coins >= 110 ? 1 : 0;
        if (audio) audio.fanfare();
        return events | EVENT_OVER;
      }
      return events;
    },

    spawnOrders(dt) {
      const state = this.state;
      state.orderTimer -= dt;
      if (state.orderTimer > 0 || state.orders.length >= MAX_ORDERS) return;
      state.orderTimer = ORDER_GAP_SECONDS;
      // Later orders get less patience: the rush grows without adding chores.
      const patience = Math.max(38, ORDER_PATIENCE - Math.floor(state.time / 45) * 4);
      const recipe = this.random.pick(RECIPES);
      state.orders.push({
        id: nextOrderId,
        name: recipe.name,
        recipeId: recipe.id,
        patience,
        maxPatience: patience,
      });
      nextOrderId += 1;
    },

    tickOrders(dt, audio) {
      const state = this.state;
      for (const order of state.orders) {
        const wasUrgent = order.patience <= 10;
        order.patience -= dt;
        if (!wasUrgent && order.patience <= 10 && order.patience > 0 && audio) audio.tick();
      }
      const expired = state.orders.filter((order) => order.patience <= 0);
      if (expired.length > 0) {
        state.orders = state.orders.filter((order) => order.patience > 0);
        state.combo = 0;
        state.coins = Math.max(0, state.coins - 5 * expired.length);
        state.shake = 1;
        state.flash = 1;
        if (audio) audio.expired();
      }
    },

    movePlayer(dt, move) {
      const state = this.state;
      const player = state.player;
      let dx = move.x;
      let dy = move.y;
      const length = Math.hypot(dx, dy);
      if (length > 1) {
        dx /= length;
        dy /= length;
      }
      // Axis-separated movement so the chef slides along counters instead of sticking.
      player.x = this.clampMove(player.x + dx * PLAYER.speed * dt, player.y, true);
      player.y = this.clampMove(player.x, player.y + dy * PLAYER.speed * dt, false);
      player.x = Math.min(FIELD.width - 14 - PLAYER.radius, Math.max(14 + PLAYER.radius, player.x));
      player.y = Math.min(FIELD.height - 14 - PLAYER.radius, Math.max(BOARD.height + 8 + PLAYER.radius, player.y));
    },

    clampMove(x, y, horizontal) {
      const r = PLAYER.radius - 2;
      for (const station of STATIONS) {
        if (x + r > station.x && x - r < station.x + station.w && y + r > station.y && y - r < station.y + station.h) {
          if (horizontal) {
            x = x < station.x + station.w / 2 ? station.x - r : station.x + station.w + r;
          } else {
            y = y < station.y + station.h / 2 ? station.y - r : station.y + station.h + r;
          }
        }
      }
      return horizontal ? x : y;
    },

    nearestStation() {
      const state = this.state;
      let best = null;
      let bestDist = Infinity;
      for (const station of STATIONS) {
        const approach = stationApproach(station);
        const dist = Math.hypot(state.player.x - approach.x, state.player.y - approach.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = station;
        }
      }
      return bestDist <= INTERACT_DIST ? best : null;
    },

    tickChop(dt, audio) {
      const state = this.state;
      if (state.chop === null) return;
      const station = STATIONS.find((item) => item.id === 'chop');
      const approach = stationApproach(station);
      const near = Math.hypot(state.player.x - approach.x, state.player.y - approach.y) <= INTERACT_DIST + 14;
      if (!near) return; // Walking away pauses the chop; the board waits for you.
      state.chop.progress += dt / CHOP_SECONDS;
      if (Math.random() < dt * 6 && audio) audio.chop();
      if (state.chop.progress >= 1) {
        const def = INGREDIENTS[state.chop.item];
        state.player.carrying = { id: def.chopped };
        state.chop = null;
        if (audio) audio.chopDone();
      }
    },

    tickGrill(dt, audio) {
      const state = this.state;
      for (const slot of state.grill) {
        if (slot === null) continue;
        slot.time += dt;
        if (slot.stage === 'cooking' && slot.time >= GRILL_COOK_SECONDS) {
          slot.stage = 'cooked';
          slot.time = 0;
          if (audio) audio.ready();
        } else if (slot.stage === 'cooked' && slot.time >= GRILL_BURN_SECONDS) {
          slot.stage = 'burnt';
          slot.time = 0;
          if (audio) audio.expired();
        }
      }
    },

    interact(audio) {
      const state = this.state;
      const station = this.nearestStation();
      if (station === null) return;
      const hands = state.player.carrying;
      switch (station.kind) {
        case 'pantry': {
          if (hands !== null) {
            if (audio) audio.error();
            return;
          }
          state.player.carrying = { id: station.item === 'patty' ? 'patty-raw' : station.item };
          if (audio) audio.pickup();
          break;
        }
        case 'chop': {
          if (state.chop !== null) return;
          if (hands === null || hands.kind === 'plate') {
            if (audio) audio.error();
            return;
          }
          const def = INGREDIENTS[hands.id];
          if (!def || !def.choppable) {
            if (audio) audio.error();
            return;
          }
          state.chop = { item: hands.id, progress: 0 };
          state.player.carrying = null;
          if (audio) audio.chop();
          break;
        }
        case 'grill': {
          if (hands !== null && hands.kind !== 'plate' && hands.id === 'patty-raw') {
            const free = state.grill.findIndex((slot) => slot === null);
            if (free === -1) {
              if (audio) audio.error();
              return;
            }
            state.grill[free] = { stage: 'cooking', time: 0 };
            state.player.carrying = null;
            if (audio) audio.grillOn();
            return;
          }
          if (hands === null) {
            const ready = state.grill.findIndex((slot) => slot !== null && slot.stage !== 'cooking');
            if (ready === -1) {
              if (audio) audio.error();
              return;
            }
            const slot = state.grill[ready];
            state.player.carrying = { id: slot.stage === 'cooked' ? 'patty-cooked' : 'patty-burnt' };
            state.grill[ready] = null;
            if (audio) audio.pickup();
          }
          break;
        }
        case 'plates': {
          if (hands !== null) {
            if (audio) audio.error();
            return;
          }
          state.player.carrying = newPlate();
          if (audio) audio.pickup();
          break;
        }
        case 'assembly': {
          if (hands !== null && hands.kind === 'plate' && state.assemblyPlate === null) {
            state.assemblyPlate = hands;
            state.player.carrying = null;
            if (audio) audio.place();
            return;
          }
          if (hands === null && state.assemblyPlate !== null) {
            state.player.carrying = state.assemblyPlate;
            state.assemblyPlate = null;
            if (audio) audio.pickup();
            return;
          }
          if (hands !== null && hands.kind !== 'plate' && state.assemblyPlate !== null) {
            const plate = state.assemblyPlate;
            if (hands.id === 'patty-burnt' || plate.items.length >= 5) {
              if (audio) audio.error();
              return;
            }
            plate.items.push(hands.id);
            state.player.carrying = null;
            if (audio) audio.place();
          }
          break;
        }
        case 'serve': {
          if (hands === null || hands.kind !== 'plate' || hands.items.length === 0) {
            if (audio) audio.error();
            return;
          }
          const match = findOrderForPlate(state, hands.items);
          if (match === null) {
            if (audio) audio.error();
            return;
          }
          this.serveDish(match, audio);
          state.player.carrying = null;
          break;
        }
        case 'bin': {
          if (hands === null) return;
          if (hands.kind === 'plate' && hands.items.length > 0) {
            // Tipping a plated dish out keeps the empty plate.
            hands.items = [];
          } else {
            state.player.carrying = null;
          }
          if (audio) audio.place();
          break;
        }
        default:
          break;
      }
    },

    serveDish(match, audio) {
      const state = this.state;
      const { order, recipe } = match;
      state.orders = state.orders.filter((item) => item.id !== order.id);
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const timeBonus = Math.round(15 * (order.patience / order.maxPatience));
      const payout = Math.round(recipe.base * (1 + 0.1 * Math.min(state.combo - 1, 10))) + timeBonus;
      state.coins += payout;
      state.served += 1;
      const station = STATIONS.find((item) => item.id === 'serve');
      state.popups.push({
        x: station.x + station.w / 2,
        y: station.y - 8,
        text: `+${payout}  ${recipe.name}`,
        life: 1.6,
      });
      for (let i = 0; i < 14; i += 1) {
        state.particles.push({
          x: station.x + station.w / 2 + (Math.random() - 0.5) * 60,
          y: station.y + 20,
          vx: (Math.random() - 0.5) * 60,
          vy: -40 - Math.random() * 50,
          life: 0.9,
          color: i % 2 === 0 ? '#ffd166' : '#ff8fa3',
        });
      }
      if (audio) audio.serve();
    },

    updateHint() {
      const state = this.state;
      const station = this.nearestStation();
      const hands = state.player.carrying;
      if (station === null) {
        state.hint = 'WASD / arrows to move — click a station to walk to it. E or click to use.';
        return;
      }
      const holding = hands === null ? 'empty hands' : hands.kind === 'plate' ? 'plate' : INGREDIENTS[hands.id]?.name ?? hands.id;
      switch (station.kind) {
        case 'pantry':
          state.hint = hands === null ? `E — take ${INGREDIENTS[station.item].name}` : `Hands full (${holding}) — serve or bin it first`;
          break;
        case 'chop':
          if (state.chop !== null) state.hint = 'Chopping… stay at the board';
          else if (hands !== null && hands.kind !== 'plate' && INGREDIENTS[hands.id]?.choppable) state.hint = `E — chop the ${INGREDIENTS[hands.id].name.toLowerCase()}`;
          else state.hint = 'Chopping board — bring tomato, lettuce or onion';
          break;
        case 'grill':
          if (hands !== null && hands.kind !== 'plate' && hands.id === 'patty-raw') state.hint = 'E — lay the patty on the grill';
          else if (hands === null) state.hint = 'E — take a cooked patty off the grill';
          else state.hint = 'Grill — patties only, and watch them: they burn';
          break;
        case 'plates':
          state.hint = hands === null ? 'E — take an empty plate' : 'Hands full';
          break;
        case 'assembly':
          if (state.assemblyPlate === null) state.hint = hands !== null && hands.kind === 'plate' ? 'E — set the plate down to build on it' : 'Assembly counter — set a plate down, then add ingredients';
          else if (hands === null) state.hint = 'E — pick the plate back up';
          else state.hint = 'E — add it to the plate';
          break;
        case 'serve':
          state.hint = hands !== null && hands.kind === 'plate' && hands.items.length > 0 ? 'E — serve the dish!' : 'Serving window — bring a finished plate';
          break;
        case 'bin':
          state.hint = 'E — throw it away';
          break;
        default:
          state.hint = '';
      }
    },
  };
  world.reset();
  return world;
}
