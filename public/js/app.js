// Screens and navigation: grade picker, game map, world path, challenge, result, prize hub, parents' corner.
import { GAMES, gameOf, findWorld } from './games.js';
import * as st from './state.js';
import { play, ROUNDS, PASS } from './engine.js';
import { h, glue } from './util.js';
import { accountant } from './art.js';
import { sfx } from './sound.js';

const app = document.getElementById('app');
// ?dev opens every challenge and level, for testing
const DEV = new URLSearchParams(location.search).has('dev');
const chOf = g => g.worlds.flatMap(w => w.challenges);
const sum = list => list.reduce((s, c) => s + st.level(c.id), 0);
const unlocked = (w, i) => DEV || i === 0 || st.level(w.challenges[i - 1].id) >= 1;
const bossBeaten = w => st.level(w.challenges[w.challenges.length - 1].id) >= 1;
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const go = hash => (location.hash = hash);
const total = list => h('div', { class: 'total' }, `⭐ ${sum(list)} / ${list.length * 3}`);
const back = (href, label) => h('a', { class: 'icon-btn', href, 'aria-label': label }, '→');

let cleanup = null, modalEl = null, theme = null;

function closeModal() {
  if (modalEl) modalEl.remove();
  modalEl = null;
}
function modal(content) {
  closeModal();
  modalEl = h('div', { class: 'modal', onclick: e => e.target === modalEl && closeModal() }, h('div', { class: 'sheet' }, content));
  document.body.append(modalEl);
}

// Colours and background follow the game being played; the grade picker uses the space look.
function useGame(g) {
  const id = g ? g.id : 'space';
  if (g) st.flag('game', g.id);
  if (theme === id) return;
  theme = id;
  document.body.dataset.theme = id;
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = (g || GAMES.find(x => x.id === 'space')).theme;
  (g || GAMES.find(x => x.id === 'space')).decor(document.getElementById('stars'));
}

function route() {
  if (cleanup) cleanup();
  cleanup = null;
  closeModal();
  const [name, a, b, c] = location.hash.replace(/^#\/?/, '').split('/');
  const w = findWorld(a), g = GAMES.find(x => x.id === a) || (w && gameOf(w));
  window.scrollTo(0, 0);
  if (name === 'world' && w) return worldScreen(g, w);
  if (name === 'play' && w && w.challenges[+b] && +c >= 1 && +c <= 3) return playScreen(g, w, +b, +c);
  if (name === 'map' && g) return mapScreen(g);
  if (name === 'hub' && g) return hubScreen(g);
  if (name === 'station') return hubScreen(GAMES.find(x => x.id === 'space'));
  if (name === 'parents') return parentsScreen();
  if (name === 'grades') return gradesScreen();
  const last = GAMES.find(x => x.id === st.flag('game'));
  return last ? mapScreen(last) : gradesScreen();
}

function muteBtn() {
  const label = () => (st.flag('mute') ? '🔇 צלילים כבויים' : '🔊 צלילים');
  const b = h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.flag('mute', !st.flag('mute')); b.textContent = label(); } }, label());
  return b;
}

const logo = () => h('div', { class: 'logo' }, h('span', { class: 'logo-art', html: accountant() }), h('h1', {}, 'נקמת החשבונאים'));

function gradesScreen() {
  useGame(null);
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, logo()),
    h('h2', { class: 'pick-title' }, 'באיזו כיתה אתם?'),
    h('div', { class: 'grades' }, GAMES.map((g, i) =>
      h('a', { class: `grade-card g-${g.id}`, href: `#/map/${g.id}`, style: `--i:${i}` },
        h('span', { class: 'gc-art', html: g.cover() }),
        h('span', { class: 'gc-text' },
          h('b', {}, g.grades),
          h('span', {}, g.name),
          h('small', {}, `⭐ ${sum(chOf(g))} / ${chOf(g).length * 3}`))))),
    h('nav', { class: 'map-nav' }, muteBtn(), h('a', { class: 'btn ghost', href: '#/parents' }, 'להורים')));
}

const storyKey = g => (g.id === 'space' ? 'story' : `story-${g.id}`);
function story(g) {
  modal(h('div', { class: 'story' },
    h('div', { class: 'story-art', html: accountant() }),
    h('h2', {}, `נקמת החשבונאים: ${g.name}`),
    g.story.map(t => h('p', {}, t)),
    h('button', { type: 'button', class: 'btn primary', onclick: () => { st.flag(storyKey(g), true); closeModal(); } }, g.storyBtn)));
}

function mapScreen(g) {
  useGame(g);
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, logo(), total(chOf(g))),
    h('div', { class: 'game-bar' },
      h('span', { class: 'game-chip' }, `${g.icon} ${g.name} · ${g.grades}`),
      h('a', { class: 'btn tiny', href: '#/grades' }, 'החלפת כיתה')),
    h('div', { class: 'galaxy' }, g.worlds.map((w, i) =>
      h('a', { class: 'planet-card', href: `#/world/${w.id}`, style: `--i:${i}` },
        h('span', { class: 'pc-art', html: g.worldArt(w) }),
        h('b', {}, w.name),
        h('span', { class: 'pc-stars' }, `⭐ ${sum(w.challenges)} / ${w.challenges.length * 3}`)))),
    h('nav', { class: 'map-nav' },
      h('a', { class: 'btn', href: `#/hub/${g.id}` }, g.hub.btn),
      muteBtn(),
      h('a', { class: 'btn ghost', href: '#/parents' }, 'להורים')));
  if (!st.flag(storyKey(g)) && !DEV) story(g);
}

// The explanation for a challenge. `then` runs after "got it"; `back` adds a way to return without starting.
function intro(ch, then, back) {
  modal(h('div', { class: 'intro' },
    h('h3', {}, ch.title),
    h('div', { class: 'intro-body', html: glue(ch.intro) }),
    h('div', { class: 'result-btns' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => { closeModal(); if (then) then(); } }, 'הבנתי, קדימה!'),
      back ? h('button', { type: 'button', class: 'btn ghost', onclick: back }, 'חזרה') : null)));
}

function levelPicker(w, i) {
  const ch = w.challenges[i], lv = st.level(ch.id);
  modal(h('div', { class: 'picker' },
    h('h3', {}, ch.title),
    h('div', { class: 'levels' }, [1, 2, 3].map(l => {
      const open = DEV || l <= lv + 1;
      return h('button', { type: 'button', class: 'level' + (l <= lv ? ' passed' : ''), disabled: !open, onclick: () => go(`#/play/${w.id}/${i}/${l}`) },
        h('b', {}, `רמה ${l}`), h('span', { class: 'lv-stars' }, '★'.repeat(l)), h('small', {}, l <= lv ? 'עברתם ✓' : open ? 'קדימה!' : '🔒'));
    })),
    // reading the explanation first leads straight into the next level still to be earned
    h('button', {
      type: 'button', class: 'btn ghost',
      onclick: () => intro(ch, () => { st.markIntro(ch.id); go(`#/play/${w.id}/${i}/${Math.min(lv + 1, 3)}`); }, () => levelPicker(w, i)),
    }, 'הסבר ודוגמה')));
}

function worldScreen(g, w) {
  useGame(g);
  const last = w.challenges.length - 1;
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back(`#/map/${g.id}`, 'חזרה למפה'), h('h2', {}, w.name), total(w.challenges)),
    h('p', { class: 'tagline' }, w.tagline),
    h('ol', { class: 'path' }, w.challenges.map((ch, i) => {
      const open = unlocked(w, i), lv = st.level(ch.id);
      return h('li', { class: 'node' + (open ? '' : ' locked') + (i === last ? ' boss' : '') + (lv ? ' done' : '') },
        h('button', { type: 'button', disabled: !open, onclick: () => levelPicker(w, i) },
          i === last ? h('span', { class: 'num art', html: accountant(w.color) }) : h('span', { class: 'num' }, String(i + 1)),
          h('span', { class: 'nt' }, h('b', {}, ch.title), h('small', {}, open ? stars(lv) : '🔒 נפתח אחרי האתגר הקודם'))));
    })));
}

function playScreen(g, w, i, lvl) {
  const ch = w.challenges[i];
  if (!unlocked(w, i) || (!DEV && lvl > st.level(ch.id) + 1)) return go(`#/world/${w.id}`);
  useGame(g);
  const root = h('div', { class: 'play' });
  app.innerHTML = '';
  app.append(root);
  cleanup = play(root, {
    ch, level: lvl,
    onExit: () => go(`#/world/${w.id}`),
    onHelp: () => intro(ch),
    onDone: correct => {
      cleanup();
      cleanup = null;
      resultScreen(g, w, i, lvl, correct);
    },
  });
  if (!st.introSeen(ch.id) && !DEV) {
    st.markIntro(ch.id);
    intro(ch);
  }
}

// Each challenge (bosses aside) frees one prize. The space game counts bosses too, so its
// aliens keep the looks they had before there were three games.
const prizeList = g => (g.id === 'space' ? chOf(g) : g.worlds.flatMap(w => w.challenges.slice(0, -1)));
const prizeOf = (g, ch) => g.prize(prizeList(g).indexOf(ch));

function resultScreen(g, w, i, lvl, correct) {
  const ch = w.challenges[i], passed = correct >= PASS, first = st.record(ch.id, lvl, correct, ROUNDS, passed);
  const boss = i === w.challenges.length - 1, nextCh = w.challenges[i + 1];
  if (first) sfx('star');
  const prize = !boss && prizeOf(g, ch);
  const reward = !first ? null
    : lvl > 1 ? h('p', { class: 'reward' }, 'כוכב חדש נוסף לאוסף!')
    : boss ? h('div', { class: 'reward' }, h('div', { class: 'reward-art', html: accountant(w.color) }), h('p', {}, g.bossLine(w)))
    : h('div', { class: 'reward' }, h('div', { class: 'reward-art', html: prize.art }), h('p', {}, g.prizeLine(prize.name)));
  window.scrollTo(0, 0);
  app.innerHTML = '';
  app.append(h('div', { class: 'result' },
    h('h2', {}, passed ? 'כל הכבוד!' : 'כמעט!'),
    h('div', { class: 'big-stars' + (first ? ' pop' : '') }, stars(st.level(ch.id))),
    h('p', { class: 'score' }, `${correct} מתוך ${ROUNDS} נכונות`),
    passed ? null : h('p', {}, `כדי לעבור רמה צריך ${PASS} נכונות. עוד ניסיון?`),
    reward,
    h('div', { class: 'result-btns' },
      passed && lvl < 3 ? h('a', { class: 'btn primary', href: `#/play/${w.id}/${i}/${lvl + 1}` }, `לרמה ${lvl + 1} ${'★'.repeat(lvl + 1)}`) : null,
      passed ? null : h('button', { type: 'button', class: 'btn primary', onclick: route }, 'מנסים שוב'),
      passed && nextCh ? h('a', { class: 'btn' + (lvl === 3 ? ' primary' : ''), href: `#/play/${w.id}/${i + 1}/1` }, 'לאתגר הבא') : null,
      h('a', { class: 'btn ghost', href: `#/world/${w.id}` }, g.backToWorld))));
}

// Where the prizes are kept: the space station, the zoo's visitor centre or the lab's equipment cupboard.
function hubScreen(g) {
  useGame(g);
  const done = g.worlds.map(bossBeaten), n = done.filter(Boolean).length;
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back(`#/map/${g.id}`, 'חזרה למפה'), h('h2', {}, g.hub.name), total(chOf(g))),
    h('section', { class: 'card' },
      g.hubArt ? h('div', { class: 'ship-wrap', html: g.hubArt(done) })
        : h('div', { class: 'hub-worlds' }, g.worlds.map((w, k) =>
          h('figure', { class: done[k] ? 'open' : null }, h('span', { html: g.worldArt(w) }), h('figcaption', {}, done[k] ? w.name : '🔒')))),
      h('p', {}, g.hubIntro(n, done.length))),
    ...g.worlds.map(w => h('section', { class: 'card' },
      h('h3', {}, w.name),
      h('div', { class: 'aliens' }, w.challenges.slice(0, -1).map(ch => {
        const k = prizeList(g).indexOf(ch), got = st.level(ch.id) >= 1;
        return h('figure', {}, h('span', { html: got ? g.prize(k).art : g.lockedPrize(k) }), h('figcaption', {}, got ? g.prize(k).name : '???'));
      })))));
}

function parentsScreen() {
  const row = (ch, i) => {
    const s = st.stats(ch.id), pct = s && s.tot ? Math.round((100 * s.ok) / s.tot) : null;
    return h('tr', { class: pct != null && pct < 60 ? 'weak' : null },
      h('td', {}, `${i + 1}. ${ch.title}`), h('td', {}, stars(st.level(ch.id))), h('td', {}, s ? String(s.plays) : '—'), h('td', {}, pct != null ? pct + '%' : '—'));
  };
  let armed = false;
  const resetBtn = h('button', {
    type: 'button', class: 'btn ghost',
    onclick: () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = 'בטוחים? לחיצה נוספת מוחקת את כל ההתקדמות';
        return;
      }
      st.reset();
      route();
    },
  }, 'איפוס התקדמות');
  const all = GAMES.flatMap(chOf), last = GAMES.find(x => x.id === st.flag('game'));
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back(last ? `#/map/${last.id}` : '#/grades', 'חזרה'), h('h2', {}, 'פינת הורים'), total(all)),
    h('p', { class: 'tagline' }, 'ההתקדמות נשמרת רק בדפדפן של המכשיר הזה. שורה מודגשת פירושה פחות מ־60% תשובות נכונות, וכדאי לחזק את הנושא.'),
    ...GAMES.map(g => h('details', { class: 'card pgame', open: g === last || null },
      h('summary', {}, h('h3', {}, `${g.icon} ${g.name} (${g.grades}) · ⭐ ${sum(chOf(g))} / ${chOf(g).length * 3}`)),
      g.worlds.map(w => h('section', { class: 'pworld' },
        h('h4', {}, `${w.name} · ⭐ ${sum(w.challenges)} / ${w.challenges.length * 3}`),
        h('table', { class: 'ptable' },
          h('thead', {}, h('tr', {}, ['אתגר', 'כוכבים', 'משחקים', 'דיוק'].map(t => h('th', {}, t)))),
          h('tbody', {}, w.challenges.map(row))))))),
    h('div', { class: 'map-nav' }, h('a', { class: 'btn', href: '#/grades' }, 'בחירת כיתה'), resetBtn));
}

window.addEventListener('hashchange', route);
route();
