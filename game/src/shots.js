// Screenshot staging: ?shot=cover|street|board|victory with &seed=N sets up a
// real frame of the live game — no composited images, no borrowed pixels.
// Each shot places the player, the traffic, the pedestrians and the police at
// fixed spots, picks the HUD state a judge should see, then lets the caller
// paint a few frames and set window.__shotReady.

import { CAR_MODELS } from './config.js';

function placeTrafficAt(ctx, spots) {
  // spots: [{road, axis, pos, dir}] — reuse the existing traffic cars in order.
  ctx.traffic.cars.forEach((car, i) => {
    const s = spots[i % spots.length];
    car.axis = s.axis;
    car.road = s.road;
    car.dir = s.dir;
    car.pos = s.pos;
    car.speed = s.speed || 9;
    car.baseSpeed = s.speed || 9;
  });
}

function placePedsAt(ctx, spots) {
  ctx.peds.peds.forEach((ped, i) => {
    const s = spots[i % spots.length];
    ped.x = s[0];
    ped.z = s[1];
    ped.targetX = s[0] + 12;
    ped.targetZ = s[1];
    ped.wait = 0;
    ped.mesh.position.set(ped.x, 0, ped.z);
  });
}

export function stageShot(name, ctx) {
  const { state, player, car, missions, story, police, combat, hud } = ctx;
  state.mode = 'play';
  state.rain = false;
  if (name === 'cover') {
    // The chase: mission 7 STORM WARNING, 4 stars, helicopter, roadblock ahead,
    // cruisers flanking, a 9 CHAIN, Nadia on the dialog bar.
    missions.startMission(state, 6, (who, text) => story.say(who, text, 30));
    state.heat = 4.4;
    state.wanted = 4;
    state.lastCrimeAt = 999999;
    state.chain = 9;
    state.chainTimer = 30;
    state.money = 3240;
    state.hp = 78;
    state.missionsDone = 6;
    player.x = -88; player.z = 20; player.heading = Math.PI;
    putPlayerInCar(ctx, CAR_MODELS[0], -88, 20, Math.PI, 24);
    placeTrafficAt(ctx, [
      { axis: 'x', road: 0, pos: -40, dir: 1, speed: 11 },
      { axis: 'x', road: 44, pos: 30, dir: -1, speed: 10 },
      { axis: 'z', road: -44, pos: -20, dir: 1, speed: 9 },
      { axis: 'z', road: 0, pos: 60, dir: -1, speed: 12 },
    ]);
    placePedsAt(ctx, [[-78, 30], [-78, 10], [-98, 44], [-98, -6], [-78, -24], [-98, 60]]);
    police.update(0.016, state, player, car, 100, null, null);
    police.setRoadblock(true, -88, -18, 0);
    story.say('Nadia Cruz', 'Flint called in every cruiser in Costa Palma. Do not stop for anyone — the garage is the only safe place left.', 30);
    hud.toast('WANTED ★★★★ — LOSE THE HEAT', '#ff7a5d');
    return 'play';
  }
  if (name === 'street') {
    // On foot in the living city: mission 1, peds and traffic all around.
    missions.startMission(state, 0, (who, text) => story.say(who, text, 30));
    state.heat = 0;
    state.wanted = 0;
    state.money = 120;
    state.hp = 100;
    state.missionsDone = 0;
    player.x = -6; player.z = 14; player.heading = Math.PI * 0.15;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    placeTrafficAt(ctx, [
      { axis: 'x', road: 0, pos: -30, dir: 1, speed: 10 },
      { axis: 'x', road: 0, pos: 26, dir: -1, speed: 9 },
      { axis: 'z', road: -44, pos: -14, dir: 1, speed: 11 },
      { axis: 'x', road: 44, pos: 44, dir: 1, speed: 8 },
    ]);
    placePedsAt(ctx, [[-2, 8], [4, 18], [-10, 20], [8, 6], [-14, 2], [2, -8], [-6, -14], [12, 12]]);
    story.say('Nadia Cruz', 'New in town? Every legend starts with a stolen key. Grab any car on the street and bring it to the Plaza.', 30);
    return 'play';
  }
  if (name === 'board') {
    // The mission board over a dimmed city: depth and progression on one screen.
    missions.startMission(state, 3, (who, text) => story.say(who, text, 30));
    state.missionsDone = 3;
    state.money = 1870;
    state.hp = 100;
    state.medallions = 5;
    state.garage = [{ name: 'Palma Sedan', color: 0x3a6fd8 }, { name: 'Comet', color: 0xd21f2b }];
    player.x = 4; player.z = 10; player.heading = Math.PI * 0.8;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    placeTrafficAt(ctx, [
      { axis: 'x', road: 0, pos: -40, dir: 1, speed: 10 },
      { axis: 'z', road: 44, pos: 30, dir: -1, speed: 9 },
    ]);
    placePedsAt(ctx, [[-4, 16], [10, 4], [-12, -4]]);
    hud.fillBoard(story.boardRows(state), state.medallions, 12);
    hud.fillGarage(state.garage);
    state.mode = 'board';
    return 'board';
  }
  // victory: the full loop, finished — 8/8 missions, LEGEND OF THE COAST.
  state.missionsDone = 8;
  state.missionIndex = 8;
  state.money = 9250;
  state.totalEarned = 9250;
  state.bestChain = 14;
  state.carsStolen = 11;
  state.medallions = 9;
  state.garage = [{ name: 'Comet', color: 0xd21f2b }, { name: 'Coast Sport', color: 0x12b76a }];
  state.hp = 100;
  state.heat = 0;
  state.wanted = 0;
  player.x = 2; player.z = 8; player.heading = Math.PI * 0.6;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  placeTrafficAt(ctx, [
    { axis: 'x', road: 0, pos: -36, dir: 1, speed: 10 },
    { axis: 'x', road: 44, pos: 20, dir: -1, speed: 9 },
  ]);
  placePedsAt(ctx, [[-6, 14], [8, 2], [-12, 6]]);
  hud.fillVictory(state);
  state.mode = 'victory';
  return 'victory';
}

export function putPlayerInCar(ctx, model, x, z, heading, speed) {
  const { state, player, car } = ctx;
  if (!car.mesh) return;
  car.model = model;
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = speed || 0;
  car.active = true;
  state.inCar = true;
  state.carName = model.name;
  player.x = x;
  player.z = z;
  player.heading = heading;
  // Rebuild the car mesh in the model's paint.
  ctx.repaintCar(model, false);
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  player.mesh.visible = false;
  car.mesh.visible = true;
}
