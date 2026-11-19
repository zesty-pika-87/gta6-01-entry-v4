// Save: the whole progression in one localStorage key — money, missions done,
// medallions, the garage, best CHAIN and total earned. Loading restores the
// numbers, not the live scene: the player always wakes up at the Plaza, which
// is the safe spawn in Costa Palma.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 4,
      money: state.money,
      totalEarned: state.totalEarned,
      missionsDone: state.missionsDone,
      missionIndex: state.missionIndex,
      medallions: state.medallions,
      medallionGot: state.medallionGot,
      garage: state.garage,
      bestChain: state.bestChain,
      carsStolen: state.carsStolen,
      kills: state.kills,
      playTime: state.playTime,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(state) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return false;
    state.money = data.money;
    state.totalEarned = data.totalEarned || 0;
    state.missionsDone = data.missionsDone || 0;
    state.missionIndex = data.missionIndex || 0;
    state.medallions = data.medallions || 0;
    if (Array.isArray(data.medallionGot)) state.medallionGot = data.medallionGot;
    if (Array.isArray(data.garage)) state.garage = data.garage;
    state.bestChain = data.bestChain || 0;
    state.carsStolen = data.carsStolen || 0;
    state.kills = data.kills || 0;
    state.playTime = data.playTime || 0;
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}
