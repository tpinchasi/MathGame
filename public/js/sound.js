import { flag } from './state.js';

const TUNES = {
  ok: [[660, 0.08], [880, 0.14]],
  bad: [[200, 0.18]],
  star: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.24]],
  zap: [[1400, 0.05], [1000, 0.05], [700, 0.08]],
  boom: [[180, 0.12], [120, 0.16], [80, 0.3]],
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
