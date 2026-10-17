// The boss fight shown above a boss challenge: the player's side on the right, the accountant on
// the left. A solved round hits the boss (4 hits beat it); a failed round costs one of 2 shields.
// These are the usual rules (4 of 5 to pass), only shown as a fight that can end early.
import { h, range } from './util.js';
import { accountant } from './art.js';
import { sfx } from './sound.js';

export const HITS = 4, SHIELDS = 2;

const heart = on => `<svg viewBox="0 0 24 22" class="bt-heart${on ? '' : ' off'}"><path d="M12 21C5 15 1 11 1 6.5A5.5 5.5 0 0 1 12 4a5.5 5.5 0 0 1 11 2.5C23 11 19 15 12 21Z"/></svg>`;

// hero: HTML of the player's side; shot: a short projectile (emoji or HTML) or null for a laser beam
export function battle({ hero, shot = null, color, boss }) {
  let hp = HITS, shields = SHIELDS;
  const bar = h('i');
  const hearts = h('div', { class: 'bt-hearts', 'aria-label': 'מגינים' });
  const villain = h('div', { class: 'bt-boss', html: accountant(color) });
  const me = h('div', { class: 'bt-hero', html: hero });
  const fx = h('div', { class: 'bt-fx', 'aria-hidden': 'true' });
  const say = h('div', { class: 'bt-say', 'aria-live': 'polite' });
  const paint = () => {
    bar.style.width = `${(100 * hp) / HITS}%`;
    hearts.innerHTML = range(SHIELDS, i => heart(i < shields)).join('');
  };
  const el = h('div', { class: 'battle', dir: 'rtl' },
    h('div', { class: 'bt-side me' }, me, hearts),
    fx,
    h('div', { class: 'bt-side foe' }, h('div', { class: 'bt-hp', title: boss }, bar), villain),
    say);
  paint();

  // one animation at a time; a new one replaces the old
  const play = (cls, html, who, ms) => {
    fx.className = 'bt-fx';
    fx.innerHTML = html;
    void fx.offsetWidth;
    fx.classList.add(cls);
    who.classList.remove('hurt');
    void who.offsetWidth;
    setTimeout(() => who.classList.add('hurt'), ms);
  };

  return {
    el,
    // the player solved a round
    hit() {
      hp = Math.max(0, hp - 1);
      sfx('zap');
      play('to-foe', shot ? `<span class="bt-shot">${shot}</span>` : '<b class="bt-beam"></b>', villain, 380);
      setTimeout(() => {
        paint();
        if (!hp) {
          sfx('boom');
          villain.classList.add('down');
          say.textContent = `${boss} הובס!`;
          say.classList.add('on');
        }
      }, 400);
    },
    // the player failed a round
    miss() {
      shields = Math.max(0, shields - 1);
      play('to-me', '<b class="bt-bolt">⚡</b>', me, 380);
      setTimeout(() => {
        paint();
        if (!shields) {
          me.classList.add('down');
          say.textContent = `${boss} ניצח הפעם. נסו שוב!`;
          say.classList.add('on');
        }
      }, 400);
    },
    over: () => !hp || !shields,
  };
}
