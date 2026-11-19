// Vehicles: the car models (player-stealable and traffic share one builder),
// the arcade driving model, stealing, and the garage that keeps up to four cars.
// A car is a body + cabin + four wheels + headlights; police cruisers add a
// light bar. No physics library — speed, steering and grip are tuned by hand.

import * as THREE from 'three';
import { CAR_MODELS } from './config.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });

export function makeCarMesh(model, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a2a4a : model.color });
  const body = new THREE.Mesh(boxGeo, paint);
  body.scale.set(2.1, 0.62, 4.4);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x10151f }));
  cabin.scale.set(1.8, 0.55, 2.2);
  cabin.position.set(0, 1.2, -0.2);
  g.add(cabin);
  const glass = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x9fd4ff, emissive: 0x223344 }));
  glass.scale.set(1.7, 0.4, 0.4);
  glass.position.set(0, 1.25, 1.0);
  g.add(glass);
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const s of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    h.position.set(s, 0.7, 2.22);
    g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  for (const s of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    t.position.set(s, 0.7, -2.22);
    g.add(t);
  }
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    red.position.x = -0.45;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2e7dff }));
    blue.position.x = 0.45;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.62, -0.2);
    lightBar.userData = { red, blue };
    g.add(lightBar);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    badge.position.set(0, 0.95, 2.21);
    g.add(badge);
  }
  g.userData = { model, isPolice: !!isPolice, lightBar };
  return g;
}

export function createPlayerCar(scene) {
  const car = {
    mesh: null, model: CAR_MODELS[1], heading: 0, speed: 0,
    x: 0, z: 0, active: false, steerVis: 0,
  };
  return car;
}

/** Arcade driving: accelerate, brake, reverse, steer harder at low speed, drift dust. */
export function driveCar(car, input, dt, collide, onCrash) {
  const m = car.model;
  const top = 34 * (m.top / 34);
  const accel = 26 * (m.accel || 1);
  if (input.fwd > 0) car.speed += accel * dt;
  else if (input.fwd < 0) {
    if (car.speed > 0.5) car.speed -= 42 * dt;
    else car.speed -= 12 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  if (car.speed > top) car.speed = top;
  if (car.speed < -10) car.speed = -10;
  const steerInput = input.strafe;
  const steerAmount = steerInput * 1.9 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.heading += steerAmount * dt * (car.speed >= 0 ? 1 : -1) * Math.sign(car.speed || 1);
  car.steerVis += (steerInput - car.steerVis) * Math.min(1, dt * 8);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collide(nx, nz, 1.6);
  if (hit) {
    if (Math.abs(car.speed) > 9 && onCrash) onCrash(Math.abs(car.speed));
    car.speed *= -0.25;
  } else {
    car.x = nx;
    car.z = nz;
  }
  if (car.mesh) {
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  return Math.abs(car.speed) > 20 && Math.abs(steerInput) > 0.5;
}

export function carSpeedKmh(car) {
  return Math.round(Math.abs(car.speed) * 3.6);
}
