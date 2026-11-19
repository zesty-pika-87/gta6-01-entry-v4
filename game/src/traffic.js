// Traffic: AI cars that drive the road grid in lanes, turn at intersections,
// slow down for the car ahead and swerve a little when something blocks them.
// Sedans, a yellow taxi, a van, a sport car and a truck — the same models the
// player can steal. Traffic cars are also stealable: walk up and press E.

import * as THREE from 'three';
import { CITY, CAR_MODELS } from './config.js';
import { makeCarMesh } from './vehicles.js';

const ROADS = CITY.roadAt;
const LANE = 2.3;

export function createTraffic(scene, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const model = rng.pick(CAR_MODELS);
    const mesh = makeCarMesh(model, false);
    scene.add(mesh);
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const road = rng.pick(ROADS);
    const dir = rng.sign();
    const lane = rng.sign() * LANE;
    const car = {
      mesh, model, axis, road, dir,
      pos: rng.range(-100, 100),
      speed: rng.range(8, 13),
      baseSpeed: 0,
      stuck: 0,
    };
    car.baseSpeed = car.speed;
    cars.push(car);
  }

  function place(car) {
    if (car.axis === 'x') {
      car.mesh.position.set(car.pos, 0, car.road + (car.dir > 0 ? -LANE : LANE));
      car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.mesh.position.set(car.road + (car.dir > 0 ? LANE : -LANE), 0, car.pos);
      car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
    }
  }

  function nearestAhead(car) {
    let best = 999;
    for (const other of cars) {
      if (other === car || other.axis !== car.axis || other.road !== car.road || other.dir !== car.dir) continue;
      const gap = (other.pos - car.pos) * car.dir;
      if (gap > 0 && gap < best) best = gap;
    }
    return best;
  }

  function update(dt, playerPos, playerInCar) {
    for (const car of cars) {
      // Slow for the car ahead; stop at a near standstill if boxed in.
      const gap = nearestAhead(car);
      let target = car.baseSpeed;
      if (gap < 12) target = Math.max(0, car.baseSpeed * (gap - 4) / 8);
      // Nervous near the player's car: slow a touch, never ram on purpose.
      if (playerInCar && playerPos) {
        const dx = car.mesh.position.x - playerPos.x;
        const dz = car.mesh.position.z - playerPos.z;
        if (dx * dx + dz * dz < 100) target = Math.min(target, 5);
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 2);
      car.pos += car.dir * car.speed * dt;
      // Turn at an intersection, sometimes; wrap around the city edge.
      const nearRoad = ROADS.find((r) => Math.abs(car.pos - r) < 1.2);
      if (nearRoad !== undefined && rng.next() < dt * 0.9) {
        const oldRoad = car.road; // position along the new axis is the old lane
        car.axis = car.axis === 'x' ? 'z' : 'x';
        car.road = nearRoad;
        car.dir = rng.sign();
        car.pos = oldRoad;
      }
      if (car.pos > 112) car.pos = -112;
      if (car.pos < -112) car.pos = 112;
      place(car);
    }
  }

  function nearestCar(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      const dx = car.mesh.position.x - x;
      const dz = car.mesh.position.z - z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function remove(car) {
    const i = cars.indexOf(car);
    if (i >= 0) cars.splice(i, 1);
    scene.remove(car.mesh);
  }

  function addStolen(mesh, model, x, z, heading) {
    // A car the player left behind rejoins traffic as a parked car that drives off.
    const car = { mesh, model, axis: 'x', road: 0, dir: 1, pos: x, speed: 0, baseSpeed: 9, stuck: 0 };
    car.road = ROADS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
    cars.push(car);
    return car;
  }

  cars.forEach(place);
  return { cars, update, nearestCar, remove, addStolen };
}
