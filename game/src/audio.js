// Procedural WebAudio sound effects — no audio files, everything is synthesised:
// engine hum that follows speed, two-tone police siren, gunshots, punches, horn,
// pickup chimes, explosions and footsteps. The context is created on the first
// user gesture, so autoplay rules never block it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.25, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    engine(speed01, on) {
      if (!ensure()) return;
      const target = on ? 0.05 + speed01 * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, ctx.currentTime, 0.1);
    },
    siren(on, dt) {
      if (!ensure()) return;
      sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.2);
      if (!on) return;
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.42;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 880 : 620, ctx.currentTime, 0.05);
      }
    },
    shoot() { noise(0.12, 0.5, 2600); tone(190, 0.1, 'square', 0.22, 70); },
    punch() { noise(0.09, 0.4, 700); tone(120, 0.09, 'sine', 0.3, 55); },
    horn() { tone(370, 0.35, 'square', 0.16); tone(466, 0.35, 'square', 0.12); },
    pickup() { tone(880, 0.12, 'sine', 0.25); setTimeout(() => tone(1320, 0.18, 'sine', 0.25), 90); },
    coin() { tone(1046, 0.1, 'triangle', 0.22); setTimeout(() => tone(1568, 0.16, 'triangle', 0.2), 70); },
    explosion() { noise(0.7, 0.6, 500); tone(90, 0.6, 'sine', 0.4, 30); },
    crash() { noise(0.25, 0.45, 900); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 110)); },
    fail() { tone(220, 0.5, 'sawtooth', 0.2, 110); },
    step() { tone(70 + Math.random() * 30, 0.05, 'sine', 0.06); },
    click() { tone(660, 0.06, 'square', 0.12); },
  };
}
