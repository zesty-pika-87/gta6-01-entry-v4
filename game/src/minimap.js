// Minimap: the round map in the top-right corner and the big map on the M key.
// Roads are drawn as a grid, the beach and sea on the west edge, the player as
// a white arrow, the mission target as a gold diamond, police as blue dots,
// thugs as red dots, medallions as gold dots and the garage as a green house.

import { CITY } from './config.js';

const ROADS = CITY.roadAt;
const HALF = 118;

function toMap(x, z, size) {
  return [((x + HALF) / (HALF * 2)) * size, ((z + HALF) / (HALF * 2)) * size];
}

export function drawMinimap(canvas, view) {
  const g = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (HALF * 2);
  g.clearRect(0, 0, size, size);
  // Sea + sand on the west, city slab, then the road grid.
  g.fillStyle = '#123a52';
  g.fillRect(0, 0, size * 0.08, size);
  g.fillStyle = '#c9a869';
  g.fillRect(size * 0.08, 0, size * 0.05, size);
  g.fillStyle = '#232733';
  g.fillRect(size * 0.13, 0, size * 0.87, size);
  g.strokeStyle = '#5a5f6e';
  g.lineWidth = 7;
  for (const r of ROADS) {
    const [x] = toMap(r, 0, size);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, size); g.stroke();
    const [, z] = toMap(0, r, size);
    g.beginPath(); g.moveTo(0, z); g.lineTo(size, z); g.stroke();
  }
  // District dots: plaza gold, marina blue, docks orange, neon pink.
  const spots = [
    [0, 0, '#ffd23e'], [-96, 66, '#39d5ff'], [-96, -66, '#ff7a5d'], [44, 44, '#ff5df2'], [30, -66, '#7dff8a'],
  ];
  for (const [x, z, color] of spots) {
    const [mx, mz] = toMap(x, z, size);
    g.fillStyle = color;
    g.beginPath(); g.arc(mx, mz, 7, 0, Math.PI * 2); g.fill();
  }
  const dot = (x, z, color, r) => {
    const [mx, mz] = toMap(x, z, size);
    g.fillStyle = color;
    g.beginPath(); g.arc(mx, mz, r, 0, Math.PI * 2); g.fill();
  };
  if (view.target) dot(view.target.x, view.target.z, '#ffd23e', 10);
  if (view.medallions) for (const m of view.medallions) dot(m.x, m.z, '#ffd23e', 4);
  if (view.cops) for (const c of view.cops) dot(c.x, c.z, '#2e7dff', 5);
  if (view.thugs) for (const t of view.thugs) dot(t.x, t.z, '#ff3b30', 5);
  // Player arrow, rotated to the heading, white with a dark rim.
  const [px, pz] = toMap(view.player.x, view.player.z, size);
  g.save();
  g.translate(px, pz);
  g.rotate(view.player.heading);
  g.fillStyle = '#fff';
  g.strokeStyle = '#111';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath();
  g.fill(); g.stroke();
  g.restore();
  // North marker.
  g.fillStyle = '#fff';
  g.font = `700 ${Math.round(size * 0.07)}px sans-serif`;
  g.textAlign = 'center';
  g.fillText('N', size / 2, size * 0.08);
}
