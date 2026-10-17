// Background music, synthesised live with Web Audio: no sound files, so the game stays small and
// works offline. Every world has its own tune, each game a theme for its map, and the bosses a
// fight tune. The "music" flag turns it off; it pauses whenever the page is hidden.
import { flag } from './state.js';
import { audio } from './sound.js';

// ---------- instruments ----------
const midi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = name => {
  const m = name.match(/^([A-G])([#b]?)(\d)$/);
  const n = midi[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (+m[3] + 1);
  return 440 * 2 ** ((n - 69) / 12);
};

let noise;
const noiseBuf = ac => {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
};

// a tone: oscillators → optional filter → envelope → out
function tone(ac, out, t, f, dur, { types = ['triangle'], ratios = [1], mix = [1], vol = 0.3, a = 0.005, d = null, cut = 0, vib = 0, detune = [] }) {
  const env = ac.createGain();
  const end = t + (d != null ? d : dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + a);
  if (d != null) env.gain.exponentialRampToValueAtTime(0.0001, end);
  else {
    env.gain.setValueAtTime(vol, Math.max(t + a, end - 0.04));
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
  }
  let node = env;
  if (cut) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cut;
    lp.connect(env);
    node = lp;
  }
  env.connect(out);
  types.forEach((type, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = f * (ratios[i] || 1);
    if (detune[i]) o.detune.value = detune[i];
    if (vib) {
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5;
      lg.gain.value = vib;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(end + 0.1);
    }
    g.gain.value = mix[i] == null ? 1 : mix[i];
    o.connect(g).connect(node);
    o.start(t);
    o.stop(end + 0.1);
  });
}

function hit(ac, out, t, { f0 = 0, f1 = 0, len = 0.1, vol = 0.3, noiseFilter = null, nf = 0 }) {
  const env = ac.createGain();
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  env.connect(out);
  if (noiseFilter) {
    const src = ac.createBufferSource(), flt = ac.createBiquadFilter();
    src.buffer = noiseBuf(ac);
    flt.type = noiseFilter;
    flt.frequency.value = nf;
    src.connect(flt).connect(env);
    src.start(t);
    src.stop(t + len + 0.02);
  } else {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + len);
    o.connect(env);
    o.start(t);
    o.stop(t + len + 0.02);
  }
}

// name → (ac, out, time, frequency, duration in seconds)
const INST = {
  marimba: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sine', 'sine'], ratios: [1, 4], mix: [1, 0.15], vol: 0.32, d: Math.min(0.5, d + 0.25) }),
  pluck: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['triangle'], vol: 0.26, d: Math.min(0.6, d + 0.2) }),
  bell: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sine', 'sine'], ratios: [1, 2.76], mix: [1, 0.25], vol: 0.2, d: 1.4 }),
  flute: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sine', 'triangle'], mix: [1, 0.2], vol: 0.2, a: 0.07, vib: 4 }),
  horn: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sawtooth'], vol: 0.13, a: 0.03, cut: 1100 }),
  lead: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['square'], vol: 0.07, cut: 2400 }),
  arp: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['square'], vol: 0.05, cut: 1800, d: Math.min(0.3, d) }),
  pad: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sawtooth', 'sawtooth'], detune: [-7, 7], vol: 0.045, a: 0.35, cut: 900 }),
  bass: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['triangle', 'sine'], ratios: [1, 0.5], mix: [1, 0.6], vol: 0.3 }),
  tuba: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['sawtooth'], vol: 0.2, a: 0.02, cut: 420 }),
  synbass: (ac, o, t, f, d) => tone(ac, o, t, f, d, { types: ['square'], vol: 0.11, cut: 700 }),
  bubble: (ac, o, t, f) => hit(ac, o, t, { f0: f, f1: f * 2.2, len: 0.12, vol: 0.12 }),
  kick: (ac, o, t) => hit(ac, o, t, { f0: 130, f1: 45, len: 0.16, vol: 0.5 }),
  snare: (ac, o, t) => hit(ac, o, t, { noiseFilter: 'bandpass', nf: 1800, len: 0.13, vol: 0.22 }),
  hat: (ac, o, t) => hit(ac, o, t, { noiseFilter: 'highpass', nf: 7000, len: 0.04, vol: 0.12 }),
  shaker: (ac, o, t) => hit(ac, o, t, { noiseFilter: 'highpass', nf: 5000, len: 0.06, vol: 0.06 }),
  bongo: (ac, o, t) => hit(ac, o, t, { f0: 420, f1: 300, len: 0.1, vol: 0.28 }),
  conga: (ac, o, t) => hit(ac, o, t, { f0: 240, f1: 170, len: 0.14, vol: 0.3 }),
  wood: (ac, o, t) => hit(ac, o, t, { f0: 1500, f1: 1300, len: 0.035, vol: 0.18 }),
};

// ---------- the tunes ----------
// One token per eighth note: a note ("E5"), a chord ("C4+E4+G4"), "x" for a drum hit,
// "." for silence, "-" to hold the previous note. Every part loops on its own length.
const T = (bpm, ...parts) => ({ bpm, parts: parts.map(([inst, pat, vol = 1]) => ({ inst, vol, steps: pat.trim().split(/\s+/) })) });

const TUNES = {
  // zoo map: a cheerful walk in C major
  'menu-zoo': T(116,
    ['marimba', 'C5 E5 G5 E5 A5 G5 E5 . F5 A5 G5 F5 E5 D5 C5 . E5 G5 C6 G5 A5 G5 E5 D5 C5 D5 E5 G5 C5 - . .'],
    ['bass', 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . G2 . C3 . G2 . A2 . E2 . F2 . G2 . C3 . . .'],
    ['kick', 'x . . . x . . .'], ['shaker', '. x . x . x . x']),
  // monkeys: jungle marimba and bongos
  zadd: T(124,
    ['marimba', 'G5 . B5 D6 . B5 A5 G5 E5 . G5 A5 . G5 E5 D5 G5 . B5 D6 E6 D6 B5 A5 G5 A5 B5 . A5 G5 . .'],
    ['bass', 'G2 . . G2 D3 . . . C3 . . C3 G2 . . . G2 . . G2 E2 . . . D2 . . D2 G2 . . .'],
    ['bongo', 'x . x x . x . .'], ['conga', '. . . . x . . x'], ['shaker', 'x x x x x x x x']),
  // elephants: a heavy, friendly march
  zmul: T(100,
    ['horn', 'F4 . A4 . C5 . A4 . Bb4 . G4 . E4 . C4 . F4 . A4 . C5 . F5 . E5 D5 C5 Bb4 A4 - . .'],
    ['tuba', 'F2 . C3 . F2 . C3 . C2 . G2 . C2 . G2 . F2 . C3 . F2 . C3 . C2 . G2 . F2 . . .'],
    ['kick', 'x . . . x . . .'], ['snare', '. . x . . . x .']),
  // penguins: icy bells over a slow chord
  zfrac: T(104,
    ['bell', 'E6 . B5 . G#5 . B5 . C#6 . B5 . G#5 . E5 . F#5 . G#5 . B5 . A5 . G#5 . F#5 . E5 - - .'],
    ['pad', 'E4+G#4+B4 - - - - - - - A3+C#4+E4 - - - - - - - B3+D#4+F#4 - - - - - - - E4+G#4+B4 - - - - - - -'],
    ['bass', 'E2 . . . . . . . A2 . . . . . . . B2 . . . . . . . E2 . . . . . . .'],
    ['hat', '. . x . . . x .', 0.6]),
  // zebras: a gallop across the plains
  zgeo: T(138,
    ['pluck', 'D5 . F#5 A5 . F#5 D5 . E5 . G5 B5 . A5 G5 . F#5 . A5 D6 . A5 F#5 . E5 F#5 G5 E5 D5 - . .'],
    ['bass', 'D3 . A2 . D3 . A2 . E3 . A2 . E3 . A2 . D3 . A2 . D3 . F#2 . G2 . A2 . D3 . . .'],
    ['kick', 'x . . . x . . .'], ['conga', 'x . x x x . x x'], ['hat', '. x . x . x . x', 0.7]),
  // owls: a soft night-time flute in A minor
  zpuz: T(84,
    ['flute', 'A4 - C5 - E5 - D5 C5 B4 - - - G4 - - - A4 - C5 - E5 - G5 F5 E5 - D5 - C5 B4 A4 -'],
    ['pad', 'A3+C4+E4 - - - - - - - G3+B3+D4 - - - - - - - F3+A3+C4 - - - - - - - E3+G#3+B3 - - - - - - -'],
    ['bass', 'A2 . . . . . . . G2 . . . . . . . F2 . . . . . . . E2 . . . . . . .'],
    ['wood', '. . . . . . x . . . . . . . . .', 0.6]),

  // space map: a slow synth arpeggio in A minor
  'menu-space': T(100,
    ['arp', 'A4 C5 E5 A5 E5 C5 A4 C5 F4 A4 C5 F5 C5 A4 F4 A4 G4 B4 D5 G5 D5 B4 G4 B4 E4 G#4 B4 E5 B4 G#4 E4 G#4'],
    ['pad', 'A3+C4+E4 - - - - - - - F3+A3+C4 - - - - - - - G3+B3+D4 - - - - - - - E3+G#3+B3 - - - - - - -'],
    ['bass', 'A2 . . . A2 . . . F2 . . . F2 . . . G2 . . . G2 . . . E2 . . . E2 . . .'],
    ['kick', 'x . . . x . . .'], ['hat', '. . x . . . x .']),
  // fractions planet (pizza): a funky bass line
  frac: T(112,
    ['lead', 'E5 . G5 . A5 G5 E5 . F5 . A5 . C6 A5 F5 . E5 . G5 . Bb5 A5 G5 E5 D5 E5 F5 G5 C5 - . .'],
    ['synbass', 'C3 . C3 C4 . C3 Bb2 . F2 . F2 F3 . F2 G2 . C3 . C3 C4 . C3 Bb2 . G2 . G2 A2 Bb2 B2 C3 .'],
    ['kick', 'x . . x . . x .'], ['snare', '. . x . . . x .'], ['hat', 'x x x x x x x x', 0.7]),
  // order-of-operations planet: steady rings of arpeggios
  order: T(104,
    ['arp', 'D4 F4 A4 C5 A4 F4 D4 F4 C4 E4 G4 Bb4 G4 E4 C4 E4 D4 F4 A4 C5 A4 F4 D4 F4 G4 B4 D5 F5 D5 B4 G4 B4'],
    ['bell', 'A5 - - - G5 - - - F5 - E5 - D5 - - - A5 - - - C6 - - - B5 - G5 - A5 - - -'],
    ['bass', 'D2 . . . D3 . . . C2 . . . C3 . . . D2 . . . D3 . . . G2 . . . G2 . . .'],
    ['kick', 'x . . . x . . .'], ['hat', '. . x . . . x .']),
  // squares planet: an old-school chiptune
  sq: T(126,
    ['lead', 'E5 E5 G5 E5 B5 . A5 G5 F#5 F#5 A5 F#5 D6 . B5 A5 G5 G5 B5 G5 E6 . D6 B5 C6 B5 A5 F#5 E5 - . .'],
    ['synbass', 'E2 . E3 . E2 . E3 . D2 . D3 . D2 . D3 . C2 . C3 . C2 . C3 . B1 . B2 . B1 . B2 .'],
    ['kick', 'x . . . x . . .'], ['snare', '. . x . . . x .'], ['hat', 'x . x . x . x .', 0.7]),
  // shapes planet: crystal bells
  geo: T(100,
    ['bell', 'F5 A5 C6 E6 C6 A5 F5 A5 G5 B5 D6 E6 D6 B5 G5 B5 F5 A5 C6 E6 C6 A5 F5 A5 E5 G5 B5 D6 B5 G5 E5 G5', 0.8],
    ['pad', 'F3+A3+C4 - - - - - - - G3+B3+D4 - - - - - - - F3+A3+C4 - - - - - - - E3+G3+B3 - - - - - - -'],
    ['bass', 'F2 . . . . . . . G2 . . . . . . . F2 . . . . . . . E2 . . . . . . .']),
  // puzzle nebula: mysterious and slow
  puz: T(88,
    ['bell', 'G5 - - - Eb5 - - - F5 - G5 - Ab5 - - - G5 - - - Eb5 - C5 - D5 - - - B4 - - -'],
    ['pad', 'C4+Eb4+G4 - - - - - - - Ab3+C4+Eb4 - - - - - - - F3+Ab3+C4 - - - - - - - G3+B3+D4 - - - - - - -'],
    ['bass', 'C2 . . . . . . . Ab1 . . . . . . . F2 . . . . . . . G2 . . . . . . .'],
    ['wood', '. . . . x . . .', 0.5]),

  // lab map: bubbly and curious
  'menu-lab': T(108,
    ['pluck', 'G5 . D5 . B4 . D5 G5 A5 . E5 . C5 . E5 A5 B5 . G5 . D5 . G5 B5 A5 . F#5 . D5 - . .'],
    ['bass', 'G2 . . . D3 . . . A2 . . . E3 . . . G2 . . . D3 . . . D2 . . . A2 . . .'],
    ['bubble', 'G5 . . . . . D6 . . . . . . . . .'],
    ['kick', 'x . . . x . . .'], ['shaker', '. x . x . x . x']),
  // decimals lab: a ticking instrument
  ldec: T(112,
    ['pluck', 'A5 . E5 . C#5 . E5 . B5 . E5 . D5 . E5 . C#6 . A5 . E5 . A5 . B5 . G#5 . E5 . . .'],
    ['bass', 'A2 . . . E2 . . . E2 . . . B2 . . . A2 . . . F#2 . . . E2 . . . E2 . . .'],
    ['wood', 'x . x . x . x .'], ['kick', 'x . . . . . . .']),
  // solutions lab: bubbling liquids
  lratio: T(100,
    ['bubble', 'F5 A5 C6 . G5 Bb5 D6 . A5 C6 F6 . G5 E5 C5 .', 0.9],
    ['pluck', 'F5 - - - E5 - D5 - C5 - - - A4 - - - Bb4 - - - C5 - D5 - E5 - - - F5 - - -'],
    ['bass', 'F2 . . . . . . . Bb2 . . . . . . . C3 . . . . . . . F2 . . . . . . .'],
    ['shaker', 'x . x x x . x x', 0.8]),
  // numbers lab: under the microscope
  lnum: T(90,
    ['bell', 'B5 - - - F#5 - - - D5 - E5 - F#5 - - - A5 - - - G5 - E5 - F#5 - - - - - - -'],
    ['pad', 'B3+D4+F#4 - - - - - - - G3+B3+D4 - - - - - - - E3+G3+B3 - - - - - - - F#3+A#3+C#4 - - - - - - -'],
    ['bass', 'B1 . . . . . . . G2 . . . . . . . E2 . . . . . . . F#2 . . . . . . .'],
    ['wood', '. . . . . . . . x . . . . . . .', 0.6]),
  // measurements lab: careful, even steps
  lgeo: T(96,
    ['pluck', 'C5 . E5 . G5 . C6 . B5 . G5 . D5 . G5 . A5 . F5 . C5 . F5 . G5 . E5 . C5 - . .'],
    ['bell', 'C6 - - - - - - - B5 - - - - - - - A5 - - - - - - - G5 - - - - - - -', 0.6],
    ['bass', 'C3 . G2 . C3 . G2 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . G2 . D3 . C3 . . .'],
    ['kick', 'x . . . x . . .'], ['hat', '. . x . . . x .', 0.6]),
  // formulas lab: upbeat synths
  lalg: T(116,
    ['lead', 'E5 . G#5 B5 . G#5 E5 . F#5 . A5 C#6 . A5 F#5 . G#5 . B5 E6 . B5 G#5 . A5 G#5 F#5 D#5 E5 - . .'],
    ['synbass', 'E2 . E3 . E2 . E3 . A2 . A3 . A2 . A3 . E2 . E3 . E2 . E3 . B1 . B2 . B1 . B2 .'],
    ['kick', 'x . . . x . . .'], ['snare', '. . x . . . x .'], ['hat', 'x x x x x x x x', 0.6]),

  // boss fights: faster and tense, one per game
  'boss-zoo': T(144,
    ['tuba', 'D2 D2 D3 D2 D2 D2 C3 D2 Bb1 Bb1 Bb2 Bb1 A1 A1 C#3 A1'],
    ['horn', 'D4 - F4 - A4 - G4 F4 E4 - - - C#4 - - - D4 - F4 - A4 - C5 Bb4 A4 - G4 - F4 E4 D4 -'],
    ['bongo', 'x x . x x . x .'], ['conga', '. . x . . x . x'], ['kick', 'x . . . x . . .']),
  'boss-space': T(150,
    ['synbass', 'A2 A2 A3 A2 A2 A2 G3 A2 F2 F2 F3 F2 G2 G2 G3 G2'],
    ['lead', 'A4 - - - C5 - B4 - A4 - E5 - - - D5 - C5 - - - B4 - A4 - G4 - B4 - E5 - - -'],
    ['kick', 'x . x . x . x .'], ['snare', '. . x . . . x .'], ['hat', 'x x x x x x x x', 0.7]),
  'boss-lab': T(146,
    ['arp', 'E4 G4 B4 E5 B4 G4 E4 G4 C4 E4 G4 C5 G4 E4 C4 E4 D4 F#4 A4 D5 A4 F#4 D4 F#4 B3 D#4 F#4 B4 F#4 D#4 B3 D#4'],
    ['synbass', 'E2 . E2 E3 . E2 . E2 C2 . C2 C3 . C2 . C2 D2 . D2 D3 . D2 . D2 B1 . B1 B2 . B1 . B1'],
    ['kick', 'x . x . x . x .'], ['snare', '. . x . . . x .'], ['bubble', 'E5 . . . . . . . B5 . . . . . . .', 0.7]),
};
export const TUNE_NAMES = Object.keys(TUNES);

// ---------- the player ----------
const LEVEL = 0.16, AHEAD = 0.25;
let want = null, now = null, out = null, gains = [], step = 0, next = 0, timer = null;

const on = () => flag('music') !== false;

function tick() {
  const ac = audio();
  if (!ac || !now || ac.state !== 'running') return;
  if (next < ac.currentTime - 0.3) next = ac.currentTime + 0.05; // timers were throttled; don't play a backlog
  const tune = TUNES[now], dt = 30 / tune.bpm;
  while (next < ac.currentTime + AHEAD) {
    tune.parts.forEach((p, i) => {
      const tok = p.steps[step % p.steps.length];
      if (tok === '.' || tok === '-') return;
      let len = 1;
      while (p.steps[(step + len) % p.steps.length] === '-' && len < p.steps.length) len++;
      const g = gains[i];
      if (tok === 'x') INST[p.inst](ac, g, next, 0, dt);
      else for (const n of tok.split('+')) INST[p.inst](ac, g, next, freq(n), dt * len * 0.95);
    });
    step++;
    next += dt;
  }
}

function start() {
  const ac = audio();
  if (!ac) return;
  if (out) {
    // fade the old tune out
    const old = out;
    old.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15);
    setTimeout(() => old.disconnect(), 800);
    out = null;
  }
  now = on() ? want : null;
  if (!now) return;
  out = ac.createGain();
  out.gain.setValueAtTime(0.0001, ac.currentTime);
  out.gain.setTargetAtTime(LEVEL, ac.currentTime + 0.1, 0.4);
  out.connect(ac.destination);
  gains = TUNES[now].parts.map(p => {
    const g = ac.createGain();
    g.gain.value = p.vol;
    g.connect(out);
    return g;
  });
  step = 0;
  next = ac.currentTime + 0.15;
  if (!timer) timer = setInterval(tick, 50);
}

// Ask for a tune (by world id, 'menu-<game>' or 'boss-<game>'); the same tune keeps playing.
export function music(name) {
  want = TUNES[name] ? name : null;
  if (want !== now) start();
}

// After the player turns music on or off.
export function musicChanged() {
  now = null;
  start();
}

// Browsers allow sound only after a touch; pause while the page is hidden (app in the background).
const unlock = () => {
  const ac = audio();
  if (ac && ac.state === 'suspended' && !document.hidden) ac.resume();
};
['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, unlock, { capture: true }));
document.addEventListener('visibilitychange', () => {
  const ac = audio();
  if (!ac) return;
  if (document.hidden) ac.suspend();
  else ac.resume();
});

// for dev/music.html: renders a tune offline to measure it
export const _dev = { TUNES, INST, freq };
