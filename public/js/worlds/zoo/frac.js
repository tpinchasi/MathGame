// מתחם הפינגווינים: first fractions for grades 2–3 (halves, thirds, quarters, up to eighths).
import { rnd, pick, shuffle, range, gcd, lcm, near, M, fr, F, showFrac, h } from '../../util.js';
import { inputs, box, choice, lineSVG, numLine } from '../../widgets.js';
import { num, nums, fracAns } from '../../kit.js';

const f1 = v => +v.toFixed(1);
const rad = d => (d * Math.PI) / 180;
const NM = { 2: ['חצי', 'חצאים'], 3: ['שליש', 'שלישים'], 4: ['רבע', 'רבעים'], 5: ['חמישית', 'חמישיות'], 6: ['שישית', 'שישיות'], 7: ['שביעית', 'שביעיות'], 8: ['שמינית', 'שמיניות'], 9: ['תשיעית', 'תשיעיות'], 10: ['עשירית', 'עשיריות'] };
const one = d => NM[d][0], many = d => NM[d][1];
const parts = n => (n === 1 ? 'חלק אחד' : `${n} חלקים`);
const jumps = n => (n === 1 ? 'קפיצה אחת' : `${n} קפיצות`);
const LET = ['א', 'ב', 'ג', 'ד', 'ה'];
const PENG = ['טוקי', 'פיני', 'נוני', 'קוקו', 'פופי', 'ביבו'];
const two = arr => shuffle(arr).slice(0, 2);
const even = n => range(n + 1, i => i / n);
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const list = idx => idx.map(i => LET[i]).join(', ');
const fl = fs => fs.map(([n, d]) => F(n, d)).join(' ו־');
const cmpSign = (a, b, c, d) => ['&lt;', '=', '&gt;'][Math.sign(a * d - c * b) + 1];

// ---------- shapes ----------
// A shape is { parts: [{ d: svg path, a: share of the whole }], noun, f: noun is feminine, vb?, cls? }.
const poly = pts => 'M' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
const R = (x, y, w, hh) => poly([[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]]);
const ICE = { noun: 'משטח הקרח', f: false }, CAKE = { noun: 'עוגת הדגים', f: true };

function strips(cuts, dir = 'v') {
  return { ...ICE, parts: range(cuts.length - 1, i => {
    const a = cuts[i], b = cuts[i + 1];
    return { d: dir === 'v' ? R(10 + 100 * a, 10, 100 * (b - a), 70) : R(10, 10 + 70 * a, 100, 70 * (b - a)), a: b - a };
  }) };
}
function grid(cc, rc) {
  const ps = [];
  for (let i = 0; i + 1 < rc.length; i++)
    for (let j = 0; j + 1 < cc.length; j++)
      ps.push({ d: R(10 + 100 * cc[j], 10 + 70 * rc[i], 100 * (cc[j + 1] - cc[j]), 70 * (rc[i + 1] - rc[i])), a: (cc[j + 1] - cc[j]) * (rc[i + 1] - rc[i]) });
  return { ...ICE, parts: ps };
}
function pie(angles) {
  let t = -90;
  const pt = g => `${f1(60 + 40 * Math.cos(rad(g)))} ${f1(45 + 40 * Math.sin(rad(g)))}`;
  return { ...CAKE, cls: 'pie', parts: angles.map(g => {
    const d = `M60 45L${pt(t)}A40 40 0 ${g > 180 ? 1 : 0} 1 ${pt(t + g)}Z`;
    t += g;
    return { d, a: g / 360 };
  }) };
}
const pieN = n => pie(range(n, () => 360 / n));
// a round cake cut by one straight line that misses the centre
function chord(o) {
  const dy = Math.sqrt(1600 - o * o), x = f1(60 + o), y1 = f1(45 - dy), y2 = f1(45 + dy);
  const small = (1600 * Math.acos(Math.abs(o) / 40) - Math.abs(o) * dy) / (1600 * Math.PI), right = o > 0 ? small : 1 - small;
  return { ...CAKE, parts: [
    { d: `M${x} ${y1}A40 40 0 ${o > 0 ? 1 : 0} 0 ${x} ${y2}Z`, a: 1 - right },
    { d: `M${x} ${y1}A40 40 0 ${o > 0 ? 0 : 1} 1 ${x} ${y2}Z`, a: right },
  ] };
}
function tri(t) {
  const A = [60, 8], B = [12, 82], C = [108, 82], P = [12 + 96 * t, 82];
  return { noun: 'הדגל', f: false, parts: [{ d: poly([A, B, P]), a: t }, { d: poly([A, P, C]), a: 1 - t }] };
}
function diag(n) {
  const TL = [25, 10], TR = [95, 10], BR = [95, 80], BL = [25, 80], C = [60, 45];
  return { noun: 'קוביית הקרח', f: true, parts: n === 2
    ? [{ d: poly([TL, TR, BR]), a: 0.5 }, { d: poly([TL, BR, BL]), a: 0.5 }]
    : [[TL, TR], [TR, BR], [BR, BL], [BL, TL]].map(([p, q]) => ({ d: poly([p, q, C]), a: 0.25 })) };
}
// half of the floe, and the other half cut into k pieces
function halfSplit(k, dir) {
  return { ...ICE, parts: dir === 'v'
    ? [{ d: R(10, 10, 50, 70), a: 0.5 }, ...range(k, i => ({ d: R(60, 10 + (70 * i) / k, 50, 70 / k), a: 0.5 / k }))]
    : [{ d: R(10, 10, 100, 35), a: 0.5 }, ...range(k, i => ({ d: R(10 + (100 * i) / k, 45, 100 / k, 35), a: 0.5 / k }))] };
}
// a long strip of ice, good for comparing two fractions one above the other
const bar = n => ({ ...ICE, vb: '0 0 240 56', cls: 'bar', parts: range(n, i => ({ d: R(4 + (232 * i) / n, 4, 232 / n, 48), a: 1 / n })) });

const GRIDS = { 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3], 10: [5, 2], 12: [4, 3] };
function eqShape(n, kinds = 'vhpgdt') {
  const o = [];
  if (kinds.includes('v')) o.push(() => strips(even(n)));
  if (kinds.includes('h') && n <= 6) o.push(() => strips(even(n), 'h'));
  if (kinds.includes('p')) o.push(() => pieN(n));
  if (kinds.includes('g') && GRIDS[n]) o.push(() => grid(even(GRIDS[n][0]), even(GRIDS[n][1])));
  if (kinds.includes('d') && (n === 2 || n === 4)) o.push(() => diag(n));
  if (kinds.includes('t') && n === 2) o.push(() => tri(0.5));
  return pick(o)();
}
const maybeFlip = cuts => (Math.random() < 0.5 ? cuts : cuts.map(c => 1 - c).reverse());
function uneqShape(n) {
  const o = {
    2: [() => strips([0, pick([0.3, 0.35, 0.65, 0.7]), 1], pick('vh')), () => chord(pick([-16, -13, 13, 16])), () => tri(pick([0.25, 0.3, 0.7, 0.75])), () => pie(pick([[120, 240], [240, 120], [100, 260]]))],
    3: [() => strips(maybeFlip(pick([[0, 0.2, 0.55, 1], [0, 0.5, 0.75, 1], [0, 0.25, 0.5, 1], [0, 0.15, 0.45, 1]])), pick('vh')), () => halfSplit(2, pick('vh')), () => pie(pick([[180, 90, 90], [90, 120, 150], [60, 120, 180]]))],
    4: [() => grid([0, pick([0.3, 0.35, 0.65, 0.7]), 1], [0, pick([0.35, 0.4, 0.6, 0.65]), 1]), () => strips(maybeFlip(pick([[0, 0.15, 0.4, 0.7, 1], [0, 0.25, 0.5, 0.65, 1], [0, 0.1, 0.3, 0.6, 1]]))), () => halfSplit(3, pick('vh')), () => pie(pick([[60, 120, 60, 120], [90, 90, 60, 120], [45, 135, 90, 90]]))],
  }[n];
  return pick(o)();
}
const shareOf = (s, on) => [...on].reduce((t, i) => t + s.parts[i].a, 0);
const svgOf = (s, on = new Set(), k = 0) =>
  `<svg viewBox="${s.vb || '0 0 120 90'}" class="zfrac-shape ${s.cls || ''}" data-k="${k}">${s.parts.map((p, i) => `<path d="${p.d}" data-i="${i}"${on.has(i) ? ' class="on"' : ''}/>`).join('')}</svg>`;
const firstN = n => new Set(range(n));
const cutIn = s => (s.f ? 'מחולקת' : 'מחולק');
const ofIt = s => (s.f ? 'ממנה' : 'ממנו');
// several wholes side by side
const row = (shapes, ons = []) => `<div class="zfrac-row" dir="ltr">${shapes.map((s, i) => svgOf(s, ons[i])).join('')}</div>`;
// w whole shapes and one more with r of its d parts coloured
const wholes = (w, r, d, kind) => {
  const mk = () => (kind === 'p' ? pieN(d) : strips(even(d)));
  return row(range(w + (r ? 1 : 0), mk), range(w + (r ? 1 : 0), i => firstN(i < w ? d : r)));
};

// ---------- widgets ----------
// Tap parts of one or more shapes to colour them. value() is the number of coloured parts.
function paint(shapes) {
  const on = shapes.map(() => new Set());
  let locked = false;
  const pics = h('div', { class: 'zfrac-paint' + (shapes.length > 1 ? ' multi' : ''), html: shapes.map((s, k) => svgOf(s, undefined, k)).join('') });
  const sync = () => pics.querySelectorAll('path').forEach(p => p.classList.toggle('on', on[+p.parentNode.dataset.k].has(+p.dataset.i)));
  pics.addEventListener('click', e => {
    const p = e.target.closest && e.target.closest('path');
    if (locked || !p) return;
    const s = on[+p.parentNode.dataset.k], i = +p.dataset.i;
    s.has(i) ? s.delete(i) : s.add(i);
    sync();
  });
  const count = () => on.reduce((t, s) => t + s.size, 0);
  return {
    el: h('div', { class: 'zfrac-pw' }, pics, h('button', { type: 'button', class: 'btn tiny', onclick: () => { if (!locked) { on.forEach(s => s.clear()); sync(); } } }, '↺ ניקוי')),
    value: () => count() || null,
    set(n) {
      on.forEach(s => s.clear());
      shapes.forEach((s, k) => s.parts.forEach((_, i) => n > 0 && (on[k].add(i), n--)));
      sync();
    },
    lock() {
      locked = true;
      pics.classList.add('locked');
    },
  };
}

// Fish to tap. rows: number of fish in each row; peng puts a penguin at the start of each row.
function fishPick(rows, { peng = false } = {}) {
  const on = new Set(), btns = [];
  let locked = false;
  const el = h('div', { class: 'zfrac-fishes' + (peng ? ' grouped' : ''), dir: 'ltr' },
    rows.map(n => h('div', { class: 'zfrac-frow' }, peng ? h('span', { class: 'zfrac-peng' }, '🐧') : null, range(n, () => {
      const i = btns.length;
      const b = h('button', { type: 'button', class: 'zfrac-fish', 'aria-label': 'דג', onclick: () => {
        if (locked) return;
        on.has(i) ? on.delete(i) : on.add(i);
        b.classList.toggle('on', on.has(i));
      } }, '🐟');
      btns.push(b);
      return b;
    }))));
  return {
    el,
    value: () => on.size || null,
    set(n) {
      on.clear();
      btns.forEach((b, i) => {
        if (i < n) on.add(i);
        b.classList.toggle('on', i < n);
      });
    },
    lock() {
      locked = true;
      el.classList.add('locked');
    },
  };
}

// Tap the items in order; value() is the list of item indices once all are placed.
function orderTap(items) {
  let seq = [], locked = false;
  const slots = h('div', { class: 'zfrac-slots', dir: 'ltr' }), pool = h('div', { class: 'zfrac-pool', dir: 'ltr' });
  const draw = () => {
    slots.innerHTML = pool.innerHTML = '';
    items.forEach((_, k) => slots.append(seq[k] == null ? h('span', { class: 'zfrac-slot' })
      : h('button', { type: 'button', class: 'zfrac-tile in', html: items[seq[k]], onclick: () => { if (!locked) { seq.splice(k, 1); draw(); } } })));
    items.forEach((t, i) => seq.includes(i) || pool.append(h('button', { type: 'button', class: 'zfrac-tile', html: t, onclick: () => { if (!locked) { seq.push(i); draw(); } } })));
  };
  draw();
  return {
    el: h('div', { class: 'zfrac-order' }, slots, h('div', { class: 'zfrac-ends', dir: 'ltr' }, h('span', {}, 'הכי קטן'), h('span', {}, 'הכי גדול')), pool,
      h('p', { class: 'tip' }, 'לחצו על השברים לפי הסדר. לחיצה על שבר שכבר בשורה מחזירה אותו.')),
    value: () => (seq.length === items.length ? [...seq] : null),
    set(a) {
      seq = [...a];
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// choice() with several answers returns [] when nothing is chosen; the engine wants null then.
const multi = w => ({ ...w, value: () => (w.value().length ? w.value() : null) });
const optPic = (s, on, i) => `${svgOf(s, on)}<span class="zfrac-lbl">${LET[i]}</span>`;

// ---------- 1. equal parts ----------
const equalParts = {
  id: 'zfrac-equal', title: 'חלקים שווים',
  intro: `<p>שבר מתחיל ב<b>חלקים שווים</b>: כל החלקים באותו גודל בדיוק.</p>
    <div class="ex"><div class="zfrac-ex"><figure>${svgOf(strips(even(2)))}<figcaption>✔ שני חצאים</figcaption></figure><figure>${svgOf(strips([0, 0.3, 1]))}<figcaption>✘ לא חצאים</figcaption></figure></div>
    בשני המשטחים יש 2 חלקים. רק בראשון הם שווים, ולכן רק הוא מחולק ל<b>חצאים</b>.</div>
    <p>לחצו על הצורה הנכונה. כשכתוב "כל הצורות", אפשר לבחור יותר מאחת.</p>`,
  gen(L) {
    if (L === 1) {
      const n = pick([2, 2, 3, 4, 4]), m = pick([2, 3, 4].filter(x => x !== n));
      const opts = shuffle([{ s: eqShape(n), ok: true }, { s: uneqShape(n), why: 'uneq' }, { s: Math.random() < 0.5 ? eqShape(m) : uneqShape(m), why: 'count' }]);
      const ans = opts.findIndex(o => o.ok), bad = opts.findIndex(o => o.why === 'uneq'), cnt = opts.findIndex(o => o.why === 'count');
      return {
        prompt: `איזו צורה מחולקת ל<b>${many(n)}</b>, כלומר ל־${n} חלקים שווים?`,
        widget: choice(opts.map((o, i) => optPic(o.s, undefined, i)), { cols: 3, cls: 'zfrac-pick' }), answer: ans, check: v => v === ans,
        hints: [`ספרו את החלקים בכל צורה. צריך בדיוק ${n}.`, `בצורה ${LET[bad]} יש ${n} חלקים, אבל הם לא באותו גודל.`],
        explain: `בצורה ${LET[ans]} יש ${n} חלקים, וכולם באותו גודל. בצורה ${LET[bad]} החלקים לא שווים, ובצורה ${LET[cnt]} יש ${m} חלקים.`,
      };
    }
    if (L === 2) {
      let opts;
      do {
        const k = rnd(1, 3);
        opts = shuffle(range(4, i => (i < k ? { s: eqShape(pick([2, 3, 4, 5, 6, 8])), ok: true } : { s: uneqShape(pick([2, 3, 4])), ok: false })));
      } while (new Set(opts.map(o => o.s.parts.map(p => p.d).join())).size < 4);
      const ans = opts.flatMap((o, i) => (o.ok ? [i] : [])), no = opts.flatMap((o, i) => (o.ok ? [] : [i]));
      return {
        prompt: 'סמנו את <b>כל</b> הצורות שמחולקות לחלקים שווים.',
        widget: multi(choice(opts.map((o, i) => optPic(o.s, undefined, i)), { multi: true, cols: 2, cls: 'zfrac-pick' })),
        answer: ans, check: v => sameSet(v, ans),
        wrongMsg: v => (v.some(i => !opts[i].ok) ? 'באחת הצורות שבחרתם החלקים לא שווים.' : 'יש עוד צורה עם חלקים שווים.'),
        hints: ['בדקו כל צורה בנפרד: האם כל החלקים בה באותו גודל בדיוק?', ans.length === 1 ? 'יש כאן רק צורה אחת כזאת.' : `יש כאן ${ans.length} צורות כאלה.`],
        explain: `${ans.map(i => `בצורה ${LET[i]} יש ${opts[i].s.parts.length} חלקים שווים.`).join(' ')} ${no.length === 1 ? 'בצורה' : 'בצורות'} ${list(no)} החלקים לא באותו גודל.`,
      };
    }
    // level 3: in which pictures is exactly 1/N coloured?
    const N = pick([2, 3, 4]);
    const GOOD = [
      () => ({ s: eqShape(N), on: new Set([rnd(0, N - 1)]), why: `${N} חלקים שווים, וחלק אחד צבוע.` }),
      () => {
        const [c, r] = pick({ 2: [[2, 2], [3, 2], [4, 2]], 3: [[3, 2], [3, 3]], 4: [[4, 2], [4, 3]] }[N]), T = c * r, k = T / N;
        return { s: grid(even(c), even(r)), on: new Set(shuffle(range(T)).slice(0, k)), why: `${k} משבצות צבועות מתוך ${T}, ו־${M(`${T} ÷ ${N} = ${k}`)}.` };
      },
      () => {
        const s = eqShape(2 * N, 'vpg'), i = rnd(0, 2 * N - 1);
        return { s, on: new Set([i, (i + 1 + rnd(0, 2 * N - 2)) % (2 * N)]), why: `${2 * N} חלקים שווים ו־2 צבועים: ${M(`${fr(2, 2 * N)} = ${fr(1, N)}`)}.` };
      },
    ];
    const BAD = [
      () => {
        const s = uneqShape(N), ok = range(s.parts.length).filter(i => Math.abs(s.parts[i].a - 1 / N) > 0.02);
        return { s, on: new Set([pick(ok)]), why: `יש ${s.parts.length} חלקים, אבל הם לא שווים.` };
      },
      () => {
        const m = pick([2, 3, 4, 5, 6].filter(x => x !== N));
        return { s: eqShape(m), on: new Set([rnd(0, m - 1)]), why: `צבוע ${F(1, m)}.` };
      },
      () => {
        const [c, r] = pick({ 2: [[3, 2], [4, 2]], 3: [[3, 2], [3, 3]], 4: [[4, 2], [4, 3]] }[N]), T = c * r, k = T / N + pick([-1, 1]);
        return { s: grid(even(c), even(r)), on: new Set(shuffle(range(T)).slice(0, k)), why: `${k} משבצות צבועות מתוך ${T}, אבל ${F(1, N)} מתוך ${T} הוא ${T / N}.` };
      },
    ];
    let opts;
    do {
      const k = rnd(1, 3);
      opts = shuffle(range(4, i => pick(i < k ? GOOD : BAD)()));
    } while (new Set(opts.map(o => o.s.parts.map(p => p.d).join() + [...o.on].sort())).size < 4);
    opts.forEach(o => (o.ok = near(shareOf(o.s, o.on), 1 / N)));
    const ans = opts.flatMap((o, i) => (o.ok ? [i] : []));
    return {
      prompt: `באילו צורות צבוע בדיוק ${F(1, N)}? סמנו את כולן.`,
      widget: multi(choice(opts.map((o, i) => optPic(o.s, o.on, i)), { multi: true, cols: 2, cls: 'zfrac-pick' })),
      answer: ans, check: v => sameSet(v, ans),
      hints: [`${F(1, N)} פירושו חלק אחד מתוך ${N} חלקים <b>שווים</b>. בדקו שהחלקים באמת שווים.`, `בצורה עם משבצות קטנות, ספרו את כל המשבצות ואת הצבועות. למשל, 2 משבצות מתוך 8 הן ${F(1, 4)}.`, ans.length === 1 ? 'יש כאן רק צורה אחת כזאת.' : `יש כאן ${ans.length} צורות כאלה.`],
      explain: opts.map((o, i) => `<b>${LET[i]}</b> ${o.ok ? '✔' : '✘'} ${o.why}`).join('<br>'),
    };
  },
};

// ---------- 2. colour a fraction ----------
const colour = {
  id: 'zfrac-paint', title: 'צובעים שבר',
  intro: `<p>במספר שלמטה (ה<b>מכנה</b>) כתוב לכמה חלקים שווים חילקו את השלם. במספר שלמעלה (ה<b>מונה</b>) כתוב כמה חלקים צובעים.</p>
    <div class="ex"><div class="zfrac-ex">${svgOf(strips(even(4)), firstN(3))}</div>${F(3, 4)}: מחלקים ל־4 חלקים שווים וצובעים 3 מהם.</div>
    <p>לחצו על חלק כדי לצבוע אותו, ולחצו שוב כדי למחוק.</p>`,
  gen(L) {
    if (L === 1 || (L === 2 && Math.random() < 0.5)) {
      const d = L === 1 ? pick([2, 3, 4, 4]) : pick([3, 4, 5, 6, 8]), n = rnd(1, d - 1), s = eqShape(d, L === 1 ? 'vhpgdt' : 'vpg');
      return {
        prompt: `צבעו ${F(n, d)} מ${s.noun}.`, widget: paint([s]), answer: n, check: v => v === n,
        hints: [`המכנה הוא ${d}: ${s.noun} ${cutIn(s)} ל־${d} חלקים שווים.`, `המונה הוא ${n}: צבעו ${parts(n)}.`],
        explain: `${s.noun} ${cutIn(s)} ל־${d} חלקים שווים (${many(d)}), וצובעים ${parts(n)}.`,
      };
    }
    if (L === 2) {
      const [n, d, p] = pick([[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 4, 8], [3, 4, 8], [1, 3, 6], [2, 3, 6], [1, 3, 9], [2, 3, 9], [1, 2, 10], [1, 4, 12], [3, 4, 12]]), k = p / d, s = eqShape(p, 'vpg');
      return {
        prompt: `${s.noun} ${cutIn(s)} ל־${p} חלקים. צבעו ${F(n, d)} ${ofIt(s)}.`, widget: paint([s]), answer: n * k, check: v => v === n * k,
        hints: [`${F(1, d)} הוא ${one(d)}: אחד מתוך ${d} חלקים שווים. כמה מהחלקים הקטנים יש ב${one(d)}?`, `${M(`${p} ÷ ${d} = ${k}`)}, כלומר ב${one(d)} יש ${k} חלקים. צבעו ${n} פעמים ${k}.`],
        explain: `${F(1, d)} הוא ${k} חלקים, כי ${M(`${p} ÷ ${d} = ${k}`)}. לכן ${F(n, d)} הוא ${M(`${n} × ${k} = ${n * k}`)} חלקים.`,
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const d = pick([3, 4, 5, 6, 8]), n = rnd(1, d - 1), m = d <= 4 ? pick([1, 2]) : 1, ans = (d - n) * m;
      return {
        prompt: `הפינגווינים אכלו ${F(n, d)} מעוגת הדגים. צבעו את החלק של העוגה שנשאר.`, widget: paint([pieN(d * m)]), answer: ans, check: v => v === ans,
        hints: [`העוגה כולה היא ${F(d, d)}. כמה ${many(d)} נשארו?`, `נשארו ${F(d - n, d)} מהעוגה${m > 1 ? `, ובכל ${one(d)} יש ${m} חלקים` : ''}.`],
        explain: `${M(`${fr(d, d)} − ${fr(n, d)} = ${fr(d - n, d)}`)}. ${m > 1 ? `בכל ${one(d)} יש ${m} חלקים, לכן צובעים ${M(`${d - n} × ${m} = ${ans}`)} חלקים.` : `צובעים ${parts(d - n)}.`}`,
      };
    }
    if (t === 1) {
      // a part of a part: colour half of a half and so on
      const [c, e, a, b, phrase] = pick([[1, 2, 1, 2, 'חצי מחצי'], [1, 3, 1, 2, 'שליש מחצי'], [1, 4, 1, 2, 'רבע מחצי'], [1, 2, 1, 4, 'חצי מרבע'], [1, 2, 3, 4, 'חצי מ־3 רבעים'], [1, 2, 2, 3, 'חצי מ־2 שלישים'], [2, 3, 1, 2, 'שני שלישים מחצי'], [1, 3, 3, 4, 'שליש מ־3 רבעים']]);
      const p = pick([6, 8, 12].filter(q => (q * a) % b === 0 && ((q * a) / b) * c % e === 0)), first = (p * a) / b, ans = (first * c) / e;
      return {
        prompt: `משטח הקרח ${cutIn(ICE)} ל־${p} חלקים שווים. צבעו <b>${phrase}</b> של המשטח.`, widget: paint([grid(even(GRIDS[p][0]), even(GRIDS[p][1]))]), answer: ans, check: v => v === ans,
        hints: [`קודם מצאו כמה חלקים הם ${F(a, b)} מהמשטח.`, `${F(a, b)} מהמשטח הם ${first} חלקים. עכשיו קחו ${F(c, e)} מתוכם.`],
        explain: `${F(a, b)} מהמשטח הם ${first} חלקים, ו־${F(c, e)} מתוך ${first} הם ${ans}. כלומר ${phrase} הם ${F(ans, p)}${gcd(ans, p) > 1 ? ` = ${showFrac(ans, p)}` : ''} מהמשטח.`,
      };
    }
    const [lo, hi, p] = pick([[[1, 2], [3, 4], 8], [[1, 2], [3, 4], 12], [[1, 3], [1, 2], 12], [[1, 4], [1, 2], 8], [[1, 4], [1, 2], 12], [[1, 2], [2, 3], 12], [[1, 3], [2, 3], 6], [[1, 4], [3, 4], 8], [[1, 2], [5, 6], 12]]);
    const a = (lo[0] * p) / lo[1], b = (hi[0] * p) / hi[1], ok = range(b - a - 1, i => a + 1 + i);
    const s = eqShape(p, 'pg');
    return {
      prompt: `צבעו <b>יותר</b> מ־${F(...lo)} מ${s.noun}, אבל <b>פחות</b> מ־${F(...hi)} ${ofIt(s)}.`, widget: paint([s]), answer: ok[0], check: v => ok.includes(v),
      hints: [`כמה חלקים הם ${F(...lo)}? וכמה חלקים הם ${F(...hi)}?`, `${F(...lo)} הם ${a} חלקים, ו־${F(...hi)} הם ${b} חלקים. צריך לצבוע מספר חלקים שביניהם.`],
      explain: `${F(...lo)} מתוך ${p} החלקים הם ${a} חלקים, ו־${F(...hi)} הם ${b} חלקים. לכן צובעים ${ok.length === 1 ? `${ok[0]} חלקים` : `${ok.join(' או ')} חלקים`}.`,
    };
  },
};

// ---------- 3. a fraction of a set ----------
const share = {
  id: 'zfrac-share', title: 'חלק מכמות',
  intro: `<p>כדי למצוא ${F(1, 3)} מכמות, מחלקים אותה ל־3 קבוצות שוות ולוקחים קבוצה אחת.</p>
    <div class="ex">${F(1, 3)} מ־12 דגים: ${M('12 ÷ 3 = 4')}, כלומר 4 דגים.<br>${F(2, 3)} מ־12 דגים הם 2 קבוצות כאלה: ${M('4 + 4 = 8')} דגים.</div>
    <p>לחצו על דג כדי לבחור אותו, ולחצו שוב כדי לבטל.</p>`,
  gen(L) {
    if (L === 1) {
      const d = pick([2, 3, 4]), k = rnd(2, d === 4 ? 5 : 6), N = d * k;
      return {
        prompt: `${d} פינגווינים מתחלקים שווה בשווה ב־${N} דגים. כל אחד מקבל ${F(1, d)} מהדגים. לחצו על הדגים של פינגווין אחד.`,
        widget: fishPick(range(d, () => k), { peng: true }), answer: k, check: v => v === k,
        hints: [`לכל פינגווין יש שורה של דגים. כמה דגים בשורה אחת?`, `${M(`${N} ÷ ${d} = ${k}`)}. בחרו ${k} דגים.`],
        explain: `${N} דגים ל־${d} קבוצות שוות: בכל קבוצה ${k} דגים, כי ${M(`${N} ÷ ${d} = ${k}`)}. לכן ${F(1, d)} מ־${N} הוא ${k}.`,
      };
    }
    if (L === 2) {
      let d, k, n;
      do {
        d = pick([3, 4, 5, 6, 8]);
        k = rnd(2, Math.floor(24 / d));
        n = rnd(2, d - 1);
      } while (d * k < 8);
      const N = d * k, w = [6, 5, 4].find(x => N % x === 0 && x !== k) || 6;
      return {
        prompt: `השומרת נותנת לפינגווין ${F(n, d)} מ־${N} הדגים. לחצו על הדגים שהוא מקבל.`,
        widget: fishPick(range(Math.ceil(N / w), i => Math.min(w, N - i * w))), answer: n * k, check: v => v === n * k,
        hints: [`מצאו קודם כמה זה ${F(1, d)} מ־${N}.`, `${F(1, d)} מ־${N} הוא ${k}, כי ${M(`${N} ÷ ${d} = ${k}`)}. כמה זה ${n} פעמים ${k}?`],
        explain: `${F(1, d)} מ־${N}: ${M(`${N} ÷ ${d} = ${k}`)}. ${F(n, d)} הם ${n} קבוצות כאלה: ${M(`${n} × ${k} = ${n * k}`)}.`,
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const [x, y] = two([2, 3, 4, 6]), l = lcm(x, y), N = l * rnd(Math.ceil(12 / l), Math.floor(48 / l)), ans = N - N / x - N / y;
      return num({
        prompt: `לפינגווין היו ${N} דגים. הוא נתן ${F(1, x)} מהם לאחיו, ו־${F(1, y)} מהם לאחותו. כמה דגים נשארו לו?`, answer: ans,
        hints: [`חשבו כל חלק בנפרד: כמה זה ${F(1, x)} מ־${N}? וכמה זה ${F(1, y)} מ־${N}?`, `לאח: ${M(`${N} ÷ ${x} = ${N / x}`)}. לאחות: ${M(`${N} ÷ ${y} = ${N / y}`)}.`],
        explain: `לאח ${N / x} דגים ולאחות ${N / y} דגים. נשארו ${M(`${N} − ${N / x} − ${N / y} = ${ans}`)}.`,
      });
    }
    if (t === 1) {
      // the bigger denominator wins, because it is a part of a bigger amount
      const [A, B] = two(PENG), a = pick([3, 4, 5, 6]), b = pick([2, 3].filter(x => x < a)), p = rnd(3, Math.floor(40 / a)), q = rnd(1, Math.min(p - 1, 8)), X = a * p, Y = b * q;
      return num({
        prompt: `${A} קיבל ${F(1, a)} מ־${X} דגים. ${B} קיבל ${F(1, b)} מ־${Y} דגים. בכמה דגים קיבל ${A} יותר מ${B}?`, answer: p - q,
        hints: ['חשבו קודם כמה דגים קיבל כל אחד.', `${A}: ${M(`${X} ÷ ${a} = ${p}`)}. ${B}: ${M(`${Y} ÷ ${b} = ${q}`)}.`],
        explain: `${A} קיבל ${p} דגים ו${B} קיבל ${q}, ו־${M(`${p} − ${q} = ${p - q}`)}. ל${A} יש שבר קטן יותר, אבל מכמות גדולה יותר.`,
      });
    }
    let d, n, k;
    do {
      d = pick([3, 4, 5, 6]);
      n = rnd(1, d - 1);
      k = rnd(2, Math.floor(48 / d));
    } while ((n * k) % 2 || d * k < 12);
    const N = d * k, blue = n * k;
    return num({
      prompt: `בדלי יש ${N} דגים. ${F(n, d)} מהדגים כחולים, וחצי מהדגים הכחולים קטנים. כמה דגים כחולים קטנים יש בדלי?`, answer: blue / 2,
      hints: ['פתרו בשני שלבים: קודם מצאו כמה דגים כחולים יש.', `כחולים: ${M(`${N} ÷ ${d} × ${n} = ${blue}`)}. עכשיו מצאו חצי מ־${blue}.`],
      explain: `כחולים: ${M(`${N} ÷ ${d} = ${k}`)}, ו־${M(`${n} × ${k} = ${blue}`)}. כחולים קטנים: ${M(`${blue} ÷ 2 = ${blue / 2}`)}.`,
    });
  },
};

// ---------- 4. the whole from a part ----------
// d boxes, the first n coloured and labelled together, the whole marked with ?
function model(d, n, label) {
  const w = 280 / d;
  let s = '<svg viewBox="0 0 300 108" class="zfrac-model"><path d="M10 30V22H290V30" class="br"/><text x="150" y="16" class="lb">?</text>';
  for (let i = 0; i < d; i++) s += `<rect x="${f1(10 + i * w)}" y="36" width="${f1(w)}" height="34"${i < n ? ' class="on"' : ''}/>`;
  return s + `<path d="M10 76V84H${f1(10 + n * w)}V76" class="br"/><text x="${f1(10 + (n * w) / 2)}" y="103" class="lb">${label}</text></svg>`;
}
const buckets = (d, k, icon) =>
  `<div class="zfrac-bk" dir="ltr">${range(d, i => `<div class="zfrac-b${i ? '' : ' known'}"><small>${F(1, d)}</small><span>${i ? '?' : icon.repeat(k)}</span></div>`).join('')}</div>`;
const whole = {
  id: 'zfrac-whole', title: 'מוצאים את השלם',
  intro: `<p>אם יודעים כמה יש בחלק אחד, אפשר למצוא את השלם: השלם בנוי מכל החלקים השווים.</p>
    <div class="ex">${F(1, 4)} מהדגים הם 3 דגים. בשלם יש 4 רבעים, לכן יש ${M('4 × 3 = 12')} דגים.</div>
    <div class="ex">${F(2, 3)} מהדגים הם 8 דגים. שני שלישים הם 8, אז שליש אחד הוא ${M('8 ÷ 2 = 4')}, ובשלם ${M('3 × 4 = 12')} דגים.</div>`,
  gen(L) {
    if (L === 1) {
      const d = pick([2, 3, 4]), k = rnd(2, 6), N = d * k, adds = M(`${range(d, () => k).join(' + ')} = ${N}`);
      const fish = Math.random() < 0.6;
      return num({
        prompt: fish ? `פינגווין אכל ${F(1, d)} מהדגים שלו. זה ${k} דגים. כמה דגים היו לו בהתחלה?` : `${F(1, d)} מהפינגווינים במתחם הם גוזלים. יש ${k} גוזלים. כמה פינגווינים יש במתחם?`,
        visual: buckets(d, k, fish ? '🐟' : '🐧'), answer: N,
        hints: [`בשלם יש ${d} ${many(d)}, ובכל ${one(d)} יש ${k}.`, `חברו: ${M(range(d, () => k).join(' + '))}.`],
        explain: `${d} ${many(d)}, ובכל אחד ${k}: ${adds}. אפשר גם בכפל: ${M(`${d} × ${k} = ${N}`)}.`,
      });
    }
    if (L === 2) {
      if (Math.random() < 0.4) {
        const d = rnd(5, 8), k = rnd(3, 9);
        return num({
          prompt: `${F(1, d)} מהדגים במחסן הם ${k} דגים. כמה דגים יש במחסן?`, visual: model(d, 1, k), answer: d * k,
          hints: [`בשלם יש ${d} ${many(d)}.`, `${d} פעמים ${k}.`],
          explain: `${d} חלקים, ובכל אחד ${k} דגים: ${M(`${d} × ${k} = ${d * k}`)}.`,
        });
      }
      const d = rnd(3, 8), n = rnd(2, d - 1), k = rnd(2, 6);
      return num({
        prompt: `${F(n, d)} מהפינגווינים במתחם הם ${n * k} פינגווינים. כמה פינגווינים יש במתחם?`, visual: model(d, n, n * k), answer: d * k,
        hints: [`${n * k} פינגווינים הם ${n} חלקים מתוך ${d}. כמה פינגווינים בחלק אחד?`, `בחלק אחד: ${M(`${n * k} ÷ ${n} = ${k}`)}. בשלם יש ${d} חלקים.`],
        explain: `חלק אחד: ${M(`${n * k} ÷ ${n} = ${k}`)}. השלם: ${M(`${d} × ${k} = ${d * k}`)}.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const d = rnd(3, 8), n = rnd(1, d - 1), k = rnd(2, 6), r = (d - n) * k;
      return num({
        prompt: `${F(n, d)} מהפינגווינים שוחים, ו־${r} פינגווינים עומדים על הקרח. כמה פינגווינים יש בסך הכול?`, answer: d * k,
        hints: ['איזה חלק מהפינגווינים עומדים על הקרח?', `${F(d - n, d)} מהפינגווינים הם ${r}. כמה זה ${F(1, d)}?`],
        explain: `על הקרח עומדים ${F(d - n, d)} מהפינגווינים. ${F(1, d)}: ${M(`${r} ÷ ${d - n} = ${k}`)}. כולם: ${M(`${d} × ${k} = ${d * k}`)}.`,
      });
    }
    if (t === 1) {
      const [a, b] = pick([[2, 4], [2, 3], [3, 6], [4, 8]]), l = lcm(a, b), diff = rnd(2, 8), T = l * diff;
      return num({
        prompt: `${F(1, a)} מהדגים הם ${diff} דגים יותר מ־${F(1, b)} מהדגים. כמה דגים יש בסך הכול?`, answer: T,
        hints: [`חלקו את הדגים ל־${l} חלקים שווים: ${F(1, a)} הוא ${l / a} חלקים, ו־${F(1, b)} הוא ${l / b} ${l / b === 1 ? 'חלק' : 'חלקים'}.`, `ההפרש ביניהם הוא חלק אחד מתוך ${l}, והוא ${diff} דגים.`],
        explain: `${F(1, a)} = ${F(l / a, l)} ו־${F(1, b)} = ${F(l / b, l)}, וההפרש הוא ${F(1, l)}. ${F(1, l)} מהדגים הוא ${diff}, לכן יש ${M(`${l} × ${diff} = ${T}`)} דגים.`,
      });
    }
    const d = rnd(3, 8), m = rnd(2, d - 1), k = rnd(2, 7);
    let j;
    do j = rnd(1, d); while (j === m);
    return num({
      prompt: `${F(m, d)} מהדגים הם ${m * k} דגים. כמה דגים הם ${F(j, d)} מהדגים?`, answer: j * k,
      hints: [`מצאו קודם כמה זה ${F(1, d)} מהדגים.`, `${F(1, d)} מהדגים: ${M(`${m * k} ÷ ${m} = ${k}`)}.`],
      explain: `${F(1, d)}: ${M(`${m * k} ÷ ${m} = ${k}`)}. ${F(j, d)}: ${M(`${j} × ${k} = ${j * k}`)}.`,
    });
  },
};

// ---------- 5. comparing unit fractions ----------
const barsOf = (...fs) => `<div class="zfrac-bars">${fs.map(([n, d]) => `<div dir="ltr">${M(fr(n, d))}${svgOf(bar(d), firstN(n))}</div>`).join('')}</div>`;
const signs = () => choice(['&lt;', '=', '&gt;'], { cols: 3, cls: 'signs' });
const pair = (a, b, c, d) => M(`<span class="big">${fr(a, b)}<span class="qm">?</span>${fr(c, d)}</span>`);
const compare = {
  id: 'zfrac-compare', title: 'מי קיבל יותר?',
  intro: `<p>כשמחלקים את אותו שלם ל<b>יותר</b> חלקים, כל חלק <b>קטן</b> יותר.</p>
    <div class="ex">${barsOf([1, 2], [1, 4])}${F(1, 2)} גדול מ־${F(1, 4)}: ${M(`${fr(1, 2)} &gt; ${fr(1, 4)}`)}</div>
    <p>הסימן &gt; או &lt; פתוח תמיד לצד של המספר הגדול.</p>`,
  gen(L) {
    if (L === 1) {
      const [a, b] = two([2, 3, 4]), [A, B] = two(PENG), big = Math.random() < 0.65, cake = Math.random() < 0.5;
      const pic = d => svgOf(cake ? pieN(d) : strips(even(d)), new Set([0]));
      const ans = (a < b) === big ? 0 : 1, win = ans ? B : A, lo = Math.min(a, b), hi = Math.max(a, b);
      return {
        prompt: `${A} קיבל ${F(1, a)} ${cake ? 'מעוגת דגים' : 'ממשטח קרח'}, ו${B} קיבל ${F(1, b)} ${cake ? 'מעוגה' : 'ממשטח'} באותו גודל. מי קיבל חתיכה ${big ? 'גדולה' : 'קטנה'} יותר?`,
        widget: choice([[A, a], [B, b]].map(([nm, d]) => `<b>${nm}</b> ${F(1, d)}${pic(d)}`), { cols: 2, cls: 'zfrac-pick' }), answer: ans, check: v => v === ans, tries: 1,
        hints: [`שתי ${cake ? 'העוגות' : 'החתיכות'} באותו גודל. כשחותכים ליותר חלקים, כל חלק קטן יותר.`],
        explain: `כשמחלקים ל־${lo} חלקים, כל חלק גדול יותר מאשר כשמחלקים ל־${hi}: ${M(`${fr(1, lo)} &gt; ${fr(1, hi)}`)}. לכן ${win} קיבל חתיכה ${big ? 'גדולה' : 'קטנה'} יותר.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 7);
      let a, b, c, d, hint;
      if (t < 5) {
        [b, d] = two(range(9, i => i + 2));
        a = c = 1;
        hint = `בשני השברים לוקחים חלק אחד. מה גדול יותר: ${one(Math.min(b, d))} או ${one(Math.max(b, d))}?`;
      } else if (t < 7) {
        b = d = rnd(3, 9);
        [a, c] = two(range(b - 1, i => i + 1));
        hint = `החלקים באותו גודל (${many(b)}). איפה יש יותר חלקים?`;
      } else {
        [a, b, c, d] = pick([[1, 2, 2, 4], [2, 4, 1, 2], [1, 3, 2, 6], [2, 6, 1, 3], [1, 2, 4, 8], [4, 8, 1, 2], [1, 4, 2, 8], [3, 4, 6, 8]]);
        hint = 'ציירו את שני השברים על שני משטחים באותו גודל והשוו.';
      }
      const sg = cmpSign(a, b, c, d), idx = ['&lt;', '=', '&gt;'].indexOf(sg);
      return {
        prompt: 'איזה סימן מתאים בין שני השברים?', visual: pair(a, b, c, d),
        widget: signs(), answer: idx, check: v => v === idx, tries: 1,
        hints: [hint],
        explain: `${barsOf([a, b], [c, d])}${M(`${fr(a, b)} ${sg} ${fr(c, d)}`)}`,
      };
    }
    if (Math.random() < 0.35) {
      const a = rnd(2, 5), [b, d] = two(range(12 - a, i => a + 1 + i)), sg = cmpSign(a, b, a, d), idx = ['&lt;', '=', '&gt;'].indexOf(sg);
      return {
        prompt: 'איזה סימן מתאים בין שני השברים?', visual: pair(a, b, a, d),
        widget: signs(), answer: idx, check: v => v === idx, tries: 1,
        hints: [`בשני השברים לוקחים ${a} חלקים. באיזה שבר כל חלק גדול יותר?`],
        explain: `בשני השברים יש ${a} חלקים, אבל ${F(1, Math.min(b, d))} גדול מ־${F(1, Math.max(b, d))}. לכן ${M(`${fr(a, b)} ${sg} ${fr(a, d)}`)}.`,
      };
    }
    // order four fractions
    const t = rnd(0, 2);
    let fs, hint;
    if (t === 0) {
      fs = shuffle(range(10, i => i + 2).filter(x => x !== 11)).slice(0, 4).map(d => [1, d]);
      hint = 'לכל השברים מונה 1. ככל שהמכנה גדול יותר, החלק קטן יותר.';
    } else if (t === 1) {
      const m = rnd(2, 3);
      fs = shuffle(range(10 - m, i => m + 1 + i)).slice(0, 4).map(d => [m, d]);
      hint = `לכל השברים אותו מונה, ${m}. ככל שהמכנה גדול יותר, כל חלק קטן יותר.`;
    } else {
      fs = shuffle([[1, 8], [1, 4], [3, 8], [1, 2], [5, 8], [3, 4], [7, 8]]).slice(0, 4);
      hint = `הפכו כל שבר לשמיניות: ${M(`${fr(1, 2)} = ${fr(4, 8)}`)}, ${M(`${fr(1, 4)} = ${fr(2, 8)}`)}, ${M(`${fr(3, 4)} = ${fr(6, 8)}`)}.`;
    }
    const order = range(4).sort((i, j) => fs[i][0] * fs[j][1] - fs[j][0] * fs[i][1]), sorted = order.map(i => fs[i]);
    return {
      prompt: 'סדרו את השברים מהקטן לגדול.',
      widget: orderTap(fs.map(([n, d]) => F(n, d))), answer: order, check: v => sameSet(v, order),
      hints: [hint, `הכי קטן: ${F(...sorted[0])}.`],
      explain: `${M(sorted.map(([n, d]) => fr(n, d)).join(' &lt; '))}${t === 2 ? `<br>בשמיניות: ${M(sorted.map(([n, d]) => fr((n * 8) / d, 8)).join(' &lt; '))}` : ''}`,
    };
  },
};

// ---------- 6. the number line ----------
const lineOf = (max, div, mark) => `<div dir="ltr">${lineSVG({ max, div, mark })}</div>`;
const place = (prompt, max, div, k, hints, explain) => ({ prompt, widget: numLine({ max, div }), answer: k, check: v => v === k, hints, explain });
const numberLine = {
  id: 'zfrac-line', title: 'ישר המספרים',
  intro: `<p>על ישר המספרים, הקטע מ־0 עד 1 הוא שלם אחד. מחלקים אותו לקפיצות שוות לפי המכנה, וסופרים קפיצות לפי המונה.</p>
    <div class="ex">${lineOf(1, 4, 3)}${F(3, 4)}: הקטע מחולק ל־4 קפיצות שוות, והפינגווין קופץ 3 קפיצות מ־0.</div>
    <p>לחצו על הקו במקום המתאים.</p>`,
  gen(L) {
    if (L === 1 && Math.random() < 0.35) {
      const d = pick([2, 3, 4]), n = rnd(1, d - 1);
      const cand = [[d - n, d], [n, d + 1], [n + 1, d], [1, d], [n, d - 1], [n, d + 2]].filter(([p, q]) => q > 1 && p > 0 && p < q && !near(p / q, n / d));
      const outs = [];
      for (const c of shuffle(cand)) if (outs.length < 2 && !outs.some(o => near(o[0] / o[1], c[0] / c[1]))) outs.push(c);
      const opts = shuffle([[n, d], ...outs]), ans = opts.findIndex(o => o[0] === n && o[1] === d);
      return {
        prompt: 'הפינגווין עומד על הנקודה המסומנת. באיזה שבר הוא עומד?', visual: lineOf(1, d, n),
        widget: choice(opts.map(([p, q]) => F(p, q)), { cols: 3, cls: 'nums' }), answer: ans, check: v => v === ans,
        hints: ['לכמה קפיצות שוות מחולק הקטע מ־0 עד 1? זה המכנה.', `הקטע מחולק ל־${d} קפיצות. כמה קפיצות מ־0 עד הנקודה?`],
        explain: `הקטע מ־0 עד 1 מחולק ל־${d} קפיצות שוות, והנקודה נמצאת ${jumps(n)} מ־0. לכן זה ${F(n, d)}.`,
      };
    }
    if (L === 1) {
      const d = pick([2, 3, 4, 4]), n = rnd(1, d - 1);
      return place(`הפינגווין רוצה להגיע ל־${F(n, d)}. לחצו על המקום הזה בישר המספרים.`, 1, d, n,
        [`הקטע מ־0 עד 1 מחולק ל־${d} קפיצות שוות.`, `ספרו ${jumps(n)} מ־0.`],
        `מחלקים את הקטע מ־0 עד 1 ל־${d} קפיצות שוות, וסופרים ${n} מ־0.`);
    }
    if (L === 2) {
      const t = rnd(0, 9);
      if (t < 3) {
        const d = rnd(3, 8), n = rnd(1, d - 1);
        return fracAns({
          prompt: 'הפינגווין עומד על הנקודה המסומנת. איזה שבר זה?', visual: lineOf(1, d, n), n, d,
          hints: ['לכמה קפיצות שוות מחולק הקטע מ־0 עד 1? זה המכנה.', `הקטע מחולק ל־${d} קפיצות. ספרו כמה קפיצות יש מ־0 עד הנקודה.`],
          explain: `הקטע מחולק ל־${d} קפיצות, והנקודה נמצאת ${jumps(n)} מ־0: ${F(n, d)}.`,
        });
      }
      if (t < 5) {
        const d = pick([2, 3, 4]), n = rnd(1, d - 1);
        return place(`סמנו את ${F(n, d)}. שימו לב: כל קפיצה כאן היא ${F(1, 2 * d)}.`, 1, 2 * d, 2 * n,
          [`${F(1, d)} הוא 2 קפיצות קטנות, כי ${M(`${fr(1, d)} = ${fr(2, 2 * d)}`)}.`, `${F(n, d)} הוא ${2 * n} קפיצות קטנות מ־0.`],
          `${M(`${fr(n, d)} = ${fr(2 * n, 2 * d)}`)}, לכן סופרים ${2 * n} קפיצות קטנות מ־0.`);
      }
      const d = rnd(3, 8), n = rnd(1, d - 1);
      return place(`סמנו את ${F(n, d)} על ישר המספרים.`, 1, d, n,
        [`הקטע מ־0 עד 1 מחולק ל־${d} קפיצות שוות.`, `ספרו ${jumps(n)} מ־0.`],
        `הקטע מחולק ל־${d} ${many(d)}, ו־${F(n, d)} נמצא ${jumps(n)} מ־0.`);
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const div = pick([4, 6, 8, 8]);
      let a, b;
      do {
        a = rnd(0, div - 2);
        b = rnd(a + 2, div);
      } while ((b - a) % 2 || (a === 0 && b === div));
      const mid = (a + b) / 2, lab = k => showFrac(k, div), as = k => (gcd(k, div) > 1 && k % div ? `${lab(k)} = ${F(k, div)}` : lab(k));
      return place(`סמנו את הנקודה שנמצאת בדיוק באמצע בין ${lab(a)} ל־${lab(b)}.`, 1, div, mid,
        [`הקו מחולק ל־${div} קפיצות. מצאו קודם את שתי הנקודות: ${as(a)}, ${as(b)}.`, `בין שתי הנקודות יש ${b - a} קפיצות. האמצע נמצא אחרי ${(b - a) / 2} מהן.`],
        `${as(a)} ו־${as(b)}. בדיוק באמצע נמצא ${F(mid, div)}${gcd(mid, div) > 1 ? ` = ${showFrac(mid, div)}` : ''}.`);
    }
    if (t === 1) {
      const d = pick([2, 3, 4, 5]), m = pick([2, 3].filter(x => x * d <= 12)), n = rnd(1, d - 1), div = d * m;
      return place(`סמנו את ${F(n, d)}. שימו לב לחלוקה של הקו!`, 1, div, n * m,
        [`ספרו לכמה קפיצות מחולק הקטע מ־0 עד 1: ${div}. כמה קפיצות הן ${F(1, d)}?`, `${F(1, d)} הוא ${m} קפיצות, לכן ${F(n, d)} הוא ${n * m} קפיצות.`],
        `${M(`${fr(n, d)} = ${fr(n * m, div)}`)}, לכן סופרים ${n * m} קפיצות מ־0.`);
    }
    const d = pick([2, 3, 4]), n = rnd(d + 1, 2 * d - 1);
    return place(`סמנו את ${F(n, d)} על ישר המספרים.`, 2, d, n,
      [`${F(n, d)} גדול מ־1, כי ${M(`${fr(d, d)} = 1`)}.`, `ספרו ${n} קפיצות מ־0: ${d} קפיצות עד 1, ועוד ${n - d}.`],
      `${d} קפיצות מגיעות ל־1, ועוד ${jumps(n - d)}: ${M(`${fr(n, d)} = 1${fr(n - d, d)}`)}.`);
  },
};

// ---------- 7. equivalent fractions ----------
const UP = [[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 4, 8], [3, 4, 8], [1, 3, 6], [2, 3, 6], [2, 4, 8], [1, 2, 10]];
const equiv = {
  id: 'zfrac-equiv', title: 'שברים שווים',
  intro: `<p>אותו חלק אפשר לכתוב בכמה דרכים. אם חותכים כל חלק לשניים, יש פי 2 חלקים, וגם פי 2 חלקים צבועים.</p>
    <div class="ex">${barsOf([1, 2], [2, 4])}${M(`${fr(1, 2)} = ${fr(2, 4)}`)}: חצי משטח קרח הוא כמו 2 רבעים.</div>`,
  gen(L) {
    if (L === 1) {
      const [a, b, c] = pick(UP), x = (a * c) / b, cake = Math.random() < 0.35;
      const mk = d => (cake ? pieN(d) : bar(d)), nn = cake ? ['בעוגה העליונה', 'בעוגה התחתונה'] : ['במשטח העליון', 'במשטח התחתון'];
      return {
        prompt: `${nn[0]} צבוע ${F(a, b)}. צבעו בדיוק אותו גודל ${nn[1]}.`,
        visual: `<div class="zfrac-top">${svgOf(mk(b), firstN(a))}</div>`, widget: paint([mk(c)]), answer: x, check: v => v === x,
        hints: [`בכל ${one(b)} למעלה יש ${c / b} ${many(c)} למטה.`, `צבעו ${a} פעמים ${c / b} חלקים.`],
        explain: `כל ${one(b)} הוא ${c / b} ${many(c)}, לכן ${M(`${fr(a, b)} = ${fr(x, c)}`)}.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t < 2) {
        // with the two strips drawn, one of them still uncoloured
        let [a, b, c] = pick(UP.filter(u => u[2] <= 8)), x = (a * c) / b;
        if (t === 1) [a, b, c, x] = [x, c, b, a];
        return {
          prompt: 'השלימו את המונה כך שהשברים יהיו שווים. הציור יכול לעזור.',
          visual: `<div class="zfrac-bars">${svgOf(bar(b), firstN(a))}${svgOf(bar(c))}</div>`,
          widget: inputs(M(`${fr(a, b)}<span class="eq">=</span>${fr(box('a', 2), c)}`)), answer: { a: x }, check: v => v.a === x,
          hints: [`כמה ${many(c)} מכסים את אותו חלק כמו ${F(a, b)}?`, c > b ? `כל ${one(b)} הוא ${c / b} ${many(c)}.` : `כל ${one(c)} הוא ${b / c} ${many(b)}.`],
          explain: `${barsOf([a, b], [x, c])}${M(`${fr(a, b)} = ${fr(x, c)}`)}`,
        };
      }
      const [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]), m = rnd(2, b === 2 ? 4 : 3), A = a * m, B = b * m;
      const cand = [[a + 1, b + 1], [A, b * m + 1], [a, B], [A + 1, B], [A - 1, B], [A, B - 1], [a + m, b + m]].filter(([p, q]) => p > 0 && p < q && q <= 12 && !near(p / q, a / b));
      const outs = [];
      for (const c of shuffle(cand)) if (outs.length < 2 && !outs.some(o => o[0] === c[0] && o[1] === c[1])) outs.push(c);
      const opts = shuffle([[A, B], ...outs]), ans = opts.findIndex(o => o[0] === A && o[1] === B);
      return {
        prompt: `איזה שבר שווה ל־${F(a, b)}?`,
        widget: choice(opts.map(([p, q]) => F(p, q)), { cols: 3, cls: 'nums' }), answer: ans, check: v => v === ans,
        hints: ['שבר שווה מקבלים כשמכפילים את המונה ואת המכנה באותו מספר.', `הכפילו את המונה ואת המכנה של ${F(a, b)} ב־${m}.`],
        explain: `${barsOf([a, b], [A, B])}${M(`${fr(a, b)} = ${fr(A, B)}`)}, כי ${M(`${a} × ${m} = ${A}`)} ו־${M(`${b} × ${m} = ${B}`)}.`,
      };
    }
    const t = rnd(0, 2);
    const [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5]]);
    if (t === 0) {
      const [m1, m2] = two([2, 3, 4, 5].filter(m => b * m <= 20));
      return {
        prompt: 'השלימו את המספרים החסרים כך שכל השברים יהיו שווים.',
        widget: inputs(M(`${fr(a, b)}<span class="eq">=</span>${fr(a * m1, box('x', 2))}<span class="eq">=</span>${fr(box('y', 2), b * m2)}`)),
        answer: { x: b * m1, y: a * m2 }, check: v => v.x === b * m1 && v.y === a * m2,
        hints: ['בכל שבר שווה, המונה והמכנה הוכפלו באותו מספר.', `${M(`${a} × ${m1} = ${a * m1}`)}, אז גם המכנה מוכפל ב־${m1}. ובשבר האחרון: ${M(`${b} × ${m2} = ${b * m2}`)}.`],
        explain: `${M(`${fr(a, b)} = ${fr(a * m1, b * m1)} = ${fr(a * m2, b * m2)}`)}: פעם כופלים ב־${m1} ופעם ב־${m2}.`,
      };
    }
    if (t === 1) {
      const ms = shuffle([2, 3, 4, 5, 6].filter(m => b * m <= 30)).slice(0, 4), wm = ms.pop();
      const k = rnd(1, 3), wrong = pick([[a + k, b + k], [a * wm + 1, b * wm], [a * wm - 1, b * wm]].filter(([p, q]) => p > 0 && p < q && !near(p / q, a / b)));
      const opts = shuffle([...ms.map(m => [a * m, b * m]), wrong]), ans = opts.indexOf(wrong);
      return {
        prompt: `איזה שבר <b>לא</b> שווה ל־${F(a, b)}?`,
        widget: choice(opts.map(([p, q]) => F(p, q)), { cols: 4, cls: 'nums' }), answer: ans, check: v => v === ans, tries: 1,
        hints: [`בדקו כל שבר: האם אפשר להגיע אליו מ־${F(a, b)} בכפל של המונה ושל המכנה באותו מספר?`],
        explain: `${ms.map(m => M(`${fr(a, b)} = ${fr(a * m, b * m)}`)).join('<br>')}<br>אבל ${F(...wrong)} לא שווה ל־${F(a, b)}: ${wrong[1] % b ? 'לא כפלו את המונה ואת המכנה באותו מספר.' : `${M(`${fr(a, b)} = ${fr((a * wrong[1]) / b, wrong[1])}`)}.`}`,
      };
    }
    const m = rnd(2, 5);
    if (Math.random() < 0.5)
      return {
        prompt: 'השלימו את המכנה כך שהשברים יהיו שווים.',
        widget: inputs(M(`${fr(a, b)}<span class="eq">=</span>${fr(a * m, box('a', 2))}`)), answer: { a: b * m }, check: v => v.a === b * m,
        hints: [`במה הוכפל המונה? ${M(`${a} × ? = ${a * m}`)}`, `המונה הוכפל ב־${m}. הכפילו גם את המכנה.`],
        explain: `${M(`${fr(a, b)} = ${fr(a * m, b * m)}`)}, כי כופלים את המונה ואת המכנה ב־${m}.`,
      };
    return {
      prompt: 'השלימו את המונה כך שהשברים יהיו שווים.',
      widget: inputs(M(`${fr(a * m, b * m)}<span class="eq">=</span>${fr(box('a', 2), b)}`)), answer: { a }, check: v => v.a === a,
      hints: [`במה צריך לחלק את המכנה ${b * m} כדי לקבל ${b}?`, `מחלקים את המכנה ב־${m}. חלקו גם את המונה ב־${m}.`],
      explain: `${M(`${fr(a * m, b * m)} = ${fr(a, b)}`)}, כי מחלקים את המונה ואת המכנה ב־${m}.`,
    };
  },
};

// ---------- 8. more than one whole ----------
const pieces = (n, d) => `<div class="zfrac-ref">משטח שלם: <i></i></div><div class="zfrac-pieces" dir="ltr">${range(n, () => `<i style="width:${Math.round(96 / d)}px"></i>`).join('')}</div>`;
const more = {
  id: 'zfrac-more', title: 'יותר משלם',
  intro: `<p>בשלם אחד יש 2 חצאים, 3 שלישים או 4 רבעים. כשיש יותר חלקים מזה, יש לנו יותר משלם אחד.</p>
    <div class="ex">${wholes(1, 1, 4, 'v')}${F(5, 4)} הם 5 רבעים: שלם אחד (4 רבעים) ועוד רבע.</div>
    <div class="ex">בכל שלם יש 2 חצאים, לכן ב־3 שלמים יש ${M('3 × 2 = 6')} חצאים.</div>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 4), d = pick([2, 2, 4, 3]), w = rnd(2, d === 2 ? 5 : 3);
      if (t < 2) {
        const kind = pick('vp'), what = kind === 'p' ? ['עוגה', 'עוגות'] : ['משטח', 'משטחים'];
        return num({
          prompt: `בכל ${what[0]} יש ${d} ${many(d)}. כמה ${many(d)} יש ב־${w} ${what[1]}?`, visual: wholes(w, 0, d, kind), answer: w * d,
          hints: ['ספרו את כל החלקים בציור.', `${M(range(w, () => d).join(' + '))}`],
          explain: `${w} ${what[1]}, ובכל אחד ${d} ${many(d)}: ${M(`${range(w, () => d).join(' + ')} = ${w * d}`)}.`,
        });
      }
      if (t < 4)
        return num({
          prompt: `יש ${w * d} ${many(d)} של משטח קרח. כמה משטחים שלמים אפשר להרכיב מהם?`, visual: pieces(w * d, d), answer: w,
          hints: [`כמה ${many(d)} צריך למשטח שלם אחד?`, `כל משטח שלם בנוי מ־${d} ${many(d)}. כמה קבוצות של ${d} יש ב־${w * d}?`],
          explain: `כל ${d} ${many(d)} הם משטח שלם, ו־${M(`${w * d} ÷ ${d} = ${w}`)}. אפשר להרכיב ${w} משטחים.`,
        });
      const n = pick([3, 5]);
      return {
        prompt: `צבעו ${F(n, 2)}, כלומר ${n} חצאים. כל משטח הוא שלם אחד.`, widget: paint(range(3, () => strips(even(2)))), answer: n, check: v => v === n,
        hints: [`${F(n, 2)} הם ${n} חצאים.`, `צבעו ${(n - 1) / 2 === 1 ? 'משטח שלם אחד' : `${(n - 1) / 2} משטחים שלמים`} ועוד חצי.`],
        explain: `${n} חצאים: ${M(`${fr(n, 2)} = ${(n - 1) / 2}${fr(1, 2)}`)}.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2), d = pick([2, 3, 4]);
      if (t === 0) {
        const n = rnd(d + 1, 3 * d), S = Math.min(4, Math.ceil(n / d) + rnd(0, 1)), w = Math.floor(n / d), r = n % d, kind = pick('vp');
        return {
          prompt: `צבעו ${F(n, d)}. כל ${kind === 'p' ? 'עוגה היא' : 'משטח הוא'} שלם אחד.`, widget: paint(range(S, () => (kind === 'p' ? pieN(d) : strips(even(d))))), answer: n, check: v => v === n,
          hints: [`${F(n, d)} הם ${n} ${many(d)}, ובכל שלם יש ${d} ${many(d)}.`, `צבעו ${w === 1 ? 'שלם אחד' : `${w} שלמים`}${r ? ` ועוד ${r === 1 ? one(d) : `${r} ${many(d)}`}` : ''}.`],
          explain: `${n} ${many(d)}: ${M(`${n} = ${w} × ${d}${r ? ` + ${r}` : ''}`)}, כלומר ${w === 1 ? 'שלם אחד' : `${w} שלמים`}${r ? ` ועוד ${F(r, d)}` : ''}.`,
        };
      }
      if (t === 1) {
        const w = rnd(1, 2), r = rnd(1, d - 1), kind = pick('vp'), n = w * d + r;
        return {
          prompt: `כל ${kind === 'p' ? 'עוגה היא' : 'משטח הוא'} שלם אחד. איזה שבר צבוע? השלימו את המונה.`, visual: wholes(w, r, d, kind),
          widget: inputs(M(fr(box('a', 2), d))), answer: { a: n }, check: v => v.a === n,
          hints: [`בכל שלם יש ${d} ${many(d)}. ספרו את כל החלקים הצבועים.`, `${w === 1 ? 'שלם אחד הוא' : `${w} שלמים הם`} ${w * d} ${many(d)}, ועוד ${r}.`],
          explain: `${M(`${w} × ${d} + ${r} = ${n}`)}, לכן צבועים ${F(n, d)}.`,
        };
      }
      const D = rnd(2, 8), w = rnd(2, 5);
      if (Math.random() < 0.5)
        return num({
          prompt: `כמה ${many(D)} יש ב־${w} שלמים?`, answer: w * D,
          hints: [`בשלם אחד יש ${D} ${many(D)}.`, `${w} פעמים ${D}.`],
          explain: `${M(`${w} × ${D} = ${w * D}`)}, לכן ${M(`${w} = ${fr(w * D, D)}`)}.`,
        });
      return num({
        prompt: `כמה שלמים הם ${w * D} ${many(D)}?`, answer: w,
        hints: [`${D} ${many(D)} הם שלם אחד.`, `כמה פעמים ${D} נכנס ב־${w * D}?`],
        explain: `${M(`${w * D} ÷ ${D} = ${w}`)}, לכן ${M(`${fr(w * D, D)} = ${w}`)}.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const d = rnd(2, 8), w = rnd(1, 4), r = rnd(1, d - 1), N = w * d + r;
      return nums({
        prompt: `יש ${N} ${many(d)} של משטח קרח. כמה משטחים שלמים אפשר להרכיב, וכמה ${many(d)} יישארו?`,
        fields: [['משטחים שלמים:', w], [`${many(d)} שנשארו:`, r]],
        hints: [`כל ${d} ${many(d)} הם משטח שלם.`, `${M(`${w} × ${d} = ${w * d}`)}, וזה הכי קרוב ל־${N} בלי לעבור אותו.`],
        explain: `${M(`${N} = ${w} × ${d} + ${r}`)}, כלומר ${w === 1 ? 'משטח שלם אחד' : `${w} משטחים שלמים`} ועוד ${r === 1 ? one(d) : `${r} ${many(d)}`}: ${M(`${fr(N, d)} = ${w}${fr(r, d)}`)}.`,
      });
    }
    if (t === 1) {
      const [a, d] = pick([[1, 2], [1, 3], [1, 4], [3, 4], [2, 3]]), ps = range(12, i => i + 1).filter(p => (p * a) % d === 0 && p > d), p = pick(ps), ans = (p * a) / d;
      return num({
        prompt: `כל פינגווין אוכל ${F(a, d)} דג בארוחה. כמה דגים שלמים צריך כדי להאכיל ${p} פינגווינים?`, answer: ans,
        hints: [`כמה ${many(d)} של דג צריך בסך הכול?`, `${p} פינגווינים, ולכל אחד ${a === 1 ? one(d) : `${a} ${many(d)}`}: ${M(`${p} × ${a} = ${p * a}`)} ${many(d)}. כמה דגים שלמים הם?`],
        explain: `צריך ${p * a} ${many(d)} של דג. בכל דג יש ${d} ${many(d)}, לכן ${M(`${p * a} ÷ ${d} = ${ans}`)} דגים.`,
      });
    }
    // which fractions are bigger than 1?
    let opts;
    do {
      const k = rnd(1, 2), e = rnd(2, 8);
      opts = [[e, e]];
      for (let i = 0; i < k; i++) { const d = rnd(2, 8); opts.push([rnd(d + 1, 2 * d), d]); }
      while (opts.length < 4) { const d = rnd(3, 9); opts.push([rnd(1, d - 1), d]); }
    } while (new Set(opts.map(String)).size < 4);
    opts = shuffle(opts);
    const ans = opts.flatMap(([n, d], i) => (n > d ? [i] : [])), eq = opts.find(([n, d]) => n === d);
    return {
      prompt: 'סמנו את <b>כל</b> השברים שגדולים מ־1.',
      widget: multi(choice(opts.map(([n, d]) => F(n, d)), { multi: true, cols: 4, cls: 'nums' })), answer: ans, check: v => sameSet(v, ans),
      hints: ['שבר גדול מ־1 כשיש בו יותר חלקים ממה שיש בשלם אחד: המונה גדול מהמכנה.', `שימו לב: ${F(...eq)} שווה בדיוק 1, ולא גדול ממנו.`],
      explain: `${fl(opts.filter(([n, d]) => n > d))} ${ans.length > 1 ? 'גדולים' : 'גדול'} מ־1, כי המונה גדול מהמכנה.<br>${F(...eq)} שווה בדיוק 1.<br>${fl(opts.filter(([n, d]) => n < d))} ${4 - ans.length > 2 ? 'קטנים' : 'קטן'} מ־1.`,
    };
  },
};

// ---------- 9. boss ----------
const BETWEEN = [[[1, 4], [1, 2], 8], [[1, 2], [3, 4], 8], [[3, 4], [1, 1], 8], [[1, 3], [2, 3], 6], [[1, 2], [5, 6], 6], [[2, 3], [1, 1], 6], [[1, 5], [2, 5], 10], [[2, 5], [3, 5], 10], [[1, 2], [1, 1], 4]];
const boss = {
  id: 'zfrac-boss', title: 'בוס: החשבונאי רבע',
  intro: `<p>החשבונאי רבע נעל את מתחם הפינגווינים, ולקח לעצמו רבע מכל הדגים! כדי לשחרר את הפינגווינים צריך לפתור את החידות שלו.</p>
    <div class="ex">"לקחתי ${F(1, 4)} מ־20 הדגים. כמה נשארו?" ${F(1, 4)} מ־20 הוא ${M('20 ÷ 4 = 5')}, ונשארו ${M('20 − 5 = 15')} דגים.</div>
    <p>קראו כל שאלה לאט, ופתרו שלב אחרי שלב.</p>`,
  gen(L) {
    const t = rnd(0, 4);
    if (L === 1) {
      if (t === 0) {
        const d = pick([2, 3, 4]), k = rnd(2, 6), N = d * k;
        return num({
          prompt: `החשבונאי רבע לקח ${F(1, d)} מ־${N} הדגים של הפינגווינים. כמה דגים נשארו לפינגווינים?`, answer: N - k,
          hints: [`כמה זה ${F(1, d)} מ־${N}?`, `החשבונאי לקח ${M(`${N} ÷ ${d} = ${k}`)} דגים.`],
          explain: `${M(`${N} ÷ ${d} = ${k}`)}, ונשארו ${M(`${N} − ${k} = ${N - k}`)} דגים.`,
        });
      }
      if (t === 1) {
        if (Math.random() < 0.3)
          return {
            prompt: `כדי לפתוח את המנעול, צבעו ${F(3, 2)}. כל משטח הוא שלם אחד.`, widget: paint([strips(even(2)), strips(even(2))]), answer: 3, check: v => v === 3,
            hints: [`${F(3, 2)} הם 3 חצאים.`, 'צבעו משטח שלם אחד ועוד חצי.'], explain: `3 חצאים: ${M(`${fr(3, 2)} = 1${fr(1, 2)}`)}.`,
          };
        const d = pick([3, 4]), n = rnd(2, d - 1), s = eqShape(d);
        return {
          prompt: `כדי לפתוח את המנעול, צבעו ${F(n, d)} מ${s.noun}.`, widget: paint([s]), answer: n, check: v => v === n,
          hints: [`${s.noun} ${cutIn(s)} ל־${d} חלקים שווים. כמה צריך לצבוע?`, `צבעו ${parts(n)}.`],
          explain: `${d} חלקים שווים, וצובעים ${parts(n)}.`,
        };
      }
      if (t === 2) {
        const [a, b] = two([2, 3, 4, 6]), ans = a < b ? 0 : 1;
        return {
          prompt: `החשבונאי מציע לפינגווין ${F(1, a)} מעוגת הדגים או ${F(1, b)} מאותה עוגה. מה כדאי לבחור כדי לקבל יותר?`,
          widget: choice([a, b].map(d => `${F(1, d)}${svgOf(pieN(d), new Set([0]))}`), { cols: 2, cls: 'zfrac-pick' }), answer: ans, check: v => v === ans, tries: 1,
          hints: ['כשחותכים את העוגה ליותר חלקים, כל חלק קטן יותר.'],
          explain: `${M(`${fr(1, Math.min(a, b))} &gt; ${fr(1, Math.max(a, b))}`)}: עוגה שחותכים ל־${Math.min(a, b)} נותנת חתיכות גדולות יותר.`,
        };
      }
      if (t === 3) {
        const [d, p] = pick([[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [4, 8], [4, 12]]);
        return num({
          prompt: `${p} פינגווינים רוצים ${one(d)} דג כל אחד. כמה דגים שלמים צריך?`, answer: p / d,
          hints: [`כמה פינגווינים אפשר להאכיל מדג אחד?`, `מדג אחד אוכלים ${d} פינגווינים.`],
          explain: `מכל דג יש ${d} ${many(d)}, כלומר ${d} פינגווינים. ${M(`${p} ÷ ${d} = ${p / d}`)} דגים.`,
        });
      }
      const d = pick([2, 3, 4]), k = rnd(2, 8);
      return num({
        prompt: `החשבונאי גנב ${F(1, d)} מהדגים. הוא גנב ${k} דגים. כמה דגים היו בהתחלה?`, answer: d * k,
        hints: [`בשלם יש ${d} ${many(d)}, ובכל ${one(d)} יש ${k} דגים.`, `${d} פעמים ${k}.`],
        explain: `${M(`${d} × ${k} = ${d * k}`)} דגים.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const d = rnd(3, 8), n = rnd(2, d - 1), k = rnd(2, 6), N = d * k;
        return num({
          prompt: `במתחם יש ${N} פינגווינים. ${F(n, d)} מהם נעולים בכלוב של החשבונאי. כמה פינגווינים חופשיים?`, answer: N - n * k,
          hints: ['מצאו קודם כמה פינגווינים נעולים.', `נעולים: ${M(`${N} ÷ ${d} × ${n} = ${n * k}`)}.`],
          explain: `נעולים ${M(`${N} ÷ ${d} × ${n} = ${n * k}`)}, וחופשיים ${M(`${N} − ${n * k} = ${N - n * k}`)}. אפשר גם כך: חופשיים הם ${F(d - n, d)} מ־${N}.`,
        });
      }
      if (t === 1) {
        const d = rnd(3, 8), n = rnd(2, d - 1), k = rnd(2, 6);
        return num({
          prompt: `החשבונאי לקח ${F(n, d)} מהדגים, כלומר ${n * k} דגים. כמה דגים היו בהתחלה?`, visual: model(d, n, n * k), answer: d * k,
          hints: [`${n * k} דגים הם ${n} חלקים. כמה בחלק אחד?`, `חלק אחד: ${M(`${n * k} ÷ ${n} = ${k}`)}.`],
          explain: `חלק אחד: ${M(`${n * k} ÷ ${n} = ${k}`)}. השלם: ${M(`${d} × ${k} = ${d * k}`)}.`,
        });
      }
      if (t === 2) {
        const d = pick([2, 3, 4]), n = rnd(d + 1, 2 * d - 1);
        return place(`הגשר של החשבונאי: סמנו את ${F(n, d)} על ישר המספרים.`, 2, d, n,
          [`${F(n, d)} גדול מ־1, כי ${M(`${fr(d, d)} = 1`)}.`, `ספרו ${n} קפיצות מ־0.`],
          `${d} קפיצות מגיעות ל־1, ועוד ${n - d}: ${M(`${fr(n, d)} = 1${fr(n - d, d)}`)}.`);
      }
      if (t === 3) {
        let [a, b, c] = pick(UP), x = (a * c) / b;
        if (Math.random() < 0.5) [a, b, c, x] = [x, c, b, a];
        return {
          prompt: 'הקוד של המנעול: השלימו את המונה כך שהשברים יהיו שווים.',
          widget: inputs(M(`${fr(a, b)}<span class="eq">=</span>${fr(box('a', 2), c)}`)), answer: { a: x }, check: v => v.a === x,
          hints: [c > b ? `כל ${one(b)} הוא ${c / b} ${many(c)}.` : `כל ${one(c)} הוא ${b / c} ${many(b)}.`],
          explain: `${barsOf([a, b], [x, c])}${M(`${fr(a, b)} = ${fr(x, c)}`)}`,
        };
      }
      const a = pick([1, 1, 2, 3]), [b, d] = two(range(10 - a, i => a + 1 + i)), sg = cmpSign(a, b, a, d), idx = ['&lt;', '=', '&gt;'].indexOf(sg);
      return {
        prompt: 'איזה סימן מתאים בין שני השברים?', visual: pair(a, b, a, d), widget: signs(), answer: idx, check: v => v === idx, tries: 1,
        hints: [`בשני השברים לוקחים ${a === 1 ? 'חלק אחד' : `${a} חלקים`}. באיזה שבר כל חלק גדול יותר?`],
        explain: `${F(1, Math.min(b, d))} גדול מ־${F(1, Math.max(b, d))}, לכן ${M(`${fr(a, b)} ${sg} ${fr(a, d)}`)}.`,
      };
    }
    if (t === 0) {
      const [a, b] = pick([[4, 3], [2, 2], [3, 2], [4, 2], [2, 3], [3, 4], [2, 4]]), q = rnd(1, 3), T = a * b * q, after = T - T / a, R = after - after / b;
      return num({
        prompt: `החשבונאי לקח ${F(1, a)} מהדגים, ואחר כך עוד ${F(1, b)} ממה שנשאר. בסוף נשארו ${R} דגים. כמה דגים היו בהתחלה?`, answer: T,
        hints: ['עבדו מהסוף להתחלה: כמה דגים היו לפני הפעם השנייה?', `אחרי הפעם השנייה נשארו ${F(b - 1, b)} ממה שהיה, כלומר לפניה היו ${after} דגים.`],
        explain: `בסוף נשארו ${F(b - 1, b)} ממה שהיה לפני הפעם השנייה, והם ${R}. לכן לפני הפעם השנייה היו ${after} דגים. אלה ${F(a - 1, a)} מההתחלה, לכן בהתחלה היו ${M(a === 2 ? `${after} × 2 = ${T}` : `${after} ÷ ${a - 1} × ${a} = ${T}`)} דגים.`,
      });
    }
    if (t === 1) {
      const [a, b] = pick([[2, 4], [2, 3], [3, 6], [4, 8]]), l = lcm(a, b), diff = rnd(2, 9), T = l * diff;
      return num({
        prompt: `החשבונאי אומר: "${F(1, a)} מהדגים שלי הם ${diff} דגים יותר מ־${F(1, b)} מהם." כמה דגים יש לו?`, answer: T,
        hints: [`חלקו את הדגים ל־${l} חלקים שווים: ${F(1, a)} הוא ${l / a} חלקים, ו־${F(1, b)} הוא ${l / b} ${l / b === 1 ? 'חלק' : 'חלקים'}.`, `ההפרש הוא חלק אחד מתוך ${l}, והוא ${diff} דגים.`],
        explain: `${F(1, a)} = ${F(l / a, l)} ו־${F(1, b)} = ${F(l / b, l)}. ההפרש, ${F(1, l)}, הוא ${diff} דגים, לכן יש ${M(`${l} × ${diff} = ${T}`)} דגים.`,
      });
    }
    if (t === 2) {
      const [lo, hi, D] = pick(BETWEEN), ok = range(D - 1, i => i + 1).filter(n => n * lo[1] > lo[0] * D && n * hi[1] < hi[0] * D);
      const lab = ([n, d]) => (n === d ? M(1) : F(n, d));
      return {
        prompt: `המנעול נפתח רק עם שבר שהמכנה שלו ${D}, שגדול מ־${lab(lo)} וקטן מ־${lab(hi)}. השלימו את המונה.`,
        widget: inputs(M(fr(box('a', 2), D))), answer: { a: ok[0] }, check: v => ok.includes(v.a),
        hints: [`כתבו את ${lab(lo)} ואת ${lab(hi)} בתור שברים שהמכנה שלהם ${D}.`, `${M(`${fr(...lo)} = ${fr((lo[0] * D) / lo[1], D)}`)} ו־${M(`${hi[0] === hi[1] ? 1 : fr(...hi)} = ${fr((hi[0] * D) / hi[1], D)}`)}. איזה מונה נמצא ביניהם?`],
        explain: `${M(`${fr((lo[0] * D) / lo[1], D)} &lt; ${fr(ok[0], D)} &lt; ${fr((hi[0] * D) / hi[1], D)}`)}`,
      };
    }
    if (t === 3) {
      const fs = shuffle([[1, 2], [3, 4], [1, 4], [5, 4], [3, 2], [7, 8], [3, 8], [1, 1]]).slice(0, 4);
      const order = range(4).sort((i, j) => fs[i][0] * fs[j][1] - fs[j][0] * fs[i][1]), sorted = order.map(i => fs[i]);
      const show = ([n, d]) => (n === d ? M(1) : F(n, d));
      return {
        prompt: 'החשבונאי ערבב את השברים. סדרו אותם מהקטן לגדול.',
        widget: orderTap(fs.map(show)), answer: order, check: v => sameSet(v, order),
        hints: [`הפכו את כולם לשמיניות: ${M(`${fr(1, 2)} = ${fr(4, 8)}`)}, ${M(`${fr(1, 4)} = ${fr(2, 8)}`)}, ${M(`1 = ${fr(8, 8)}`)}.`, `שברים שהמונה שלהם גדול מהמכנה גדולים מ־1. הכי קטן: ${show(sorted[0])}.`],
        explain: `${M(sorted.map(([n, d]) => (n === d ? '1' : fr(n, d))).join(' &lt; '))}<br>בשמיניות: ${M(sorted.map(([n, d]) => fr((n * 8) / d, 8)).join(' &lt; '))}`,
      };
    }
    const [a, d] = pick([[3, 4], [2, 3], [3, 2], [5, 4]]), p = pick(range(12, i => i + 1).filter(x => (x * a) % d === 0 && x > d)), ans = (p * a) / d;
    return num({
      prompt: `כל פינגווין צריך ${F(a, d)} דג ביום. החשבונאי מסכים לתת רק דגים שלמים. כמה דגים שלמים צריך בשביל ${p} פינגווינים ליום אחד?`, answer: ans,
      hints: [`כמה ${many(d)} של דג צריך בסך הכול?`, `${M(`${p} × ${a} = ${p * a}`)} ${many(d)}. כמה דגים שלמים הם?`],
      explain: `צריך ${M(`${p} × ${a} = ${p * a}`)} ${many(d)}, ובכל דג יש ${d} ${many(d)}: ${M(`${p * a} ÷ ${d} = ${ans}`)} דגים.`,
    });
  },
};

export default {
  id: 'zfrac', name: 'מתחם הפינגווינים', icon: '🐧', color: '#22d3ee', boss: 'החשבונאי רבע',
  tagline: 'החשבונאים שברו את משטח הקרח לחתיכות. כדי לחלק את הדגים בצדק צריך להכיר שברים.',
  challenges: [equalParts, colour, share, whole, compare, numberLine, equiv, more, boss],
};
