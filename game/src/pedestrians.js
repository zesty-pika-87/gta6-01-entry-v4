// Pedestrians: Costa Palma's street life. Walkers stroll the sidewalks in varied
// shirts and speeds, some cross at the zebra stripes, a few pause and look
// around. They flee when a shot is fired or a car comes at them — and getting
// hit by the player is a crime the police notice.

import * as THREE from 'three';
import { CITY } from './config.js';

const ROADS = CITY.roadAt;
const SHIRTS = [0xd21f2b, 0x3a6fd8, 0x12b76a, 0xf2c200, 0x7a4a8a, 0xe8e2d0, 0xff7a5d, 0x39d5ff];
const SKINS = [0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0];

function makePedMesh(shirt, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.72;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6), new THREE.MeshLambertMaterial({ color: 0x2a1e14 }));
  hair.scale.set(1, 0.6, 1);
  hair.position.y = 1.86;
  g.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legL.position.set(-0.16, 0.31, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legR.position.set(0.16, 0.31, 0);
  g.add(legL, legR);
  g.userData = { legL, legR };
  return g;
}

export function createPedestrians(scene, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePedMesh(rng.pick(SHIRTS), rng.pick(SKINS));
    scene.add(mesh);
    const road = rng.pick(ROADS);
    const side = rng.sign();
    const along = rng.chance(0.5);
    const ped = {
      mesh,
      x: along ? rng.range(-100, 100) : road + side * 9.5,
      z: along ? road + side * 9.5 : rng.range(-100, 100),
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.0, 2.2),
      baseSpeed: 0,
      targetX: 0, targetZ: 0,
      wait: 0, walkPhase: rng.range(0, 6),
      fleeing: 0,
      crossing: false,
    };
    ped.baseSpeed = ped.speed;
    retarget(ped);
    peds.push(ped);
  }

  function retarget(ped) {
    // Walk along a sidewalk to a far point; sometimes cross at a zebra instead.
    if (rng.next() < 0.3) {
      const rx = rng.pick(ROADS);
      const rz = rng.pick(ROADS);
      ped.targetX = rx;
      ped.targetZ = rz;
      ped.crossing = true;
    } else {
      const road = rng.pick(ROADS);
      const side = rng.sign();
      if (rng.chance(0.5)) { ped.targetX = rng.range(-100, 100); ped.targetZ = road + side * 9.5; }
      else { ped.targetX = road + side * 9.5; ped.targetZ = rng.range(-100, 100); }
      ped.crossing = false;
    }
  }

  function update(dt, playerPos, dangerAt) {
    for (const ped of peds) {
      if (ped.wait > 0) {
        ped.wait -= dt;
        continue;
      }
      const dx = ped.targetX - ped.x;
      const dz = ped.targetZ - ped.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.2) {
        if (rng.next() < 0.25) ped.wait = rng.range(1, 4);
        retarget(ped);
        continue;
      }
      let speed = ped.speed;
      // Flee from gunfire or a speeding car: run away from the danger point.
      if (dangerAt) {
        const ddx = ped.x - dangerAt.x;
        const ddz = ped.z - dangerAt.z;
        const dd = Math.sqrt(ddx * ddx + ddz * ddz);
        if (dd < 14) {
          ped.targetX = ped.x + (ddx / (dd || 1)) * 20;
          ped.targetZ = ped.z + (ddz / (dd || 1)) * 20;
          speed = ped.baseSpeed * 2.6;
          ped.fleeing = 2;
        }
      }
      const mx = dx / dist;
      const mz = dz / dist;
      ped.x += mx * speed * dt;
      ped.z += mz * speed * dt;
      ped.heading = Math.atan2(mx, mz);
      ped.walkPhase += dt * speed * 4;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
      const swing = Math.sin(ped.walkPhase) * 0.45;
      ped.mesh.userData.legL.rotation.x = swing;
      ped.mesh.userData.legR.rotation.x = -swing;
    }
  }

  function nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const ped of peds) {
      const dx = ped.x - x;
      const dz = ped.z - z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }

  return { peds, update, nearest };
}
