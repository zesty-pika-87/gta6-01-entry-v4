// Boot and the one loop: Costa Palma starts on the title screen over a slowly
// orbiting camera, plays in real time, and stages deterministic screenshots
// under ?shot=cover|street|board|victory&seed=N. All systems meet here — the
// player on foot or in a stolen car, traffic, pedestrians, police, combat,
// missions, the HUD and the save — and this file is the only place that knows
// how they talk to each other.

import * as THREE from 'three';
import { CITY, COMBAT, MISSIONS, MEDALLION_SPOTS, RACE_CHECKPOINTS, WANTED, CAR_MODELS } from './config.js';
import { makeRng } from './random.js';
import { createInput, ACT_ENTER, ACT_PUNCH, ACT_SHOOT, ACT_HORN, ACT_PAUSE, ACT_BOARD, ACT_MAP, ACT_GARAGE, ACT_RELOAD } from './input.js';
import { createState, addMoney, addChain, currentMission } from './state.js';
import { createAudio } from './audio.js';
import { createMusic } from './music.js';
import { createParticles } from './particles.js';
import { createFeel } from './feel.js';
import { buildWorld } from './world.js';
import { makeCarMesh, driveCar, carSpeedKmh } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createStory } from './story.js';
import { drawMinimap } from './minimap.js';
import { createHud } from './hud.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import { createRenderer, makePlayerMesh } from './render.js';
import { stageShot, putPlayerInCar } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const rng = makeRng(seed);

// A small read handle for automated playtests (and the finalist review):
// position, wanted level, mission and car state, nothing secret.
window.__costaPalma = null;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const render = createRenderer(canvas);
const { scene, camera } = render;
const state = createState();
const input = createInput();
const audio = createAudio();
const music = createMusic();
const particles = createParticles(scene);
const feel = createFeel(camera);
const hud = createHud();
const story = createStory();
const world = buildWorld(scene, rng);
const traffic = createTraffic(scene, rng, 11);
const peds = createPedestrians(scene, rng, 16);
const police = createPolice(scene, rng);
const combat = createCombat(scene, rng);
const missions = createMissions(scene, rng);

// ---- Player and the player's car -------------------------------------------
const player = {
  x: 0, z: 8, heading: Math.PI, mesh: makePlayerMesh(),
  walkPhase: 0, stepTimer: 0,
};
scene.add(player.mesh);
const car = {
  mesh: null, model: CAR_MODELS[1], heading: 0, speed: 0, x: 0, z: 0, active: false,
};
function repaintCar(model, isPolice) {
  if (car.mesh) scene.remove(car.mesh);
  car.mesh = makeCarMesh(model, isPolice);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.visible = car.active;
  scene.add(car.mesh);
}
repaintCar(car.model, false);
car.mesh.visible = false;

const parked = []; // cars the player left behind: { mesh, model, x, z, heading }
let comet = null; // the red Comet of mission 4, parked on Beach Road
const flags = { thugsFor: -1, cometSpawned: false, raceStarted: false, safeHold: 0, raceRivals: [], raceDone: false };
let caughtTimer = 0;
let crashCooldown = 0;
let mapTimer = 0;
let saveTimer = 0;
let medallionMeshes = [];

function announce(text) { statusEl.textContent = text; }

// ---- Collision ---------------------------------------------------------------
function collide(x, z, r) {
  if (x < -132 + r || x > 112 - r || z < -112 + r || z > 112 - r) return true;
  for (const c of world.colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}

function commitCrime(amount) {
  state.heat = Math.min(5, state.heat + amount);
  state.lastCrimeAt = state.time;
}

// ---- Medallions ---------------------------------------------------------------
function buildMedallions() {
  for (const m of medallionMeshes) scene.remove(m);
  medallionMeshes = [];
  MEDALLION_SPOTS.forEach((spot, i) => {
    if (state.medallionGot[i]) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x6a4a00 }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(spot.x, 1.2, spot.z);
    scene.add(mesh);
    medallionMeshes.push(mesh);
  });
}
buildMedallions();

// ---- Stealing, entering, exiting ----------------------------------------------
function nearestStealable() {
  const tc = traffic.nearestCar(player.x, player.z, 4.2);
  if (tc) return { kind: 'traffic', car: tc };
  for (const p of parked) {
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    if (dx * dx + dz * dz < 18) return { kind: 'parked', car: p };
  }
  if (comet) {
    const dx = comet.x - player.x;
    const dz = comet.z - player.z;
    if (dx * dx + dz * dz < 18) return { kind: 'comet', car: comet };
  }
  return null;
}

function enterCar(target) {
  const model = target.car.model;
  if (target.kind === 'traffic') traffic.remove(target.car);
  if (target.kind === 'parked') {
    const i = parked.indexOf(target.car);
    if (i >= 0) parked.splice(i, 1);
    scene.remove(target.car.mesh);
  }
  if (target.kind === 'comet') {
    scene.remove(comet.mesh);
    comet = null;
    state.cometStolen = true;
    story.say('Lena Mar', 'That is the Comet! Now drive — its owner is already shouting.', 5);
  }
  car.model = model;
  car.x = target.car.mesh ? target.car.mesh.position.x : target.car.x;
  car.z = target.car.mesh ? target.car.mesh.position.z : target.car.z;
  car.heading = target.car.mesh ? target.car.mesh.rotation.y : (target.car.heading || 0);
  car.speed = 0;
  car.active = true;
  state.inCar = true;
  state.carName = model.name;
  state.carsStolen += 1;
  addChain(state, 1);
  commitCrime(WANTED.crimeSteal);
  audio.unlock();
  audio.horn();
  player.mesh.visible = false;
  repaintCar(model, false);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.visible = true;
  hud.toast(`STOLE THE ${model.name.toUpperCase()}`, '#ffd23e');
  announce(`Stole the ${model.name}.`);
}

function exitCar() {
  const gx = 30, gz = -66;
  const dx = car.x - gx;
  const dz = car.z - gz;
  player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.4;
  player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.4;
  player.heading = car.heading;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  state.inCar = false;
  state.carName = '';
  state.carSpeedKmh = 0;
  if (dx * dx + dz * dz < 81 && state.garage.length < 4) {
    state.garage.push({ name: car.model.name, color: car.model.color });
    car.active = false;
    car.mesh.visible = false;
    hud.toast(`PARKED IN THE GARAGE (${state.garage.length}/4)`, '#7dff8a');
    story.say('COSTA PALMA', `The ${car.model.name} is safe in your garage now.`, 4);
    saveGame(state);
  } else {
    // Leave it parked where it stands; it can be stolen back.
    const mesh = makeCarMesh(car.model, false);
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    scene.add(mesh);
    parked.push({ mesh, model: car.model, x: car.x, z: car.z, heading: car.heading });
    car.active = false;
    car.mesh.visible = false;
  }
}

// ---- Mission scripting ---------------------------------------------------------
function missionSetup() {
  const m = currentMission(state);
  if (!m) return;
  if (m.id === 4 && !flags.cometSpawned) {
    flags.cometSpawned = true;
    const mesh = makeCarMesh(CAR_MODELS[0], false);
    mesh.position.set(-88, 0, -30);
    mesh.rotation.y = 0;
    scene.add(mesh);
    comet = { mesh, model: CAR_MODELS[0], x: -88, z: -30, heading: 0 };
  }
  if (m.id === 7 && state.missionStep === 0) {
    state.heat = Math.max(state.heat, 3.2);
    state.lastCrimeAt = state.time;
    state.rain = true;
    story.say('Nadia Cruz', 'Three stars and rising. The rain is coming — drive like the city depends on it.', 5);
  }
  if (m.id === 8 && state.missionStep === 0) {
    story.say('Nadia Cruz', 'The warehouse is guarded. Get inside, grab the safe, and do not look back.', 5);
  }
}

function missionStepSpawns() {
  const m = currentMission(state);
  if (!m) return;
  if (m.id === 3 && state.missionStep === 1 && flags.thugsFor !== 3) {
    flags.thugsFor = 3;
    combat.spawnThug(-100, -70, false);
    combat.spawnThug(-92, -62, false);
    combat.spawnThug(-96, -74, false);
    story.say('Old Tomas', 'There they are — Flint\u2019s collectors. Show them the door.', 5);
  }
  if (m.id === 5 && state.missionStep === 1 && flags.thugsFor !== 5) {
    flags.thugsFor = 5;
    combat.spawnThug(-100, 62, true);
    combat.spawnThug(-92, 70, true);
    combat.spawnThug(-104, 68, true);
    combat.spawnThug(-96, 58, true);
    story.say('Silas the Broker', 'Ambush! Four gunmen — use the containers as cover!', 5);
  }
  if (m.id === 6 && state.missionStep === 1 && !flags.raceStarted) {
    flags.raceStarted = true;
    state.raceActive = true;
    state.raceCheckpoint = 0;
    flags.raceRivals = [];
    for (let i = 0; i < 3; i += 1) {
      const model = CAR_MODELS[(i + 2) % CAR_MODELS.length];
      const mesh = makeCarMesh(model, false);
      mesh.position.set(40 + i * 3, 0, 50);
      scene.add(mesh);
      flags.raceRivals.push({ mesh, model, cp: 0, x: 40 + i * 3, z: 50, pace: 7.5 + i * 0.9, timer: 0 });
    }
    story.say('Lena Mar', 'Green light in three… two… Hit every checkpoint. First across the line wins.', 5);
  }
}

function updateRace(dt) {
  if (!state.raceActive) return;
  // Player checkpoints.
  const cp = RACE_CHECKPOINTS[state.raceCheckpoint];
  if (cp) {
    const dx = player.x - cp.x;
    const dz = player.z - cp.z;
    if (dx * dx + dz * dz < 49) {
      state.raceCheckpoint += 1;
      audio.pickup();
      hud.toast(`CHECKPOINT ${state.raceCheckpoint} / 6`, '#39d5ff');
      if (state.raceCheckpoint >= 6) {
        const rivalDone = flags.raceRivals.some((r) => r.cp >= 6);
        if (!rivalDone) {
          state.raceWon = true;
          state.raceActive = false;
          addMoney(state, RACE_REWARD);
          hud.toast('RACE WON — $200', '#7dff8a');
          for (const r of flags.raceRivals) scene.remove(r.mesh);
          flags.raceRivals = [];
        } else {
          // A rival beat the player: restart the race.
          state.raceCheckpoint = 0;
          flags.raceStarted = false;
          state.raceActive = false;
          for (const r of flags.raceRivals) scene.remove(r.mesh);
          flags.raceRivals = [];
          story.say('Lena Mar', 'Too slow — a rival took the line. The Strip runs again tonight. Try once more.', 5);
        }
      }
    }
  }
  // Rivals cruise the checkpoints on a fixed pace.
  for (const r of flags.raceRivals) {
    if (r.cp >= 6) continue;
    const target = RACE_CHECKPOINTS[r.cp];
    const dx = target.x - r.x;
    const dz = target.z - r.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const speed = 26 / r.pace * 3.2;
    r.x += (dx / d) * speed * dt;
    r.z += (dz / d) * speed * dt;
    r.mesh.position.set(r.x, 0, r.z);
    r.mesh.rotation.y = Math.atan2(dx, dz);
    if (d < 5) r.cp += 1;
  }
}

// ---- Damage, busted, wasted ------------------------------------------------------
function damagePlayer(amount) {
  if (state.mode !== 'play') return;
  state.hp -= amount;
  feel.addShake(0.35);
  if (state.hp <= 0) {
    state.hp = 0;
    state.wastedCount += 1;
    state.money = Math.max(0, state.money - 150);
    audio.fail();
    state.mode = 'wasted';
    hud.setScreen('wasted');
    saveGame(state);
    announce('Wasted.');
  }
}

function bustPlayer() {
  if (state.mode !== 'play') return;
  state.bustedCount += 1;
  state.money = Math.max(0, state.money - 150);
  state.heat = 0;
  state.wanted = 0;
  state.chain = 0;
  police.clearAll();
  combat.clearThugs();
  if (state.inCar) { state.inCar = false; car.active = false; car.mesh.visible = false; }
  player.x = 0; player.z = 8; player.heading = Math.PI;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  state.hp = 100;
  audio.fail();
  state.mode = 'busted';
  hud.setScreen('busted');
  saveGame(state);
  announce('Busted.');
}

function respawnAfterFail() {
  state.hp = 100;
  state.heat = 0;
  state.wanted = 0;
  state.chain = 0;
  state.rain = false;
  feel.reset();
  flags.thugsFor = -1;
  flags.raceStarted = false;
  state.raceActive = false;
  player.x = 0; player.z = 8; player.heading = Math.PI;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  missions.startMission(state, state.missionIndex, (who, text) => story.say(who, text, 6));
  missionSetup();
  state.mode = 'play';
  hud.setScreen('none');
  announce('Back on the streets of Costa Palma.');
}

// ---- Modes -----------------------------------------------------------------------
function startPlay(fresh) {
  if (fresh) {
    Object.assign(state, createState());
    state.mode = 'play';
    combat.clearThugs();
    police.clearAll();
    buildMedallions();
    player.x = 0; player.z = 8; player.heading = Math.PI;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
    car.active = false;
    car.mesh.visible = false;
    flags.thugsFor = -1;
    flags.cometSpawned = false;
    flags.raceStarted = false;
    clearSave();
  }
  missions.startMission(state, state.missionIndex, (who, text) => story.say(who, text, 6));
  missionSetup();
  state.mode = 'play';
  hud.setScreen('none');
  audio.unlock();
  music.start();
  music.setIntensity(0);
  announce('Costa Palma. Mission 1: First Key.');
}

function showVictory() {
  state.mode = 'victory';
  state.victoryShown = true;
  particles.confetti(player.x, 3, player.z);
  hud.fillVictory(state);
  hud.setScreen('victory');
  audio.mission();
  saveGame(state);
}

// ---- Input actions -----------------------------------------------------------------
function handleActions(actions) {
  if (state.mode === 'title') return;
  if (actions & ACT_PAUSE) {
    if (state.mode === 'play') { state.mode = 'paused'; hud.setScreen('pause'); }
    else if (state.mode === 'paused') { state.mode = 'play'; hud.setScreen('none'); }
    else if (state.mode === 'board' || state.mode === 'map' || state.mode === 'garage') { state.mode = 'play'; hud.setScreen('none'); }
    return;
  }
  if (state.mode === 'paused') return;
  if (actions & ACT_BOARD) {
    if (state.mode === 'play') {
      state.mode = 'board';
      hud.fillBoard(story.boardRows(state), state.medallions, 12);
      hud.setScreen('board');
    } else if (state.mode === 'board') { state.mode = 'play'; hud.setScreen('none'); }
    return;
  }
  if (actions & ACT_MAP) {
    if (state.mode === 'play') {
      state.mode = 'map';
      drawMinimap(document.getElementById('bigmap'), minimapView());
      hud.setScreen('mapscreen');
    } else if (state.mode === 'map') { state.mode = 'play'; hud.setScreen('none'); }
    return;
  }
  if (actions & ACT_GARAGE) {
    if (state.mode === 'play') {
      state.mode = 'garage';
      hud.fillGarage(state.garage);
      hud.setScreen('garage');
    } else if (state.mode === 'garage') { state.mode = 'play'; hud.setScreen('none'); }
    return;
  }
  if (state.mode !== 'play') return;
  if (actions & ACT_ENTER) {
    audio.unlock();
    if (state.inCar) exitCar();
    else {
      const target = nearestStealable();
      if (target) enterCar(target);
    }
  }
  if (actions & ACT_HORN && state.inCar) audio.horn();
  if (actions & ACT_PUNCH && !state.inCar) {
    audio.punch();
    const hit = combat.punch(player, (thug) => onThugDown(thug));
    if (hit) {
      feel.hitStopMs(60);
      feel.addShake(0.3);
      particles.sparks(player.x + Math.sin(player.heading) * 1.6, 1.3, player.z + Math.cos(player.heading) * 1.6);
      addChain(state, 1);
    }
  }
  if (actions & ACT_SHOOT && !state.inCar && state.ammo > 0 && state.reloadTimer <= 0) {
    state.ammo -= 1;
    audio.shoot();
    feel.addShake(0.12);
    const hit = combat.shoot(player, (thug) => onThugDown(thug), particles);
    if (hit) addChain(state, 1);
    commitCrime(WANTED.crimeShoot);
    peds.scatter(player.x, player.z, 14);
  }
  if (actions & ACT_RELOAD && state.ammo < COMBAT.ammoMax) {
    state.reloadTimer = COMBAT.reloadTime;
  }
}

function onThugDown(thug) {
  state.thugsDown += 1;
  state.kills += 1;
  addChain(state, 2);
  addMoney(state, 40);
  particles.smoke(thug.x, 1, thug.z);
  audio.coin();
  hud.toast(`+$40 · ${state.thugsDown} DOWN`, '#7dff8a');
}

// ---- Minimap view -------------------------------------------------------------------
function minimapView() {
  return {
    player,
    target: missions.targetPos(state),
    medallions: MEDALLION_SPOTS.filter((s, i) => !state.medallionGot[i]),
    cops: police.cops.map((c) => ({ x: c.x, z: c.z })),
    thugs: combat.thugs.map((t) => ({ x: t.x, z: t.z })),
  };
}

// ---- Per-frame update ------------------------------------------------------------------
function updatePlayerOnFoot(dt, drive) {
  const speed = drive.run ? 11 : 7.5;
  if (drive.fwd !== 0 || drive.strafe !== 0) {
    if (drive.strafe !== 0) player.heading += drive.strafe * 2.4 * dt;
    const mx = Math.sin(player.heading) * drive.fwd;
    const mz = Math.cos(player.heading) * drive.fwd;
    const nx = player.x + mx * speed * dt;
    const nz = player.z + mz * speed * dt;
    if (!collide(nx, player.z, 0.7)) player.x = nx;
    if (!collide(player.x, nz, 0.7)) player.z = nz;
    player.walkPhase += dt * speed * 1.6;
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) { player.stepTimer = 0.38; audio.step(); }
  }
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  const swing = Math.sin(player.walkPhase) * 0.5 * (drive.fwd !== 0 || drive.strafe !== 0 ? 1 : 0);
  player.mesh.userData.legL.rotation.x = swing;
  player.mesh.userData.legR.rotation.x = -swing;
  player.mesh.userData.armL.rotation.x = -swing * 0.8;
  player.mesh.userData.armR.rotation.x = swing * 0.8;
}

function step(dt) {
  state.time += dt;
  state.playTime += dt;
  const drive = input.drive();
  const actions = input.takeActions();
  handleActions(actions);
  if (state.mode !== 'play') {
    world.update(dt, state.time);
    particles.update(dt);
    return;
  }
  if (feel.consumeHitStop(dt)) return;

  // Movement: car or feet.
  if (state.inCar) {
    const drifting = driveCar(car, drive, dt, collide, (speed) => {
      audio.crash();
      feel.addShake(0.5);
      particles.dust(car.x, 0.5, car.z);
      commitCrime(WANTED.crimeCrash * 0.5);
    });
    if (drifting) {
      particles.dust(car.x - Math.sin(car.heading) * 2, 0.4, car.z - Math.cos(car.heading) * 2);
      audio.skid();
    }
    player.x = car.x;
    player.z = car.z;
    player.heading = car.heading;
    state.carSpeedKmh = carSpeedKmh(car);
    audio.engine(Math.abs(car.speed) / 34, true);
    // Hit a pedestrian while driving: a crime, and the ped flees.
    const ped = peds.nearest(car.x, car.z, 2.4);
    if (ped && Math.abs(car.speed) > 5) {
      ped.x += Math.sin(car.heading) * 3;
      ped.z += Math.cos(car.heading) * 3;
      ped.wait = 3;
      commitCrime(WANTED.crimeHitPed);
      addChain(state, 1);
      audio.crash();
      feel.addShake(0.4);
    }
    // Bump traffic: slow down, small heat.
    crashCooldown -= dt;
    for (const tc of traffic.cars) {
      const dx = tc.mesh.position.x - car.x;
      const dz = tc.mesh.position.z - car.z;
      if (dx * dx + dz * dz < 10.2) {
        car.speed *= 0.55;
        if (crashCooldown <= 0) {
          crashCooldown = 1.2;
          audio.crash();
          feel.addShake(0.3);
          commitCrime(WANTED.crimeCrash);
        }
      }
    }
  } else {
    updatePlayerOnFoot(dt, drive);
    state.carSpeedKmh = 0;
    audio.engine(0, false);
  }

  // Reload timer.
  if (state.reloadTimer > 0) {
    state.reloadTimer -= dt;
    if (state.reloadTimer <= 0) {
      state.ammo = Math.min(COMBAT.ammoMax, state.ammo + 12);
      audio.click();
    }
  }

  // Chain decays when the player goes quiet.
  if (state.chain > 0) {
    state.chainTimer -= dt;
    if (state.chainTimer <= 0) {
      if (state.chain >= 5) {
        const bonus = state.chain * 10;
        addMoney(state, bonus);
        hud.toast(`CHAIN BONUS +$${bonus}`, '#7dff8a');
      }
      state.chain = 0;
    }
  }

  // Medallions.
  MEDALLION_SPOTS.forEach((spot, i) => {
    if (state.medallionGot[i]) return;
    const dx = player.x - spot.x;
    const dz = player.z - spot.z;
    if (dx * dx + dz * dz < 4) {
      state.medallionGot[i] = true;
      state.medallions += 1;
      addMoney(state, 50);
      particles.glint(spot.x, 1.5, spot.z);
      audio.coin();
      hud.toast(`SUN MEDALLION ${state.medallions}/12 · +$50`, '#ffd23e');
      buildMedallions();
    }
  });
  for (const m of medallionMeshes) m.rotation.y += dt * 2;

  // Mission scripting and progress.
  missionSetup();
  missionStepSpawns();
  const m = currentMission(state);
  if (m && m.id === 8 && state.missionStep === 1 && !state.safeGrabbed) {
    const dx = player.x - (-96);
    const dz = player.z - 52;
    if (dx * dx + dz * dz < 16) {
      flags.safeHold += dt;
      if (flags.safeHold > 1.2) {
        state.safeGrabbed = true;
        state.heat = Math.max(state.heat, 4.2);
        state.lastCrimeAt = state.time;
        story.say('Nadia Cruz', 'The safe is yours! Now run — the helicopter is already in the air.', 5);
        audio.mission();
      }
    } else flags.safeHold = 0;
  }
  updateRace(dt);
  const result = missions.advance(state, { playerPos: player });
  if (result && result.completed) {
    story.missionDone(result.completed);
    audio.mission();
    hud.toast(`MISSION COMPLETE — $${result.completed.reward.toLocaleString('en-US')}`, '#7dff8a');
    combat.clearThugs();
    state.raceActive = false;
    flags.raceStarted = false;
    flags.thugsFor = -1;
    saveGame(state);
    if (!result.nextMission) {
      showVictory();
      return;
    }
    missions.startMission(state, state.missionIndex, (who, text) => story.say(who, text, 6));
    missionSetup();
  }

  // The living city.
  traffic.update(dt, player, state.inCar);
  peds.update(dt, player, null);
  police.update(dt, state, player, car, state.time, (kind) => {
    if (kind === 'cop') damagePlayer(12);
    else if (kind === 'caught') {
      caughtTimer += dt;
      if (caughtTimer > 1.0) { caughtTimer = 0; bustPlayer(); }
    }
  }, () => damagePlayer(5));
  if (state.wanted === 0) caughtTimer = 0;
  combat.update(dt, state, player, camera, (thug) => onThugDown(thug), (dmg) => damagePlayer(dmg), particles);
  missions.update(dt, state, player, state.time);
  world.update(dt, state.time);
  particles.update(dt);
  story.update(dt, (who, text) => hud.showDialog(who, text), () => hud.hideDialog());
  music.setIntensity(state.wanted);
  audio.siren(state.wanted >= 1, dt);

  // Rain on mission 7 and the finale: streaks falling around the player.
  if (state.rain) {
    for (let i = 0; i < 6; i += 1) {
      particles.rain(player.x + (Math.random() - 0.5) * 40, 18 + Math.random() * 6, player.z + (Math.random() - 0.5) * 40);
    }
  }

  // Camera follows the player or the car.
  feel.updateCamera(dt, { x: player.x, y: 0, z: player.z }, player.heading, state.inCar, Math.abs(car.speed || 0) / 34, state.time);

  // HUD + minimap.
  hud.update(state, missions.objectiveText(state), player, missions.targetPos(state), dt);
  mapTimer -= dt;
  if (mapTimer <= 0) {
    mapTimer = 0.15;
    drawMinimap(document.getElementById('minimap'), minimapView());
  }
  saveTimer -= dt;
  if (saveTimer <= 0) {
    saveTimer = 20;
    saveGame(state);
  }
}

// ---- Buttons ----------------------------------------------------------------------
document.getElementById('btnContinue').addEventListener('click', () => {
  if (hasSave()) loadGame(state);
  buildMedallions();
  startPlay(false);
});
document.getElementById('btnNew').addEventListener('click', () => startPlay(true));
document.getElementById('btnResume').addEventListener('click', () => { state.mode = 'play'; hud.setScreen('none'); });
document.getElementById('btnQuitTitle').addEventListener('click', () => { state.mode = 'title'; hud.setScreen('title'); saveGame(state); });
document.getElementById('btnBustedRetry').addEventListener('click', respawnAfterFail);
document.getElementById('btnWastedRetry').addEventListener('click', respawnAfterFail);
document.getElementById('btnPlayAgain').addEventListener('click', () => startPlay(true));
document.getElementById('btnKeepCruising').addEventListener('click', () => {
  state.mode = 'play';
  hud.setScreen('none');
  state.heat = 0;
  state.wanted = 0;
});
document.getElementById('btnCloseGarage').addEventListener('click', () => { state.mode = 'play'; hud.setScreen('none'); });
document.getElementById('garageTable').addEventListener('click', (event) => {
  const row = event.target.closest('tr');
  if (!row || state.garage.length === 0) return;
  const index = row.rowIndex;
  const taken = state.garage.splice(index, 1)[0];
  if (!taken) return;
  const model = CAR_MODELS.find((c) => c.name === taken.name) || CAR_MODELS[1];
  car.model = model;
  car.x = 30; car.z = -52; car.heading = Math.PI; car.speed = 0; car.active = true;
  state.inCar = true;
  state.carName = model.name;
  player.x = car.x; player.z = car.z; player.heading = car.heading;
  player.mesh.visible = false;
  repaintCar(model, false);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.visible = true;
  state.mode = 'play';
  hud.setScreen('none');
  hud.toast(`TOOK THE ${model.name.toUpperCase()} OUT`, '#ffd23e');
});

// ---- Main loop --------------------------------------------------------------------
window.__costaPalma = {
  state, player, car, missions, traffic, peds, police, combat,
  teleport(x, z) { player.x = x; player.z = z; if (!state.inCar) { player.mesh.position.set(x, 0, z); } },
};
let last = performance.now();
let orbitAngle = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (state.mode === 'title') {
    orbitAngle += dt * 0.06;
    const cx = Math.sin(orbitAngle) * 55;
    const cz = Math.cos(orbitAngle) * 55;
    camera.position.set(cx, 26, cz);
    camera.lookAt(0, 4, 0);
    world.update(dt, state.time);
    state.time += dt;
    particles.update(dt);
    render.render();
    return;
  }
  step(dt);
  render.render();
}

if (shotName) {
  // Deterministic screenshot staging: build the scene, stage it, paint, signal.
  state.mode = 'play';
  hud.setScreen('none');
  const mode = stageShot(shotName, {
    state, player, car, missions, story, police, combat, hud, traffic, peds, world,
    repaintCar,
  });
  if (mode === 'board') hud.setScreen('board');
  else if (mode === 'victory') hud.setScreen('victory');
  else hud.setScreen('none');
  // Let the world settle: a few fixed steps of traffic, peds and particles.
  for (let i = 0; i < 30; i += 1) {
    traffic.update(1 / 60, player, state.inCar);
    peds.update(1 / 60, player, null);
    world.update(1 / 60, 100 + i / 60);
    particles.update(1 / 60);
  }
  story.update(0.01, (who, text) => hud.showDialog(who, text), () => hud.hideDialog());
  missions.update(0.016, state, player, 100);
  hud.update(state, missions.objectiveText(state), player, missions.targetPos(state), 0.016);
  drawMinimap(document.getElementById('minimap'), minimapView());
  feel.snapTo({ x: player.x, y: 0, z: player.z }, player.heading, state.inCar);
  let painted = 0;
  function paintShot() {
    render.render();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  if (hasSave()) {
    document.getElementById('btnContinue').style.display = 'inline-block';
  } else {
    document.getElementById('btnContinue').style.display = 'none';
  }
  hud.setScreen('title');
  requestAnimationFrame(frame);
}
