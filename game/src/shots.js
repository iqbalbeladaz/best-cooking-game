// The screenshot scenes behind ?shot=start|play|end. Each one stages the real game state
// directly — the same fields the live game fills — so the frame is what the game really
// looks like at that moment, and the same seed always gives the same frame.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function setOrders(state, orders) {
  state.orders = orders.map((order, i) => ({
    id: i + 1,
    name: order.name,
    recipeId: order.recipeId,
    patience: order.patience,
    maxPatience: order.maxPatience,
  }));
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    // Title over a kitchen already at work: two tickets on the board, a patty on the grill.
    setOrders(state, [
      { name: 'Garden Burger', recipeId: 'garden-burger', patience: 44, maxPatience: 52 },
      { name: 'Cheese Melt', recipeId: 'cheese-melt', patience: 30, maxPatience: 52 },
    ]);
    state.grill[0] = { stage: 'cooking', time: 2.5 };
    state.player.x = 480;
    state.player.y = 340;
    state.time = 12;
    state.timeLeft = 138;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-shift, mid-assembly: the chef carries a plate with bun, patty and lettuce and is
    // about to add the tomato; a finished salad waits on the assembly counter to be served;
    // the board holds three tickets, the grill holds a cooking and a ready patty, and the
    // shift clock reads 1:27.
    state.time = 63;
    state.timeLeft = 87;
    state.coins = 145;
    state.combo = 3;
    state.bestCombo = 4;
    state.served = 5;
    setOrders(state, [
      { name: 'Garden Burger', recipeId: 'garden-burger', patience: 34, maxPatience: 52 },
      { name: 'Double Stack', recipeId: 'double-stack', patience: 18, maxPatience: 48 },
      { name: 'Garden Salad', recipeId: 'garden-salad', patience: 41, maxPatience: 52 },
    ]);
    state.player.x = 500;
    state.player.y = 440;
    state.player.carrying = { kind: 'plate', items: ['bun', 'patty-cooked', 'lettuce-chopped'] };
    state.assemblyPlate = { kind: 'plate', items: ['lettuce-chopped', 'tomato-chopped', 'onion-chopped'] };
    state.grill[0] = { stage: 'cooking', time: 3.5 };
    state.grill[1] = { stage: 'cooked', time: 1.2 };
    state.chop = null;
    world.updateHint();
    return { screen: SCREEN_PLAY, best: 145 };
  }
  // End of the rush: the clock is nearly out, the board is full of urgent tickets,
  // and the shift-over panel shows three stars for 420 coins.
  state.time = 142;
  state.timeLeft = 8;
  state.coins = 420;
  state.combo = 5;
  state.bestCombo = 6;
  state.served = 12;
  setOrders(state, [
    { name: 'Double Stack', recipeId: 'double-stack', patience: 9, maxPatience: 44 },
    { name: 'Garden Burger', recipeId: 'garden-burger', patience: 6, maxPatience: 44 },
    { name: 'Cheese Melt', recipeId: 'cheese-melt', patience: 14, maxPatience: 44 },
  ]);
  state.player.x = 830;
  state.player.y = 440;
  state.player.carrying = { kind: 'plate', items: ['bun', 'patty-cooked', 'cheese'] };
  state.grill[0] = { stage: 'cooked', time: 0.5 };
  state.grill[1] = { stage: 'burnt', time: 0 };
  state.over = true;
  state.stars = 3;
  return { screen: SCREEN_OVER, best: 420 };
}
