// Procedural beach-synth music: a slow original chord loop (Am7 – Fmaj7 – Cmaj7 – G6)
// played as soft triangle pads with a warm bass, plus a light off-beat pluck.
// No melody is borrowed from any commercial song. Intensity rises with the
// wanted level: the tempo steps up and a driving bass joins at 3 stars and above.

const CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 65], // Fmaj7
  [48, 55, 60, 64], // Cmaj7
  [55, 59, 62, 67], // G6
];
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createMusic() {
  let ctx = null;
  let master = null;
  let timer = null;
  let step = 0;
  let intensity = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function note(freq, dur, type, vol, when) {
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playStep() {
    if (!ctx) return;
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const bar = step % 8;
    const hot = intensity >= 3;
    // Pad on the first beat of each bar.
    if (bar === 0) {
      for (const m of chord) note(midiToFreq(m), hot ? 1.6 : 2.6, 'triangle', hot ? 0.10 : 0.14);
      note(midiToFreq(chord[0] - 12), hot ? 1.6 : 2.6, 'sine', 0.2);
    }
    // Bass pulse and a sparse pluck; hotter when the heat is on.
    if (bar % 2 === 0) note(midiToFreq(chord[0] - 24), 0.5, 'sine', hot ? 0.3 : 0.18);
    if (bar === 3 || bar === 6) note(midiToFreq(chord[(step % 3) + 1] + 12), 0.35, 'triangle', 0.08);
    if (hot && bar % 2 === 1) note(midiToFreq(chord[0] - 12), 0.22, 'square', 0.05);
    step += 1;
  }

  return {
    start() {
      if (!ensure()) return;
      if (timer) return;
      timer = setInterval(playStep, 300);
    },
    setIntensity(wanted) { intensity = wanted; },
    setVolume(v) { if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
    stop() {
      if (timer) { clearInterval(timer); timer = null; }
    },
  };
}
