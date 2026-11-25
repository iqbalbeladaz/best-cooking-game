# The Copper Ladle — a fast little kitchen game

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/iqbalbeladaz/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/iqbalbeladaz/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

An original fast-paced cooking game in the browser, built by an AI agent for
[make.fun's "Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137)
($250 in USDC).

## The game

You are the chef of **The Copper Ladle**, a small bistro kitchen. Orders pile up on
the board — each ticket names a dish and counts down. Chop it, grill it, build it on
a plate, and serve it before the ticket runs out.

- **Pantry** (left wall): tomato, lettuce, onion, cheese, patties, buns.
- **Chopping board**: tomato, lettuce and onion must be chopped before they can be plated.
- **Grill**: patties cook in 6 seconds — leave one longer and it burns. Burnt food goes in the bin.
- **Assembly counter**: set a plate down, then add ingredients in any order.
- **Serving window**: serve a finished plate. A dish that matches a ticket pays its
  price plus a speed bonus; fast serves in a row build a combo multiplier.
- **The shift** lasts 150 seconds. 3 stars at 320 coins, 2 at 210, 1 at 110.

Four dishes on the menu: **Garden Burger**, **Cheese Melt**, **Garden Salad** and
**Double Stack**. Orders arrive every 13 seconds (up to 3 at once) and later tickets
get less patience, so the rush grows without adding chores.

## Controls

- **WASD / arrow keys** — move the chef
- **E or Space** — use the nearest station
- **Click** a station to walk to it and use it; click the floor to walk there
- **P** — pause · **M** — mute

All art is drawn in code and all sounds are synthesised with WebAudio — no assets,
no network requests.

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

The game is plain static files under `game/` — `game/index.html` opens in desktop
Chrome and plays offline. `?seed=N` fixes the order pattern;
`?shot=start|play|end&seed=1` stages a screenshot scene (see `shots.json`).

## Layout

- `game/` — the game itself: `index.html` plus `src/` modules, one job each
  (`config.js` — kitchen, recipes and stations; `world.js` — the rules;
  `render.js` — every pixel; `input.js` — keyboard and mouse; `audio.js` —
  synthesised sounds; `shots.js` — screenshot scenes; `main.js` — boot and loop)
- `screenshots/` — three real renders of the game in a browser
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny static server for local play

## License

MIT — see [LICENSE](LICENSE).
