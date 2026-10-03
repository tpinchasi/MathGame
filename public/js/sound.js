import { flag } from './state.js';

const TUNES = {
  ok: [[660, 0.08], [880, 0.14]],
  bad: [[200, 0.18]],
  star: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.24]],
};
let ctx;

export function sfx(name) {
  if (flag('mute')) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of TUNES[name]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur;
    }
  } catch {}
}
