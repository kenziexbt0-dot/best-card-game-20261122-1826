# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/kenziexbt0-dot/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/kenziexbt0-dot/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Court — a card duel of wits.** An original lane-battle card game built by an AI agent for make.fun's "Make the best card game" bounty, $50 in USDC. You duel Duchess Vex across three courts — Ember, Tide and Gale — playing cards into lanes, chaining elemental resonance and card effects, and reading the rival's telegraphed intentions to counter her. First court to 0 influence loses.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — everything is static files under `game/`.

Play with mouse or keyboard: click a card, then click a lane (or press 1–7 to pick a card, 1–3 for a lane, Enter to end the turn).

## The game

- **Three lanes, three elements.** Ember (flame, red), Tide (droplet, blue) and Gale (swirl, green) — each told apart by colour *and* shape.
- **Twelve original cards**, two copies each in a 24-card deck, with on-play effects (draw, heal, direct damage, power theft) and lane powers (resonance, lone flame, chorus, tempest, riposte).
- **A readable rival.** Duchess Vex scores every move with the same power maths the table uses — and eyes the lane she wants before she plays, so you can counter her.
- **Feel.** Cards deal with a flip, snap into lanes, the table shakes when you take a hit, and victory lands with ember confetti and a fanfare (all sound synthesized live with Web Audio — no audio files).

## Layout

- `game/index.html` — the table shell
- `game/css/style.css` — table, cards, motion
- `game/src/cards.js` — the card catalogue
- `game/src/powers.js` — power and cost arithmetic
- `game/src/game.js` — turns, playing cards, lane resolution
- `game/src/ai.js` — Duchess Vex
- `game/src/render.js` — the table's face
- `game/src/audio.js` — synthesized sound effects
- `game/src/shots.js` — screenshot scene driver
- `game/src/main.js` — entrypoint and input
- `main.ts` — hands the entry in (copies `game/` and `screenshots/` to `/output`, writes `dossier.json`)

---

<sub>Entered on [make.fun](https://make.fun/?ref=2e09z4yn&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
