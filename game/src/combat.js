// Combat: fists and a pistol, thugs who fight back, pickups, and the Busted /
// Wasted outcomes. A punch is a short arc in front of the player with a hit-stop
// and a shake; a shot is a hitscan ray with a tracer and a spark. Thugs carry a
// small health bar over their heads and drop cash, health or ammo when they fall.

import * as THREE from 'three';
import { COMBAT } from './config.js';

function makeThugMesh(armed) {
  const g = new THREE.Group();
  const shirt = armed ? 0x3a3f46 : 0x6a3a3a;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.9, 0.4), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
  head.position.y = 1.72;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x22242c });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legL.position.set(-0.16, 0.31, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legR.position.set(0.16, 0.31, 0);
  g.add(legL, legR);
  // Health bar: dark backing + green fill, billboarded toward the camera.
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.14), new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.85, depthWrite: false }));
  barBg.position.y = 2.25;
  const barFg = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.1), new THREE.MeshBasicMaterial({ color: 0x37e05c, transparent: true, opacity: 0.95, depthWrite: false }));
  barFg.position.set(0, 2.25, 0.01);
  g.add(barBg, barFg);
  g.userData = { legL, legR, barBg, barFg };
  return g;
}

function makePickupMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'hp') {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.2), new THREE.MeshLambertMaterial({ color: 0x37e05c }));
    g.add(box, a, b);
  } else if (kind === 'ammo') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xf2c200 }));
    g.add(box);
  } else {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16), new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x6a4a00 }));
    coin.rotation.x = Math.PI / 2;
    g.add(coin);
  }
  return g;
}

export function createCombat(scene, rng) {
  const thugs = [];
  const pickups = [];
  let tracer = null;
  let tracerLife = 0;

  function spawnThug(x, z, armed) {
    const mesh = makeThugMesh(armed);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const thug = { mesh, x, z, hp: armed ? 90 : 70, maxHp: armed ? 90 : 70, armed: !!armed, heading: 0, phase: rng.range(0, 6), shootTimer: rng.range(1, 2.5), punchTimer: 0, speed: armed ? 4.6 : 4.0 };
    thugs.push(thug);
    return thug;
  }

  function clearThugs() {
    for (const t of thugs) scene.remove(t.mesh);
    thugs.length = 0;
  }

  function spawnPickup(x, z, kind) {
    const mesh = makePickupMesh(kind);
    mesh.position.set(x, 1, z);
    scene.add(mesh);
    pickups.push({ mesh, x, z, kind, t: rng.range(0, 6) });
  }

  function showTracer(from, to) {
    if (!tracer) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
      tracer.frustumCulled = false;
      scene.add(tracer);
    }
    const pos = tracer.geometry.attributes.position.array;
    pos[0] = from.x; pos[1] = from.y; pos[2] = from.z;
    pos[3] = to.x; pos[4] = to.y; pos[5] = to.z;
    tracer.geometry.attributes.position.needsUpdate = true;
    tracerLife = 0.09;
  }

  function update(dt, state, player, camera, onThugDown, onPlayerHit, particles) {
    // Tracer fades fast.
    if (tracer) {
      tracerLife -= dt;
      tracer.visible = tracerLife > 0;
    }
    // Thugs chase the player, punch up close, shoot from range when armed.
    for (const thug of thugs) {
      const dx = player.x - thug.x;
      const dz = player.z - thug.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      thug.heading = Math.atan2(dx, dz);
      if (dist > 2.0) {
        thug.x += (dx / dist) * thug.speed * dt;
        thug.z += (dz / dist) * thug.speed * dt;
      }
      thug.phase += dt * 8;
      thug.mesh.position.set(thug.x, 0, thug.z);
      thug.mesh.rotation.y = thug.heading;
      thug.mesh.userData.legL.rotation.x = Math.sin(thug.phase) * 0.5;
      thug.mesh.userData.legR.rotation.x = -Math.sin(thug.phase) * 0.5;
      // Face the health bar at the camera.
      thug.mesh.userData.barBg.quaternion.copy(camera.quaternion);
      thug.mesh.userData.barFg.quaternion.copy(camera.quaternion);
      thug.punchTimer -= dt;
      thug.shootTimer -= dt;
      if (dist < 2.1 && thug.punchTimer <= 0) {
        thug.punchTimer = 1.0;
        if (onPlayerHit) onPlayerHit(10, thug);
      } else if (thug.armed && dist < 26 && dist > 4 && thug.shootTimer <= 0) {
        thug.shootTimer = rng.range(1.4, 2.6);
        if (onPlayerHit) onPlayerHit(7, thug);
        if (particles) particles.sparks(thug.x, 1.4, thug.z);
      }
    }
    // Pickups bob and spin; the player collects them by walking over.
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const p = pickups[i];
      p.t += dt;
      p.mesh.position.y = 1 + Math.sin(p.t * 3) * 0.15;
      p.mesh.rotation.y = p.t * 2;
      const dx = player.x - p.x;
      const dz = player.z - p.z;
      if (dx * dx + dz * dz < 2.6) {
        scene.remove(p.mesh);
        pickups.splice(i, 1);
        if (p.kind === 'hp') state.hp = Math.min(100, state.hp + 25);
        else if (p.kind === 'ammo') state.ammo = Math.min(COMBAT.ammoMax, state.ammo + 12);
        else if (p.kind === 'cash') { state.money += 50; state.totalEarned += 50; }
      }
    }
  }

  function punch(player, onHit) {
    let hitAny = false;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    for (const thug of thugs) {
      const dx = thug.x - player.x;
      const dz = thug.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > COMBAT.punchRange) continue;
      const dot = (dx * fx + dz * fz) / (dist || 1);
      if (dot < Math.cos(COMBAT.punchArc)) continue;
      thug.hp -= COMBAT.punchDamage;
      thug.x += (dx / (dist || 1)) * 1.2;
      thug.z += (dz / (dist || 1)) * 1.2;
      hitAny = true;
      if (thug.hp <= 0) killThug(thug, onHit);
    }
    return hitAny;
  }

  function shoot(player, onHit, particles) {
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    const from = { x: player.x, y: 1.4, z: player.z };
    let best = null;
    let bestD = COMBAT.shootRange;
    for (const thug of thugs) {
      const dx = thug.x - player.x;
      const dz = thug.z - player.z;
      const along = dx * fx + dz * fz;
      if (along < 0 || along > bestD) continue;
      const perp = Math.abs(dx * fz - dz * fx);
      if (perp > 1.4) continue;
      best = thug;
      bestD = along;
    }
    const to = best
      ? { x: best.x, y: 1.3, z: best.z }
      : { x: player.x + fx * COMBAT.shootRange, y: 1.4, z: player.z + fz * COMBAT.shootRange };
    showTracer(from, to);
    if (particles) particles.sparks(to.x, to.y, to.z);
    if (best) {
      best.hp -= COMBAT.shootDamage;
      if (best.hp <= 0) killThug(best, onHit);
      return true;
    }
    return false;
  }

  function killThug(thug, onHit) {
    const i = thugs.indexOf(thug);
    if (i < 0) return;
    thugs.splice(i, 1);
    scene.remove(thug.mesh);
    // Drops: always some cash, sometimes health or ammo.
    spawnPickup(thug.x + 0.6, thug.z, 'cash');
    if (rng.next() < 0.5) spawnPickup(thug.x - 0.6, thug.z + 0.6, rng.chance(0.5) ? 'hp' : 'ammo');
    if (onHit) onHit(thug);
  }

  return {
    thugs, pickups, spawnThug, clearThugs, spawnPickup, update, punch, shoot,
    setBar(thug) {
      const f = Math.max(0, thug.hp / thug.maxHp);
      thug.mesh.userData.barFg.scale.x = f;
      thug.mesh.userData.barFg.position.x = -(1 - f) * 0.53;
    },
  };
}
