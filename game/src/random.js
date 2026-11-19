// Seeded randomness (mulberry32) so the city, the traffic and every screenshot
// stage are repeatable from one seed. The same seed always builds the same Costa Palma.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small helper object around a seeded function: ranges, picks and shuffles. */
export function makeRng(seed) {
  const rand = createRandom(seed);
  return {
    next: rand,
    range(min, max) { return min + rand() * (max - min); },
    int(min, max) { return min + Math.floor(rand() * (max - min + 1)); },
    pick(list) { return list[Math.floor(rand() * list.length)]; },
    chance(p) { return rand() < p; },
    sign() { return rand() < 0.5 ? -1 : 1; },
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
