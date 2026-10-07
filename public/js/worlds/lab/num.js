// מעבדת המספרים
import { rnd, pick, shuffle, range, gcd, lcm, M, fr, F, nf, h, SYM } from '../../util.js';
import { inputs, box, choice, exprTap } from '../../widgets.js';
import { num, nums } from '../../kit.js';
import { genExpr, tokHTML, chainHTML, build, nextOp, validOps, hasBoth } from '../../expr.js';
import { squareArea } from '../../visuals.js';

// ---------- number theory helpers ----------
const isPrime = n => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const factors = n => {
  const f = [];
  for (let p = 2; p * p <= n; p++) while (n % p === 0) (f.push(p), (n /= p));
  if (n > 1) f.push(n);
  return f;
};
const groups = n => {
  const m = new Map();
  for (const p of factors(n)) m.set(p, (m.get(p) || 0) + 1);
  return [...m];
};
const spf = n => factors(n)[0];
const P = (b, e) => (e === 1 ? `${b}` : `${b}<sup>${e}</sup>`);
const powStr = n => groups(n).map(([p, e]) => P(p, e)).join(' × ');
const prodStr = n => factors(n).join(' × ');
const digitSum = n => [...String(n)].reduce((s, c) => s + +c, 0);
const divisors = n => range(n, i => i + 1).filter(d => n % d === 0);
const nDiv = n => groups(n).reduce((s, [, e]) => s * (e + 1), 1);
const isSq = n => Number.isInteger(Math.sqrt(n));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const list_ = a => a.map(x => M(x)).join(', ');
const par = t => (t < 0 ? `(${nf(t)})` : nf(t));
const deg = t => M(`${nf(t)}°`);
// gives the multiset intersection and the two leftovers of two factor lists
function split(a, b) {
  const fb = factors(b), both = [], onlyA = [];
  for (const p of factors(a)) {
    const i = fb.indexOf(p);
    if (i >= 0) {
      both.push(p);
      fb.splice(i, 1);
    } else onlyA.push(p);
  }
  return { both, onlyA, onlyB: fb };
}
// kit's num() with the answer box inside the left-to-right equation (eq = 'left side = ')
const numEq = ({ eq = '', answer, ...r }) => ({
  ...num({ ...r, answer }),
  ...(eq ? { widget: inputs(`<div class="ans-line">${M(`${eq}${box('a', String(answer).length + 1)}`)}</div>`) } : {}),
});
// a whole-number answer that may be negative
const numN = ({ prompt, visual, answer, pre = '', post = '', hints, explain, tries }) => ({
  prompt, visual, hints, explain, tries,
  widget: inputs(`<div class="ans-line">${pre}${box('a', String(answer).length + 2, false, 'n')}${post}</div>`),
  answer: { a: answer },
  check: v => v.a === answer,
});

// ---------- pictures ----------
const sample = (n, label = 'דגימה') => `<div class="lnum-sample"><span>🧪 ${label}</span><b dir="ltr">${n}</b></div>`;

// two overlapping circles with the prime factors of a and b
function venn(a, b) {
  const { both, onlyA, onlyB } = split(a, b);
  const col = (arr, x) => arr.map((p, i) => `<text x="${x}" y="${115 + (i - (arr.length - 1) / 2) * 21}" class="lnum-vf">${p}</text>`).join('');
  return `<svg viewBox="0 0 320 212" class="lnum-venn" dir="ltr">
    <circle cx="112" cy="116" r="90" class="lnum-va"/><circle cx="208" cy="116" r="90" class="lnum-vb"/>
    <text x="70" y="18" class="lnum-vl">${a}</text><text x="250" y="18" class="lnum-vl">${b}</text>
    ${col(onlyA, 62)}${col(both, 160)}${col(onlyB, 258)}</svg>`;
}

// a rectangle w × hgt (w ≥ hgt) with its side lengths
function rectPic(w, hgt) {
  const k = Math.min(250 / w, 130 / hgt), W = w * k, H = hgt * k, x0 = (320 - W) / 2 + 14;
  return `<svg viewBox="0 0 320 ${H + 44}" class="lnum-rect" dir="ltr"><rect x="${x0}" y="8" width="${W}" height="${H}" rx="3"/>
    <text x="${x0 + W / 2}" y="${H + 36}" class="lnum-rl">${w}</text><text x="${x0 - 8}" y="${8 + H / 2 + 6}" class="lnum-rl side">${hgt}</text></svg>`;
}

// a static factor tree; nodes = [{v, kids}]
function treeSVG(nodes, cls = () => '') {
  const pos = {};
  let col = 0, rows = 1;
  const walk = (i, d) => {
    rows = Math.max(rows, d + 1);
    const nd = nodes[i];
    if (!nd.kids) return (pos[i] = { x: col++, y: d });
    walk(nd.kids[0], d + 1);
    walk(nd.kids[1], d + 1);
    pos[i] = { x: (pos[nd.kids[0]].x + pos[nd.kids[1]].x) / 2, y: d };
  };
  walk(0, 0);
  const cols = Math.max(col, 3), off = (cols - col) / 2, X = i => 34 + (pos[i].x + off) * 64, Y = i => 32 + pos[i].y * 64;
  let lines = '', dots = '';
  nodes.forEach((nd, i) => {
    if (nd.kids) for (const k of nd.kids) lines += `<line x1="${X(i)}" y1="${Y(i)}" x2="${X(k)}" y2="${Y(k)}" class="lnum-tl"/>`;
    const s = String(nd.v), fs = s.length <= 2 ? 21 : s.length === 3 ? 18 : 15;
    dots += `<g data-i="${i}" class="lnum-tn ${isPrime(nd.v) ? 'pr' : nd.kids ? 'done' : 'cp'} ${cls(i)}"><circle cx="${X(i)}" cy="${Y(i)}" r="26"/><text x="${X(i)}" y="${Y(i) + fs * 0.36}" style="font-size:${fs}px">${s}</text></g>`;
  });
  return `<svg viewBox="0 0 ${cols * 64 + 4} ${rows * 64 + 4}" class="lnum-treesvg" dir="ltr" style="max-width:${Math.min(cols * 64 + 4, 420)}px">${lines}${dots}</svg>`;
}
function fullTree(N) {
  const nodes = [{ v: N, kids: null }];
  const grow = i => {
    const v = nodes[i].v;
    if (isPrime(v)) return;
    const p = spf(v);
    nodes[i].kids = [nodes.push({ v: p, kids: null }) - 1, nodes.push({ v: v / p, kids: null }) - 1];
    grow(nodes[i].kids[1]);
  };
  grow(0);
  return nodes;
}

// thermometer: geometry shared by the picture and the widget
const TH = { top: 22, bot: 262 };
function thermoSVG({ min, max, t = null, start = null }) {
  const y = v => TH.bot - ((v - min) * (TH.bot - TH.top)) / (max - min), span = max - min;
  const lab = span <= 40 ? 5 : 10, mid = span <= 40 ? 0 : 5;
  let s = `<svg viewBox="0 0 210 330" class="lnum-thsvg" dir="ltr">`;
  s += `<rect x="72" y="8" width="26" height="290" rx="13" class="lnum-glass"/><circle cx="85" cy="298" r="24" class="lnum-glass"/>`;
  for (let v = min; v <= max; v++) {
    const big = v % lab === 0, m5 = mid && v % mid === 0;
    s += `<line x1="100" y1="${y(v)}" x2="${big ? 114 : m5 ? 110 : 106}" y2="${y(v)}" class="lnum-tk${v === 0 ? ' zero' : ''}"/>`;
    if (big) s += `<text x="118" y="${y(v) + 6}" class="lnum-tlab${v === 0 ? ' zero' : ''}">${nf(v)}</text>`;
  }
  s += `<circle cx="85" cy="298" r="17" class="lnum-hg"/>`;
  if (t != null) s += `<rect x="79" y="${y(t)}" width="12" height="${298 - y(t)}" rx="6" class="lnum-hg"/>`;
  if (start != null) s += `<line x1="58" y1="${y(start)}" x2="100" y2="${y(start)}" class="lnum-st"/><rect x="4" y="${y(start) - 14}" width="54" height="28" rx="14" class="lnum-stp"/><text x="31" y="${y(start) + 6}" class="lnum-stt">${nf(start)}°</text>`;
  if (t != null) s += `<rect x="150" y="${y(t) - 15}" width="56" height="30" rx="15" class="lnum-rd"/><text x="178" y="${y(t) + 6}" class="lnum-rdt">${nf(t)}°</text>`;
  return s + '</svg>';
}

// ---------- widgets ----------
// a hundred-chart style grid of numbers; tap to mark
function tapGrid(list, { cols = 6, mark = () => '', tip = 'לחצו על מספר כדי לסמן אותו. לחיצה נוספת מבטלת את הסימון.', single = false, reveal = null } = {}) {
  const on = new Set();
  let locked = false;
  const btns = list.map(n =>
    h('button', {
      type: 'button', class: `lnum-cell ${mark(n)}`, html: `<span>${n}</span>`,
      onclick: () => {
        if (locked) return;
        if (single) {
          const had = on.has(n);
          on.clear();
          if (!had) on.add(n);
        } else on.has(n) ? on.delete(n) : on.add(n);
        paint();
      },
    })
  );
  const grid = h('div', { class: 'lnum-grid', dir: 'ltr', style: `grid-template-columns:repeat(${cols},1fr)` }, btns);
  const paint = () => btns.forEach((b, i) => b.classList.toggle('on', on.has(list[i])));
  return {
    el: h('div', { class: 'lnum-gridw' }, grid, h('p', { class: 'tip' }, tip)),
    value: () => (on.size ? (single ? [...on][0] : [...on].sort((a, b) => a - b)) : null),
    set(a) {
      on.clear();
      [].concat(a).forEach(x => on.add(x));
      paint();
    },
    lock() {
      locked = true;
      grid.classList.add('locked');
      if (reveal) btns.forEach((b, i) => b.classList.add(...reveal(list[i]).split(' ').filter(Boolean)));
    },
  };
}

// The player splits each composite leaf into two factors until only primes are left;
// with powers they then write the result in power form.
function factorTree(N, { powers = false } = {}) {
  return ctx => {
    const nodes = [{ v: N, kids: null }];
    let sel = null, locked = false, mini = null;
    const art = h('div', { class: 'lnum-tree' }), sub = h('div', { class: 'lnum-tree-sub' }), note = h('p', { class: 'tip' });
    const leaves = () => {
      const out = [];
      const walk = i => (nodes[i].kids ? nodes[i].kids.forEach(walk) : out.push(i));
      walk(0);
      return out;
    };
    const pending = () => leaves().filter(i => !isPrime(nodes[i].v));
    const draw = () => (art.innerHTML = treeSVG(nodes, i => (i === sel ? 'sel' : '')));
    const askSplit = () => {
      const v = nodes[sel].v;
      mini = inputs(M(`${v} = ${box('a', String(v).length)} × ${box('b', String(v).length)}`), { onOk: submit });
      sub.innerHTML = '';
      sub.append(mini.el);
      note.textContent = `פרקו את ${v} לכפל של שני מספרים, ולחצו ✓.${pending().length > 1 ? ' אפשר גם לבחור מספר כתום אחר.' : ''}`;
    };
    const askPowers = () => {
      sel = null;
      draw();
      const ps = groups(N).map(([p]) => p);
      mini = inputs(`<div class="lnum-sup">${M(`${N} = ${ps.map(p => `${p}<sup>${box('e' + p, 1)}</sup>`).join(' × ')}`)}</div>`, { onOk: submit });
      sub.innerHTML = '';
      sub.append(mini.el);
      note.textContent = 'כל הקצוות ראשוניים! עכשיו כתבו כמה פעמים מופיע כל גורם (חזקה 1 כותבים 1), ולחצו ✓.';
    };
    const finish = () => {
      locked = true;
      sel = mini = null;
      draw();
      sub.innerHTML = `<div class="lnum-done">${M(`${N} = ${prodStr(N)}${groups(N).some(([, e]) => e > 1) ? ` = ${powStr(N)}` : ''}`)}</div>`;
      note.textContent = '';
      ctx.solved();
    };
    const next = () => {
      const p = pending();
      if (p.length) {
        sel = p[0];
        draw();
        return askSplit();
      }
      if (powers) return askPowers();
      finish();
    };
    function submit() {
      if (locked || !mini) return;
      const v = mini.value();
      if (!v) return;
      if (sel == null) {
        const ok = groups(N).every(([p, e]) => v['e' + p] === e);
        if (ok) return finish();
        mini.clear();
        return ctx.mistake('ספרו שוב כמה פעמים מופיע כל גורם ראשוני בקצות העץ.');
      }
      const n = nodes[sel].v;
      if (v.a * v.b !== n) {
        mini.clear();
        return ctx.mistake(`${M(`${v.a} × ${v.b} = ${v.a * v.b}`)}, ולא ${n}.`);
      }
      if (v.a === 1 || v.b === 1) {
        mini.clear();
        note.textContent = `פירוק עם 1 לא מקדם אותנו. חפשו מספר אחר ש־${n} מתחלק בו.`;
        return;
      }
      nodes[sel].kids = [nodes.push({ v: v.a, kids: null }) - 1, nodes.push({ v: v.b, kids: null }) - 1];
      next();
    }
    art.addEventListener('click', e => {
      const g = e.target.closest && e.target.closest('[data-i]');
      if (locked || !g) return;
      const i = +g.dataset.i;
      if (i === sel || !pending().includes(i)) return;
      sel = i;
      draw();
      askSplit();
    });
    next();
    return {
      el: h('div', { class: 'lnum-treew' }, art, note, sub),
      // splits by the smallest prime each time; used by the self-test
      auto() {
        let guard = 0;
        while (!locked && guard++ < 40) {
          if (sel == null) {
            mini.set(Object.fromEntries(groups(N).map(([p, e]) => ['e' + p, e])));
          } else {
            const n = nodes[sel].v, p = spf(n);
            mini.set({ a: p, b: n / p });
          }
          submit();
        }
      },
      key(e) {
        if (!mini) return false;
        if (e.key === 'Enter') {
          submit();
          return true;
        }
        return mini.key(e);
      },
      lock() {
        if (!locked) {
          sub.innerHTML = '';
          note.textContent = '';
        }
        locked = true;
        sel = null;
        draw();
      },
    };
  };
}

// a thermometer the player sets by dragging or with the arrows
function thermo({ min, max, start = null }) {
  let t = start == null ? Math.round((min + max) / 2) : start, moved = false, locked = false, drag = false;
  const stage = h('div', { class: 'lnum-thst' });
  const draw = () => (stage.innerHTML = thermoSVG({ min, max, t: moved ? t : start, start }));
  const aim = e => {
    const svg = stage.firstChild, p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    t = Math.max(min, Math.min(max, Math.round(min + ((TH.bot - p.y) * (max - min)) / (TH.bot - TH.top))));
    moved = true;
    draw();
  };
  stage.addEventListener('pointerdown', e => {
    if (locked) return;
    e.preventDefault();
    drag = true;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    aim(e);
  });
  stage.addEventListener('pointermove', e => drag && !locked && aim(e));
  const stop = () => (drag = false);
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  const nudge = by => () => {
    if (locked) return;
    t = Math.max(min, Math.min(max, t + by));
    moved = true;
    draw();
  };
  draw();
  return {
    el: h('div', { class: 'lnum-thw' }, stage,
      h('div', { class: 'lnum-thbtn' },
        h('button', { type: 'button', class: 'round', 'aria-label': 'מעלה אחת יותר', onclick: nudge(1) }, '▲'),
        h('span', {}, 'מעלה'),
        h('button', { type: 'button', class: 'round', 'aria-label': 'מעלה אחת פחות', onclick: nudge(-1) }, '▼'))),
    value: () => (moved ? t : null),
    set(a) {
      t = a;
      moved = true;
      draw();
    },
    key(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        nudge(e.key === 'ArrowUp' ? 1 : -1)();
        e.preventDefault();
        return true;
      }
      return false;
    },
    lock() {
      locked = true;
    },
  };
}

// ---------- 1. divisibility rules ----------
const RULE = {
  2: 'ספרת האחדות זוגית',
  3: 'סכום הספרות מתחלק ב־3',
  4: 'המספר שבנוי משתי הספרות האחרונות מתחלק ב־4',
  5: 'ספרת האחדות היא 0 או 5',
  6: 'המספר מתחלק גם ב־2 וגם ב־3',
  9: 'סכום הספרות מתחלק ב־9',
  10: 'ספרת האחדות היא 0',
};
const two = n => String(n % 100).padStart(2, '0');
function why(n, k) {
  const s = digitSum(n), u = n % 10, not = c => (c ? '' : 'לא ');
  if (k === 2) return `ספרת האחדות ${u} ${u % 2 ? 'אי־זוגית' : 'זוגית'}`;
  if (k === 3 || k === 9) return `סכום הספרות ${s} ${not(s % k === 0)}מתחלק ב־${k}`;
  if (k === 4) return `${M(two(n))} ${not(n % 4 === 0)}מתחלק ב־4`;
  if (k === 6) return n % 2 ? 'המספר אי־זוגי' : `זוגי, וסכום הספרות ${s} ${not(s % 3 === 0)}מתחלק ב־3`;
  return `ספרת האחדות ${u}`;
}
const verdicts = (n, ks) => ks.map(k => `${M(k)}: ${n % k === 0 ? '<b>כן</b>' : 'לא'}, ${why(n, k)}.`).join('<br>');
// numbers that look divisible by k but are not
const sneaky = (n, k) => (k === 3 ? [3, 6, 9].includes(n % 10) : k === 9 ? digitSum(n) % 3 === 0 : k === 6 ? n % 2 === 0 || digitSum(n) % 3 === 0 : n % 2 === 0);
const COMBO = { 6: [2, 3], 12: [3, 4], 15: [3, 5], 18: [2, 9], 36: [4, 9], 45: [5, 9], 9: [9], 4: [4], 3: [3] };
const CLAIMS = [
  ['כל מספר שמתחלק ב־9 מתחלק גם ב־3.', true, `כי ${M('9 = 3 × 3')}.`],
  ['כל מספר שמתחלק ב־3 מתחלק גם ב־9.', false, '12 מתחלק ב־3 ולא ב־9.'],
  ['מספר שמתחלק ב־4 וגם ב־6 מתחלק תמיד ב־24.', false, '12 מתחלק ב־4 וב־6, אבל לא ב־24.'],
  ['מספר שמתחלק ב־2 וגם ב־5 מתחלק תמיד ב־10.', true, `ל־2 ול־5 אין גורם משותף, ו־${M('2 × 5 = 10')}.`],
  ['מספר שמתחלק ב־3 וגם ב־5 מתחלק תמיד ב־15.', true, 'ל־3 ול־5 אין גורם משותף.'],
  ['מספר שמתחלק ב־4 וגם ב־10 מתחלק תמיד ב־40.', false, '20 מתחלק ב־4 וב־10, אבל לא ב־40.'],
  ['אם סכום הספרות של מספר מתחלק ב־6, המספר מתחלק ב־6.', false, 'ב־15 סכום הספרות 6, אבל 15 אי־זוגי.'],
  ['הסכום של שלושה מספרים עוקבים מתחלק תמיד ב־3.', true, `למשל ${M('4 + 5 + 6 = 15')}: זה פי 3 מהמספר האמצעי.`],
  ['המכפלה של שני מספרים עוקבים היא תמיד זוגית.', true, 'אחד משני מספרים עוקבים הוא תמיד זוגי.'],
  ['הסכום של שני מספרים אי־זוגיים הוא תמיד אי־זוגי.', false, `${M('3 + 5 = 8')}, וזה זוגי.`],
  ['הסכום של ארבעה מספרים עוקבים מתחלק תמיד ב־4.', false, `${M('1 + 2 + 3 + 4 = 10')}, ו־10 לא מתחלק ב־4.`],
  ['כל מספר שמתחלק ב־8 מתחלק גם ב־4.', true, `כי ${M('8 = 4 × 2')}.`],
  ['מספר שמסתיים בספרה 3 מתחלק תמיד ב־3.', false, '13 לא מתחלק ב־3.'],
  ['אם מספר מתחלק ב־6, גם המספר שגדול ממנו פי 5 מתחלק ב־6.', true, 'אם 6 נכנס בו מספר שלם של פעמים, הוא נכנס גם בפי 5 ממנו.'],
];

const divRules = {
  id: 'lnum-div', title: 'סימני התחלקות',
  intro: `<p>אפשר לדעת אם מספר מתחלק במספר אחר בלי לחלק, רק לפי הספרות שלו:</p>
    <p><b>2</b>: ${RULE[2]}. <b>5</b>: ${RULE[5]}. <b>10</b>: ${RULE[10]}.<br>
    <b>3</b>: ${RULE[3]}. <b>9</b>: ${RULE[9]}.<br>
    <b>4</b>: ${RULE[4]}. <b>6</b>: ${RULE[6]}.</p>
    <div class="ex">${M('5832')}: סכום הספרות ${M('5 + 8 + 3 + 2 = 18')}, לכן הוא מתחלק ב־3 וב־9. הוא זוגי, אז גם ב־6. ו־32 מתחלק ב־4, אז גם ${M('5832')}. ב־5 וב־10 הוא לא מתחלק.</div>
    <p>מסמנים את כל התשובות המתאימות, ולוחצים על "בדיקה".</p>`,
  gen(L) {
    if (L === 3) return Math.random() < 0.6 ? missingDigit() : claims();
    if (Math.random() < 0.55) {
      const ds = L === 1 ? [2, 3, 5, 9, 10] : [2, 3, 4, 5, 6, 9, 10], [lo, hi] = L === 1 ? [100, 999] : [1000, 99999];
      let n, ans;
      do {
        const m = pick(L === 1 ? [1, 2, 3, 5, 6, 9, 10, 15, 18, 45] : [1, 4, 6, 9, 12, 15, 18, 20, 36, 45, 60]);
        n = m * rnd(Math.ceil(lo / m), Math.floor(hi / m));
        ans = ds.filter(k => n % k === 0);
      } while (!ans.length || ans.length === ds.length);
      const idx = ans.map(k => ds.indexOf(k));
      return {
        prompt: `על המבחנה כתוב ${M(n)}. סמנו את כל המספרים ש־${M(n)} מתחלק בהם.`, visual: sample(n),
        widget: choice(ds.map(String), { multi: true, cols: L === 1 ? 5 : 4, cls: 'nums lnum-ltr' }), answer: idx, check: v => same(v, idx),
        hints: ['בדקו כל מספר בעזרת הסימן שלו. כדאי להתחיל מספרת האחדות.', `ספרת האחדות ${n % 10}, וסכום הספרות ${M([...String(n)].join(' + ') + ' = ' + digitSum(n))}.${L === 2 ? ` שתי הספרות האחרונות: ${M(two(n))}.` : ''}`],
        explain: verdicts(n, ds),
      };
    }
    const k = L === 1 ? pick([3, 9, 6]) : pick([4, 6, 9]), [lo, hi] = L === 1 ? [100, 999] : [1000, 9999], cnt = L === 1 ? 4 : 6;
    const good = new Set(), bad = new Set(), want = L === 1 ? 1 : rnd(2, 3);
    while (good.size < want) good.add(k * rnd(Math.ceil(lo / k), Math.floor(hi / k)));
    while (bad.size < cnt - want) {
      const n = rnd(lo, hi);
      if (n % k && sneaky(n, k) && !good.has(n)) bad.add(n);
    }
    const opts = shuffle([...good, ...bad]), ans = opts.map((n, i) => (n % k === 0 ? i : -1)).filter(i => i >= 0);
    return {
      prompt: L === 1 ? `באיזו מבחנה מספר החיידקים מתחלק ב־${k}?` : `סמנו את כל המספרים שמתחלקים ב־${k}.`,
      widget: choice(opts.map(String), { multi: L > 1, cols: 2, cls: 'nums' }), answer: L === 1 ? ans[0] : ans,
      check: v => (L === 1 ? v === ans[0] : same(v, ans)),
      hints: [`הסימן של ${k}: ${RULE[k]}.`, k === 6 ? 'שימו לב: צריך את שני התנאים. מספר אי־זוגי לא מתחלק ב־6 גם אם סכום הספרות שלו מתחלק ב־3.' : k === 9 ? 'סכום ספרות שמתחלק ב־3 עוד לא מספיק. הוא צריך להתחלק ב־9.' : k === 4 ? 'לא מספיק שהמספר זוגי. בדקו את שתי הספרות האחרונות.' : 'ספרת האחדות לא קובעת אם מספר מתחלק ב־3. חברו את הספרות.'],
      explain: opts.map(n => `${M(n)}: ${n % k === 0 ? '<b>כן</b>' : 'לא'}, ${why(n, k)}.`).join('<br>'),
    };
  },
};
function missingDigit() {
  let D, ds, pos, ans;
  do {
    D = pick([6, 12, 15, 18, 36, 45, 9, 4, 12, 18]);
    ds = range(rnd(4, 5), i => (i === 0 ? rnd(1, 9) : rnd(0, 9)));
    pos = rnd(1, ds.length - 1);
    ans = range(10).filter(d => +ds.map((x, i) => (i === pos ? d : x)).join('') % D === 0);
  } while (!ans.length || ans.length > 4);
  const shown = ds.map((x, i) => (i === pos ? '<span class="lnum-q">?</span>' : x)).join(''), known = ds.reduce((s, x, i) => (i === pos ? s : s + x), 0);
  const parts = COMBO[D], with_ = d => +ds.map((x, i) => (i === pos ? d : x)).join('');
  return {
    prompt: `במספר שעל המבחנה נמחקה ספרה אחת. סמנו את כל הספרות שאפשר לכתוב במקום סימן השאלה, כך שהמספר יתחלק ב־${D}.`, visual: sample(shown, 'מספר מחוק'),
    widget: choice(range(10, String), { multi: true, cols: 5, cls: 'nums lnum-ltr' }), answer: ans, check: v => same(v, ans),
    hints: [parts.length === 2 ? `מספר מתחלק ב־${D} כשהוא מתחלק גם ב־${parts[0]} וגם ב־${parts[1]}. בדקו את שני הסימנים.` : `הסימן של ${D}: ${RULE[D]}.`,
      `סכום הספרות הידועות הוא ${known}. ${ans.length === 1 ? 'רק ספרה אחת מתאימה.' : `יש ${ans.length} ספרות שמתאימות.`}`],
    explain: `${ans.map(d => M(with_(d))).join(', ')} ${ans.length === 1 ? 'מתחלק' : 'מתחלקים'} ב־${D}${parts.length === 2 ? ` (גם ב־${parts[0]} וגם ב־${parts[1]})` : ''}. לכן ${ans.length === 1 ? 'הספרה היא' : 'הספרות הן'} ${list_(ans)}.`,
  };
}
function claims() {
  let pickd;
  do pickd = shuffle(CLAIMS).slice(0, 4);
  while (pickd.every(c => c[1]) || pickd.every(c => !c[1]));
  const ans = pickd.map((c, i) => (c[1] ? i : -1)).filter(i => i >= 0);
  return {
    prompt: 'החשבונאים כתבו על הלוח טענות. סמנו את כל הטענות הנכונות.',
    widget: choice(pickd.map(c => c[0]), { multi: true, cols: 1, cls: 'lnum-claims' }), answer: ans, check: v => same(v, ans),
    hints: ['כדי להפריך טענה מספיקה דוגמה אחת שבה היא לא מתקיימת. נסו מספרים קטנים.', `יש כאן ${ans.length === 1 ? 'טענה נכונה אחת' : ans.length + ' טענות נכונות'}.`],
    explain: pickd.map(c => `<b>${c[1] ? 'נכון' : 'לא נכון'}:</b> ${c[0]} ${c[2]}`).join('<br>'),
  };
}

// ---------- 2. prime or composite ----------
const tricky = list => list.filter(n => n > 1 && !isPrime(n) && gcd(n, 30) === 1);
const sieveRound = L => {
  const [k0, k1, rows] = L === 1 ? [0, 12, rnd(4, 5)] : L === 2 ? [16, 33, rnd(3, 4)] : [33, 61, 3];
  const s = 6 * rnd(k0, k1) + 1, list = range(rows * 6, i => s + i), primes = list.filter(isPrime), tr = tricky(list).slice(0, 3);
  return {
    prompt: L === 1 ? 'בצלחת יש מושבות חיידקים ממוספרות. סמנו את כל המספרים הראשוניים.' : 'סמנו את כל המספרים הראשוניים בטבלה.',
    widget: tapGrid(list, { reveal: n => (isPrime(n) ? 'ok' : '') }), answer: primes, check: v => same(v, primes), tries: 3,
    wrongMsg: v => {
      const badOne = v.find(n => !isPrime(n));
      if (badOne === 1) return '1 אינו ראשוני וגם לא פריק.';
      if (badOne) return `${M(badOne)} פריק: ${M(`${badOne} = ${spf(badOne)} × ${badOne / spf(badOne)}`)}.`;
      const miss = primes.filter(p => !v.includes(p)).length;
      return miss === 1 ? 'חסר עוד מספר ראשוני אחד.' : `חסרים עוד ${miss} מספרים ראשוניים.`;
    },
    hints: L === 1
      ? ['מספר ראשוני מתחלק רק ב־1 ובעצמו. 1 אינו ראשוני.', 'פסלו את הזוגיים (חוץ מ־2), ואחר כך כפולות של 3, של 5 ושל 7.', `יש בטבלה ${primes.length} מספרים ראשוניים.`]
      : [`בטבלה של 6 עמודות, כל הראשוניים${list[0] < 4 ? ' (חוץ מ־2 ו־3)' : ''} נמצאים רק בעמודה הראשונה ובעמודה החמישית. למה?`, `בעמודות האלה בדקו חלוקה ב־5, 7, 11, 13${L === 3 ? ', 17 ו־19' : ''}.`, `יש בטבלה ${primes.length} מספרים ראשוניים.`],
    explain: `הראשוניים: ${list_(primes)}.${tr.length ? ` מספרים שנראים ראשוניים אבל אינם: ${tr.map(n => M(`${n} = ${spf(n)} × ${n / spf(n)}`)).join(', ')}.` : ''}`,
  };
};
const primes = {
  id: 'lnum-prime', title: 'ראשוני או פריק',
  intro: `<p>מספר <b>ראשוני</b> מתחלק רק ב־1 ובעצמו: 2, 3, 5, 7, 11, 13... מספר <b>פריק</b> מתחלק גם במספרים אחרים. המספר 1 אינו ראשוני וגם לא פריק.</p>
    <div class="ex">91 נראה ראשוני, אבל ${M('91 = 7 × 13')}, לכן הוא פריק.</div>
    <p><b>נפה של ארטוסתנס:</b> מוחקים את הכפולות של 2, של 3, של 5, של 7... ומה שנשאר הוא ראשוני. כדי לבדוק מספר מספיק לנסות לחלק אותו בראשוניים שהריבוע שלהם לא גדול ממנו.</p>
    <p>בטבלה לוחצים על מספר כדי לסמן אותו כראשוני.</p>`,
  gen(L) {
    if (L < 3) return sieveRound(L);
    const t = rnd(0, 3);
    if (t === 0) return sieveRound(3);
    if (t === 1) {
      let N, pairs;
      do {
        N = 2 * rnd(20, 80);
        pairs = range(N / 2 - 1, i => i + 2).filter(p => isPrime(p) && isPrime(N - p));
      } while (!pairs.length);
      const p = pick(pairs);
      return {
        prompt: `כתבו את ${M(N)} כסכום של שני מספרים ראשוניים.`,
        widget: inputs(M(`${N} = ${box('a', 3)} + ${box('b', 3)}`)), answer: { a: p, b: N - p },
        check: v => v.a + v.b === N && isPrime(v.a) && isPrime(v.b),
        wrongMsg: v => (v.a + v.b !== N ? `${M(`${v.a} + ${v.b} = ${v.a + v.b}`)}.` : `${[v.a, v.b].filter(x => !isPrime(x)).map(x => M(x)).join(' ו־')} אינו ראשוני.`),
        hints: ['בחרו מספר ראשוני קטן, החסירו אותו מ־' + N + ' ובדקו אם מה שנשאר ראשוני.', `למשל, נסו להתחיל ב־${p}.`],
        explain: `${M(`${N} = ${p} + ${N - p}`)}${pairs.length > 1 ? `. יש עוד אפשרויות: ${pairs.filter(x => x !== p).slice(0, 3).map(x => M(`${x} + ${N - x}`)).join(', ')}` : ''}. (ההשערה שכל מספר זוגי גדול מ־2 הוא סכום של שני ראשוניים נקראת השערת גולדבך, ועד היום אף אחד לא הוכיח אותה!)`,
      };
    }
    if (t === 2) {
      const ps = [7, 11, 13, 17, 19, 23, 29, 31];
      let p, q;
      do [p, q] = [pick(ps), pick(ps)];
      while (p >= q || p * q > 800);
      return {
        prompt: `מספר המבחנות במחסן, ${M(p * q)}, הוא מכפלה של שני מספרים ראשוניים. מצאו אותם.`,
        widget: inputs(M(`${p * q} = ${box('a', 2)} × ${box('b', 2)}`)), answer: { a: p, b: q },
        check: v => isPrime(v.a) && isPrime(v.b) && v.a * v.b === p * q,
        hints: [`${M(p * q)} לא מתחלק ב־2, ב־3 או ב־5. נסו לחלק ב־7, ב־11, ב־13...`, `אחד הגורמים הוא ${p}.`],
        explain: `${M(`${p * q} = ${p} × ${q}`)}, ושני המספרים ראשוניים.`,
      };
    }
    let A, pairs;
    do {
      A = rnd(100, 280);
      pairs = range(28, i => A + i).filter(p => isPrime(p) && isPrime(p + 2));
    } while (!pairs.length);
    const tp = pick(pairs);
    return {
      prompt: `<b>ראשוניים תאומים</b> הם שני ראשוניים שההפרש ביניהם 2, כמו 11 ו־13. מצאו זוג ראשוניים תאומים ששניהם בין ${M(A)} ל־${M(A + 30)}.`,
      widget: inputs(M(`${box('a', 3)} , ${box('b', 3)}`)), answer: { a: tp, b: tp + 2 },
      check: v => Math.abs(v.a - v.b) === 2 && isPrime(v.a) && isPrime(v.b) && Math.min(v.a, v.b) >= A && Math.max(v.a, v.b) <= A + 30,
      hints: ['שני הראשוניים אי־זוגיים, והמספר שביניהם מתחלק ב־6 (למה?). חפשו כפולות של 6 בתחום ובדקו את השכנים שלהן.', `נסו את ${M(tp + 1)} ושני השכנים שלו.`],
      explain: `${M(`${tp}, ${tp + 2}`)}: שניהם ראשוניים.${pairs.length > 1 ? ` עוד זוגות בתחום: ${pairs.filter(x => x !== tp).map(x => M(`${x}, ${x + 2}`)).join('; ')}.` : ''}`,
    };
  },
};

// ---------- 3. factor tree ----------
const POOL = (lo, hi, ok) => range(hi - lo + 1, i => lo + i).filter(ok);
const T1 = POOL(24, 100, n => factors(n).length >= 3);
const T2 = POOL(100, 400, n => factors(n).length >= 4 && Math.max(...factors(n)) <= 13);
const T3 = POOL(500, 3000, n => factors(n).length >= 5 && factors(n).length <= 7 && groups(n).length >= 3 && Math.max(...factors(n)) <= 17);
const treeExplain = N => `<div class="lnum-tex">${treeSVG(fullTree(N))}</div>${M(`${N} = ${prodStr(N)}${groups(N).some(([, e]) => e > 1) ? ` = ${powStr(N)}` : ''}`)}`;
const tree = {
  id: 'lnum-tree', title: 'עץ גורמים',
  intro: `<p><b>פירוק לגורמים ראשוניים</b> הוא כתיבת מספר ככפל של מספרים ראשוניים בלבד. בעץ גורמים מפרקים כל מספר לכפל של שני מספרים, עד שבקצות נשארים רק ראשוניים.</p>
    <div class="ex">${M('60 = 6 × 10')}, ${M('6 = 2 × 3')}, ${M('10 = 2 × 5')}<br>${M(`60 = 2 × 2 × 3 × 5 = ${P(2, 2)} × 3 × 5`)}</div>
    <p>לא משנה איך מתחילים לפרק: תמיד מגיעים לאותם גורמים ראשוניים.</p>
    <p>בעץ לוחצים על מספר כתום, מקלידים שני מספרים שהמכפלה שלהם שווה לו, ולוחצים ✓. מספרים ראשוניים נצבעים בירוק.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L < 3 || t < 2) {
      const N = pick(L === 1 ? T1 : L === 2 ? T2 : T3);
      return {
        prompt: L === 1 ? `פרקו את ${M(N)} לגורמים ראשוניים בעזרת עץ גורמים.` : `בנו עץ גורמים ל־${M(N)}, ואז כתבו אותו בעזרת חזקות.`,
        sig: 'tree' + N, widget: factorTree(N, { powers: L > 1 }), tries: 3,
        hints: [`התחילו ממחלק שקל לראות. ${N % 10 === 0 ? `${M(N)} מסתיים ב־0, אז ${M(`${N} = 10 × ${N / 10}`)}.` : N % 2 === 0 ? `${M(N)} זוגי, אז ${M(`${N} = 2 × ${N / 2}`)}.` : `סכום הספרות של ${M(N)} הוא ${digitSum(N)}${digitSum(N) % 3 === 0 ? ', אז הוא מתחלק ב־3' : ''}.`}`,
          `הגורמים הראשוניים: ${M(prodStr(N))}.`],
        explain: treeExplain(N),
      };
    }
    if (t === 2) {
      let N;
      do N = [2, 3, 5, 7].reduce((s, p, i) => s * p ** (i < 2 ? rnd(1, 4) : rnd(0, 2)), 1);
      while (N > 2000 || groups(N).length < 2 || N < 30);
      const g = groups(N), ans = nDiv(N);
      return num({
        prompt: `${M(`${N} = ${powStr(N)}`)}. כמה מחלקים יש ל־${M(N)}, כולל 1 ו־${M(N)}?`, answer: ans,
        hints: [`כל מחלק של ${M(N)} בנוי רק מהגורמים שלו. למשל את ${g[0][0]} אפשר לקחת 0, 1${g[0][1] > 1 ? `, ... עד ${g[0][1]}` : ''} פעמים: ${g[0][1] + 1} אפשרויות.`, `כופלים את מספר האפשרויות של כל גורם: ${M(g.map(([, e]) => e + 1).join(' × '))}.`],
        explain: `${g.map(([p, e]) => `ל־${p}: ${e + 1} אפשרויות (חזקה 0 עד ${e})`).join('; ')}. סך הכול ${M(`${g.map(([, e]) => e + 1).join(' × ')} = ${ans}`)} מחלקים.`,
      });
    }
    let N, m;
    do {
      N = rnd(40, 900);
      m = groups(N).filter(([, e]) => e % 2).reduce((s, [p]) => s * p, 1);
    } while (m === 1 || m === N || m > 30 || factors(N).length < 3);
    const odd = groups(N).filter(([, e]) => e % 2).map(([p]) => p);
    return nums({
      prompt: `הניסוי עובד רק עם מספר ריבועי של חיידקים. בצלחת יש ${M(N)}. מה המספר הקטן ביותר שצריך לכפול בו את ${M(N)} כדי לקבל מספר ריבועי? ושל איזה מספר הוא ריבוע?`,
      fields: [['כופלים ב־', m], ['ומקבלים ריבוע של', Math.sqrt(N * m)]],
      hints: ['במספר ריבועי, כל גורם ראשוני מופיע מספר זוגי של פעמים.', `${M(`${N} = ${powStr(N)}`)}. אילו גורמים מופיעים מספר אי־זוגי של פעמים?`],
      explain: `${M(`${N} = ${powStr(N)}`)}. חסר עוד ${odd.join(' ועוד ')}, לכן כופלים ב־${m}: ${M(`${N} × ${m} = ${N * m} = ${P(Math.sqrt(N * m), 2)}`)}.`,
    });
  },
};

// ---------- 4. greatest common divisor ----------
const pair = (lo, hi, minG, ok = () => true) => {
  for (;;) {
    const a = rnd(lo, hi), b = rnd(lo, hi);
    if (a !== b && gcd(a, b) >= minG && a % b && b % a && ok(a, b)) return [a, b];
  }
};
const gcdWhy = (a, b) => `${venn(a, b)}${M(`${a} = ${prodStr(a)}`)}<br>${M(`${b} = ${prodStr(b)}`)}<br>הגורמים המשותפים (באמצע): ${split(a, b).both.length > 1 ? M(`${split(a, b).both.join(' × ')} = ${gcd(a, b)}`) : M(gcd(a, b))}.`;
const gcdW = {
  id: 'lnum-gcd', title: 'מחלק משותף גדול ביותר',
  intro: `<p>ה<b>מחלק המשותף הגדול ביותר</b> של שני מספרים הוא המספר הגדול ביותר ששניהם מתחלקים בו.</p>
    <p><b>דרך 1:</b> רושמים את המחלקים של כל מספר ומחפשים את הגדול ביותר שמשותף לשניהם.<br><b>דרך 2:</b> מפרקים את שניהם לגורמים ראשוניים וכופלים את הגורמים המשותפים.</p>
    <div class="ex">${M('24 = 2 × 2 × 2 × 3')}<br>${M('36 = 2 × 2 × 3 × 3')}<br>משותפים: ${M('2 × 2 × 3 = 12')}. זה המחלק המשותף הגדול ביותר.</div>
    <p>זה שימושי כשמחלקים כמה סוגים של דברים לקבוצות זהות, בלי שיישאר כלום.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const [a, b] = pair(12, 48, 2, (a, b) => new Set([...divisors(a), ...divisors(b)]).size <= 12);
        const opts = [...new Set([...divisors(a), ...divisors(b)])].sort((x, y) => x - y), ans = opts.map((d, i) => (a % d === 0 && b % d === 0 ? i : -1)).filter(i => i >= 0);
        return {
          prompt: `סמנו את כל המחלקים המשותפים של ${M(a)} ושל ${M(b)}.`,
          widget: choice(opts.map(String), { multi: true, cols: 4, cls: 'nums lnum-ltr' }), answer: ans, check: v => same(v, ans),
          hints: [`עברו על כל מספר ובדקו אם הוא מחלק גם את ${M(a)} וגם את ${M(b)}.`, `המחלק המשותף הגדול ביותר הוא ${gcd(a, b)}, וכל המחלקים שלו משותפים.`],
          explain: `המחלקים של ${a}: ${list_(divisors(a))}.<br>המחלקים של ${b}: ${list_(divisors(b))}.<br>משותפים: ${list_(divisors(gcd(a, b)))}. הגדול ביותר הוא ${gcd(a, b)}.`,
        };
      }
      const [a, b] = pair(8, 60, 3), g = gcd(a, b);
      return num({
        prompt: t === 1
          ? `במעבדה יש ${M(a)} מבחנות ו־${M(b)} צלוחיות. מחלקים את כולן לערכות ניסוי זהות, בלי שיישאר כלום. מה המספר הגדול ביותר של ערכות שאפשר להכין?`
          : `מצאו את המחלק המשותף הגדול ביותר של ${M(a)} ושל ${M(b)}.`, answer: g,
        hints: [t === 1 ? `מספר הערכות צריך לחלק גם את ${M(a)} וגם את ${M(b)}.` : `רשמו את המחלקים של ${M(Math.min(a, b))}, מהגדול לקטן, ובדקו מי מהם מחלק גם את ${M(Math.max(a, b))}.`, `המחלקים של ${M(Math.min(a, b))}: ${list_(divisors(Math.min(a, b)))}.`],
        explain: `${g} מחלק את שניהם: ${M(`${a} = ${g} × ${a / g}`)}, ${M(`${b} = ${g} × ${b / g}`)}, ואין מחלק משותף גדול ממנו.${t === 1 ? ` בכל ערכה ${a / g} מבחנות ו־${b / g} צלוחיות.` : ''}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const [a, b] = pair(40, 180, 4), g = gcd(a, b);
        return nums({
          prompt: `יש ${M(a)} מבחנות אדומות ו־${M(b)} מבחנות כחולות. מחלקים את כולן לערכות זהות, כמה שיותר ערכות, בלי שיישאר כלום.`,
          fields: [['מספר הערכות:', g], ['אדומות בכל ערכה:', a / g], ['כחולות בכל ערכה:', b / g]],
          hints: ['מספר הערכות הוא המחלק המשותף הגדול ביותר.', `${M(`${a} = ${prodStr(a)}`)}, ${M(`${b} = ${prodStr(b)}`)}.`],
          explain: `${gcdWhy(a, b)}<br>בכל ערכה: ${M(`${a} ÷ ${g} = ${a / g}`)} אדומות ו־${M(`${b} ÷ ${g} = ${b / g}`)} כחולות.`,
        });
      }
      if (t === 1) {
        const [a, b] = pair(60, 400, 6), g = gcd(a, b);
        return num({
          prompt: `מצאו את המחלק המשותף הגדול ביותר של ${M(a)} ושל ${M(b)}.`, answer: g,
          hints: ['פרקו את שני המספרים לגורמים ראשוניים.', `${M(`${a} = ${prodStr(a)}`)}<br>${M(`${b} = ${prodStr(b)}`)}<br>כפלו את הגורמים שמופיעים בשניהם.`],
          explain: gcdWhy(a, b),
        });
      }
      const g = pick([4, 5, 6, 8, 10, 12, 15, 20]);
      let m, n;
      do [m, n] = [rnd(2, 7), rnd(2, 7)];
      while (m >= n || gcd(m, n) > 1);
      const a = g * m, b = g * n;
      return nums({
        prompt: `את רצפת המעבדה, מלבן של ${M(`${b} × ${a}`)} ס"מ, מרצפים באריחים ריבועיים זהים, בלי לחתוך אף אריח. מה אורך הצלע של האריח הגדול ביותר שאפשר? וכמה אריחים כאלה צריך?`,
        visual: rectPic(b, a),
        fields: [['צלע האריח (ס"מ):', g], ['מספר האריחים:', m * n]],
        hints: ['צלע האריח צריכה לחלק גם את האורך וגם את הרוחב.', `המחלק המשותף הגדול ביותר של ${a} ושל ${b} הוא ${g}. כמה אריחים נכנסים לאורך, וכמה לרוחב?`],
        explain: `הצלע: ${g} ס"מ. לאורך נכנסים ${M(`${b} ÷ ${g} = ${n}`)} אריחים ולרוחב ${M(`${a} ÷ ${g} = ${m}`)}, ובסך הכול ${M(`${n} × ${m} = ${m * n}`)} אריחים.`,
      });
    }
    const u = rnd(0, 3);
    if (u === 0) {
      let a, b, c, g;
      do {
        g = rnd(4, 18);
        [a, b, c] = range(3, () => g * rnd(2, 12));
      } while (new Set([a, b, c]).size < 3 || gcd(gcd(a, b), c) !== g);
      return num({
        prompt: `יש ${M(a)} מבחנות אדומות, ${M(b)} ירוקות ו־${M(c)} כחולות. מחלקים את כולן לערכות זהות, בלי שיישאר כלום. כמה ערכות לכל היותר?`, answer: g,
        hints: ['מספר הערכות צריך לחלק את שלושת המספרים.', `מצאו קודם את המחלק המשותף הגדול ביותר של ${a} ושל ${b} (הוא ${gcd(a, b)}), ואז של התוצאה ושל ${c}.`],
        explain: `${M(`${a} = ${g} × ${a / g}`)}, ${M(`${b} = ${g} × ${b / g}`)}, ${M(`${c} = ${g} × ${c / g}`)}, ולמספרים ${a / g}, ${b / g}, ${c / g} אין מחלק משותף. לכן ${g} ערכות.`,
      });
    }
    if (u === 1) {
      const g = rnd(2, 12);
      let m, n;
      do [m, n] = [rnd(2, 9), rnd(2, 9)];
      while (m === n || gcd(m, n) > 1);
      const a = g * m, b = g * n, l = g * m * n;
      return num({
        prompt: `המחלק המשותף הגדול ביותר של שני מספרים הוא ${M(g)}, והכפולה המשותפת הקטנה ביותר שלהם היא ${M(l)}. אחד המספרים הוא ${M(a)}. מה המספר השני?`, answer: b,
        hints: ['המכפלה של שני מספרים שווה למכפלה של המחלק המשותף הגדול ביותר שלהם ושל הכפולה המשותפת הקטנה ביותר שלהם.', `${M(`${g} × ${l} = ${g * l}`)}. כמה צריך לכפול ב־${a} כדי לקבל את זה?`],
        explain: `${M(`${a} × ? = ${g} × ${l} = ${g * l}`)}, לכן המספר הוא ${M(`${g * l} ÷ ${a} = ${b}`)}. בדיקה: ${M(`${a} = ${g} × ${m}`)}, ${M(`${b} = ${g} × ${n}`)}.`,
      });
    }
    if (u === 2) {
      const ps = [13, 17, 19, 23, 29, 31, 37, 41];
      let g, p, q;
      do [g, p, q] = [pick([11, 13, 17, 19, 23]), pick(ps), pick(ps)];
      while (p <= q || p === g || q === g || g * p > 999);
      const a = g * p, b = g * q;
      return num({
        prompt: `מצאו את המחלק המשותף הגדול ביותר של ${M(a)} ושל ${M(b)}.`, answer: g,
        hints: ['טריק של אוקלידס: כל מחלק משותף של שני מספרים מחלק גם את ההפרש שלהם.', `${M(`${a} − ${b} = ${a - b}`)}. איזה מחלק של ${a - b} מחלק גם את ${b}?`],
        explain: `${M(`${a} − ${b} = ${a - b} = ${prodStr(a - b)}`)}. בודקים: ${M(`${b} = ${g} × ${q}`)} ו־${M(`${a} = ${g} × ${p}`)}, ו־${p} ו־${q} ראשוניים שונים. לכן התשובה ${g}.`,
      });
    }
    let g, m, n, r1, r2;
    do {
      g = rnd(7, 30);
      [m, n] = [rnd(2, 9), rnd(2, 9)];
      [r1, r2] = [rnd(1, Math.min(9, g - 1)), rnd(1, Math.min(9, g - 1))];
    } while (m === n || gcd(m, n) > 1 || r1 === r2);
    const a = g * m + r1, b = g * n + r2;
    return num({
      prompt: `מהו המספר הגדול ביותר שכאשר מחלקים בו את ${M(a)} נשארת שארית ${r1}, וכאשר מחלקים בו את ${M(b)} נשארת שארית ${r2}?`, answer: g,
      hints: [`אם מורידים את השארית, החילוק יוצא בדיוק. לכן המספר מחלק את ${M(`${a} − ${r1}`)} ואת ${M(`${b} − ${r2}`)}.`, `מצאו את המחלק המשותף הגדול ביותר של ${a - r1} ושל ${b - r2}.`],
      explain: `המספר מחלק את ${a - r1} ואת ${b - r2}. המחלק המשותף הגדול ביותר שלהם: ${M(`${a - r1} = ${g} × ${m}`)}, ${M(`${b - r2} = ${g} × ${n}`)}, כלומר ${g}. (והוא גדול מהשאריות, כמו שצריך.)`,
    });
  },
};

// ---------- 5. least common multiple ----------
const lcmWhy = (a, b) => `${venn(a, b)}${M(`${a} = ${prodStr(a)}`)}<br>${M(`${b} = ${prodStr(b)}`)}<br>כופלים את כל מה שבעיגולים, בלי לספור את האמצע פעמיים: ${M(`${[...split(a, b).onlyA, ...split(a, b).both, ...split(a, b).onlyB].join(' × ')} = ${lcm(a, b)}`)}.`;
const mults = (a, upto) => range(Math.floor(upto / a), i => a * (i + 1));
const flashRound = () => {
  let a, b;
  do [a, b] = [rnd(2, 8), rnd(3, 10)];
  while (a === b || a % b === 0 || b % a === 0 || lcm(a, b) > 40);
  const l = lcm(a, b), T = Math.min(56, Math.ceil((l + rnd(4, 12)) / 8) * 8);
  return {
    prompt: `נורה סגולה מהבהבת כל ${a} שניות (מסומן בטבלה), ונורה צהובה כל ${b} שניות. בשנייה 0 הן הבהבו יחד. לחצו על השנייה הראשונה שבה יהבהבו שוב יחד.`,
    widget: tapGrid(range(T, i => i + 1), { cols: 8, single: true, mark: n => (n % a === 0 ? 'fa' : ''), reveal: n => (n % b === 0 ? 'fb' : '') + (n === l ? ' ok' : ''), tip: 'הנקודה הסגולה: הנורה הסגולה מהבהבת. לחצו על התשובה.' }),
    answer: l, check: v => v === l,
    wrongMsg: v => (v % a ? `בשנייה ${v} הנורה הסגולה לא מהבהבת.` : v % b ? `בשנייה ${v} הנורה הצהובה לא מהבהבת: ${v} אינו כפולה של ${b}.` : `גם בשנייה ${v} הן מהבהבות יחד, אבל זה לא הרגע הראשון.`),
    hints: [`הנורה הצהובה מהבהבת בשניות ${list_(mults(b, 3 * b))}...`, `עברו על הכפולות של ${b} ומצאו את הראשונה שמסומנת בסגול.`],
    explain: `הסגולה: ${list_(mults(a, l))}. הצהובה: ${list_(mults(b, l))}. הפעם הראשונה ששתיהן מהבהבות יחד: ${l}.`,
  };
};
const lcmW = {
  id: 'lnum-lcm', title: 'כפולה משותפת קטנה ביותר',
  intro: `<p>ה<b>כפולה המשותפת הקטנה ביותר</b> של שני מספרים היא המספר הקטן ביותר (חוץ מ־0) ששניהם מחלקים אותו.</p>
    <div class="ex">כפולות של 4: 4, 8, <b>12</b>, 16, 20, <b>24</b>...<br>כפולות של 6: 6, <b>12</b>, 18, <b>24</b>...<br>הכפולה המשותפת הקטנה ביותר: 12.</div>
    <p>דרך נוספת: מפרקים לגורמים ראשוניים. ${M('4 = 2 × 2')}, ${M('6 = 2 × 3')}, ולוקחים כל גורם כמה פעמים שהוא מופיע במספר שבו יש ממנו הכי הרבה: ${M('2 × 2 × 3 = 12')}.</p>
    <p>כך פותרים שאלות כמו "מתי שתי מכונות יהבהבו שוב יחד?".</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t < 2) return flashRound();
      let a, b;
      do [a, b] = [rnd(2, 12), rnd(2, 12)];
      while (a >= b || b % a === 0 || lcm(a, b) > 60);
      const l = lcm(a, b);
      return num({
        prompt: t === 2 ? `מצאו את הכפולה המשותפת הקטנה ביותר של ${M(a)} ושל ${M(b)}.` : `מכונה אחת מטפטפת טיפה כל ${a} שניות, ומכונה שנייה כל ${b} שניות. הן טפטפו יחד עכשיו. בעוד כמה שניות יטפטפו שוב יחד?`, answer: l,
        hints: [`רשמו את הכפולות של ${b}: ${list_(mults(b, 3 * b))}...`, `איזו מהן היא הראשונה שמתחלקת גם ב־${a}?`],
        explain: `כפולות של ${b}: ${list_(mults(b, l))}. הראשונה שמתחלקת ב־${a} היא ${l}.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let a, b;
        do [a, b] = [rnd(6, 30), rnd(6, 30)];
        while (a >= b || b % a === 0 || gcd(a, b) < 2 || lcm(a, b) > 300);
        const l = lcm(a, b);
        return num({
          prompt: `במעבדה שתי נורות אזהרה. אחת מהבהבת כל ${a} שניות, והשנייה כל ${b} שניות. עכשיו הבהבו יחד. בעוד כמה שניות יהבהבו שוב יחד?`, answer: l,
          hints: ['מחפשים את הכפולה המשותפת הקטנה ביותר.', `${M(`${a} = ${prodStr(a)}`)}, ${M(`${b} = ${prodStr(b)}`)}.`],
          explain: lcmWhy(a, b),
        });
      }
      if (t === 1) {
        let a, b;
        do [a, b] = [rnd(3, 15), rnd(3, 15)];
        while (a >= b || b % a === 0 || lcm(a, b) > 60);
        const l = lcm(a, b);
        let X;
        do X = rnd(2 * l, 6 * l);
        while (X % l === 0 || X > 400);
        const k = Math.floor(X / l);
        return num({
          prompt: `נורה אחת מהבהבת כל ${a} שניות, ונורה שנייה כל ${b} שניות. בתחילת הניסוי הן הבהבו יחד. כמה פעמים <b>נוספות</b> יהבהבו יחד במהלך ${X} השניות הראשונות?`, answer: k,
          hints: [`הן מהבהבות יחד כל ${l} שניות. למה?`, `כמה פעמים ${l} נכנס ב־${X}?`],
          explain: `הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b} היא ${l}, לכן הן מהבהבות יחד בשניות ${list_(mults(l, X))}: ${k} פעמים.`,
        });
      }
      if (t === 2) {
        let a, b;
        do [a, b] = [rnd(4, 18), rnd(4, 18)];
        while (a >= b || b % a === 0 || gcd(a, b) < 2);
        const l = lcm(a, b), n1 = pick(range(a - 1, i => i + 1).filter(x => gcd(x, a) === 1)), n2 = pick(range(b - 1, i => i + 1).filter(x => gcd(x, b) === 1));
        return num({
          prompt: `כדי לחבר ${M(`${fr(n1, a)} + ${fr(n2, b)}`)} צריך מכנה משותף. מהו המכנה המשותף הקטן ביותר?`, answer: l,
          hints: ['המכנה המשותף הקטן ביותר הוא הכפולה המשותפת הקטנה ביותר של המכנים.', `${M(`${a} = ${prodStr(a)}`)}, ${M(`${b} = ${prodStr(b)}`)}.`],
          explain: `הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b} היא ${l}: ${M(`${fr(n1, a)} + ${fr(n2, b)} = ${fr(n1 * (l / a), l)} + ${fr(n2 * (l / b), l)}`)}.`,
        });
      }
      let a, b;
      do [a, b] = [rnd(12, 80), rnd(12, 80)];
      while (a >= b || b % a === 0 || gcd(a, b) < 3 || lcm(a, b) > 600);
      return num({
        prompt: `מצאו את הכפולה המשותפת הקטנה ביותר של ${M(a)} ושל ${M(b)}.`, answer: lcm(a, b),
        hints: ['פרקו את שני המספרים לגורמים ראשוניים.', `${M(`${a} = ${prodStr(a)}`)}, ${M(`${b} = ${prodStr(b)}`)}. קחו כל גורם כמה פעמים שהוא מופיע במספר שבו יש ממנו הכי הרבה.`],
        explain: lcmWhy(a, b),
      });
    }
    if (t === 0) {
      let a, b, c;
      do [a, b, c] = [rnd(2, 12), rnd(2, 12), rnd(2, 15)];
      while (!(a < b && b < c) || c % a === 0 || c % b === 0 || b % a === 0 || lcm(lcm(a, b), c) > 360);
      const l = lcm(lcm(a, b), c);
      return num({
        prompt: `שלוש מכונות במעבדה. הראשונה מצפצפת כל ${a} דקות, השנייה כל ${b} דקות והשלישית כל ${c} דקות. עכשיו צפצפו שלושתן יחד. בעוד כמה דקות יצפצפו שוב שלושתן יחד?`, answer: l,
        hints: ['מחפשים את הכפולה המשותפת הקטנה ביותר של שלושת המספרים.', `קודם של ${a} ושל ${b}: ${lcm(a, b)}. עכשיו של ${lcm(a, b)} ושל ${c}.`],
        explain: `הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b} היא ${lcm(a, b)}, ושל ${lcm(a, b)} ושל ${c} היא ${l}.`,
      });
    }
    if (t === 1) {
      let a, b;
      do [a, b] = [pick([8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45]), pick([8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45])];
      while (a >= b || b % a === 0 || lcm(a, b) < 61 || lcm(a, b) > 240 || lcm(a, b) % 60 === 0);
      const l = lcm(a, b), h0 = rnd(7, 10), H = h0 + Math.floor(l / 60), mm = l % 60;
      return {
        prompt: `מתחנת המעבדה יוצא אוטובוס של קו 1 כל ${a} דקות, ואוטובוס של קו 2 כל ${b} דקות. בשעה ${M(`${h0}:00`)} יצאו שניהם יחד. באיזו שעה יצאו שוב יחד?`,
        widget: inputs(M(`${box('h', 2)} : ${box('m', 2)}`)), answer: { h: H, m: mm }, check: v => v.h === H && v.m === mm,
        hints: [`הם יוצאים יחד כל ${l} דקות (הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b}).`, `${l} דקות הן ${Math.floor(l / 60) === 1 ? 'שעה' : Math.floor(l / 60) + ' שעות'} ו־${mm} דקות.`],
        explain: `הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b} היא ${l} דקות, כלומר ${Math.floor(l / 60) === 1 ? 'שעה' : Math.floor(l / 60) + ' שעות'} ו־${mm} דקות. ${l} דקות אחרי ${M(`${h0}:00`)} השעה ${M(`${H}:${String(mm).padStart(2, '0')}`)}.`,
      };
    }
    if (t === 2) {
      let a, b;
      do [a, b] = [rnd(8, 40), rnd(8, 40)];
      while (a >= b || b % a === 0 || gcd(a, b) < 2);
      const l = lcm(a, b);
      return num({
        prompt: `גלגל שיניים עם ${a} שיניים משולב בגלגל עם ${b} שיניים. סימנו בכל גלגל שן אחת, ועכשיו שתי השיניים המסומנות נוגעות זו בזו. אחרי כמה סיבובים שלמים של הגלגל הקטן הן ייגעו שוב לראשונה?`, answer: l / a,
        hints: [`בכל סיבוב הגלגל הקטן מעביר ${a} שיניים. השיניים המסומנות נפגשות כשמספר השיניים שעברו הוא כפולה של ${a} וגם של ${b}.`, `הכפולה המשותפת הקטנה ביותר היא ${l}. כמה סיבובים של ${a} שיניים זה?`],
        explain: `צריך לעבור ${l} שיניים (הכפולה המשותפת הקטנה ביותר של ${a} ושל ${b}), כלומר ${M(`${l} ÷ ${a} = ${l / a}`)} סיבובים של הגלגל הקטן (והגדול מסתובב ${l / b} ${l / b === 1 ? 'סיבוב' : 'סיבובים'}).`,
      });
    }
    let ms;
    do ms = [rnd(2, 6), rnd(3, 8), rnd(4, 10)].sort((x, y) => x - y);
    while (new Set(ms).size < 3 || ms[2] % ms[0] === 0 || ms[2] % ms[1] === 0 || ms[1] % ms[0] === 0 || lcm(lcm(ms[0], ms[1]), ms[2]) > 300);
    const l = lcm(lcm(ms[0], ms[1]), ms[2]);
    return num({
      prompt: `כשמסדרים את המבחנות בשורות של ${ms[0]}, של ${ms[1]} או של ${ms[2]}, תמיד נשארת מבחנה אחת בחוץ. יש יותר ממבחנה אחת. מה המספר הקטן ביותר של מבחנות שיכול להיות?`, answer: l + 1,
      hints: [`אם מוציאים את המבחנה שנשארת, מספר המבחנות מתחלק ב־${ms[0]}, ב־${ms[1]} וב־${ms[2]}.`, `הכפולה המשותפת הקטנה ביותר של ${ms.join(', ')} היא ${l}.`],
      explain: `בלי המבחנה העודפת המספר הוא כפולה משותפת של ${ms.join(', ')}. הקטנה ביותר היא ${l}, ולכן יש ${M(`${l} + 1 = ${l + 1}`)} מבחנות.`,
    });
  },
};

// ---------- 6. powers and roots ----------
const fmt = n => (n >= 10000 ? n.toLocaleString('en-US') : String(n));
const CMP2 = [[[2, 5], [5, 2]], [[3, 4], [4, 3]], [[2, 10], [10, 3]], [[2, 6], [4, 3]], [[9, 2], [3, 4]], [[2, 7], [5, 3]], [[1, 20], [20, 1]], [[10, 2], [2, 10]], [[2, 4], [4, 2]], [[6, 2], [2, 5]], [[3, 3], [5, 2]], [[2, 8], [4, 4]], [[7, 2], [2, 6]]];
const CMP3 = [[[2, 30], [3, 20]], [[2, 20], [4, 10]], [[3, 40], [9, 20]], [[5, 20], [2, 50]], [[2, 100], [10, 30]], [[3, 30], [5, 20]], [[7, 10], [2, 30]], [[4, 15], [8, 10]], [[6, 10], [3, 20]], [[2, 60], [8, 20]], [[10, 20], [3, 40]]];
const CMP3WHY = {
  '2,30|3,20': `${M(`${P(2, 30)} = ${P(8, 10)}`)} ו־${M(`${P(3, 20)} = ${P(9, 10)}`)}`,
  '2,20|4,10': `${M(`${P(4, 10)} = ${P(2, 20)}`)}`,
  '3,40|9,20': `${M(`${P(9, 20)} = ${P(3, 40)}`)}`,
  '5,20|2,50': `${M(`${P(5, 20)} = ${P(25, 10)}`)} ו־${M(`${P(2, 50)} = ${P(32, 10)}`)}`,
  '2,100|10,30': `${M(`${P(2, 100)} = ${P(1024, 10)}`)} ו־${M(`${P(10, 30)} = ${P(1000, 10)}`)}`,
  '3,30|5,20': `${M(`${P(3, 30)} = ${P(27, 10)}`)} ו־${M(`${P(5, 20)} = ${P(25, 10)}`)}`,
  '7,10|2,30': `${M(`${P(2, 30)} = ${P(8, 10)}`)}, ו־7 קטן מ־8`,
  '4,15|8,10': `${M(`${P(4, 15)} = ${P(2, 30)}`)} וגם ${M(`${P(8, 10)} = ${P(2, 30)}`)}`,
  '6,10|3,20': `${M(`${P(3, 20)} = ${P(9, 10)}`)}, ו־6 קטן מ־9`,
  '2,60|8,20': `${M(`${P(8, 20)} = ${P(2, 60)}`)}`,
  '10,20|3,40': `${M(`${P(3, 40)} = ${P(81, 10)}`)} ו־${M(`${P(10, 20)} = ${P(100, 10)}`)}`,
};
const big = ([b, e]) => BigInt(b) ** BigInt(e);
function compareRound(pairs, L) {
  let [x, y] = pick(pairs);
  if (Math.random() < 0.5) [x, y] = [y, x];
  const X = big(x), Y = big(y), ans = X < Y ? 0 : X === Y ? 1 : 2;
  const key = [x, y].map(String).sort().join('|');
  const w3 = CMP3WHY[`${x}|${y}`] || CMP3WHY[`${y}|${x}`] || '';
  return {
    prompt: `איזה סימן מתאים? ${L === 3 ? 'אי אפשר לחשב את המספרים האלה בראש, אז חשבו בחוכמה.' : ''}`, visual: `<div class="lnum-cmp" dir="ltr">${M(P(...x))} <span class="qm">?</span> ${M(P(...y))}</div>`,
    widget: choice(['&lt;', '=', '&gt;'], { cols: 3, cls: 'signs' }), answer: ans, check: v => v === ans, sig: key,
    hints: L === 3
      ? ['נסו לכתוב את שתי החזקות עם אותו מעריך (המספר הקטן למעלה), או עם אותו בסיס.', w3]
      : ['חשבו כל חזקה בנפרד: הבסיס כפול עצמו כמה פעמים שכתוב במעריך.', `${M(`${P(...x)} = ${X}`)}`],
    explain: L === 3 ? `${w3}, לכן ${M(`${P(...x)} ${['&lt;', '=', '&gt;'][ans]} ${P(...y)}`)}.` : M(`${P(...x)} = ${X} ${['&lt;', '=', '&gt;'][ans]} ${Y} = ${P(...y)}`),
  };
}
const LAST = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 4: [4, 6], 9: [9, 1] };
const powers = {
  id: 'lnum-pow', title: 'חזקות ושורשים',
  intro: `<p><b>חזקה</b> היא כפל של מספר בעצמו כמה פעמים. ב־${M(P(2, 5))} המספר 2 הוא ה<b>בסיס</b>, ו־5 הוא ה<b>מעריך</b>: כמה פעמים כופלים.</p>
    <div class="ex">${M(`${P(2, 5)} = 2 × 2 × 2 × 2 × 2 = 32`)}<br>${M(`${P(10, 4)} = 10,000`)} (1 ואחריו 4 אפסים)</div>
    <p><b>שורש ריבועי</b> הוא הפעולה ההפוכה לריבוע: ${M('√81 = 9')}, כי ${M(`${P(9, 2)} = 81`)}. ו<b>שורש שלישי</b> הפוך לחזקה שלישית: ${M('∛64 = 4')}, כי ${M(`${P(4, 3)} = 64`)}.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t === 0) {
        const [b, e] = pick([[2, 3], [2, 4], [2, 5], [2, 6], [3, 3], [3, 4], [4, 3], [5, 3], [10, 3], [10, 5], [10, 6], [6, 2], [5, 4], [3, 2], [7, 3]]);
        return numEq({
          prompt: 'חשבו:', eq: `${P(b, e)} = `, answer: b ** e,
          hints: [`${M(P(b, e))} פירושו ${M(range(e, () => b).join(' × '))}.`, b === 10 ? `1 ואחריו ${e} אפסים.` : `${M(`${P(b, e - 1)} = ${b ** (e - 1)}`)}, ועוד פעם כפול ${b}.`],
          explain: M(`${P(b, e)} = ${range(e, () => b).join(' × ')} = ${fmt(b ** e)}`),
        });
      }
      if (t === 1) {
        const b = rnd(2, 9), e = rnd(3, 6);
        const askBase = Math.random() < 0.5 && b ** 3 <= 729;
        if (askBase)
          return {
            prompt: 'איזה מספר חסר?', widget: inputs(M(`${box('a', 1)}<sup>3</sup> = ${b ** 3}`)), answer: { a: b }, check: v => v.a === b,
            hints: ['איזה מספר, כפול עצמו שלוש פעמים, נותן את התוצאה?', `נסו ${M(`${b - 1} × ${b - 1} × ${b - 1} = ${(b - 1) ** 3}`)}. קטן מדי?`],
            explain: `${M(`${b} × ${b} × ${b} = ${b ** 3}`)}, לכן ${M(`∛${b ** 3} = ${b}`)}.`,
          };
        return {
          prompt: 'כתבו בעזרת חזקה:', widget: inputs(`<div class="lnum-sup">${M(`${range(e, () => b).join(' × ')} = ${b}<sup>${box('a', 1)}</sup>`)}</div>`), answer: { a: e }, check: v => v.a === e,
          hints: ['המעריך אומר כמה פעמים הבסיס מופיע בכפל.', `ספרו כמה פעמים כתוב ${b}.`],
          explain: `${b} מופיע ${e} פעמים: ${M(P(b, e))}.`,
        };
      }
      const n = rnd(4, 15);
      return numEq({
        prompt: t === 2 ? `צלחת מעבדה ריבועית בנויה מ־${n * n} משבצות. מה אורך הצלע שלה, במשבצות?` : 'מצאו את השורש:', visual: t === 2 ? squareArea(n * n) : undefined,
        eq: t === 2 ? '' : `√${n * n} = `, answer: n,
        hints: ['איזה מספר, כפול עצמו, נותן ' + (n * n) + '?', `${M(`${P(n - 1, 2)} = ${(n - 1) ** 2}`)}, קצת פחות מדי.`],
        explain: `${M(`${n} × ${n} = ${n * n}`)}, לכן ${M(`√${n * n} = ${n}`)}.`,
      });
    }
    if (L === 2) {
      if (t === 0) return compareRound(CMP2, 2);
      if (t === 1) {
        const n = rnd(2, 10), cube = Math.random() < 0.5;
        return cube
          ? numEq({ prompt: 'מצאו את השורש השלישי:', eq: `∛${n ** 3} = `, answer: n, hints: ['איזה מספר, כפול עצמו שלוש פעמים, נותן את המספר?', `${M(`${P(n - 1, 3)} = ${(n - 1) ** 3}`)}, קטן מדי.`], explain: `${M(`${n} × ${n} × ${n} = ${n ** 3}`)}, לכן ${M(`∛${n ** 3} = ${n}`)}.` })
          : numEq({ prompt: `קובייה בנויה מ־${M(`${n} × ${n} × ${n}`)} קוביות קטנות. כמה קוביות קטנות יש בה?`, eq: `${P(n, 3)} = `, answer: n ** 3, hints: [`בכל שכבה ${M(`${n} × ${n} = ${n * n}`)} קוביות.`, `יש ${n} שכבות.`], explain: M(`${P(n, 3)} = ${n * n} × ${n} = ${n ** 3}`) });
      }
      if (t === 2) {
        const n = rnd(11, 30);
        return numEq({
          prompt: 'מצאו את השורש:', eq: `√${n * n} = `, answer: n,
          hints: [`${M(`${P(10, 2)} = 100`)}, ${M(`${P(20, 2)} = 400`)}, ${M(`${P(30, 2)} = 900`)}. בין אילו עשרות התשובה?`, `ספרת האחדות של ${n * n} היא ${(n * n) % 10}. איזו ספרה, כפול עצמה, מסתיימת כך?`],
          explain: `${M(`${P(n, 2)} = ${n * n}`)}, לכן ${M(`√${n * n} = ${n}`)}.`,
        });
      }
      const a = rnd(2, 99), k = rnd(2, 6), N = a * 10 ** k, askK = Math.random() < 0.5 && a % 10;
      return askK
        ? { prompt: 'איזו חזקה חסרה?', widget: inputs(`<div class="lnum-sup">${M(`${fmt(N)} = ${a} × 10<sup>${box('k', 1)}</sup>`)}</div>`), answer: { k }, check: v => v.k === k, hints: [`${M(P(10, 'n'))} הוא 1 ואחריו n אפסים.`, `כמה אפסים נוספו אחרי ${a}?`], explain: `אחרי ${a} יש ${k} אפסים, לכן ${M(`${fmt(N)} = ${a} × ${P(10, k)}`)}.` }
        : numEq({ prompt: 'חשבו:', eq: `${a} × ${P(10, k)} = `, answer: N, hints: [`${M(`${P(10, k)} = ${fmt(10 ** k)}`)}`, `כופלים ב־${fmt(10 ** k)}: מוסיפים ${k} אפסים אחרי ${a}.`], explain: M(`${a} × ${fmt(10 ** k)} = ${fmt(N)}`) });
    }
    if (t === 0) return compareRound(CMP3, 3);
    if (t === 1) {
      const b = pick(Object.keys(LAST).map(Number)), cyc = LAST[b], e = rnd(20, 2030), d = cyc[(e - 1) % cyc.length];
      return numEq({
        prompt: `מה ספרת האחדות של ${M(P(b, e))}?`, answer: d,
        hints: [`חשבו את ספרת האחדות של ${M(P(b, 1))}, ${M(P(b, 2))}, ${M(P(b, 3))}, ${M(P(b, 4))}... יש בה מחזוריות.`, `הספרות חוזרות כל ${cyc.length}: ${cyc.join(', ')}. מה השארית של ${e} בחילוק ל־${cyc.length}?`],
        explain: `ספרות האחדות של החזקות של ${b} חוזרות במחזור ${cyc.join(', ')} (באורך ${cyc.length}). ${M(`${e} = ${cyc.length} × ${Math.floor(e / cyc.length)} + ${e % cyc.length}`)}, לכן הספרה היא ${d}.`,
      });
    }
    if (t === 2) {
      const b = pick([2, 3, 5, 7, 10]), m = rnd(2, 7), n = rnd(2, 6), u = rnd(0, 2);
      const [q, ans, why] = u === 0 ? [`${P(b, m)} × ${P(b, n)}`, m + n, `בכפל יש ${m} גורמים של ${b} ועוד ${n} גורמים של ${b}: בסך הכול ${m + n}.`]
        : u === 1 ? [`(${P(b, m)})<sup>${n}</sup>`, m * n, `כופלים ${n} פעמים את ${M(P(b, m))}: ${n} קבוצות של ${m} גורמים, כלומר ${m * n} גורמים של ${b}.`]
        : [`${P(b, m + n)} ÷ ${P(b, n)}`, m, `במונה ${m + n} גורמים של ${b}, ומצמצמים ${n} מהם. נשארים ${m}.`];
      return {
        prompt: 'איזו חזקה חסרה? (בלי לחשב את המספרים)', widget: inputs(`<div class="lnum-sup">${M(`${q} = ${b}<sup>${box('a', 2)}</sup>`)}</div>`), answer: { a: ans }, check: v => v.a === ans,
        hints: ['כתבו את החזקות ככפל ארוך וספרו כמה פעמים מופיע הבסיס.', why],
        explain: `${why} ${M(`${q} = ${P(b, ans)}`)}.`,
      };
    }
    const n = pick([24, 36, 42, 45, 48, 54, 56, 60, 63, 72, 75, 84, 90, 96, 98, 99]), N = n * n;
    return numEq({
      prompt: 'מצאו את השורש בעזרת פירוק לגורמים:', eq: `√${N} = `, answer: n,
      hints: [`פרקו: ${M(`${N} = ${powStr(N)}`)}.`, `השורש מחלק כל מעריך ב־2: ${M(groups(N).map(([p, e]) => P(p, e / 2)).join(' × '))}.`],
      explain: `${M(`${N} = ${powStr(N)}`)}, לכן ${M(`√${N} = ${groups(N).map(([p, e]) => P(p, e / 2)).join(' × ')} = ${n}`)}.`,
    });
  },
};

// ---------- 7. negative numbers on a thermometer ----------
const temps = {
  id: 'lnum-temp', title: 'מספרים שליליים במדחום',
  intro: `<p>מתחת לאפס יש מספרים <b>שליליים</b>: ${deg(-1)}, ${deg(-2)}, ${deg(-3)}... ככל שמתרחקים מ־0 כלפי מטה, קר יותר: ${M('−8')} קטן מ־${M('−3')}.</p>
    <div class="ex">היה ${deg(3)} והטמפרטורה ירדה ב־5 מעלות: יורדים 3 עד האפס, ועוד 2 מתחתיו. עכשיו ${deg(-2)}.<br>ההפרש בין ${deg(-4)} ל־${deg(6)}: 4 עד האפס ועוד 6, כלומר 10 מעלות.</div>
    <p>את המדחום מכוונים בגרירה או בחצים ▲ ▼. כדי להקליד מספר שלילי לוחצים על המקש −.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t < 2) {
        const s = rnd(-5, 10), d = rnd(3, 12) * (Math.random() < 0.7 ? -1 : 1), e = s + d;
        if (e < -14 || e > 14 || (s >= 0 && e >= 0)) return temps.gen(L);
        return {
          prompt: `במקרר הניסויים היה ${deg(s)}. הטמפרטורה ${d < 0 ? 'ירדה' : 'עלתה'} ב־${Math.abs(d)} מעלות. כוונו את המדחום לטמפרטורה החדשה.`,
          widget: thermo({ min: -15, max: 15, start: s }), answer: e, check: v => v === e,
          wrongMsg: v => `המדחום מראה ${deg(v)}.`,
          hints: [d < 0 ? 'ירידה: זזים למטה במדחום.' : 'עלייה: זזים למעלה במדחום.', d < 0 && s > 0 && e < 0 ? `יורדים ${s} מעלות עד האפס, ועוד ${-d - s} מתחת לאפס.` : `סופרים ${Math.abs(d)} שנתות מ־${deg(s)}.`],
          explain: `${M(`${nf(s)} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${nf(e)}`)}. המדחום מראה ${deg(e)}.`,
        };
      }
      if (t === 2) {
        const a = rnd(-12, -1), b = rnd(1, 12);
        return num({
          prompt: `בבוקר המדחום במעבדה הראה ${deg(a)}, ובצהריים ${deg(b)}. בכמה מעלות עלתה הטמפרטורה?`, visual: `<div class="lnum-two">${thermoSVG({ min: -15, max: 15, t: a })}${thermoSVG({ min: -15, max: 15, t: b })}</div>`, answer: b - a,
          hints: [`מ־${deg(a)} עד האפס עולים ${-a} מעלות.`, `ומהאפס עד ${deg(b)} עוד ${b}.`],
          explain: `${M(`${-a} + ${b} = ${b - a}`)} מעלות. בתרגיל: ${M(`${b} − ${par(a)} = ${b - a}`)}.`,
        });
      }
      const a = rnd(-10, 4), d = rnd(4, 12), e = a - d;
      return numN({
        prompt: `המדחום מראה ${deg(a)}. בלילה הטמפרטורה תרד ב־${d} מעלות. כמה יראה המדחום? (מספר שלילי כותבים עם המקש −)`, visual: thermoSVG({ min: -25, max: 15, t: a }), answer: e,
        hints: ['ירידה: זזים למטה, לכיוון המספרים השליליים.', a > 0 ? `${a} מעלות עד האפס, ועוד ${d - a} מתחת לאפס.` : `מ־${deg(a)} יורדים עוד ${d}: מתרחקים מהאפס.`],
        explain: `${M(`${nf(a)} − ${d} = ${nf(e)}`)}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const s = rnd(-8, 12), ch = range(3, i => rnd(2, 9) * (i % 2 ? 1 : -1)), e = ch.reduce((x, y) => x + y, s);
        if (e < -24 || e > 24 || e >= 0) return temps.gen(L);
        const say = c => (c < 0 ? `ירדה ב־${-c}` : `עלתה ב־${c}`);
        return {
          prompt: `בניסוי הקירור הטמפרטורה הייתה ${deg(s)}. אחר כך היא ${say(ch[0])}, ${say(ch[1])} ובסוף ${say(ch[2])}. כוונו את המדחום לטמפרטורה בסוף.`,
          widget: thermo({ min: -25, max: 25, start: s }), answer: e, check: v => v === e,
          wrongMsg: v => `המדחום מראה ${deg(v)}.`,
          hints: ['בצעו את השינויים אחד אחרי השני.', `אחרי השינוי הראשון: ${deg(s + ch[0])}. אחרי השני: ${deg(s + ch[0] + ch[1])}.`],
          explain: M(`${nf(s)} ${ch.map(c => (c < 0 ? `− ${-c}` : `+ ${c}`)).join(' ')} = ${nf(e)}`),
        };
      }
      if (t === 1) {
        const a = rnd(-25, -2), b = Math.random() < 0.5 ? rnd(-20, -1) : rnd(5, 35);
        if (a === b) return temps.gen(L);
        const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
        const place = pick([['בקוטב הצפוני', 'במעבדה בהר'], ['במקפיא א', 'במקפיא ב'], ['בתא הקירור', 'בחדר הסמוך']]);
        return num({
          prompt: `${place[0]} ${deg(a)}, ו${place[1]} ${deg(b)}. מה ההפרש בין שתי הטמפרטורות, במעלות?`, answer: hi - lo,
          hints: ['ההפרש הוא המרחק בין שתי הטמפרטורות על המדחום.', hi > 0 ? `מ־${deg(lo)} עד 0 יש ${-lo}, ומ־0 עד ${deg(hi)} יש ${hi}.` : `שתיהן מתחת לאפס: ${M(`${-lo} − ${-hi}`)}.`],
          explain: `${M(`${nf(hi)} − ${par(lo)} = ${hi - lo}`)} מעלות.`,
        });
      }
      if (t === 2) {
        const a = rnd(-15, 15), b = rnd(-20, 15);
        if (a === b || (a >= 0 && b >= 0)) return temps.gen(L);
        return numN({
          prompt: `בבוקר היה ${deg(a)} ובערב ${deg(b)}. בכמה מעלות השתנתה הטמפרטורה? (עלייה כותבים כמספר חיובי, וירידה כמספר שלילי)`, answer: b - a,
          hints: ['השינוי הוא הטמפרטורה בסוף פחות הטמפרטורה בהתחלה.', `${M(`${nf(b)} − ${par(a)}`)}. ${b > a ? 'היא עלתה.' : 'היא ירדה, אז התשובה שלילית.'}`],
          explain: `${M(`${nf(b)} − ${par(a)} = ${nf(b - a)}`)}: ${b > a ? `עלייה של ${b - a}` : `ירידה של ${a - b}`} מעלות.`,
        });
      }
      const vals = shuffle([...new Set(range(6, () => rnd(-20, 8)))]).slice(0, 4);
      if (vals.length < 4 || vals.filter(v => v < 0).length < 2) return temps.gen(L);
      const lo = Math.min(...vals), ans = vals.indexOf(lo);
      return {
        prompt: 'באיזה מקפיא הכי קר?',
        widget: choice(vals.map((v, i) => `מקפיא ${'אבגד'[i]}: ${deg(v)}`), { cols: 2 }), answer: ans, check: v => v === ans,
        hints: ['הכי קר זה הכי נמוך במדחום.', 'במספרים שליליים: ככל שהמספר אחרי המינוס גדול יותר, המספר קטן יותר.'],
        explain: `${M(vals.slice().sort((x, y) => x - y).map(v => `${nf(v)}°`).join(' &lt; '))}. הכי קר: ${deg(lo)}.`,
      };
    }
    if (t === 0) {
      const n = pick([4, 5]), avg = rnd(-6, 3);
      let vals;
      do {
        vals = range(n - 1, () => rnd(-15, 10));
        vals.push(avg * n - vals.reduce((a, b) => a + b, 0));
      } while (vals[n - 1] < -18 || vals[n - 1] > 14 || new Set(vals).size < n);
      const sum = avg * n;
      return numN({
        prompt: `בתחנת המחקר מדדו ${n} ימים: ${vals.map(v => deg(v)).join(', ')}. מה הטמפרטורה הממוצעת?`, answer: avg,
        hints: ['ממוצע: מחברים את כל המספרים ומחלקים במספר הימים.', `הסכום הוא ${M(nf(sum))}.`],
        explain: `${M(`(${vals.map(nf).join(' + ').replace(/\+ −/g, '− ')}) ÷ ${n} = ${nf(sum)} ÷ ${n} = ${nf(avg)}`)}`,
      });
    }
    if (t === 1) {
      const T0 = rnd(10, 30), km = rnd(2, 6), e = T0 - 6 * km, ask = Math.random() < 0.5;
      return ask
        ? numN({ prompt: `כשעולים בהר, הטמפרטורה יורדת בערך 6 מעלות על כל 1,000 מטר. למרגלות ההר ${deg(T0)}. כמה מעלות יהיו בגובה ${M(fmt(km * 1000))} מטר מעל המרגלות?`, answer: e, hints: [`כמה פעמים 1,000 מטר יש ב־${fmt(km * 1000)} מטר?`, `הטמפרטורה יורדת ${M(`${km} × 6 = ${6 * km}`)} מעלות.`], explain: `${M(`${T0} − ${km} × 6 = ${T0} − ${6 * km} = ${nf(e)}`)}` })
        : num({ prompt: `כשעולים בהר, הטמפרטורה יורדת 6 מעלות על כל 1,000 מטר. למרגלות ההר ${deg(T0)}, ובפסגה ${deg(e)}. כמה מטרים מעל המרגלות נמצאת הפסגה?`, answer: km * 1000, hints: [`בכמה מעלות ירדה הטמפרטורה? ${M(`${T0} − ${par(e)}`)}`, `הטמפרטורה ירדה ${6 * km} מעלות. כמה פעמים 6?`], explain: `הירידה: ${M(`${T0} − ${par(e)} = ${6 * km}`)} מעלות, כלומר ${M(`${6 * km} ÷ 6 = ${km}`)} פעמים 1,000 מטר: ${fmt(km * 1000)} מטר.` });
    }
    if (t === 2) {
      const r = rnd(2, 5), s = rnd(4, 20), m = rnd(4, 12), e = s - r * m;
      if (e >= 0 || e < -40) return temps.gen(L);
      return num({
        prompt: `חומר בניסוי מתקרר ב־${r} מעלות בכל דקה. עכשיו הוא ${deg(s)}. בעוד כמה דקות יגיע ל־${deg(e)}?`, answer: m,
        hints: [`בכמה מעלות הוא צריך להתקרר בסך הכול? מ־${deg(s)} עד ${deg(e)}.`, `${M(`${s} − ${par(e)} = ${s - e}`)} מעלות. כמה דקות של ${r} מעלות?`],
        explain: `צריך לרדת ${M(`${s} − ${par(e)} = ${s - e}`)} מעלות, ו־${M(`${s - e} ÷ ${r} = ${m}`)} דקות.`,
      });
    }
    const mid = rnd(-12, 3), half = rnd(3, 10), lo = mid - half, hi = mid + half;
    return numN({
      prompt: `ההפרש בין הטמפרטורה בתא א לטמפרטורה בתא ב הוא ${2 * half} מעלות, ובדיוק באמצע ביניהן נמצאת ${deg(mid)}. מה הטמפרטורה בתא הקר יותר?`, answer: lo,
      hints: ['שתי הטמפרטורות נמצאות באותו מרחק מהאמצע, אחת מעליו ואחת מתחתיו.', `כל אחת רחוקה ${half} מעלות מ־${deg(mid)}.`],
      explain: `${M(`${nf(mid)} − ${half} = ${nf(lo)}`)} ו־${M(`${nf(mid)} + ${half} = ${nf(hi)}`)}. הקרה יותר: ${deg(lo)}.`,
    });
  },
};

// ---------- 8. order of operations with powers and fractions ----------
const Q = (n, d = 1) => {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
function qop(x, o, y) {
  if (o === '+') return Q(x.n * y.d + y.n * x.d, x.d * y.d);
  if (o === '-') return x.n * y.d - y.n * x.d < 0 ? null : Q(x.n * y.d - y.n * x.d, x.d * y.d);
  if (o === '*') return Q(x.n * y.n, x.d * y.d);
  return y.n === 0 ? null : Q(x.n * y.d, x.d * y.n);
}
const qHTML = x => (x.d === 1 ? `${x.n}` : fr(x.n, x.d));
function applyQ(T, i) {
  const t = T[i];
  const res = t.t === 'p' ? Q(T[i - 1].v.n ** t.v, T[i - 1].v.d ** t.v) : qop(T[i - 1].v, t.v, T[i + 1].v);
  if (!res) return null;
  const from = i - 1, to = t.t === 'p' ? i : i + 1;
  const N = [...T.slice(0, from), { t: 'n', v: res }, ...T.slice(to + 1)];
  let k = from;
  while (N[k - 1] && N[k - 1].t === '(' && N[k + 1] && N[k + 1].t === ')') {
    N.splice(k + 1, 1);
    N.splice(k - 1, 1);
    k--;
  }
  return { tokens: N, res, from, to };
}
function stepsQ(T) {
  const out = [T];
  while (T.length > 1) {
    const i = nextOp(T);
    if (i < 0) return null;
    const r = applyQ(T, i);
    if (!r || r.res.n === 0 || r.res.d > 60 || r.res.n > 300) return null;
    T = r.tokens;
    out.push(T);
  }
  return out;
}
const tokQ = T =>
  T.map((t, i) => {
    if (t.t === 'n') {
      const s = `<span class="tk n">${qHTML(t.v)}</span>`;
      return t.v.d > 1 && T[i + 1] && T[i + 1].t === 'p' ? `<span class="tk b">(</span>${s}<span class="tk b">)</span>` : s;
    }
    return t.t === 'o' ? `<span class="tk o">${SYM[t.v]}</span>` : t.t === 'p' ? `<sup class="tk p">${t.v}</sup>` : `<span class="tk b">${t.t}</span>`;
  }).join('');
const chainQ = st => `<div class="chain lnum-chain" dir="ltr">${st.map((T, i) => `<div class="chain-line">${i ? '<span class="tk o">=</span>' : ''}${tokQ(T)}</div>`).join('')}</div>`;
const properFrac = ds => {
  const d = pick(ds);
  let n;
  do n = rnd(1, d - 1);
  while (gcd(n, d) > 1);
  return Q(n, d);
};
function genQ(L) {
  const n = L === 2 ? 3 : rnd(3, 4);
  for (let tries = 0; tries < 5000; tries++) {
    const os = range(n - 1, () => pick(L === 2 ? ['+', '-', '*', '*', '/'] : ['+', '-', '*', '/']));
    const ns = range(n, () => (Math.random() < 0.55 ? properFrac(L === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 10]) : Q(rnd(1, L === 2 ? 6 : 9))));
    let parens = [];
    if (L === 3 || Math.random() < 0.5) {
      const len = rnd(2, n - 1), i = rnd(0, n - len);
      parens = [[i, i + len - 1]];
    }
    const pows = {};
    if (L === 3 && parens.length && Math.random() < 0.45) parens[0] = [...parens[0], 2];
    else {
      const k = rnd(0, n - 1);
      pows[k] = 2;
      ns[k] = Math.random() < 0.6 ? properFrac([2, 3, 4, 5]) : Q(rnd(2, 5));
      if (L === 3 && Math.random() < 0.3 && ns[k].d === 2) pows[k] = 3;
    }
    if (!ns.some(x => x.d > 1)) continue;
    const T = build(ns, os, parens, pows), st = stepsQ(T);
    if (!st) continue;
    const val = st[st.length - 1][0].v;
    if (val.d > 24 || val.n > 120 || st.length < (L === 2 ? 4 : 5)) continue;
    if (!hasBoth(os) && !parens.length) continue;
    if (parens.length && !parens[0][2]) {
      const alt = stepsQ(build(ns, os, [], pows));
      if (alt) {
        const v2 = alt[alt.length - 1][0].v;
        if (v2.n === val.n && v2.d === val.d) continue;
      }
    }
    return { T, st, val };
  }
  const T = build([Q(1, 2), Q(3), Q(1, 4)], ['+', '*'], [], { 0: 2 });
  return { T, st: stepsQ(T), val: stepsQ(T).pop()[0].v };
}
// like exprTap with compute, for numbers that may be fractions
function fracTap(tokens) {
  return ctx => {
    let T = tokens, locked = false, pend = null, mini = null;
    const hist = h('div', { class: 'chain lnum-chain', dir: 'ltr' }), line = h('div', { class: 'expr lnum-fexpr', dir: 'ltr' }), sub = h('div', { class: 'expr-sub' });
    const draw = () => {
      line.innerHTML = '';
      if (hist.children.length) line.append(h('span', { class: 'tk o' }, '='));
      T.forEach((t, i) => {
        const hot = pend && i >= pend.r.from && i <= pend.r.to ? ' hot' : '';
        if (t.t === 'o' || t.t === 'p') return line.append(h('button', { type: 'button', class: `tk ${t.t} tap${hot}`, onclick: () => tap(i) }, t.t === 'o' ? SYM[t.v] : t.v === 2 ? '²' : '³'));
        if (t.t === 'n') {
          const paren = t.v.d > 1 && T[i + 1] && T[i + 1].t === 'p';
          if (paren) line.append(h('span', { class: 'tk b' + hot }, '('));
          line.append(h('span', { class: 'tk n' + hot, html: qHTML(t.v) }));
          if (paren) line.append(h('span', { class: 'tk b' + hot }, ')'));
          return;
        }
        line.append(h('span', { class: 'tk b' + hot }, t.t));
      });
    };
    const commit = r => {
      hist.append(h('div', { class: 'chain-line', html: (hist.children.length ? '<span class="tk o">=</span>' : '') + tokQ(T) }));
      T = r.tokens;
      pend = mini = null;
      sub.innerHTML = '';
      draw();
      if (T.length === 1) {
        locked = true;
        line.classList.add('final');
        ctx.solved();
      }
    };
    const submit = () => {
      const v = mini && mini.value();
      if (!v || locked) return;
      const d = v.d == null ? 1 : v.d, r = pend.r.res;
      if (d > 0 && v.n * r.d === r.n * d) return commit(pend.r);
      mini.clear();
      ctx.mistake(d === 0 ? 'אי אפשר לכתוב 0 במכנה.' : 'החישוב לא מדויק.');
    };
    const tap = i => {
      if (locked || pend) return;
      // validOps only looks at token types, so it works for fractions too
      if (!validOps(T).includes(i)) return ctx.mistake('הפעולה הזאת עוד לא בתור.');
      const r = applyQ(T, i), t = T[i];
      pend = { r };
      draw();
      const L = T[i - 1].v, q = t.t === 'p' ? (L.d > 1 ? `(${qHTML(L)})<sup>${t.v}</sup>` : `${L.n}<sup>${t.v}</sup>`) : `${qHTML(L)} ${SYM[t.v]} ${qHTML(T[i + 1].v)}`;
      mini = inputs(`${M(`${q} = <span class="frac fin">${box('n', 3)}${box('d', 3, true)}</span>`)}<div class="lnum-mtip">תוצאה שלמה? כתבו אותה למעלה והשאירו את המכנה ריק.</div>`, { onOk: submit });
      sub.innerHTML = '';
      sub.append(mini.el);
    };
    draw();
    return {
      el: h('div', { class: 'w-expr lnum-tight' }, hist, line, sub),
      auto() {
        let guard = 0;
        while (!locked && guard++ < 30) {
          tap(nextOp(T));
          mini.set({ n: pend.r.res.n, d: pend.r.res.d });
          submit();
        }
      },
      key(e) {
        if (!mini) return false;
        if (e.key === 'Enter') {
          submit();
          return true;
        }
        return mini.key(e);
      },
      lock() {
        locked = true;
        if (mini) mini.lock();
      },
    };
  };
}

const order = {
  id: 'lnum-order', title: 'סדר פעולות עם חזקות ושברים',
  intro: `<p>הסדר: <b>1.</b> סוגריים. <b>2.</b> חזקות. <b>3.</b> כפל וחילוק, משמאל לימין. <b>4.</b> חיבור וחיסור, משמאל לימין.</p>
    <div class="ex">${M(`${fr(1, 2)} + (${fr(1, 2)})<sup>2</sup> × 2`)}<br>${M(`= ${fr(1, 2)} + ${fr(1, 4)} × 2`)}<br>${M(`= ${fr(1, 2)} + ${fr(1, 2)}`)}<br>${M('= 1')}</div>
    <p>שימו לב: ${M(`(${fr(2, 3)})<sup>2</sup> = ${fr(4, 9)}`)}. מעלים בחזקה גם את המונה וגם את המכנה.</p>
    <p>בכל שלב לוחצים על הפעולה הבאה בתור, מקלידים את התוצאה שלה ולוחצים ✓. אם התוצאה מספר שלם, משאירים את המכנה ריק.</p>`,
  gen(L) {
    if (L === 1) {
      const e = genExpr({ n: 4, par: 'one', pow: 1, max: 9, limit: 300, parPow: Math.random() < 0.4 });
      return {
        prompt: 'פתרו שלב אחר שלב: לחצו על הפעולה הבאה בתור, הקלידו את התוצאה שלה ולחצו ✓.', sig: tokHTML(e.T), tries: 3,
        widget: ctx => {
          const w = exprTap(e.T, { compute: true })(ctx);
          w.el.classList.add('lnum-tight');
          return w;
        },
        hints: ['קודם סוגריים, אחר כך חזקות, אחר כך כפל וחילוק, ובסוף חיבור וחיסור.', 'חזקה שנמצאת אחרי סוגריים מחכה עד שפותרים את מה שבתוכם.'],
        explain: `כך פותרים לפי הסדר:<div class="lnum-chain">${chainHTML(e.st)}</div>`,
      };
    }
    if (L === 3 && Math.random() < 0.3) {
      const u = rnd(0, 2);
      if (u === 0) {
        const x = rnd(2, 9), a = rnd(2, 5), b = rnd(1, 20), c = a * x * x - b;
        return {
          prompt: 'איזה מספר חיובי חסר?', widget: inputs(M(`${a} × ${box('x', 2)}<sup>2</sup> − ${b} = ${c}`)), answer: { x }, check: v => v.x === x,
          hints: [`עבדו מהסוף: ${M(`${a} × ?<sup>2</sup> = ${c} + ${b} = ${c + b}`)}.`, `${M(`?<sup>2</sup> = ${c + b} ÷ ${a} = ${x * x}`)}.`],
          explain: `${M(`${c} + ${b} = ${c + b}`)}, ${M(`${c + b} ÷ ${a} = ${x * x}`)}, ${M(`√${x * x} = ${x}`)}. בדיקה: ${M(`${a} × ${P(x, 2)} − ${b} = ${a * x * x} − ${b} = ${c}`)}.`,
        };
      }
      if (u === 1) {
        let x, a, b;
        do [x, a, b] = [rnd(1, 9), rnd(1, 6), pick([2, 3, 4, 5, 6, 8, 9])];
        while (((x + a) ** 2) % b);
        const y = (x + a) ** 2 / b;
        return {
          prompt: 'איזה מספר חיובי חסר?', widget: inputs(M(`(${box('x', 2)} + ${a})<sup>2</sup> ÷ ${b} = ${y}`)), answer: { x }, check: v => v.x === x,
          hints: [`עבדו מהסוף: ${M(`(? + ${a})<sup>2</sup> = ${y} × ${b} = ${y * b}`)}.`, `${M(`? + ${a} = √${y * b} = ${x + a}`)}.`],
          explain: `${M(`${y} × ${b} = ${y * b}`)}, ${M(`√${y * b} = ${x + a}`)}, ${M(`${x + a} − ${a} = ${x}`)}.`,
        };
      }
      const [n, d] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 2], [1, 10]]), k = rnd(2, d === 2 || d === 3 ? 5 : 3);
      return {
        prompt: 'איזה מעריך חסר?', widget: inputs(`<div class="lnum-sup">${M(`(${fr(n, d)})<sup>${box('k', 1)}</sup> = ${fr(n ** k, d ** k)}`)}</div>`), answer: { k }, check: v => v.k === k,
        hints: ['מעלים בחזקה את המונה ואת המכנה בנפרד.', `${M(`${d}<sup>?</sup> = ${d ** k}`)}. כמה פעמים כופלים ${d}?`],
        explain: `${M(`${P(d, k)} = ${d ** k}`)}${n > 1 ? ` וגם ${M(`${P(n, k)} = ${n ** k}`)}` : ''}, לכן המעריך ${k}.`,
      };
    }
    const e = genQ(L);
    return {
      prompt: 'פתרו שלב אחר שלב: לחצו על הפעולה הבאה בתור, הקלידו את התוצאה שלה ולחצו ✓.', sig: tokQ(e.T), widget: fracTap(e.T), tries: 3,
      hints: ['הסדר: סוגריים, חזקות, כפל וחילוק, ובסוף חיבור וחיסור.', 'בשבר בחזקה מעלים בחזקה את המונה ואת המכנה. בחיבור ובחיסור של שברים צריך מכנה משותף.'],
      explain: `כך פותרים לפי הסדר:${chainQ(e.st)}`,
    };
  },
};

// ---------- 9. boss ----------
function riddle(L) {
  const [lo, hi] = L === 2 ? [10, 99] : [100, 999], all = range(hi - lo + 1, i => lo + i);
  for (let tries = 0; tries < 400; tries++) {
    const n = pick(all), s = digitSum(n), pool = [];
    for (const k of [3, 4, 6, 7, 8, 9, 11, 12, 15]) if (n % k === 0) pool.push([`אני מתחלק ב־${k}.`, x => x % k === 0, 3]);
    for (const k of shuffle([2, 3, 4, 5, 9]).slice(0, 2)) if (n % k) pool.push([`אני לא מתחלק ב־${k}.`, x => x % k !== 0, 1]);
    pool.push([`סכום הספרות שלי ${s}.`, x => digitSum(x) === s, 2]);
    pool.push(isPrime(n) ? ['אני מספר ראשוני.', isPrime, 3] : ['אני מספר פריק.', x => !isPrime(x), 1]);
    if (isSq(n)) pool.push(['אני מספר ריבועי.', isSq, 3]);
    pool.push(n % 2 ? ['אני אי־זוגי.', x => x % 2 === 1, 1] : ['אני זוגי.', x => x % 2 === 0, 1]);
    const tn = Math.floor(n / 10) % 10, u = n % 10;
    if (L === 2 && tn !== u) pool.push(tn > u ? ['ספרת העשרות שלי גדולה מספרת האחדות.', x => Math.floor(x / 10) % 10 > x % 10, 1] : ['ספרת העשרות שלי קטנה מספרת האחדות.', x => Math.floor(x / 10) % 10 < x % 10, 1]);
    if (L === 3) pool.push([`יש לי בדיוק ${nDiv(n)} מחלקים.`, x => nDiv(x) === nDiv(n), 2]);
    const g = Math.floor(n / 10) * 10 + 10 + rnd(0, 3) * 10, l = Math.floor((n - 1) / 10) * 10 - rnd(0, 3) * 10;
    if (g < hi) pool.push([`אני קטן מ־${g}.`, x => x < g, 1]);
    if (l > lo) pool.push([`אני גדול מ־${l}.`, x => x > l, 1]);
    const ranked = shuffle(pool).sort((a, b) => b[2] - a[2] + (Math.random() - 0.5) * 2);
    let cand = all, used = [];
    for (const c of ranked) {
      if (c[2] === 3 && c[0].startsWith('אני מתחלק') && used.filter(u => u[0].startsWith('אני מתחלק')).length >= 2) continue;
      const next = cand.filter(c[1]);
      if (next.length < cand.length) {
        used.push(c);
        cand = next;
      }
      if (cand.length === 1) break;
    }
    // drop any clue that the others already make unnecessary
    for (const c of [...used]) {
      const rest = used.filter(u => u !== c);
      if (all.filter(x => rest.every(u => u[1](x))).length === 1) used = rest;
    }
    if (cand.length !== 1 || cand[0] !== n || used.length < 3 || used.length > (L === 2 ? 4 : 5)) continue;
    const after2 = all.filter(used[0][1]).filter(used[1][1]);
    return num({
      prompt: `החשבונאי ראשוני נעל את הכספת בקוד, מספר ${L === 2 ? 'דו־ספרתי' : 'תלת־ספרתי'}. גלו את הקוד לפי הרמזים:`,
      visual: `<ul class="clues lnum-clues">${used.map(c => `<li>${c[0]}</li>`).join('')}</ul>`, answer: n,
      hints: ['התחילו מהרמז שמשאיר הכי מעט אפשרויות, רשמו את המועמדים ומחקו את מי שלא מתאים לשאר.', after2.length <= 8 ? `אחרי שני הרמזים הראשונים נשארים רק: ${list_(after2)}.` : `הקוד בין ${n - (n % 10)} ל־${n - (n % 10) + 9}.`],
      explain: `הקוד הוא ${n}. ${isPrime(n) ? 'הוא ראשוני' : M(`${n} = ${prodStr(n)}`)}, סכום הספרות שלו ${s}, והוא המספר היחיד שמתאים לכל הרמזים.`,
    });
  }
  return riddle(L);
}
const boss = {
  id: 'lnum-boss', title: 'בוס: החשבונאי ראשוני',
  intro: `<p>החשבונאי ראשוני נעל את כספת המעבדה, והקוד מתחבא בין המחלקים, הכפולות והחזקות. כדי לפתוח אותה צריך את כל מה שלמדתם בעולם הזה.</p>
    <div class="ex">"אני דו־ספרתי, מתחלק ב־4 וגם ב־9, ואני גדול מ־50."<br>מתחלק ב־4 וב־9, כלומר מתחלק ב־36: אז 36 או 72. גדול מ־50: הקוד הוא 72.</div>
    <p>קראו כל שאלה בעיון, פתרו שלב אחר שלב, ואל תאמינו לחשבונאי בלי לבדוק.</p>`,
  gen(L) {
    const t = rnd(0, 4);
    if (L === 1) {
      if (t === 0) {
        const [a, b] = pair(12, 60, 4), g = gcd(a, b);
        return nums({
          prompt: `לחשבונאי ${M(a)} מפתחות ו־${M(b)} מנעולים. הוא מחלק אותם לחבילות זהות, כמה שיותר חבילות, בלי שיישאר כלום. כמה חבילות? וכמה מפתחות בכל חבילה?`,
          fields: [['חבילות:', g], ['מפתחות בחבילה:', a / g]],
          hints: ['מספר החבילות הוא המחלק המשותף הגדול ביותר.', `המחלקים של ${Math.min(a, b)}: ${list_(divisors(Math.min(a, b)))}.`],
          explain: `המחלק המשותף הגדול ביותר של ${a} ושל ${b} הוא ${g}. בכל חבילה ${M(`${a} ÷ ${g} = ${a / g}`)} מפתחות.`,
        });
      }
      if (t === 1) {
        let a, b;
        do [a, b] = [rnd(3, 12), rnd(3, 12)];
        while (a >= b || b % a === 0 || lcm(a, b) > 72);
        return num({
          prompt: `האזעקה של החשבונאי מצפצפת כל ${a} דקות, והמצלמה שלו מצלמת כל ${b} דקות. עכשיו קרו שניהם יחד. בעוד כמה דקות יקרו שוב יחד? (אז אפשר לחמוק פנימה!)`, answer: lcm(a, b),
          hints: ['מחפשים את הכפולה המשותפת הקטנה ביותר.', `כפולות של ${b}: ${list_(mults(b, 4 * b))}...`],
          explain: `כפולות של ${b}: ${list_(mults(b, lcm(a, b)))}. הראשונה שמתחלקת ב־${a}: ${lcm(a, b)}.`,
        });
      }
      if (t === 2) {
        const s = rnd(-6, 8), d = rnd(5, 15), e = s - d;
        return numN({
          prompt: `הכספת נפתחת רק בקור. עכשיו בחדר ${deg(s)}, ומקררים אותו ב־${d} מעלות. כמה מעלות יהיו בחדר?`, answer: e,
          hints: ['קירור: יורדים במדחום.', s > 0 ? `${s} מעלות עד האפס, ועוד ${d - s} מתחתיו.` : `מ־${deg(s)} יורדים עוד ${d}.`],
          explain: M(`${nf(s)} − ${d} = ${nf(e)}`),
        });
      }
      if (t === 3) {
        let N;
        do N = 2 ** rnd(1, 4) * 3 ** rnd(0, 3) * 5 ** rnd(0, 2);
        while (N > 400 || N < 24 || groups(N).length < 2);
        const ps = [2, 3, 5], ex = ps.map(p => groups(N).find(g => g[0] === p)?.[1] || 0);
        return {
          prompt: `הקוד הוא החזקות בפירוק של ${M(N)} לגורמים ראשוניים. מלאו אותן (גורם שלא מופיע מקבל 0).`,
          widget: inputs(`<div class="lnum-sup">${M(`${N} = ${ps.map(p => `${p}<sup>${box('e' + p, 1)}</sup>`).join(' × ')}`)}</div>`), answer: Object.fromEntries(ps.map((p, i) => ['e' + p, ex[i]])),
          check: v => ps.every((p, i) => v['e' + p] === ex[i]),
          hints: ['חלקו שוב ושוב ב־2, אחר כך ב־3, ואחר כך ב־5, וספרו.', `${M(`${N} = ${prodStr(N)}`)}.`],
          explain: `${M(`${N} = ${prodStr(N)} = ${ps.map((p, i) => P(p, ex[i])).join(' × ')}`)}. (כל מספר בחזקת 0 שווה 1.)`,
        };
      }
      let ds, pos, ans;
      do {
        ds = range(4, i => (i === 0 ? rnd(1, 9) : rnd(0, 9)));
        pos = rnd(1, 3);
        ans = range(10).filter(d => +ds.map((x, i) => (i === pos ? d : x)).join('') % 9 === 0);
      } while (ans.length !== 1);
      return num({
        prompt: 'בקוד של הכספת נמחקה ספרה. ידוע שהקוד מתחלק ב־9. איזו ספרה נמחקה?', visual: sample(ds.map((x, i) => (i === pos ? '<span class="lnum-q">?</span>' : x)).join(''), 'קוד'), answer: ans[0],
        hints: ['מספר מתחלק ב־9 כשסכום הספרות שלו מתחלק ב־9.', `סכום הספרות הידועות: ${ds.reduce((s, x, i) => (i === pos ? s : s + x), 0)}. כמה חסר עד הכפולה הבאה של 9?`],
        explain: `סכום הספרות הידועות ${ds.reduce((s, x, i) => (i === pos ? s : s + x), 0)}, ועם ${ans[0]} הוא ${ds.reduce((s, x, i) => (i === pos ? s : s + x), 0) + ans[0]}, שמתחלק ב־9.`,
      });
    }
    if (L === 2) {
      if (t < 2) return riddle(2);
      if (t === 2) {
        const g = pick([6, 8, 9, 12, 14, 15, 18]);
        let m, n;
        do [m, n] = [rnd(2, 8), rnd(2, 8)];
        while (m >= n || gcd(m, n) > 1);
        const a = g * m, b = g * n, l = g * m * n;
        return nums({
          prompt: `לחשבונאי שני מספרים סודיים: ${M(a)} ו־${M(b)}. הקוד מורכב מהמחלק המשותף הגדול ביותר שלהם ומהכפולה המשותפת הקטנה ביותר שלהם.`,
          fields: [['מחלק משותף גדול ביותר:', g], ['כפולה משותפת קטנה ביותר:', l]],
          hints: [`פרקו לגורמים: ${M(`${a} = ${prodStr(a)}`)}, ${M(`${b} = ${prodStr(b)}`)}.`, `בדיקה שימושית: המכפלה של שתי התשובות שווה ל־${M(`${a} × ${b} = ${a * b}`)}.`],
          explain: `${venn(a, b)}המחלק המשותף הגדול ביותר: ${g} (האמצע). הכפולה המשותפת הקטנה ביותר: ${l} (הכול).`,
        });
      }
      if (t === 3) {
        const e = genQ(2), v = e.val;
        return {
          prompt: `הקוד הוא התוצאה של התרגיל. כתבו אותה כשבר (או כמספר שלם):<div class="expr lnum-fexpr" dir="ltr">${tokQ(e.T)}</div>`,
          widget: inputs(M(`<span class="frac fin">${box('n', 3)}${box('d', 3, true)}</span>`)), answer: { n: v.n, d: v.d },
          check: x => (x.d == null ? 1 : x.d) > 0 && x.n * v.d === v.n * (x.d == null ? 1 : x.d),
          hints: ['סוגריים, חזקות, כפל וחילוק, ובסוף חיבור וחיסור.', `השלב הראשון: ${M(tokQ(e.st[1]))}.`],
          explain: `כך פותרים לפי הסדר:${chainQ(e.st)}`,
        };
      }
      const s = rnd(-10, 5), r = rnd(2, 4), m = rnd(3, 8), e = s - r * m;
      return numN({
        prompt: `הכספת מתקררת ב־${r} מעלות בכל דקה. עכשיו היא ${deg(s)}. כמה מעלות יהיו בה בעוד ${m} דקות?`, answer: e,
        hints: [`בסך הכול היא תתקרר ב־${M(`${r} × ${m} = ${r * m}`)} מעלות.`, `${M(`${nf(s)} − ${r * m}`)}`],
        explain: M(`${nf(s)} − ${r} × ${m} = ${nf(s)} − ${r * m} = ${nf(e)}`),
      });
    }
    if (t === 0) return riddle(3);
    if (t === 1) {
      const N = rnd(30, 150), k = Math.floor(Math.sqrt(N));
      return num({
        prompt: `במסדרון של החשבונאי ${N} מבחנות סגורות במכסה, ממוספרות מ־1 עד ${N}. רובוט 1 משנה את המצב (פותח סגורה, סוגר פתוחה) של כל המבחנות. רובוט 2 משנה את המצב של כל מבחנה שנייה (2, 4, 6...). רובוט 3 של כל שלישית, וכך הלאה עד רובוט ${N}. כמה מבחנות פתוחות בסוף?`, answer: k,
        hints: ['מבחנה מספר n משנה מצב פעם אחת לכל מחלק של n. היא פתוחה בסוף אם מספר המחלקים שלה אי־זוגי.', 'למספר יש מספר אי־זוגי של מחלקים רק אם הוא מספר ריבועי (המחלקים באים בזוגות, חוץ מהשורש).'],
        explain: `פתוחות בסוף רק המבחנות שהמספר שלהן ריבועי: ${list_(range(k, i => (i + 1) ** 2))}. כלומר ${k} מבחנות.`,
      });
    }
    if (t === 2) {
      const N = rnd(20, 130), z = Math.floor(N / 5) + Math.floor(N / 25) + Math.floor(N / 125);
      return num({
        prompt: `החשבונאי כפל את כל המספרים מ־1 עד ${N}: ${M(`1 × 2 × 3 × … × ${N}`)}. בכמה אפסים מסתיימת התוצאה?`, answer: z,
        hints: [`כל 0 בסוף בא מ־${M('10 = 2 × 5')}. גורמי 2 יש בשפע, אז סופרים כמה גורמי 5 יש במכפלה.`, `כל כפולה של 5 תורמת 5 אחד, וכל כפולה של 25 תורמת עוד אחד${N >= 125 ? ', ו־125 עוד אחד' : ''}.`],
        explain: `כפולות של 5 עד ${N}: ${Math.floor(N / 5)}. כפולות של 25: ${Math.floor(N / 25)}${N >= 125 ? `. של 125: 1` : ''}. סך הכול ${z} גורמי 5, ולכן ${z} אפסים.`,
      });
    }
    if (t === 3) {
      for (;;) {
        const ms = shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((x, y) => x - y), cond = ms.map(m => [m, rnd(0, m - 1)]);
        if (cond.every(([, r]) => r === 0)) continue;
        let n = 0;
        for (let x = ms[2] + 1; x <= 600 && !n; x++) if (cond.every(([m, r]) => x % m === r)) n = x;
        if (!n) continue;
        return num({
          prompt: `כשמסדרים את המפתחות של החשבונאי ${cond.map(([m, r]) => `בשורות של ${m}, ${r === 0 ? 'לא נשאר אף מפתח' : r === 1 ? 'נשאר מפתח אחד' : `נשארים ${r} מפתחות`}`).join('; ')}. יש יותר מ־${ms[2]} מפתחות. מה המספר הקטן ביותר של מפתחות שיכול להיות?`, answer: n,
          hints: [`התחילו מהתנאי עם המספר הגדול (${ms[2]}): רשמו את המספרים שמתאימים לו, ובדקו עליהם את שאר התנאים.`, `המספרים שמתאימים לשני התנאים הראשונים חוזרים כל ${lcm(ms[0], ms[1])}.`],
          explain: `${n} מתאים: ${cond.map(([m, r]) => M(`${n} = ${m} × ${(n - r) / m}${r ? ` + ${r}` : ''}`)).join(', ')}. ואין מספר קטן ממנו שמתאים.`,
        });
      }
    }
    const k = pick([3, 4, 5, 6, 8, 9, 10, 12]);
    let n = 1;
    while (nDiv(n) !== k) n++;
    return num({
      prompt: `מהו המספר הקטן ביותר שיש לו בדיוק ${k} מחלקים?`, answer: n,
      hints: [`מספר המחלקים של ${M(`${P('p', 'a')} × ${P('q', 'b')}`)} הוא ${M('(a + 1) × (b + 1)')}. פרקו את ${k} לכפל.`, `כדי לקבל מספר קטן, תנו את החזקות הגדולות לגורמים הקטנים (2, ואחר כך 3...).`],
      explain: `${M(`${n} = ${powStr(n)}`)}, ויש לו ${k} מחלקים: ${list_(divisors(n))}.`,
    });
  },
};

export default {
  id: 'lnum', name: 'מעבדת המספרים', icon: '🔬', color: '#a78bfa', boss: 'החשבונאי ראשוני',
  tagline: 'מתחת למיקרוסקופ כל מספר מתפרק לגורמים, והחשבונאים הסתירו את המפתחות בין המחלקים.',
  challenges: [divRules, primes, tree, gcdW, lcmW, powers, temps, order, boss],
};
