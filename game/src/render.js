// The Copper Ladle — the renderer: every pixel of the kitchen, drawn with canvas 2D.
// One file, one job: it paints a world state. It never changes the rules.
import { BOARD, FIELD, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, INGREDIENTS, RECIPES, STATIONS, recipeById } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 48;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** One ingredient, drawn as a little icon. `size` is its bounding box. */
export function drawIngredient(ctx, id, x, y, size) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'tomato':
      ctx.fillStyle = '#e2483d';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d33';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.36, s * 0.2, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'tomato-chopped':
      ctx.fillStyle = '#e2483d';
      for (const [dx, dy] of [[-0.22, 0.1], [0.2, -0.08], [0.05, 0.24]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f2b8b5';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'lettuce':
      ctx.fillStyle = '#69b455';
      for (const [dx, dy] of [[-0.18, 0], [0.18, 0], [0, -0.16]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#4a8a3e';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.28);
      ctx.stroke();
      break;
    case 'lettuce-chopped':
      ctx.fillStyle = '#7cc46a';
      for (const [dx, dy, r] of [[-0.2, 0.08, 0], [0.18, -0.1, 0.5], [0.02, 0.22, 1.1]]) {
        ctx.save();
        ctx.translate(dx * s, dy * s);
        ctx.rotate(r);
        ctx.fillRect(-s * 0.2, -s * 0.07, s * 0.4, s * 0.14);
        ctx.restore();
      }
      break;
    case 'onion':
      ctx.fillStyle = '#e8d8f0';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b48ec4';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'onion-chopped':
      ctx.fillStyle = '#efe4f5';
      for (const [dx, dy] of [[-0.2, 0.05], [0.16, -0.12], [0.05, 0.2]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#b48ec4';
      ctx.lineWidth = s * 0.04;
      for (const [dx, dy] of [[-0.2, 0.05], [0.16, -0.12], [0.05, 0.2]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.08, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'cheese':
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.3);
      ctx.lineTo(s * 0.42, s * 0.3);
      ctx.lineTo(0, -s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9a520';
      for (const [dx, dy] of [[-0.12, 0.08], [0.14, 0.14]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'patty':
    case 'patty-raw':
      ctx.fillStyle = '#b06a4a';
      roundRect(ctx, -s * 0.44, -s * 0.22, s * 0.88, s * 0.44, s * 0.18);
      ctx.fill();
      break;
    case 'patty-cooked':
      ctx.fillStyle = '#7a4a2e';
      roundRect(ctx, -s * 0.44, -s * 0.22, s * 0.88, s * 0.44, s * 0.18);
      ctx.fill();
      ctx.strokeStyle = '#4e2c18';
      ctx.lineWidth = s * 0.06;
      for (const dx of [-0.22, 0, 0.22]) {
        ctx.beginPath();
        ctx.moveTo(dx * s, -s * 0.18);
        ctx.lineTo(dx * s, s * 0.18);
        ctx.stroke();
      }
      break;
    case 'patty-burnt':
      ctx.fillStyle = '#241a14';
      roundRect(ctx, -s * 0.44, -s * 0.22, s * 0.88, s * 0.44, s * 0.18);
      ctx.fill();
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.arc(-s * 0.15, 0, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.18, -s * 0.05, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bun':
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath();
      ctx.arc(0, s * 0.08, s * 0.42, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c98f4e';
      ctx.fillRect(-s * 0.42, s * 0.08, s * 0.84, s * 0.1);
      ctx.fillStyle = '#fff3d6';
      for (const [dx, dy] of [[-0.18, -0.18], [0.05, -0.26], [0.22, -0.12]]) {
        ctx.beginPath();
        ctx.ellipse(dx * s, dy * s, s * 0.05, s * 0.03, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    default:
      break;
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, items, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.62, size * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c2b2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size * 0.26, 0, 0, Math.PI * 2);
  ctx.stroke();
  const n = items.length;
  items.forEach((item, i) => {
    const offset = n === 1 ? 0 : (i - (n - 1) / 2) * size * 0.34;
    drawIngredient(ctx, item, offset, -size * 0.04 - i * 2, size * 0.5);
  });
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }

  function drawFloor() {
    ctx.fillStyle = '#c98f5f';
    ctx.fillRect(0, BOARD.height, FIELD.width, FIELD.height - BOARD.height);
    for (let y = BOARD.height; y < FIELD.height; y += TILE) {
      for (let x = 0; x < FIELD.width; x += TILE) {
        const odd = ((x / TILE + y / TILE) % 2 + 2) % 2 === 0;
        ctx.fillStyle = odd ? '#d19a68' : '#c98a58';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      }
    }
    // A worn rug in the middle of the kitchen, where the chef runs.
    ctx.fillStyle = 'rgba(122, 62, 32, 0.25)';
    roundRect(ctx, 330, 250, 300, 150, 18);
    ctx.fill();
  }

  function drawBoard(state, screen) {
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(0, 0, FIELD.width, BOARD.height);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(0, BOARD.height - 6, FIELD.width, 6);
    text(ctx, 'THE COPPER LADLE', 16, 30, 21, '#ffd166');
    text(ctx, `Coins ${state.coins}`, 16, 58, 17, '#fff3d6');
    if (state.combo > 1) text(ctx, `COMBO ×${state.combo}`, 128, 58, 15, '#ff8fa3');
    // Order tickets.
    for (let i = 0; i < 3; i += 1) {
      const x = 246 + i * 176;
      const order = state.orders[i];
      ctx.fillStyle = order ? '#fff8e7' : 'rgba(255, 248, 231, 0.14)';
      roundRect(ctx, x, 10, 166, 68, 8);
      ctx.fill();
      if (!order) {
        text(ctx, '— waiting —', x + 83, 46, 13, 'rgba(255,248,231,0.65)', 'center');
        continue;
      }
      const recipe = recipeById(order.recipeId);
      const urgent = order.patience <= 10;
      text(ctx, `#${order.id} ${recipe.name}`, x + 10, 28, 13, '#3a2415');
      recipe.items.forEach((item, j) => drawIngredient(ctx, item, x + 22 + j * 26, 46, 22));
      const frac = Math.max(0, order.patience / order.maxPatience);
      ctx.fillStyle = '#e5d9c3';
      roundRect(ctx, x + 10, 62, 146, 8, 4);
      ctx.fill();
      ctx.fillStyle = urgent && Math.floor(state.time * 4) % 2 === 0 ? '#e2483d' : frac > 0.5 ? '#69b455' : frac > 0.25 ? '#f5a623' : '#e2483d';
      roundRect(ctx, x + 10, 62, 146 * frac, 8, 4);
      ctx.fill();
    }
    // The shift clock.
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const low = state.timeLeft <= 30 && screen === SCREEN_PLAY;
    ctx.fillStyle = low && Math.floor(state.time * 3) % 2 === 0 ? '#e2483d' : '#fff3d6';
    roundRect(ctx, 786, 12, 158, 62, 10);
    ctx.fill();
    text(ctx, 'SHIFT', 865, 32, 11, '#8a6a45', 'center');
    text(ctx, clock, 865, 62, 26, low ? '#e2483d' : '#3a2415', 'center');
  }

  function drawStationLabel(station, label, color = '#fff3d6') {
    text(ctx, label, station.x + station.w / 2, station.y + station.h - 6, 11, color, 'center');
  }

  function drawStations(state) {
    for (const station of STATIONS) {
      ctx.save();
      if (station.kind === 'pantry') {
        ctx.fillStyle = '#8a5a2e';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#a9743f';
        ctx.fillRect(station.x + 4, station.y + 4, station.w - 8, station.h - 8);
        ctx.fillStyle = '#f4e8d2';
        ctx.beginPath();
        ctx.arc(station.x + station.w / 2, station.y + station.h / 2 - 6, 17, 0, Math.PI * 2);
        ctx.fill();
        drawIngredient(ctx, station.item, station.x + station.w / 2, station.y + station.h / 2 - 6, 34);
        text(ctx, INGREDIENTS[station.item].name, station.x + station.w / 2, station.y + station.h - 4, 10, '#fff3d6', 'center');
      } else if (station.kind === 'chop') {
        ctx.fillStyle = '#a9805a';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#e8d5b5';
        roundRect(ctx, station.x + 10, station.y + 10, station.w - 20, station.h - 20, 6);
        ctx.fill();
        if (state.chop !== null) {
          drawIngredient(ctx, state.chop.item, station.x + station.w / 2, station.y + station.h / 2 - 2, 30);
          ctx.fillStyle = '#d8c9a8';
          roundRect(ctx, station.x + 14, station.y + station.h - 14, station.w - 28, 7, 3);
          ctx.fill();
          ctx.fillStyle = '#e2483d';
          roundRect(ctx, station.x + 14, station.y + station.h - 14, (station.w - 28) * Math.min(1, state.chop.progress), 7, 3);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#7a5a3a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(station.x + station.w / 2 - 18, station.y + 18);
          ctx.lineTo(station.x + station.w / 2 + 18, station.y + station.h - 18);
          ctx.stroke();
        }
        drawStationLabel(station, 'CHOP', '#7a5a3a');
      } else if (station.kind === 'grill') {
        ctx.fillStyle = '#3a3a40';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#232327';
        roundRect(ctx, station.x + 8, station.y + 8, station.w - 16, station.h - 16, 6);
        ctx.fill();
        ctx.strokeStyle = '#55555e';
        ctx.lineWidth = 2;
        for (let i = 1; i < 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(station.x + 8 + ((station.w - 16) / 5) * i, station.y + 10);
          ctx.lineTo(station.x + 8 + ((station.w - 16) / 5) * i, station.y + station.h - 10);
          ctx.stroke();
        }
        state.grill.forEach((slot, i) => {
          if (slot === null) return;
          const cx = station.x + 42 + i * 66;
          const cy = station.y + station.h / 2 - 4;
          drawIngredient(ctx, slot.stage === 'cooking' ? 'patty-raw' : slot.stage === 'cooked' ? 'patty-cooked' : 'patty-burnt', cx, cy, 44);
          const total = slot.stage === 'cooking' ? GRILL_COOK_SECONDS : GRILL_BURN_SECONDS;
          const frac = Math.min(1, slot.time / total);
          ctx.strokeStyle = slot.stage === 'cooked' ? '#69b455' : slot.stage === 'burnt' ? '#e2483d' : '#f5a623';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, 28, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();
          if (slot.stage === 'cooked') text(ctx, 'READY', cx, station.y + station.h + 15, 11, '#2e7d32', 'center');
          if (slot.stage === 'burnt') text(ctx, 'BURNT!', cx, station.y + station.h + 15, 11, '#e2483d', 'center');
        });
        drawStationLabel(station, 'GRILL');
      } else if (station.kind === 'plates') {
        ctx.fillStyle = '#7a5a3a';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = '#f4f1ea';
          ctx.beginPath();
          ctx.ellipse(station.x + station.w / 2, station.y + 22 + i * 12, 26, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawStationLabel(station, 'PLATES');
      } else if (station.kind === 'assembly') {
        ctx.fillStyle = '#b98a5a';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#d9b183';
        ctx.fillRect(station.x + 6, station.y + 6, station.w - 12, station.h - 12);
        if (state.assemblyPlate !== null) {
          drawPlate(ctx, station.x + station.w / 2, station.y + station.h / 2 + 4, state.assemblyPlate.items, 56);
        } else {
          text(ctx, 'build the dish here', station.x + station.w / 2, station.y + station.h / 2 + 5, 12, '#7a5a3a', 'center');
        }
        drawStationLabel(station, 'ASSEMBLY', '#7a5a3a');
      } else if (station.kind === 'serve') {
        ctx.fillStyle = '#8a2f2f';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#5a1e1e';
        ctx.fillRect(station.x + 8, station.y + 8, station.w - 16, station.h - 16);
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(station.x + station.w / 2, station.y + 34, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(station.x + station.w / 2 - 14, station.y + 34, 28, 4);
        text(ctx, 'SERVE', station.x + station.w / 2, station.y + 74, 15, '#ffd166', 'center');
        text(ctx, 'window', station.x + station.w / 2, station.y + 92, 11, '#fff3d6', 'center');
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(station.x + station.w / 2, station.y + station.h - 22);
        ctx.lineTo(station.x + station.w / 2 - 10, station.y + station.h - 8);
        ctx.lineTo(station.x + station.w / 2 + 10, station.y + station.h - 8);
        ctx.closePath();
        ctx.fill();
      } else if (station.kind === 'bin') {
        ctx.fillStyle = '#4a4a52';
        roundRect(ctx, station.x, station.y, station.w, station.h, 8);
        ctx.fill();
        ctx.fillStyle = '#2e2e33';
        roundRect(ctx, station.x + 8, station.y + 8, station.w - 16, station.h - 16, 6);
        ctx.fill();
        drawStationLabel(station, 'BIN');
      }
      ctx.restore();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    ctx.save();
    ctx.translate(player.x, player.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: white chef's jacket.
    ctx.fillStyle = '#f8f5ef';
    ctx.beginPath();
    ctx.arc(0, 4, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2483d';
    ctx.fillRect(-3, -2, 6, 14);
    // Head and toque.
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6, -22, 7, 0, Math.PI * 2);
    ctx.arc(6, -22, 7, 0, Math.PI * 2);
    ctx.arc(0, -25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, -24, 22, 5);
    // Eyes.
    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.arc(-4, -15, 1.6, 0, Math.PI * 2);
    ctx.arc(4, -15, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // What the chef carries, held up high.
    const hands = player.carrying;
    if (hands !== null) {
      if (hands.kind === 'plate') {
        drawPlate(ctx, 0, -42, hands.items, 40);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(0, -42, 15, 0, Math.PI * 2);
        ctx.fill();
        drawIngredient(ctx, hands.id, 0, -42, 26);
      }
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const popup of state.popups) {
      ctx.globalAlpha = Math.min(1, popup.life);
      text(ctx, popup.text, popup.x, popup.y, 18, '#ffd166', 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawHint(state) {
    ctx.fillStyle = 'rgba(30, 16, 8, 0.72)';
    ctx.fillRect(0, FIELD.height - 26, FIELD.width, 26);
    text(ctx, state.hint, 12, FIELD.height - 8, 13, '#ffe9c4');
    text(ctx, 'E interact · P pause · M mute', FIELD.width - 12, FIELD.height - 8, 12, '#c9a98a', 'right');
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(20, 10, 5, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 180, 96, 600, 380, 16);
    ctx.fill();
    text(ctx, 'THE COPPER LADLE', 480, 158, 42, '#8a2f2f', 'center');
    text(ctx, 'a fast little kitchen game', 480, 188, 17, '#6b4423', 'center');
    text(ctx, 'Orders pile up on the board. Chop it, grill it,', 480, 232, 16, '#3a2415', 'center');
    text(ctx, 'build it on a plate — and serve it before the', 480, 256, 16, '#3a2415', 'center');
    text(ctx, 'ticket runs out. Burnt patties go in the bin.', 480, 280, 16, '#3a2415', 'center');
    text(ctx, 'WASD / arrows — move      E or click — use a station', 480, 322, 15, '#3a2415', 'center');
    text(ctx, 'Click a station to walk to it. 150-second shift.', 480, 346, 15, '#3a2415', 'center');
    text(ctx, '3 stars at 320 coins · 2 at 210 · 1 at 110', 480, 372, 14, '#8a6a45', 'center');
    if (best > 0) text(ctx, `Best shift: ${best} coins`, 480, 402, 15, '#2e7d32', 'center');
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text(ctx, 'Press Enter or click to start', 480, 446, 19, '#8a2f2f', 'center');
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20, 10, 5, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 480, 280, 44, '#fff3d6', 'center');
    text(ctx, 'Press P to keep cooking', 480, 318, 17, '#ffe9c4', 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(20, 10, 5, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 230, 110, 500, 360, 16);
    ctx.fill();
    text(ctx, 'SHIFT OVER!', 480, 168, 38, '#8a2f2f', 'center');
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.stars ? '#f5a623' : '#d8c9a8';
      ctx.font = '44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 410 + i * 70, 226);
    }
    text(ctx, `${state.coins} coins earned`, 480, 272, 22, '#3a2415', 'center');
    text(ctx, `${state.served} dishes served · best combo ×${state.bestCombo}`, 480, 304, 16, '#6b4423', 'center');
    text(ctx, `Best shift: ${Math.max(best, state.coins)} coins`, 480, 332, 15, '#2e7d32', 'center');
    const verdict = state.stars === 3 ? 'Head chef material.' : state.stars === 2 ? 'The regulars are happy.' : state.stars === 1 ? 'A solid first shift.' : 'The tickets won this time.';
    text(ctx, verdict, 480, 372, 16, '#3a2415', 'center');
    text(ctx, 'Press Enter to cook again', 480, 428, 17, '#8a2f2f', 'center');
  }

  return {
    draw(state, screen, best) {
      fit();
      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * 8 * state.shake, (Math.random() - 0.5) * 8 * state.shake);
      }
      drawFloor();
      drawStations(state);
      if (screen !== SCREEN_TITLE) drawPlayer(state);
      drawBoard(state, screen);
      drawParticles(state);
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(226, 72, 61, ${0.18 * state.flash})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      if (screen === SCREEN_PLAY) drawHint(state);
      if (screen === SCREEN_TITLE) {
        // The title plays over a kitchen already at work.
        drawPlayer(state);
        drawTitle(state, best);
      }
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_OVER) drawOver(state, best);
      ctx.restore();
    },
  };
}
