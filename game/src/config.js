// Costa Palma — every tuning number, name and story beat in one place.
// The city is a road grid: roads run at x and z = -88, -44, 0, 44, 88 (metres).
// West of x = -110 is the beach and the sea. Golden hour is 18:42, fixed.

export const STEP = 1 / 60;
export const SAVE_KEY = 'costa-palma-save-v4';
export const CITY = { roadAt: [-88, -44, 0, 44, 88], half: 112, beachX: -110, seaX: -132 };
export const GOLDEN_HOUR = '18:42 · GOLDEN HOUR';

export const PLAYER = { walkSpeed: 7.5, runSpeed: 11, radius: 0.7, hp: 100 };
export const CAR = {
  accel: 26, brake: 42, maxSpeed: 34, maxReverse: 10, steer: 1.9,
  grip: 6.5, drag: 0.55, hornCooldown: 0.6,
};
export const WANTED = {
  decayDelay: 9, decayRate: 0.55, maxCruisers: 5, heliAt: 4, roadblockAt: 3,
  crimeSteal: 1, crimeHitPed: 1, crimeCrash: 0.5, crimeShoot: 1, crimeKillCop: 2,
};
export const COMBAT = { punchDamage: 34, punchRange: 2.2, punchArc: 1.1, shootDamage: 45, shootRange: 60, ammoStart: 12, ammoMax: 36, reloadTime: 1.1 };
export const RANKS = ['ROOKIE', 'HUSTLER', 'STREET BOSS', 'KINGPIN', 'LEGEND OF THE COAST'];
export const RANK_AT = [0, 2, 4, 6, 8];
export const MEDALLIONS_TOTAL = 12;
export const RACE_REWARD = 200;
export const GARAGE_POS = { x: 30, z: -66 };
export const PLAZA_POS = { x: 0, z: 0 };

export const DISTRICTS = [
  { name: 'PLAZA', x: 0, z: 0, r: 26 },
  { name: 'MARINA', x: -96, z: 66, r: 30 },
  { name: 'BEACH ROAD', x: -88, z: -10, r: 26 },
  { name: 'NEON STRIP', x: 44, z: 44, r: 30 },
  { name: 'DOCKS', x: -96, z: -66, r: 30 },
  { name: 'OLD TOWN', x: 66, z: -66, r: 28 },
];

// Facade treatments: glass blue, warm brick, cream concrete, coloured panel.
export const FACADES = [
  { base: 0x2e5f8a, trim: 0x9fd4ff, lit: 0xffd98a, name: 'glass' },
  { base: 0x9a5a3c, trim: 0xd8a077, lit: 0xffe1a1, name: 'brick' },
  { base: 0xd9c9a8, trim: 0x8a7a5c, lit: 0xfff2c0, name: 'concrete' },
  { base: 0x7a4a8a, trim: 0xff9ad5, lit: 0x9df2ff, name: 'panel' },
];
export const NEON_WORDS = ['PALMA', 'MARINA', 'SOL BAR', 'NEON', 'HOTEL LUNA', 'TACOS', 'SURF', 'CASINO SOL'];
export const CAR_MODELS = [
  { name: 'Comet', color: 0xd21f2b, top: 34, accel: 1.15 },
  { name: 'Palma Sedan', color: 0x3a6fd8, top: 28, accel: 1.0 },
  { name: 'Sun Taxi', color: 0xf2c200, top: 26, accel: 0.95 },
  { name: 'Dune Van', color: 0xe8e2d0, top: 24, accel: 0.85 },
  { name: 'Coast Sport', color: 0x12b76a, top: 36, accel: 1.2 },
  { name: 'Harbour Truck', color: 0x8a8f96, top: 22, accel: 0.8 },
];

// Eight named story missions. Each step: text + a target to reach (or a condition).
export const MISSIONS = [
  {
    id: 1, name: 'First Key', giver: 'Nadia Cruz', reward: 350,
    intro: ['New in town? Every legend starts with a stolen key. Grab any car on the street and bring it to the Plaza. Quick and quiet — the Palma police are bored, not blind.'],
    steps: [
      { text: 'Steal any car on the street (E)', need: 'inCar' },
      { text: 'Drive to the Plaza', target: { x: 0, z: 0 }, radius: 12 },
    ],
    outro: ['Not bad. The car is yours now — park it at the garage when you want to keep it.'],
  },
  {
    id: 2, name: "The Broker's Errand", giver: 'Silas the Broker', reward: 500,
    intro: ['A package waits at the Harbour. Fetch it, bring it to the garage. The patrols are thick tonight — stay clean and nobody looks twice.'],
    steps: [
      { text: 'Pick up the package at the Harbour', target: { x: -96, z: 66 }, radius: 8 },
      { text: 'Deliver the package to the Garage', target: { x: 30, z: -66 }, radius: 9 },
    ],
    outro: ['Clean delivery. Silas remembers people who deliver clean.'],
  },
  {
    id: 3, name: "Old Tomas's Debt", giver: 'Old Tomas', reward: 650,
    intro: ['Dario Flint sent three collectors to the Docks for my money. They are not here to talk. Send them home, then bring me what they owe.'],
    steps: [
      { text: 'Go to the Docks', target: { x: -96, z: -66 }, radius: 10 },
      { text: 'Deal with the 3 collectors', need: 'thugsDead', count: 3 },
      { text: 'Return to Old Tomas at the Plaza', target: { x: 0, z: 0 }, radius: 10 },
    ],
    outro: ['You have a spine, kid. Tomas owes you one — and Tomas always pays.'],
  },
  {
    id: 4, name: 'Hot Wheels', giver: 'Lena Mar', reward: 800,
    intro: ['A red Comet races the Beach Road every evening. Its owner brags too much. Take it — and bring it to the garage before its owner and one cruiser catch you.'],
    steps: [
      { text: 'Steal the red Comet on Beach Road', need: 'stealComet' },
      { text: 'Lose the heat and reach the Garage', target: { x: 30, z: -66 }, radius: 9 },
    ],
    outro: ['That Comet purrs like a cat with a secret. Lena approves.'],
  },
  {
    id: 5, name: 'Dockside Double-Cross', giver: 'Silas the Broker', reward: 950,
    intro: ['It was a setup. Four of Flint\u2019s gunmen wait at the Marina. Use the containers as cover, put them down, then run — the police will be on you.'],
    steps: [
      { text: 'Go to the Marina ambush', target: { x: -96, z: 66 }, radius: 10 },
      { text: 'Fight off the 4 armed thugs', need: 'thugsDead', count: 4 },
      { text: 'Escape the heat — reach the Garage', target: { x: 30, z: -66 }, radius: 9 },
    ],
    outro: ['You walked into a trap and walked out richer. Flint will remember that.'],
  },
  {
    id: 6, name: 'Neon Run', giver: 'Lena Mar', reward: 1100,
    intro: ['Night race on the Neon Strip. Six checkpoints, three rivals, one winner. Traffic is live and the police hate fun. Finish first.'],
    steps: [
      { text: 'Reach the Neon Strip start line', target: { x: 44, z: 44 }, radius: 10 },
      { text: 'Race! Hit all 6 checkpoints before the rivals', need: 'race' },
      { text: 'Return to Lena at the Plaza', target: { x: 0, z: 0 }, radius: 10 },
    ],
    outro: ['First across the line under the neon. The Strip is talking about you tonight.'],
  },
  {
    id: 7, name: 'Storm Warning', giver: 'Nadia Cruz', reward: 1400,
    intro: ['Flint called in every cruiser in Costa Palma. Three stars, roadblocks on the roads, rain on the way. Get to the garage — and do not stop for anyone.'],
    steps: [
      { text: 'Break through the roadblock — reach the Garage', target: { x: 30, z: -66 }, radius: 9 },
    ],
    outro: ['You outran the whole department. Nadia is impressed — and Nadia is never impressed.'],
  },
  {
    id: 8, name: 'The Palma Job', giver: 'Nadia Cruz', reward: 2500,
    intro: ['The finale. Flint\u2019s safe sits in the Marina warehouse. Take it, break the roadblock, lose the helicopter — and bring it home. Costa Palma is watching.'],
    steps: [
      { text: 'Reach the Marina warehouse', target: { x: -96, z: 66 }, radius: 10 },
      { text: 'Grab the safe', need: 'grabSafe' },
      { text: 'Escape the 4-star heat — reach the Garage', target: { x: 30, z: -66 }, radius: 9 },
    ],
    outro: ['The safe is open. The city is yours. LEGEND OF THE COAST.'],
  },
];

export const CHARACTERS = {
  'Nadia Cruz': { color: '#ffd23e', line: 'Nadia runs the Plaza. She knows every car in Costa Palma by its engine note.' },
  'Silas the Broker': { color: '#9df2ff', line: 'Silas buys and sells everything — packages, cars, favours, silence.' },
  'Old Tomas': { color: '#d8a077', line: 'Old Tomas has lived on the Plaza for forty years. Nobody collects from Tomas twice.' },
  'Lena Mar': { color: '#ff9ad5', line: 'Lena Mar races the Neon Strip at night and fixes engines by day.' },
  'Dario Flint': { color: '#ff5d5d', line: 'Dario Flint owns the Docks and half the police overtime budget.' },
};

export const MEDALLION_SPOTS = [
  { x: -104, z: 20 }, { x: -104, z: -30 }, { x: -60, z: 88 }, { x: 0, z: 88 },
  { x: 66, z: 88 }, { x: 88, z: 20 }, { x: 88, z: -44 }, { x: 22, z: -88 },
  { x: -22, z: -88 }, { x: -66, z: 44 }, { x: 22, z: 44 }, { x: -96, z: 66 },
];

export const RACE_CHECKPOINTS = [
  { x: 44, z: 20 }, { x: 44, z: -44 }, { x: 0, z: -44 },
  { x: -44, z: -44 }, { x: -44, z: 44 }, { x: 0, z: 44 },
];

export const PALETTE = {
  skyTop: 0x2a1b5e, skyMid: 0xff8c42, skyLow: 0xffc46b,
  sea: 0x1e6f8e, sand: 0xe8cf9a, asphalt: 0x2c2f36, sidewalk: 0x8f8a80,
  grass: 0x3f7a4a, fog: 0xff9e5e,
};
