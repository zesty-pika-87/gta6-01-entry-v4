// The one shared game state: money, wanted level, health, chain, missions,
// garage, medallions, stats and the current screen. Every system reads and
// writes this object; nothing else holds a second copy of a number the HUD shows.

import { MISSIONS, MEDALLIONS_TOTAL } from './config.js';

export function createState() {
  return {
    mode: 'title', // title | play | paused | board | map | garage | busted | wasted | victory
    prevMode: 'play',
    money: 0,
    totalEarned: 0,
    hp: 100,
    wanted: 0,
    heat: 0, // continuous 0..5 behind the star display
    lastCrimeAt: -999,
    chain: 0,
    chainTimer: 0,
    bestChain: 0,
    ammo: 12,
    reloadTimer: 0,
    missionIndex: 0, // 0..7, next mission to play
    missionStep: 0,
    thugsDown: 0,
    raceActive: false,
    raceCheckpoint: 0,
    raceWon: false,
    safeGrabbed: false,
    cometStolen: false,
    medallions: 0,
    medallionGot: new Array(MEDALLIONS_TOTAL).fill(false),
    garage: [], // { name, color } up to 4
    carsOwned: 0,
    carsStolen: 0,
    missionsDone: 0,
    playTime: 0,
    kills: 0,
    bustedCount: 0,
    wastedCount: 0,
    rain: false,
    time: 0,
    inCar: false,
    carName: '',
    carSpeedKmh: 0,
    victoryShown: false,
  };
}

export function rankFor(state) {
  const done = state.missionsDone;
  if (done >= 8) return 'LEGEND OF THE COAST';
  if (done >= 6) return 'KINGPIN';
  if (done >= 4) return 'STREET BOSS';
  if (done >= 2) return 'HUSTLER';
  return 'ROOKIE';
}

export function missionDoneCount(state) {
  return state.missionsDone;
}

export function addMoney(state, amount) {
  state.money += amount;
  if (amount > 0) state.totalEarned += amount;
}

export function addChain(state, n = 1) {
  state.chain += n;
  state.chainTimer = 6;
  if (state.chain > state.bestChain) state.bestChain = state.chain;
}

export function currentMission(state) {
  return state.missionIndex < MISSIONS.length ? MISSIONS[state.missionIndex] : null;
}
