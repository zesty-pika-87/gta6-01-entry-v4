// The Palma police: a wanted level that rises with witnessed crime and cools
// when the player hides, cruisers that dispatch from the road edge and chase,
// PIT bumps from the side, a roadblock of two cruisers at 3 stars, foot cops
// who chase and swing, and a helicopter with a searchlight cone at 4 stars.
// Busted happens when a cop reaches the player on foot; Wasted when HP hits 0.

import * as THREE from 'three';
import { WANTED } from './config.js';
import { makeCarMesh } from './vehicles.js';

function makeCopMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.38), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.72;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.16, 10), new THREE.MeshLambertMaterial({ color: 0x10151f }));
  cap.position.y = 1.9;
  g.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legL.position.set(-0.16, 0.31, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legR.position.set(0.16, 0.31, 0);
  g.add(legL, legR);
  g.userData = { legL, legR };
  return g;
}

function makeHeliMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 5.2), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.6), new THREE.MeshLambertMaterial({ color: 0x9fd4ff, emissive: 0x223344 }));
  glass.position.set(0, 0.2, 2.0);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.5), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  tail.position.set(0, 0.3, -4.2);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.7), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.0;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  tailRotor.position.set(0.4, 0.5, -6.2);
  g.add(tailRotor);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(3.4, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  spot.rotation.x = Math.PI;
  spot.position.y = -13;
  g.add(spot);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  g.add(shadow);
  g.userData = { rotor, spot, shadow };
  return g;
}

export function createPolice(scene, rng) {
  const cruisers = [];
  const cops = [];
  let heli = null;
  let roadblock = null;
  let flashT = 0;

  function spawnCruiser(x, z) {
    const mesh = makeCarMesh({ name: 'Palma Cruiser', color: 0x1a2a4a, top: 32, accel: 1.1 }, true);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const c = { mesh, x, z, heading: 0, speed: 0, pitTimer: 0 };
    cruisers.push(c);
    return c;
  }

  function spawnCop(x, z) {
    const mesh = makeCopMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const c = { mesh, x, z, heading: 0, phase: rng.range(0, 6), punchTimer: 0 };
    cops.push(c);
    return c;
  }

  function setRoadblock(on, px, pz, heading) {
    if (roadblock) {
      for (const m of roadblock) scene.remove(m);
      // The block's cruisers leave the chase pool too, or they would drive on invisible.
      for (let i = cruisers.length - 1; i >= 0; i -= 1) {
        if (roadblock.includes(cruisers[i].mesh)) cruisers.splice(i, 1);
      }
      roadblock = null;
    }
    if (!on) return;
    const a = spawnCruiser(px + 5, pz);
    const b = spawnCruiser(px - 5, pz);
    a.mesh.rotation.y = heading + Math.PI / 2;
    b.mesh.rotation.y = heading + Math.PI / 2;
    a.speed = 0; b.speed = 0;
    roadblock = [a.mesh, b.mesh];
    // Two foot cops stand behind the block.
    spawnCop(px + 8, pz + 3);
    spawnCop(px - 8, pz - 3);
  }

  function setHeli(on) {
    if (on && !heli) {
      heli = makeHeliMesh();
      scene.add(heli);
    } else if (!on && heli) {
      scene.remove(heli);
      heli = null;
    }
  }

  function clearAll() {
    for (const c of cruisers) scene.remove(c.mesh);
    cruisers.length = 0;
    for (const c of cops) scene.remove(c.mesh);
    cops.length = 0;
    setRoadblock(false);
    setHeli(false);
  }

  function update(dt, state, player, car, t, onBusted, onHeliShot) {
    // Wanted stars follow heat; heat cools after a quiet stretch.
    if (state.heat > 0 && t - state.lastCrimeAt > WANTED.decayDelay) {
      state.heat = Math.max(0, state.heat - WANTED.decayRate * dt);
    }
    const want = Math.min(5, Math.floor(state.heat + 0.001));
    state.wanted = want;

    const px = player.x;
    const pz = player.z;
    // Dispatch cruisers up to the wanted level; extras leave when heat cools.
    const wantCruisers = state.inCar ? Math.min(want, WANTED.maxCruisers) : Math.min(want, 2);
    while (cruisers.filter((c) => !roadblock || !roadblock.includes(c.mesh)).length < wantCruisers) {
      const a = rng.range(0, Math.PI * 2);
      spawnCruiser(px + Math.sin(a) * 55, pz + Math.cos(a) * 55);
    }
    while (cruisers.filter((c) => !roadblock || !roadblock.includes(c.mesh)).length > wantCruisers) {
      const c = cruisers.find((cc) => !roadblock || !roadblock.includes(cc.mesh));
      if (!c) break;
      scene.remove(c.mesh);
      cruisers.splice(cruisers.indexOf(c), 1);
    }
    // Foot cops: more of them when the player is on foot and wanted.
    const wantCops = state.inCar ? 0 : Math.min(want, 3);
    while (cops.length < wantCops) {
      const a = rng.range(0, Math.PI * 2);
      spawnCop(px + Math.sin(a) * 22, pz + Math.cos(a) * 22);
    }
    while (cops.length > wantCops) {
      const c = cops.pop();
      scene.remove(c.mesh);
    }
    // Roadblock at 3 stars, helicopter at 4.
    if (want >= WANTED.roadblockAt && !roadblock) setRoadblock(true, px + 26, pz, 0);
    if (want < WANTED.roadblockAt && roadblock) setRoadblock(false);
    setHeli(want >= WANTED.heliAt);

    // Chase: cruisers steer at the player and PIT from the side.
    for (const c of cruisers) {
      if (roadblock && roadblock.includes(c.mesh)) continue;
      const dx = px - c.x;
      const dz = pz - c.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      const targetSpeed = state.inCar ? 30 : 13;
      c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.2);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      // PIT: alongside the player's car, bump it sideways and slow it.
      if (state.inCar && dist < 5.5 && Math.abs(dh) < 1.2) {
        c.pitTimer -= dt;
        if (c.pitTimer <= 0) {
          c.pitTimer = 1.6;
          if (car) {
            car.x += Math.cos(c.heading) * 2.2;
            car.z -= Math.sin(c.heading) * 2.2;
            car.speed *= 0.82;
          }
        }
      }
      // Flash the light bar.
      if (c.mesh.userData.lightBar) {
        flashT += dt;
        const on = Math.floor(flashT * 6) % 2 === 0;
        c.mesh.userData.lightBar.userData.red.material.color.setHex(on ? 0xff3b30 : 0x550000);
        c.mesh.userData.lightBar.userData.blue.material.color.setHex(on ? 0x112244 : 0x2e7dff);
      }
    }
    // Foot cops run at the player and swing when close.
    for (const c of cops) {
      const dx = px - c.x;
      const dz = pz - c.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      c.heading = Math.atan2(dx, dz);
      const speed = 6.2;
      c.x += (dx / dist) * speed * dt;
      c.z += (dz / dist) * speed * dt;
      c.phase += dt * 9;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      c.mesh.userData.legL.rotation.x = Math.sin(c.phase) * 0.6;
      c.mesh.userData.legR.rotation.x = -Math.sin(c.phase) * 0.6;
      c.punchTimer -= dt;
      if (dist < 1.9 && c.punchTimer <= 0) {
        c.punchTimer = 0.9;
        if (onBusted) onBusted('cop');
      }
      // Busted: a cop catches the player on foot.
      if (!state.inCar && dist < 1.4 && onBusted) onBusted('caught');
    }
    // Helicopter: hover above, rotor spinning, spotlight on the player, pot-shots.
    if (heli) {
      const hx = px + Math.sin(t * 0.4) * 8;
      const hz = pz + Math.cos(t * 0.33) * 8;
      heli.position.set(hx, 26 + Math.sin(t * 0.8) * 1.5, hz);
      heli.rotation.y = Math.atan2(px - hx, pz - hz);
      heli.userData.rotor.rotation.y = t * 22;
      heli.userData.shadow.position.set(0, -25.4, 0);
      heli.userData.shadow.rotation.x = -Math.PI / 2;
      if (onHeliShot && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
        if (rng.next() < 0.35) onHeliShot();
      }
    }
  }

  return { update, clearAll, setRoadblock, cruisers, cops, get heli() { return heli; }, get roadblockOn() { return !!roadblock; } };
}
