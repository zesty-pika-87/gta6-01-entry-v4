// Missions: the eight-story chain from the config, driven as a small state
// machine. Each step is either "reach this place" or a condition the game
// reports (thugs down, race finished, safe grabbed, Comet stolen). A glowing
// beacon marks the target, the HUD shows the objective in one line, and the
// mission pays out on completion. Failing a mission just restarts that mission.

import * as THREE from 'three';
import { MISSIONS, RACE_CHECKPOINTS } from './config.js';

export function createMissions(scene, rng) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.55, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 60, 16, 1, true), beaconMat);
  beacon.position.y = 30;
  beacon.visible = false;
  scene.add(beacon);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.4, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  ring.visible = false;
  scene.add(ring);
  const raceRings = [];
  for (const cp of RACE_CHECKPOINTS) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(3, 0.28, 8, 24), new THREE.MeshBasicMaterial({ color: 0x39d5ff }));
    r.rotation.x = Math.PI / 2;
    r.position.set(cp.x, 1.2, cp.z);
    r.visible = false;
    scene.add(r);
    raceRings.push(r);
  }

  let activeTarget = null; // {x, z, radius}

  function mission(state) {
    return state.missionIndex < MISSIONS.length ? MISSIONS[state.missionIndex] : null;
  }

  function step(state) {
    const m = mission(state);
    return m ? m.steps[state.missionStep] : null;
  }

  function objectiveText(state) {
    const m = mission(state);
    if (!m) return { tag: 'FREE ROAM · COSTA PALMA', text: 'Cruise the coast — medallions, races and the garage are yours' };
    const s = step(state);
    return { tag: `MISSION ${m.id} · ${m.name.toUpperCase()}`, text: s ? s.text : '' };
  }

  /** "Mission 3/8" for the board header and the toast line. */
  function progressLabel(state) {
    return `MISSION ${Math.min(state.missionsDone + 1, 8)}/8`;
  }

  function startMission(state, index, onDialog) {
    state.missionIndex = index;
    state.missionStep = 0;
    state.thugsDown = 0;
    state.raceActive = false;
    state.raceCheckpoint = 0;
    state.safeGrabbed = false;
    state.cometStolen = false;
    const m = mission(state);
    if (m && onDialog) onDialog(m.giver, m.intro[0]);
  }

  function targetPos(state) {
    const s = step(state);
    if (s && s.target) return s.target;
    return null;
  }

  function advance(state, events) {
    const m = mission(state);
    if (!m) return null;
    const s = step(state);
    if (!s) return null;
    // Condition steps first.
    if (s.need === 'inCar' && state.inCar) return next(state);
    if (s.need === 'thugsDead' && state.thugsDown >= (s.count || 1)) return next(state);
    if (s.need === 'stealComet' && state.cometStolen) return next(state);
    if (s.need === 'grabSafe' && state.safeGrabbed) return next(state);
    if (s.need === 'race' && state.raceWon) return next(state);
    // Reach steps.
    if (s.target && events.playerPos) {
      const dx = events.playerPos.x - s.target.x;
      const dz = events.playerPos.z - s.target.z;
      if (dx * dx + dz * dz < s.radius * s.radius) return next(state);
    }
    return null;
  }

  function next(state) {
    const m = mission(state);
    state.missionStep += 1;
    if (state.missionStep >= m.steps.length) {
      // Mission complete: pay out and move on.
      state.money += m.reward;
      state.totalEarned += m.reward;
      state.missionsDone += 1;
      const done = m;
      state.missionIndex += 1;
      state.missionStep = 0;
      state.thugsDown = 0;
      return { completed: done, nextMission: mission(state) };
    }
    return { advanced: true };
  }

  function update(dt, state, playerPos, t, onRaceTick) {
    const s = step(state);
    const target = s && s.target ? s.target : null;
    activeTarget = target;
    if (target) {
      beacon.visible = true;
      beacon.position.x = target.x;
      beacon.position.z = target.z;
      beacon.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;
      ring.visible = true;
      ring.position.x = target.x;
      ring.position.z = target.z;
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      ring.scale.set(pulse, pulse, 1);
    } else {
      beacon.visible = false;
      ring.visible = false;
    }
    // Race checkpoints light up one at a time.
    if (state.raceActive) {
      raceRings.forEach((r, i) => {
        r.visible = i >= state.raceCheckpoint;
        if (i === state.raceCheckpoint) {
          r.material.color.setHex(0xffd23e);
          r.position.y = 1.2 + Math.sin(t * 4) * 0.25;
        } else {
          r.material.color.setHex(0x39d5ff);
        }
      });
      if (onRaceTick) onRaceTick(dt);
    } else {
      raceRings.forEach((r) => { r.visible = false; });
    }
  }

  function showRace(on) {
    raceRings.forEach((r) => { r.visible = on; });
  }

  return { mission, step, objectiveText, progressLabel, startMission, targetPos, advance, update, showRace, get activeTarget() { return activeTarget; } };
}
