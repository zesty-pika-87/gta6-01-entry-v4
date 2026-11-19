// Feel: screen shake with trauma decay, a 60 ms hit-stop that freezes the
// simulation on a landed punch, and the smooth third-person chase camera that
// sits behind the player on foot and pulls back and widens its field of view
// while driving. The camera never snaps; it lerps to its target every frame.

import * as THREE from 'three';

export function createFeel(camera) {
  let trauma = 0;
  let hitStop = 0;
  const camPos = new THREE.Vector3(0, 9, 14);
  const camLook = new THREE.Vector3(0, 1.5, 0);
  const desired = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  return {
    addShake(amount) { trauma = Math.min(1, trauma + amount); },
    hitStopMs(ms) { hitStop = Math.max(hitStop, ms / 1000); },
    /** Clear shake and hit-stop, e.g. after a respawn. */
    reset() { trauma = 0; hitStop = 0; },
    /** Returns false while a hit-stop is active (the caller skips the step). */
    consumeHitStop(dt) {
      if (hitStop <= 0) return false;
      hitStop -= dt;
      return true;
    },
    updateCamera(dt, targetPos, heading, driving, speed01, elapsed) {
      const back = driving ? 11.5 + speed01 * 3.5 : 8.5;
      const height = driving ? 4.6 + speed01 * 0.8 : 4.2;
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      desired.set(targetPos.x - fx * back, targetPos.y + height, targetPos.z - fz * back);
      desiredLook.set(targetPos.x + fx * 6, targetPos.y + 1.4, targetPos.z + fz * 6);
      const k = 1 - Math.pow(0.0001, dt); // frame-rate independent lerp
      camPos.lerp(desired, k);
      camLook.lerp(desiredLook, k);
      trauma = Math.max(0, trauma - dt * 1.4);
      const sh = trauma * trauma;
      tmp.set(
        (Math.random() * 2 - 1) * sh * 0.7,
        (Math.random() * 2 - 1) * sh * 0.5 + Math.sin(elapsed * 0.5) * 0.02,
        (Math.random() * 2 - 1) * sh * 0.7,
      );
      camera.position.copy(camPos).add(tmp);
      camera.lookAt(camLook);
      const targetFov = driving ? 62 + speed01 * 12 : 55;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
        camera.updateProjectionMatrix();
      }
    },
    snapTo(targetPos, heading, driving) {
      const back = driving ? 11.5 : 8.5;
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      camPos.set(targetPos.x - fx * back, targetPos.y + (driving ? 4.6 : 4.2), targetPos.z - fz * back);
      camLook.set(targetPos.x + fx * 6, targetPos.y + 1.4, targetPos.z + fz * 6);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    },
  };
}
