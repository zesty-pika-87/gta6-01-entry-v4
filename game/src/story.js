// Story: the people of Costa Palma — who gives each mission, what they say,
// and the rank ladder the player climbs. Dialogue is one or two lines at a
// time in the bar at the bottom of the screen; the queue keeps lines in order
// and never overlaps them.

import { CHARACTERS, MISSIONS } from './config.js';

export function createStory() {
  const queue = [];
  let current = null;
  let timer = 0;

  function say(who, text, seconds) {
    queue.push({ who, text, seconds: seconds || 5 });
  }

  function missionBrief(mission) {
    say(mission.giver, mission.intro[0], 6);
  }

  function missionDone(mission) {
    say(mission.giver, mission.outro[0], 5);
    say('COSTA PALMA', `Mission complete — $${mission.reward.toLocaleString('en-US')} earned.`, 4);
  }

  function tip(text) {
    say('COSTA PALMA', text, 4);
  }

  const AMBIENT_TIPS = [
    'Tip: park a stolen car at the garage (press G there) to keep it forever.',
    'Tip: 12 Sun Medallions hide around the city — each one pays $50.',
    'Tip: a CHAIN of 5 or more pays a cash bonus when it ends safely.',
  ];
  let tipIndex = 0;
  function ambientTip() {
    say('COSTA PALMA', AMBIENT_TIPS[tipIndex % AMBIENT_TIPS.length], 5);
    tipIndex += 1;
  }

  function update(dt, show, hide) {
    if (current) {
      timer -= dt;
      if (timer <= 0) {
        current = null;
        hide();
      }
    }
    if (!current && queue.length > 0) {
      current = queue.shift();
      timer = current.seconds;
      show(current.who, current.text);
    }
  }

  function clear() {
    queue.length = 0;
    current = null;
    timer = 0;
  }

  function boardRows(state) {
    return MISSIONS.map((m, i) => ({
      n: m.id,
      name: m.name,
      giver: m.giver,
      reward: m.reward,
      done: i < state.missionsDone,
      active: i === state.missionIndex,
    }));
  }

  return { say, missionBrief, missionDone, tip, ambientTip, update, clear, boardRows, characters: CHARACTERS };
}
