// HUD: every DOM readout — wanted stars, money, health, rank, the mission
// banner, the CHAIN popup, the dialog bar, the speedometer, the objective arrow
// and the toast. The HUD stays sparse on purpose: one line per idea, readable
// at a glance when the cover is shrunk to 768x480.

import { GOLDEN_HOUR } from './config.js';
import { rankFor } from './state.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const starsEl = $('stars');
  const moneyEl = $('money');
  const hpFill = $('hpfill');
  const hpNum = $('hpnum');
  const rankEl = $('rank');
  const objTag = $('objtag');
  const objText = $('objtext');
  const chainEl = $('chain');
  const dialogEl = $('dialog');
  const dlgWho = $('dlgwho');
  const dlgWhat = $('dlgwhat');
  const vehName = $('vehname');
  const speedEl = $('speed');
  const toastEl = $('toast');
  const arrowEl = $('arrow');
  const clockEl = $('clock');
  let toastTimer = 0;
  let lastMoney = -1;
  let lastHp = -1;
  let lastWanted = -1;
  let lastRank = '';

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  return {
    update(state, objective, playerPos, targetPos, dt) {
      if (state.wanted !== lastWanted) {
        lastWanted = state.wanted;
        const spans = starsEl.children;
        for (let i = 0; i < 5; i += 1) {
          spans[i].className = i < state.wanted ? 'on' : 'off';
        }
      }
      if (state.money !== lastMoney) {
        lastMoney = state.money;
        moneyEl.textContent = `$${state.money.toLocaleString('en-US')}`;
      }
      const hp = Math.max(0, Math.round(state.hp));
      if (hp !== lastHp) {
        lastHp = hp;
        hpFill.style.width = `${hp}%`;
        hpNum.textContent = String(hp);
        hpFill.style.background = hp > 50
          ? 'linear-gradient(90deg, #37e05c, #9dff6e)'
          : hp > 25 ? 'linear-gradient(90deg, #f2c200, #ffd23e)' : 'linear-gradient(90deg, #ff3b30, #ff7a5d)';
      }
      const rank = rankFor(state);
      if (rank !== lastRank) {
        lastRank = rank;
        rankEl.textContent = `${rank} · COSTA PALMA`;
      }
      objTag.textContent = objective.tag;
      objText.textContent = objective.text;
      if (state.chain >= 2) {
        chainEl.style.display = 'block';
        chainEl.firstChild.textContent = `${state.chain} CHAIN`;
      } else {
        chainEl.style.display = 'none';
      }
      vehName.textContent = state.inCar ? state.carName.toUpperCase() : 'ON FOOT';
      speedEl.innerHTML = `${state.carSpeedKmh} <small>km/h</small>`;
      clockEl.textContent = GOLDEN_HOUR;
      if (targetPos && playerPos) {
        const dx = targetPos.x - playerPos.x;
        const dz = targetPos.z - playerPos.z;
        const d = Math.round(Math.sqrt(dx * dx + dz * dz));
        if (d > 12) {
          arrowEl.style.display = 'block';
          // Point the arrow at the target relative to where the player faces.
          const bearing = Math.atan2(dx, dz) - (playerPos.heading || 0);
          arrowEl.textContent = `▲ ${d} m`;
          arrowEl.style.transform = `translateX(-50%) rotate(${(-bearing * 180) / Math.PI}deg)`;
        } else {
          arrowEl.style.display = 'none';
        }
      } else {
        arrowEl.style.display = 'none';
      }
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toastEl.style.display = 'none';
      }
    },
    showDialog(who, text) {
      dlgWho.textContent = who.toUpperCase();
      dlgWhat.textContent = text;
      dialogEl.style.display = 'block';
    },
    hideDialog() { dialogEl.style.display = 'none'; },
    toast(text, color) {
      toastEl.textContent = text;
      toastEl.style.color = color || '#7dff8a';
      toastEl.style.display = 'block';
      toastTimer = 2.6;
    },
    setScreen(name) {
      // name: title | pause | board | map | garage | busted | wasted | victory | none
      for (const id of ['title', 'pause', 'board', 'mapscreen', 'garage', 'busted', 'wasted', 'victory']) {
        const el = $(id);
        if (id === name) show(el);
        else hide(el);
      }
      $('hud').style.display = name === 'none' ? 'block' : (name === 'title' ? 'none' : 'block');
    },
    fillBoard(rows, medallions, total) {
      const table = $('missionTable');
      table.innerHTML = rows.map((r) => {
        const mark = r.done ? '✓ DONE' : r.active ? '▶ ACTIVE' : '· LOCKED';
        const cls = r.done ? 'done' : 'todo';
        return `<tr><td class="${cls}">${r.n}. ${r.name} — ${r.giver} <span style="opacity:.7">${mark}</span></td><td>$${r.reward.toLocaleString('en-US')}</td></tr>`;
      }).join('');
      $('medCount').textContent = `${medallions} / ${total}`;
    },
    fillGarage(garage) {
      const table = $('garageTable');
      if (garage.length === 0) {
        table.innerHTML = '<tr><td class="todo">Empty — steal a car, drive it here and press G to park it.</td><td></td></tr>';
        return;
      }
      table.innerHTML = garage.map((c, i) => `<tr><td>Slot ${i + 1} · ${c.name}</td><td style="color:#ffd23e">PARKED</td></tr>`).join('');
    },
    fillVictory(state) {
      const rows = [
        ['Missions', '8 / 8'],
        ['Cash', `$${state.money.toLocaleString('en-US')}`],
        ['Total earned', `$${state.totalEarned.toLocaleString('en-US')}`],
        ['Best CHAIN', `${state.bestChain}`],
        ['Cars owned', `${state.garage.length}`],
        ['Cars stolen', `${state.carsStolen}`],
        ['Sun Medallions', `${state.medallions} / 12`],
        ['Rank', 'LEGEND OF THE COAST'],
      ];
      $('victoryStats').innerHTML = rows.map(([k, v]) => `<div>${k}</div><div><b>${v}</b></div>`).join('');
    },
  };
}
