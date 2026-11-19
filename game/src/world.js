// Costa Palma itself: the road grid, the beach and sea, five districts that feel
// different, buildings with four facade treatments and lit windows, neon signs,
// palms with real fronds, street furniture, the marina, the docks, the plaza
// fountain and the garage. Everything is built from one seed so the city is
// identical on every run. Colliders are plain AABBs the player and cars use.

import * as THREE from 'three';
import { CITY, FACADES, NEON_WORDS, PALETTE } from './config.js';

const ROADS = CITY.roadAt;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function facadeTexture(facade, rng) {
  return canvasTexture(256, 256, (g, w, h) => {
    const base = '#' + facade.base.toString(16).padStart(6, '0');
    const trim = '#' + facade.trim.toString(16).padStart(6, '0');
    const lit = '#' + facade.lit.toString(16).padStart(6, '0');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // Subtle vertical panel seams so the wall is not one flat colour.
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
    // Window grid; a random subset glows warm in the golden hour.
    const cols = 6, rows = 9;
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = c * cw + 6, y = r * ch + 7;
        const litWin = rng.next() < 0.42;
        g.fillStyle = litWin ? lit : 'rgba(12,18,32,0.85)';
        g.fillRect(x, y, cw - 12, ch - 14);
        g.strokeStyle = trim;
        g.lineWidth = 2;
        g.strokeRect(x, y, cw - 12, ch - 14);
        if (litWin) {
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(x, y, cw - 12, 5);
        }
      }
    }
    // Ground floor: shopfront band with awning stripes.
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, h - 30, w, 30);
    for (let x = 0; x < w; x += 24) {
      g.fillStyle = (x / 24) % 2 === 0 ? trim : 'rgba(255,255,255,0.85)';
      g.fillRect(x, h - 30, 24, 10);
    }
  });
}

function signTexture(word, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = 'rgba(8,6,20,0.92)';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.font = '900 64px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(word, w / 2, h / 2 + 2);
  });
}

function billboardTexture(line, sub, color) {
  return canvasTexture(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ff8c42');
    grad.addColorStop(1, '#c2437a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.font = '900 58px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#fff';
    g.shadowColor = 'rgba(0,0,0,0.5)';
    g.shadowBlur = 12;
    g.fillText(line, w / 2, h / 2 - 12);
    g.font = '700 30px "Trebuchet MS", sans-serif';
    g.fillStyle = color;
    g.fillText(sub, w / 2, h / 2 + 46);
  });
}

export function buildWorld(scene, rng) {
  const colliders = [];
  const palms = [];
  const neonMats = [];
  const trafficLights = [];
  let seaMat = null;
  let fountainWater = null;
  let sunGlint = null;

  const addCollider = (x, z, hx, hz) => { colliders.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz }); };
  const lambert = (color, opts) => new THREE.MeshLambertMaterial({ color, ...(opts || {}) });
  const basic = (color, opts) => new THREE.MeshBasicMaterial({ color, ...(opts || {}) });

  // ---- Sky, fog, sun, sea -------------------------------------------------
  scene.background = new THREE.Color(0xff9e5e);
  scene.fog = new THREE.Fog(0xff9e5e, 90, 260);
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3a5e, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 2.1);
  sun.position.set(-90, 55, -40);
  scene.add(sun);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), basic(0xffe9a8, { fog: false }));
  sunDisc.position.set(-190, 34, -60);
  sunDisc.lookAt(0, 10, 0);
  scene.add(sunDisc);
  // Clouds: flat white puffs high up.
  const cloudMat = lambert(0xfff2e0, { transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i += 1) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(rng.range(6, 12), 8, 6), cloudMat);
    cl.scale.y = 0.32;
    cl.position.set(rng.range(-160, 140), rng.range(48, 70), rng.range(-140, 140));
    scene.add(cl);
  }

  // ---- Ground: city slab, beach, sea ---------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), lambert(0x6b7a5e));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  scene.add(ground);
  const citySlab = new THREE.Mesh(new THREE.PlaneGeometry(232, 232), lambert(0x555049));
  citySlab.rotation.x = -Math.PI / 2;
  citySlab.position.set(0, 0, 0);
  scene.add(citySlab);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(30, 240), lambert(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-124, 0.02, 0);
  scene.add(sand);
  seaMat = new THREE.MeshLambertMaterial({ color: PALETTE.sea, emissive: 0x0a2a3a });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 560), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-215, 0.01, 0);
  scene.add(sea);
  sunGlint = new THREE.Mesh(new THREE.PlaneGeometry(120, 26), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  sunGlint.rotation.x = -Math.PI / 2;
  sunGlint.position.set(-185, 0.06, -40);
  scene.add(sunGlint);
  // Curved shoreline: a sand-coloured arc so the coast is not a straight box edge.
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const z = -120 + t * 240;
    const x = -138 + Math.sin(t * Math.PI) * 6;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), lambert(PALETTE.sand));
    dune.scale.set(1, 0.18, 1.4);
    dune.position.set(x, 0.1, z);
    scene.add(dune);
  }

  // ---- Roads, sidewalks, markings ------------------------------------------
  const roadMat = lambert(PALETTE.asphalt);
  const walkMat = lambert(PALETTE.sidewalk);
  for (const r of ROADS) {
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(224, 10), roadMat);
    hRoad.rotation.x = -Math.PI / 2; hRoad.position.set(0, 0.03, r);
    scene.add(hRoad);
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(10, 224), roadMat);
    vRoad.rotation.x = -Math.PI / 2; vRoad.position.set(r, 0.03, 0);
    scene.add(vRoad);
    // Sidewalks: raised strips flanking every road.
    for (const off of [-7, 7]) {
      const hWalk = new THREE.Mesh(new THREE.BoxGeometry(224, 0.35, 3.4), walkMat);
      hWalk.position.set(0, 0.17, r + off);
      scene.add(hWalk);
      const vWalk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 224), walkMat);
      vWalk.position.set(r + off, 0.17, 0);
      scene.add(vWalk);
    }
  }
  // Dashed centre lines (instanced) and zebra stripes (instanced).
  const dashGeo = new THREE.BoxGeometry(3, 0.06, 0.5);
  const dashMat = basic(0xfff6d8);
  const dashPositions = [];
  for (const r of ROADS) {
    for (let p = -104; p <= 104; p += 8) {
      if (ROADS.some((q) => Math.abs(p - q) < 9)) continue;
      dashPositions.push([p, r, 0]);
      dashPositions.push([r, p, 1]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashPositions.length);
  const m4 = new THREE.Matrix4();
  dashPositions.forEach(([x, z, rot], i) => {
    m4.makeRotationY(rot ? Math.PI / 2 : 0);
    m4.setPosition(x, 0.08, z);
    dashes.setMatrixAt(i, m4);
  });
  scene.add(dashes);
  const zebraGeo = new THREE.BoxGeometry(0.9, 0.06, 4.4);
  const zebraPositions = [];
  for (const rx of ROADS) for (const rz of ROADS) {
    if (Math.abs(rx) > 88 || Math.abs(rz) > 88) continue;
    for (let k = -4; k <= 4; k += 1) {
      zebraPositions.push([rx + k * 1.15, rz + 6.4, 0]);
      zebraPositions.push([rx + 6.4, rz + k * 1.15, 1]);
    }
  }
  const zebras = new THREE.InstancedMesh(zebraGeo, basic(0xffffff), zebraPositions.length);
  zebraPositions.forEach(([x, z, rot], i) => {
    m4.makeRotationY(rot ? Math.PI / 2 : 0);
    m4.setPosition(x, 0.08, z);
    zebras.setMatrixAt(i, m4);
  });
  scene.add(zebras);

  // ---- Plaza: brick circle + fountain ---------------------------------------
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(21, 40), lambert(0xb98a62));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.05, 0);
  scene.add(plaza);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 1.1, 20), lambert(0x8a7a6a));
  fountainBase.position.set(0, 0.55, 0);
  scene.add(fountainBase);
  fountainWater = new THREE.Mesh(new THREE.CircleGeometry(4.8, 20), new THREE.MeshBasicMaterial({ color: 0x4fc3e8, transparent: true, opacity: 0.85 }));
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.set(0, 1.12, 0);
  scene.add(fountainWater);
  const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 2.6, 10), lambert(0xd9c9a8));
  fountainTop.position.set(0, 2.2, 0);
  scene.add(fountainTop);
  addCollider(0, 0, 6.5, 6.5);

  // ---- Buildings ------------------------------------------------------------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = lambert(0x3a3340);
  const acMat = lambert(0x9aa0a8);
  const tankMat = lambert(0x7a9ab0);
  const neonStrip = (x, z) => (Math.abs(x - 44) < 30 && Math.abs(z - 44) < 30);
  const blockCenters = [];
  for (const bx of [-66, -22, 22, 66]) for (const bz of [-66, -22, 22, 66]) blockCenters.push([bx, bz]);
  for (const [bcx, bcz] of blockCenters) {
    if (Math.abs(bcx) <= 22 && Math.abs(bcz) <= 22) continue; // the plaza breathes
    if (bcx === 22 && bcz === -66) continue; // garage block
    const count = rng.int(2, 3);
    for (let b = 0; b < count; b += 1) {
      const w = rng.range(11, 19);
      const d = rng.range(11, 19);
      const tall = neonStrip(bcx, bcz) ? rng.range(18, 44) : rng.range(8, 26);
      const x = bcx + rng.range(-8, 8);
      const z = bcz + rng.range(-8, 8);
      const facade = rng.pick(FACADES);
      const tex = facadeTexture(facade, rng);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const body = new THREE.Mesh(boxGeo, mat);
      body.scale.set(w, tall, d);
      body.position.set(x, tall / 2, z);
      scene.add(body);
      // Chamfered corner on some towers: a stepped crown so the skyline is not all boxes.
      if (rng.chance(0.45)) {
        const crown = new THREE.Mesh(boxGeo, lambert(facade.base));
        crown.scale.set(w * 0.62, rng.range(2, 5), d * 0.62);
        crown.position.set(x, tall + crown.scale.y / 2, z);
        scene.add(crown);
      }
      // Roof props: AC units, antennas, water tanks, a pyramid cap.
      const roofY = tall + 0.4;
      if (rng.chance(0.6)) {
        const ac = new THREE.Mesh(boxGeo, acMat);
        ac.scale.set(2.2, 0.9, 1.6);
        ac.position.set(x + rng.range(-3, 3), roofY, z + rng.range(-3, 3));
        scene.add(ac);
      }
      if (rng.chance(0.4)) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, rng.range(4, 8), 6), acMat);
        ant.position.set(x + w * 0.3, roofY + 3, z);
        scene.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), basic(0xff5d5d));
        tip.position.set(x + w * 0.3, roofY + 6.5, z);
        scene.add(tip);
      }
      if (rng.chance(0.35)) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 10), tankMat);
        tank.position.set(x - w * 0.25, roofY + 1.3, z - d * 0.2);
        scene.add(tank);
      }
      if (rng.chance(0.3)) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.55, 3.2, 4), lambert(0x8a4a3c));
        cap.position.set(x, roofY + 1.6, z);
        cap.rotation.y = Math.PI / 4;
        scene.add(cap);
      }
      // Ground-floor awning.
      if (rng.chance(0.7)) {
        const awn = new THREE.Mesh(boxGeo, lambert(rng.pick([0xc2437a, 0x2e8a6a, 0xd8a077, 0x3a6fd8])));
        awn.scale.set(w * 0.7, 0.25, 2.4);
        awn.position.set(x, 3.1, z + d / 2 + 0.9);
        scene.add(awn);
      }
      // Neon sign on neon-strip and marina buildings.
      if ((neonStrip(bcx, bcz) || (bcx < -40 && bcz > 40)) && rng.chance(0.65)) {
        const word = rng.pick(NEON_WORDS);
        const color = rng.pick(['#ff5df2', '#39d5ff', '#ffd23e', '#7dff8a', '#ff7a5d']);
        const tex2 = signTexture(word, color);
        const smat = new THREE.MeshBasicMaterial({ map: tex2, transparent: true });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), smat);
        sign.position.set(x, Math.min(tall - 2, 12), z + d / 2 + 0.15);
        scene.add(sign);
        neonMats.push(smat);
      }
      addCollider(x, z, w / 2 + 0.4, d / 2 + 0.4);
    }
  }

  // ---- Garage (Palma Garage) -------------------------------------------------
  const garage = new THREE.Group();
  const gBody = new THREE.Mesh(boxGeo, lambert(0x5a6a7a));
  gBody.scale.set(20, 7, 14);
  gBody.position.y = 3.5;
  garage.add(gBody);
  const gRoof = new THREE.Mesh(boxGeo, roofMat);
  gRoof.scale.set(21, 0.6, 15);
  gRoof.position.y = 7.3;
  garage.add(gRoof);
  const gDoor = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), lambert(0x22242c));
  gDoor.position.set(0, 2.5, 7.15);
  garage.add(gDoor);
  const gSign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2), new THREE.MeshBasicMaterial({ map: signTexture('GARAGE', '#ffd23e') }));
  gSign.position.set(0, 6.2, 7.2);
  garage.add(gSign);
  garage.position.set(30, 0, -66);
  scene.add(garage);
  addCollider(30, -66, 10.5, 7.5);

  // ---- Marina: basin, wooden docks, boats ------------------------------------
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), new THREE.MeshLambertMaterial({ color: 0x1e6f8e, emissive: 0x0a2a3a }));
  basin.rotation.x = -Math.PI / 2;
  basin.position.set(-100, 0.04, 66);
  scene.add(basin);
  const dockMat = lambert(0x8a6a4a);
  for (let i = 0; i < 3; i += 1) {
    const dock = new THREE.Mesh(boxGeo, dockMat);
    dock.scale.set(2.4, 0.5, 22);
    dock.position.set(-112 + i * 12, 0.3, 66);
    scene.add(dock);
  }
  for (let i = 0; i < 5; i += 1) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(boxGeo, lambert(rng.pick([0xe8e2d0, 0x3a6fd8, 0xd21f2b, 0x12b76a])));
    hull.scale.set(2.2, 1, 6.5);
    hull.position.y = 0.6;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.5, 6), lambert(0x5a4632));
    mast.position.y = 3.4;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), basic(0xfff2e0, { side: THREE.DoubleSide }));
    sail.position.set(0, 3.2, 1.2);
    boat.add(sail);
    boat.position.set(-110 + i * 9, 0, 56 + (i % 2) * 18);
    boat.rotation.y = rng.range(-0.3, 0.3);
    scene.add(boat);
  }

  // ---- Docks: containers, crane, warehouse -----------------------------------
  const containerColors = [0xd21f2b, 0x2e8a6a, 0x3a6fd8, 0xf2c200, 0x7a4a8a];
  for (let i = 0; i < 9; i += 1) {
    const c = new THREE.Mesh(boxGeo, lambert(containerColors[i % containerColors.length]));
    const w = 6, hgt = 2.6, d = 2.6;
    c.scale.set(w, hgt, d);
    const cx = -104 + (i % 3) * 9;
    const cz = -78 + Math.floor(i / 3) * 8;
    c.position.set(cx, hgt / 2 + (i % 2) * 2.6, cz);
    c.rotation.y = (i % 2) * 0.06;
    scene.add(c);
    addCollider(cx, cz, w / 2, d / 2);
  }
  const craneMat = lambert(0xf2c200);
  const crane = new THREE.Group();
  const legL = new THREE.Mesh(boxGeo, craneMat); legL.scale.set(1.2, 22, 1.2); legL.position.set(-3, 11, 0);
  const legR = new THREE.Mesh(boxGeo, craneMat); legR.scale.set(1.2, 22, 1.2); legR.position.set(3, 11, 0);
  const beam = new THREE.Mesh(boxGeo, craneMat); beam.scale.set(26, 1.4, 1.4); beam.position.set(4, 21, 0);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 6), lambert(0x222222));
  hook.position.set(12, 17, 0);
  crane.add(legL, legR, beam, hook);
  crane.position.set(-104, 0, -58);
  scene.add(crane);
  addCollider(-104, -58, 4, 2);
  const warehouse = new THREE.Mesh(boxGeo, lambert(0x6a5a4a));
  warehouse.scale.set(16, 8, 12);
  warehouse.position.set(-96, 4, 52);
  scene.add(warehouse);
  addCollider(-96, 52, 8.5, 6.5);

  // ---- Palms: trunk + five drooping fronds ------------------------------------
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.4, 6.5, 7);
  const trunkMat = lambert(0x6a4a2e);
  const frondGeo = new THREE.ConeGeometry(0.85, 4.2, 5);
  const frondMat = lambert(0x2e8a4a, { side: THREE.DoubleSide });
  const palmSpots = [];
  for (let i = 0; i < 30; i += 1) {
    const alongBeach = rng.chance(0.5);
    if (alongBeach) palmSpots.push([-112 + rng.range(-4, 4), rng.range(-100, 100)]);
    else palmSpots.push([rng.pick(ROADS) + rng.pick([-9.5, 9.5]), rng.range(-100, 100)]);
  }
  for (const [px, pz] of palmSpots) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.25;
    trunk.rotation.z = rng.range(-0.08, 0.08);
    palm.add(trunk);
    const crown = new THREE.Group();
    crown.position.y = 6.6;
    for (let f = 0; f < 5; f += 1) {
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.scale.set(1, 1, 0.28);
      frond.position.y = 0.4;
      frond.rotation.z = Math.PI / 2 + rng.range(0.5, 0.9);
      const holder = new THREE.Group();
      holder.rotation.y = (f / 5) * Math.PI * 2;
      holder.add(frond);
      frond.position.set(1.6, 0.3, 0);
      crown.add(holder);
    }
    palm.add(crown);
    palm.position.set(px, 0, pz);
    palm.rotation.y = rng.range(0, Math.PI * 2);
    scene.add(palm);
    palms.push(crown);
  }

  // ---- Streetlights, traffic lights, benches, hydrants, billboards -----------
  const poleMat = lambert(0x3a3f46);
  const lampMat = basic(0xffe9a8);
  for (const r of ROADS) {
    for (let p = -100; p <= 100; p += 26) {
      if (ROADS.some((q) => Math.abs(p - q) < 8)) continue;
      for (const [lx, lz] of [[r, p], [p, r]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 6), poleMat);
        pole.position.set(lx + 6.2, 2.75, lz);
        scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMat);
        lamp.position.set(lx + 6.2, 5.6, lz);
        scene.add(lamp);
      }
    }
  }
  for (const [tx, tz] of [[0, 0], [44, 44], [-44, -44], [44, -44], [-44, 44]]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.5, 6), poleMat);
    pole.position.y = 3.25;
    g.add(pole);
    const box = new THREE.Mesh(boxGeo, lambert(0x22242c));
    box.scale.set(0.7, 1.9, 0.7);
    box.position.y = 6.2;
    g.add(box);
    const dots = [];
    for (let i = 0; i < 3; i += 1) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), basic([0xff3b30, 0xffcc00, 0x34c759][i]));
      dot.position.set(0, 6.85 - i * 0.55, 0.4);
      g.add(dot);
      dots.push(dot);
    }
    g.position.set(tx + 6.5, 0, tz + 6.5);
    scene.add(g);
    trafficLights.push({ dots, phase: (tx + tz) / 20 });
  }
  const benchMat = lambert(0x7a5a3a);
  for (let i = 0; i < 10; i += 1) {
    const bench = new THREE.Mesh(boxGeo, benchMat);
    bench.scale.set(2.4, 0.5, 0.9);
    bench.position.set(rng.pick(ROADS) + rng.pick([-9.5, 9.5]), 0.45, rng.range(-90, 90));
    scene.add(bench);
  }
  for (let i = 0; i < 8; i += 1) {
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8), lambert(0xd21f2b));
    hyd.position.set(rng.pick(ROADS) + 6.8, 0.45, rng.range(-90, 90));
    scene.add(hyd);
  }
  const bb1 = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: billboardTexture('COSTA PALMA', 'GOLDEN HOUR · EVERY NIGHT', '#ffd23e') }));
  bb1.position.set(66, 9, -96);
  bb1.rotation.y = Math.PI / 4;
  scene.add(bb1);
  const bb2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: billboardTexture('SOL BAR', 'COLD DRINKS · LIVE MUSIC', '#7dd8ff') }));
  bb2.position.set(-20, 8, 96);
  bb2.rotation.y = Math.PI;
  scene.add(bb2);

  function update(dt, t) {
    // Palm crowns sway in the sea breeze; neon flickers; the sea glints.
    for (let i = 0; i < palms.length; i += 1) {
      palms[i].rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.05;
      palms[i].rotation.x = Math.cos(t * 0.7 + i) * 0.03;
    }
    for (let i = 0; i < neonMats.length; i += 1) {
      const m = neonMats[i];
      m.opacity = 0.82 + Math.sin(t * 3 + i * 2.3) * 0.12 + (Math.sin(t * 13 + i) > 0.96 ? -0.25 : 0);
      m.transparent = true;
    }
    if (seaMat) seaMat.emissive.setHSL(0.55, 0.6, 0.05 + Math.sin(t * 0.4) * 0.02);
    if (sunGlint) sunGlint.material.opacity = 0.28 + Math.sin(t * 0.5) * 0.1;
    if (fountainWater) fountainWater.rotation.z = t * 0.15;
    for (const tl of trafficLights) {
      const phase = (t * 0.12 + tl.phase) % 3;
      tl.dots[0].material.color.setHex(phase < 1 ? 0xff3b30 : 0x441111);
      tl.dots[1].material.color.setHex(phase >= 1 && phase < 1.4 ? 0xffcc00 : 0x443311);
      tl.dots[2].material.color.setHex(phase >= 1.4 ? 0x34c759 : 0x113311);
    }
  }

  return { colliders, update, plazaPos: { x: 0, z: 0 }, garagePos: { x: 30, z: -66 }, marinaPos: { x: -96, z: 66 }, docksPos: { x: -96, z: -66 }, neonPos: { x: 44, z: 44 }, beachPos: { x: -88, z: -10 } };
}
