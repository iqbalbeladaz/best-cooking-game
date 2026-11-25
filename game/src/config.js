// The Copper Ladle — configuration: the kitchen, its stations, ingredients and recipes.
// One file, one job: every number and name the rest of the game shares lives here.
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'copper-ladle-best-coins';
export const SHIFT_SECONDS = 150;
export const PLAYER = { radius: 20, speed: 235 };
export const INTERACT_DIST = 78;

// Order board: the strip across the top of the kitchen.
export const BOARD = { x: 0, y: 0, width: 960, height: 88 };
export const MAX_ORDERS = 3;
export const ORDER_GAP_SECONDS = 13;
export const ORDER_PATIENCE = 52;

// Grill: a raw patty cooks, then overcooks and burns.
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 6;
export const CHOP_SECONDS = 1.4;

// Every ingredient the pantry stocks, with its colour, chop rule and draw shape.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e2483d', choppable: true, chopped: 'tomato-chopped' },
  lettuce: { name: 'Lettuce', color: '#69b455', choppable: true, chopped: 'lettuce-chopped' },
  onion: { name: 'Onion', color: '#e8d8f0', choppable: true, chopped: 'onion-chopped' },
  cheese: { name: 'Cheese', color: '#f5c542', choppable: false, chopped: null },
  patty: { name: 'Patty', color: '#b06a4a', choppable: false, chopped: null },
  bun: { name: 'Bun', color: '#e8b06a', choppable: false, chopped: null },
};

// The menu: four dishes, each a multiset of prepared ingredients on one plate.
export const RECIPES = [
  {
    id: 'garden-burger',
    name: 'Garden Burger',
    base: 30,
    items: ['bun', 'patty-cooked', 'lettuce-chopped', 'tomato-chopped'],
  },
  {
    id: 'cheese-melt',
    name: 'Cheese Melt',
    base: 25,
    items: ['bun', 'patty-cooked', 'cheese'],
  },
  {
    id: 'garden-salad',
    name: 'Garden Salad',
    base: 20,
    items: ['lettuce-chopped', 'tomato-chopped', 'onion-chopped'],
  },
  {
    id: 'double-stack',
    name: 'Double Stack',
    base: 40,
    items: ['bun', 'patty-cooked', 'patty-cooked', 'cheese', 'lettuce-chopped'],
  },
];

// Stations: rectangles the chef walks around and uses. kind drives the interaction.
export const STATIONS = [
  { id: 'pantry-tomato', kind: 'pantry', item: 'tomato', x: 18, y: 108, w: 78, h: 52 },
  { id: 'pantry-lettuce', kind: 'pantry', item: 'lettuce', x: 18, y: 168, w: 78, h: 52 },
  { id: 'pantry-onion', kind: 'pantry', item: 'onion', x: 18, y: 228, w: 78, h: 52 },
  { id: 'pantry-cheese', kind: 'pantry', item: 'cheese', x: 18, y: 288, w: 78, h: 52 },
  { id: 'pantry-patty', kind: 'pantry', item: 'patty', x: 18, y: 348, w: 78, h: 52 },
  { id: 'pantry-bun', kind: 'pantry', item: 'bun', x: 18, y: 408, w: 78, h: 52 },
  { id: 'chop', kind: 'chop', x: 700, y: 104, w: 120, h: 64 },
  { id: 'grill', kind: 'grill', x: 700, y: 184, w: 150, h: 84 },
  { id: 'plates', kind: 'plates', x: 252, y: 486, w: 76, h: 66 },
  { id: 'assembly', kind: 'assembly', x: 344, y: 486, w: 280, h: 66 },
  { id: 'serve', kind: 'serve', x: 872, y: 380, w: 72, h: 140 },
  { id: 'bin', kind: 'bin', x: 128, y: 496, w: 64, h: 56 },
];

// Where the chef stands to use a station (its approach point).
export function stationApproach(station) {
  if (station.kind === 'serve') return { x: station.x - 34, y: station.y + station.h / 2 };
  if (station.kind === 'pantry') return { x: station.x + station.w + 34, y: station.y + station.h / 2 };
  if (station.y < 300) return { x: station.x + station.w / 2, y: station.y + station.h + 34 };
  return { x: station.x + station.w / 2, y: station.y - 34 };
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

/** Short label for a carried thing, for the HUD and the hint line. */
export function itemLabel(item) {
  if (item === null) return 'empty hands';
  if (item.kind === 'plate') {
    return item.items.length === 0 ? 'empty plate' : `plate (${item.items.length} item${item.items.length === 1 ? '' : 's'})`;
  }
  if (item.id === 'patty-cooked') return 'cooked patty';
  if (item.id === 'patty-burnt') return 'burnt patty';
  if (item.id === 'patty-raw') return 'raw patty';
  if (item.id.endsWith('-chopped')) return `chopped ${INGREDIENTS[item.id.replace('-chopped', '')].name.toLowerCase()}`;
  return INGREDIENTS[item.id].name;
}
