// Screens and navigation: galaxy map, planet path, challenge, result, space station, parents' corner.
import { WORLDS } from './worlds/index.js';
import * as st from './state.js';
import { play, ROUNDS, PASS } from './engine.js';
import { h } from './util.js';
import { planet, alien, alienName, accountant, ship, starfield } from './art.js';
import { sfx } from './sound.js';

const app = document.getElementById('app');
// ?dev opens every challenge and level, for testing
const DEV = new URLSearchParams(location.search).has('dev');
const ALL = WORLDS.flatMap(w => w.challenges);
const sum = list => list.reduce((s, c) => s + st.level(c.id), 0);
const unlocked = (w, i) => DEV || i === 0 || st.level(w.challenges[i - 1].id) >= 1;
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const go = hash => (location.hash = hash);
const total = list => h('div', { class: 'total' }, `⭐ ${sum(list)} / ${list.length * 3}`);
const back = (href, label) => h('a', { class: 'icon-btn', href, 'aria-label': label }, '→');

let cleanup = null, modalEl = null;

function closeModal() {
  if (modalEl) modalEl.remove();
  modalEl = null;
}
function modal(content) {
  closeModal();
  modalEl = h('div', { class: 'modal', onclick: e => e.target === modalEl && closeModal() }, h('div', { class: 'sheet' }, content));
  document.body.append(modalEl);
}

function route() {
  if (cleanup) cleanup();
  cleanup = null;
  closeModal();
  const [name, a, b, c] = location.hash.replace(/^#\/?/, '').split('/');
  const w = WORLDS.find(x => x.id === a);
  window.scrollTo(0, 0);
  if (name === 'world' && w) return worldScreen(w);
  if (name === 'play' && w && w.challenges[+b] && +c >= 1 && +c <= 3) return playScreen(w, +b, +c);
  if (name === 'station') return stationScreen();
  if (name === 'parents') return parentsScreen();
  mapScreen();
}

function muteBtn() {
  const label = () => (st.flag('mute') ? '🔇 צלילים כבויים' : '🔊 צלילים');
  const b = h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.flag('mute', !st.flag('mute')); b.textContent = label(); } }, label());
  return b;
}

function story() {
  modal(h('div', { class: 'story' },
    h('div', { class: 'story-art', html: accountant() }),
    h('h2', {}, 'נקמת החשבונאים'),
    h('p', {}, 'לחשבונאי החלל נמאס שכולם אומרים שחשבון זה משעמם. אז הם נעלו את כל הגלקסיה במנעולי חשבון, ולקחו את החייזרים בשבי.'),
    h('p', {}, 'רק מי שפותר את האתגרים שלהם יכול לשחרר את החייזרים, לאסוף כוכבים ולשדרג את החללית.'),
    h('p', {}, 'בכל כוכב לכת מחכים 8 אתגרים ובוס אחד. מוכנים?'),
    h('button', { type: 'button', class: 'btn primary', onclick: () => { st.flag('story', true); closeModal(); } }, 'יוצאים לדרך!')));
}

function mapScreen() {
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' },
      h('div', { class: 'logo' }, h('span', { class: 'logo-art', html: accountant() }), h('h1', {}, 'נקמת החשבונאים')),
      total(ALL)),
    h('div', { class: 'galaxy' }, WORLDS.map((w, i) =>
      h('a', { class: 'planet-card', href: `#/world/${w.id}`, style: `--i:${i}` },
        h('span', { class: 'pc-art', html: planet(w.id) }),
        h('b', {}, w.name),
        h('span', { class: 'pc-stars' }, `⭐ ${sum(w.challenges)} / ${w.challenges.length * 3}`)))),
    h('nav', { class: 'map-nav' },
      h('a', { class: 'btn', href: '#/station' }, '🚀 תחנת החלל'),
      muteBtn(),
      h('a', { class: 'btn ghost', href: '#/parents' }, 'להורים')));
  if (!st.flag('story') && !DEV) story();
}

// The explanation for a challenge. `then` runs after "got it"; `back` adds a way to return without starting.
function intro(ch, then, back) {
  modal(h('div', { class: 'intro' },
    h('h3', {}, ch.title),
    h('div', { class: 'intro-body', html: ch.intro }),
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

function worldScreen(w) {
  const last = w.challenges.length - 1;
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back('#/', 'חזרה למפה'), h('h2', {}, w.name), total(w.challenges)),
    h('p', { class: 'tagline' }, w.tagline),
    h('ol', { class: 'path' }, w.challenges.map((ch, i) => {
      const open = unlocked(w, i), lv = st.level(ch.id);
      return h('li', { class: 'node' + (open ? '' : ' locked') + (i === last ? ' boss' : '') + (lv ? ' done' : '') },
        h('button', { type: 'button', disabled: !open, onclick: () => levelPicker(w, i) },
          i === last ? h('span', { class: 'num art', html: accountant(w.color) }) : h('span', { class: 'num' }, String(i + 1)),
          h('span', { class: 'nt' }, h('b', {}, ch.title), h('small', {}, open ? stars(lv) : '🔒 נפתח אחרי האתגר הקודם'))));
    })));
}

function playScreen(w, i, lvl) {
  const ch = w.challenges[i];
  if (!unlocked(w, i) || (!DEV && lvl > st.level(ch.id) + 1)) return go(`#/world/${w.id}`);
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
      resultScreen(w, i, lvl, correct);
    },
  });
  if (!st.introSeen(ch.id) && !DEV) {
    st.markIntro(ch.id);
    intro(ch);
  }
}

function resultScreen(w, i, lvl, correct) {
  const ch = w.challenges[i], passed = correct >= PASS, first = st.record(ch.id, lvl, correct, ROUNDS, passed);
  const boss = i === w.challenges.length - 1, gi = ALL.indexOf(ch), nextCh = w.challenges[i + 1];
  if (first) sfx('star');
  const reward = !first ? null
    : lvl > 1 ? h('p', { class: 'reward' }, 'כוכב חדש נוסף לאוסף!')
    : boss ? h('div', { class: 'reward' }, h('div', { class: 'reward-art', html: accountant(w.color) }), h('p', {}, `${w.boss} הובס! קיבלתם שדרוג לחללית.`))
    : h('div', { class: 'reward' }, h('div', { class: 'reward-art', html: alien(gi) }), h('p', {}, `שחררתם את ${alienName(gi)}! מחכה לכם בתחנת החלל.`));
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
      h('a', { class: 'btn ghost', href: `#/world/${w.id}` }, 'חזרה לכוכב'))));
}

function stationScreen() {
  const parts = WORLDS.map(w => st.level(w.challenges[w.challenges.length - 1].id) >= 1);
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back('#/', 'חזרה למפה'), h('h2', {}, 'תחנת החלל'), total(ALL)),
    h('section', { class: 'card' },
      h('div', { class: 'ship-wrap', html: ship(parts) }),
      h('p', {}, `שדרוגי חללית: ${parts.filter(Boolean).length} מתוך ${parts.length}. כל בוס שמובס מוסיף חלק.`)),
    ...WORLDS.map(w => h('section', { class: 'card' },
      h('h3', {}, w.name),
      h('div', { class: 'aliens' }, w.challenges.slice(0, -1).map(ch => {
        const gi = ALL.indexOf(ch), got = st.level(ch.id) >= 1;
        return h('figure', {}, h('span', { html: alien(gi, !got) }), h('figcaption', {}, got ? alienName(gi) : '???'));
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
  app.innerHTML = '';
  app.append(
    h('header', { class: 'top' }, back('#/', 'חזרה למפה'), h('h2', {}, 'פינת הורים'), total(ALL)),
    h('p', { class: 'tagline' }, 'ההתקדמות נשמרת רק בדפדפן של המכשיר הזה. שורה מודגשת פירושה פחות מ־60% תשובות נכונות, וכדאי לחזק את הנושא.'),
    ...WORLDS.map(w => h('section', { class: 'card' },
      h('h3', {}, `${w.name} · ⭐ ${sum(w.challenges)} / ${w.challenges.length * 3}`),
      h('table', { class: 'ptable' },
        h('thead', {}, h('tr', {}, ['אתגר', 'כוכבים', 'משחקים', 'דיוק'].map(t => h('th', {}, t)))),
        h('tbody', {}, w.challenges.map(row))))),
    h('div', { class: 'map-nav' }, resetBtn));
}

starfield(document.getElementById('stars'));
window.addEventListener('hashchange', route);
route();
