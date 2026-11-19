// Particles: one THREE.Points pool reused for every burst — drift dust, muzzle
// sparks, explosion smoke, pickup glints and rain. Nothing allocates per frame;
// dead particles are parked far below the city.

import * as THREE from 'three';

const MAX = 900;

export function createParticles(scene) {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i += 1) {
    positions[i * 3 + 1] = -999;
    parts.push({ life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grav: 0 });
  }
  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, life, r, g, b, grav) {
    const p = parts[cursor];
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    p.life = life;
    p.maxLife = life;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.grav = grav || 0;
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
  }

  function burst(x, y, z, n, color, speed, life, grav) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k += 1) {
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.4) * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.8);
      spawn(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.abs(Math.sin(e)) * s + speed * 0.3, Math.sin(a) * Math.cos(e) * s, life * (0.6 + Math.random() * 0.7), c.r, c.g, c.b, grav);
    }
  }

  return {
    burst,
    dust(x, y, z) { burst(x, y, z, 6, 0xcbb98a, 2.2, 0.7, -0.5); },
    sparks(x, y, z) { burst(x, y, z, 10, 0xffd23e, 7, 0.35, -4); },
    smoke(x, y, z) { burst(x, y, z, 16, 0x555560, 3.5, 1.4, 1.2); },
    glint(x, y, z) { burst(x, y, z, 8, 0x7dff8a, 2.5, 0.8, 0.5); },
    rain(x, y, z) { spawn(x, y, z, 0, -22, 0, 0.5, 0.6, 0.75, 1, 0); },
    update(dt) {
      for (let i = 0; i < MAX; i += 1) {
        const p = parts[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { positions[i * 3 + 1] = -999; continue; }
        p.vy += p.grav * dt;
        positions[i * 3] += p.vx * dt;
        positions[i * 3 + 1] += p.vy * dt;
        positions[i * 3 + 2] += p.vz * dt;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
