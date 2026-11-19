# Costa Palma — Make GTA 6

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/zesty-pika-87/gta6-01-entry-v4/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/zesty-pika-87/gta6-01-entry-v4/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game set in **Costa Palma**, a sun-soaked coastal
city at golden hour (18:42). Explore on foot and by stolen car, outrun the
Palma police, and climb from ROOKIE to LEGEND OF THE COAST.

## Screenshots

Four real renders of the game's own code (`?shot=cover|street|board|victory&seed=7`):

1. **1-cover.jpg** — the Storm Warning chase: 4★ wanted, helicopter, roadblock.
2. **2-street.jpg** — on foot in the living city: pedestrians, traffic, palms.
3. **3-board.jpg** — the mission board: 8 named missions, rewards, medallions.
4. **4-victory.jpg** — "COSTA PALMA IS YOURS" with full end-game statistics.

## Play

`node serve.ts`, then open http://localhost:8080 — no build step, no network,
everything is a static file under `game/` (three.js 0.187.0 vendored as
`game/vendor/*.min.js`).

- **WASD** move / drive · **E** enter or steal a car · **F** punch ·
  **SPACE** shoot · **R** reload · **H** horn · **M** map · **TAB** mission board ·
  **G** garage · **P** pause
- **8 story missions**: First Key, The Broker's Errand, Old Tomas's Debt,
  Hot Wheels, Dockside Double-Cross, Neon Run, Storm Warning, The Palma Job.
  Nadia Cruz, Silas the Broker, Old Tomas and Lena Mar vs. Dario Flint's crew.
- **Wanted 1–5★**: cruisers that chase and PIT, roadblocks at 3★, foot cops,
  and a helicopter with a searchlight at 4★. Hide to cool down, or reach the
  garage. Busted and Wasted both cost $150 and restart the current mission.
- **Combat**: melee combos with hit-stop, a pistol with limited ammo and
  pickups, thugs who fight back with health bars, cash drops.
- **Side life**: 12 hidden Sun Medallions, a nightly Neon Strip street race
  ($200), CHAIN combos that pay a bonus, a 4-slot garage, ranks, and a save
  in localStorage.
- **Feel**: procedural WebAudio engine, sirens, gunshots and a beach-synth
  soundtrack that gets hotter with the wanted level; screen shake, drift dust,
  muzzle sparks, rain on the storm missions, swaying palms and neon that
  flickers.

## Structure

One job per file under `game/src/`: `world.js` (the city), `traffic.js`,
`pedestrians.js`, `police.js`, `missions.js`, `story.js`, `combat.js`,
`vehicles.js`, `minimap.js`, `hud.js`, `feel.js`, `audio.js`, `music.js`,
`particles.js`, `save.js`, `input.js`, `render.js`, `config.js`, `state.js`,
`random.js`, `shots.js`, `main.js`.

All names, characters, places, vehicles and music are original — nothing from
any commercial game.
