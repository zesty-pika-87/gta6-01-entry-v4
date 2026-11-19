// Rendering: the three.js renderer, the golden-hour lighting rig and the
// player character mesh. No shadow maps — the low sun is faked with a warm
// directional light and a long soft blob shadow under the player and the cars,
// which keeps the frame fast in headless Chromium.

import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 9, 14);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, resize,
    render() { renderer.render(scene, camera); },
  };
}

export function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xd21f2b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.38), jacket);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.72;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6), new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.scale.set(1, 0.6, 1);
  hair.position.y = 1.86;
  g.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legL.position.set(-0.16, 0.31, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), legMat);
  legR.position.set(0.16, 0.31, 0);
  g.add(legL, legR);
  const armMat = new THREE.MeshLambertMaterial({ color: 0xd21f2b });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), armMat);
  armL.position.set(-0.45, 1.1, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), armMat);
  armR.position.set(0.45, 1.1, 0);
  g.add(armL, armR);
  // A soft blob shadow so the player reads on the ground without shadow maps.
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.06;
  g.add(blob);
  g.userData = { legL, legR, armL, armR };
  return g;
}
