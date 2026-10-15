// מתחם הפילים
import { rnd, pick, shuffle, range, M, h } from '../../util.js';
import { inputs, box, choice, gridPaint, rectOf } from '../../widgets.js';
import { num } from '../../kit.js';

// ---------- shared pieces ----------
// Animals with masculine names only, so "כל קוף קיבל" works for all of them.
const ZOO = [
  { a: '🐒', one: 'קוף', many: 'קופים', f: '🍌', food: 'בננות' },
  { a: '🐧', one: 'פינגווין', many: 'פינגווינים', f: '🐟', food: 'דגים' },
  { a: '🐘', one: 'פיל', many: 'פילים', f: '🥜', food: 'בוטנים' },
  { a: '🐻', one: 'דוב', many: 'דובים', f: '🍓', food: 'תותים' },
  { a: '🐢', one: 'צב', many: 'צבים', f: '🍅', food: 'עגבניות' },
  { a: '🐇', one: 'ארנב', many: 'ארנבים', f: '🥕', food: 'גזרים' },
  { a: '🦜', one: 'תוכי', many: 'תוכים', f: '🍇', food: 'ענבים' },
];
const items = (e, n) => range(n, () => `<i>${e}</i>`).join('');
const sumOf = (n, k) => range(k, () => n).join(' + ');
const X = (a, b) => `${a} × ${b}`;
const D = (a, b) => `${a} ÷ ${b}`;
const line = s => `<div class="ans-line">${s}</div>`;
const bx = (k, ans) => box(k, String(ans).length + 1);
// a list of numbers that keeps its order in Hebrew text and may wrap
const LST = a => `<span class="zmul-list" dir="ltr">${a.join(', ')}</span>`;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// one answer box (□) inside a maths line
const eq = ({ prompt, visual, expr, ans, hints, explain, tries }) => ({
  prompt, visual, hints, explain, tries,
  widget: inputs(line(M(expr.replace('□', bx('a', ans))))),
  answer: { a: ans }, check: v => v.a === ans,
});
// "□ × □ = □": the two factors may come in either order
const mulLine = t => line(M(`${box('a', 2)} × ${box('b', 2)} = ${bx('t', t)}`));
const mulAns = (a, b) => ({ answer: { a, b, t: a * b }, check: v => v.t === a * b && ((v.a === a && v.b === b) || (v.a === b && v.b === a)) });
// a multiple-choice round whose options are plain strings
const pickOne = ({ prompt, visual, opts, right, hints, explain, tries, cols = 2, cls = '' }) => {
  const o = shuffle(opts), idx = o.indexOf(right);
  return { prompt, visual, hints, explain, tries, widget: choice(o, { cols, cls }), answer: idx, check: v => v === idx };
};

// ---------- pictures ----------
const gcols = n => (n <= 3 ? n : n === 4 ? 2 : n === 9 ? 3 : Math.ceil(n / 2));
const groupsPic = (k, n, e) =>
  `<div class="zmul-groups">${range(k, () => `<div class="zmul-grp" style="grid-template-columns:repeat(${gcols(n)},auto)">${items(e, n)}</div>`).join('')}</div>`;
const sumPic = (n, k) => `<div class="zmul-sum" dir="ltr">${range(k, i => n + (i < k - 1 ? (i % 5 === 4 ? ' +<br>' : ' + ') : '')).join('')}</div>`;
const arrPic = (r, c, e) => `<div class="zmul-arr" dir="ltr" style="grid-template-columns:repeat(${c},auto)">${items(e, r * c)}</div>`;

// r × c dots; split draws a cut after that many rows, cover hides all but the first row and column
function dots(r, c, { split = 0, cover = false } = {}) {
  const u = 26, gap = split ? 10 : 0, W = c * u + 8, H = r * u + 8 + gap;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="zmul-dots" style="max-width:${Math.min(300, Math.round(W * 1.15))}px">`;
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      if (cover && i > 0 && j > 0) continue;
      const lower = split && i >= split;
      s += `<circle cx="${4 + u / 2 + j * u}" cy="${4 + u / 2 + i * u + (lower ? gap : 0)}" r="9" class="${lower ? 'b' : 'a'}"/>`;
    }
  if (split) s += `<line x1="0" x2="${W}" y1="${4 + split * u + gap / 2}" y2="${4 + split * u + gap / 2}" class="cut"/>`;
  if (cover) {
    const x = 4 + u + 3, y = 4 + u + 3, w = (c - 1) * u - 6, hh = (r - 1) * u - 6;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="10" class="tarp"/><text x="${x + w / 2}" y="${y + hh / 2 + 12}" class="tarp-q">?</text>`;
  }
  return s + '</svg>';
}

// fact-family triangle: product on top, factors at the bottom; null shows a question mark
function tri(top, l, r) {
  const c = (x, y, v) => {
    const t = v == null ? '?' : String(v);
    return `<circle cx="${x}" cy="${y}" r="31" class="${v == null ? 'q' : ''}"/><text x="${x}" y="${y + 9}" style="font-size:${t.length > 3 ? 18 : t.length > 2 ? 22 : 27}px">${t}</text>`;
  };
  return `<svg viewBox="0 0 220 184" class="zmul-tri" style="max-width:230px"><path d="M110 38L40 146H180Z" class="edge"/>
    <text x="110" y="122" class="ops">× ÷</text>${c(110, 38, top)}${c(40, 146, l)}${c(180, 146, r)}</svg>`;
}

// k groups of m base-ten pieces: unit 't' = tens rods, 'h' = hundred squares
function blocks(k, m, unit) {
  const rod = unit === 't', pw = rod ? 9 : 30, ph = rod ? 50 : 30, gap = 4, per = rod ? 10 : 3, pad = 6, G = 10;
  const cols = Math.min(m, per), rws = Math.ceil(m / per);
  const gw = cols * (pw + gap) - gap + 2 * pad, gh = rws * (ph + gap) - gap + 2 * pad;
  const perLine = k <= 3 ? k : Math.ceil(k / 2), lines = Math.ceil(k / perLine);
  const W = perLine * (gw + G) - G + 4, H = lines * (gh + G) - G + 4;
  let s = `<svg viewBox="-2 -2 ${W} ${H}" class="zmul-blocks" style="max-width:${Math.min(320, Math.round(W * 1.7))}px">`;
  for (let g = 0; g < k; g++) {
    const gx = (g % perLine) * (gw + G), gy = Math.floor(g / perLine) * (gh + G);
    s += `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="7" class="grp"/>`;
    for (let p = 0; p < m; p++) {
      const x = gx + pad + (p % per) * (pw + gap), y = gy + pad + Math.floor(p / per) * (ph + gap);
      s += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" class="piece"/>`;
      for (let t = 1; t < 10; t++) {
        s += `<line x1="${x}" x2="${x + pw}" y1="${y + (t * ph) / 10}" y2="${y + (t * ph) / 10}" class="seg"/>`;
        if (!rod) s += `<line y1="${y}" y2="${y + ph}" x1="${x + (t * pw) / 10}" x2="${x + (t * pw) / 10}" class="seg"/>`;
      }
    }
  }
  return s + '</svg>';
}

// ---------- widgets ----------
// Pens the player fills: tap a pen to put one in, − to take one out, + / − below to change the number of pens.
// pool: nothing new comes in; − puts an item in the hand and tapping a pen puts it down (for evening out).
function pens({ item, init = [0], fixed = false, pool = false, ask = '', unit = 'כלובים', maxPens = 6, max = 10 }) {
  let c = [...init], hand = 0, locked = false;
  const area = h('div', { class: 'zmul-pens' }), cnt = h('b', {});
  const handEl = pool ? h('div', { class: 'zmul-hand' }) : null;
  const ans = ask ? inputs(line(ask)) : null;
  const flash = () => {
    if (!handEl) return;
    handEl.classList.remove('zmul-flash');
    void handEl.offsetWidth;
    handEl.classList.add('zmul-flash');
  };
  const put = i => {
    if (locked) return;
    if (pool) {
      if (!hand) return flash();
      hand--;
    } else if (c[i] >= max) return;
    c[i]++;
    draw();
  };
  const take = i => {
    if (locked || !c[i]) return;
    c[i]--;
    if (pool) hand++;
    draw();
  };
  const step = by => () => {
    if (locked) return;
    if (by > 0 && c.length < maxPens) c.push(0);
    if (by < 0 && c.length > 1) c.pop();
    draw();
  };
  const draw = () => {
    cnt.textContent = String(c.length);
    area.innerHTML = '';
    c.forEach((x, i) =>
      area.append(h('div', { class: 'zmul-pen', role: 'button', 'aria-label': 'להכניס', onclick: () => put(i) },
        h('div', { class: 'zmul-in', html: items(item, x) }),
        h('div', { class: 'zmul-foot' },
          h('b', {}, String(x)),
          h('button', { type: 'button', class: 'zmul-minus', 'aria-label': 'להוציא', onclick: e => (e.stopPropagation(), take(i)) }, '−')))));
    if (handEl) handEl.innerHTML = hand ? `ביד: ${items(item, hand)}<br><small>לחצו על סל כדי להניח.</small>` : 'ביד: כלום. לחצו על − כדי לקחת.';
  };
  const ctl = fixed ? null : h('div', { class: 'fb-ctl', dir: 'ltr' },
    h('button', { type: 'button', class: 'round', 'aria-label': 'פחות', onclick: step(-1) }, '−'),
    h('span', { dir: 'rtl' }, `${unit}: `, cnt),
    h('button', { type: 'button', class: 'round', 'aria-label': 'עוד', onclick: step(1) }, '+'));
  draw();
  const el = h('div', { class: 'zmul-penw' }, handEl, area, ctl, ans && ans.el);
  return {
    el,
    value() {
      if (pool && hand) return null;
      const a = ans ? ans.value() : {};
      return a ? { c: [...c], ...a } : null;
    },
    set(a) {
      c = [...a.c];
      hand = 0;
      if (ans) ans.set(a);
      draw();
    },
    key: e => (ans ? ans.key(e) : false),
    lock() {
      locked = true;
      el.classList.add('locked');
      if (ans) ans.lock();
    },
  };
}

// A pile of food the player deals into k cages (one cage at a time, or one to every cage), then answers.
function dealer({ n, k, z, ask }) {
  let cs, pile, locked = false;
  const pileEl = h('div', { class: 'zmul-pile' }), msg = h('div', { class: 'zmul-msg' });
  const cages = h('div', { class: 'zmul-cages', style: `grid-template-columns:repeat(${k <= 4 ? k : Math.ceil(k / 2)},1fr)` });
  const say = t => (msg.textContent = t);
  const draw = () => {
    pileEl.innerHTML = pile ? items(z.f, pile) : '<span class="zmul-empty">הערמה ריקה</span>';
    cages.innerHTML = '';
    cs.forEach((x, i) =>
      cages.append(h('div', { class: 'zmul-cage', role: 'button', 'aria-label': 'לתת', onclick: () => give(i) },
        h('div', { class: 'zmul-who' }, z.a), h('div', { class: 'zmul-in', html: items(z.f, x) }), h('b', {}, String(x)))));
  };
  const give = i => {
    if (locked) return;
    if (!pile) return say('לא נשאר מה לחלק.');
    pile--;
    cs[i]++;
    say('');
    draw();
  };
  const all = () => {
    if (locked) return;
    if (!pile) return say('לא נשאר מה לחלק.');
    if (pile < k) return say(`נשארו רק ${pile}, ואין מספיק לכל הכלובים.`);
    pile -= k;
    cs = cs.map(x => x + 1);
    say('');
    draw();
  };
  const reset = () => {
    if (locked) return;
    cs = Array(k).fill(0);
    pile = n;
    say('');
    draw();
  };
  cs = Array(k).fill(0);
  pile = n;
  draw();
  const ans = inputs(ask);
  const el = h('div', { class: 'zmul-deal' }, pileEl,
    h('div', { class: 'zmul-tools' },
      h('button', { type: 'button', class: 'btn tiny', onclick: all }, '⬇ אחד לכל כלוב'),
      h('button', { type: 'button', class: 'btn tiny', onclick: reset }, '↺ מהתחלה')),
    cages, msg, ans.el);
  return {
    el,
    value: () => ans.value(),
    set(a) {
      ans.set(a);
      cs = Array(k).fill(Math.floor(n / k));
      pile = n % k;
      say('');
      draw();
    },
    key: e => ans.key(e),
    lock() {
      locked = true;
      el.classList.add('locked');
      ans.lock();
    },
  };
}

// A number board 1..to; tap numbers to colour them.
function tapChart(to) {
  const on = new Set();
  let locked = false;
  const grid = h('div', { class: 'zmul-chart', dir: 'ltr' });
  const cells = range(to, i =>
    h('button', {
      type: 'button', class: 'zmul-cell',
      onclick: () => {
        if (locked) return;
        on.has(i + 1) ? on.delete(i + 1) : on.add(i + 1);
        paint();
      },
    }, String(i + 1)));
  const paint = () => cells.forEach((b, i) => b.classList.toggle('on', on.has(i + 1)));
  grid.append(...cells);
  return {
    el: h('div', { class: 'zmul-chartw' }, grid),
    value: () => (on.size ? [...on].sort((a, b) => a - b) : null),
    set(a) {
      on.clear();
      a.forEach(x => on.add(x));
      paint();
    },
    lock() {
      locked = true;
      grid.classList.add('locked');
    },
  };
}
const chartMsg = (target, why) => v => {
  const extra = v.filter(x => !target.includes(x)), miss = target.filter(x => !v.includes(x));
  if (extra.length) return `${M(extra[0])} לא ${why}.`;
  return miss.length === 1 ? 'חסר עוד מספר אחד.' : `חסרים עוד ${miss.length} מספרים.`;
};

// ---------- 1. equal groups ----------
const groups = {
  id: 'zmul-groups', title: 'קבוצות שוות',
  intro: `<p>כשיש כמה קבוצות, ובכל קבוצה אותו מספר, אפשר לחבר שוב ושוב את אותו מספר, או פשוט לכפול.</p>
    <div class="ex">3 סלים, ובכל סל 4 בננות:<br>${M('4 + 4 + 4 = 12')}<br>${M('3 × 4 = 12')} (3 פעמים 4)</div>
    <p>כשבונים כלובים: לחצו על + כדי להוסיף כלוב, על כלוב כדי להכניס אליו חיה, ועל − שבתוך הכלוב כדי להוציא.</p>`,
  gen(L) {
    const z = pick(ZOO);
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        const k = rnd(2, 5), n = rnd(2, 6), T = k * n;
        return {
          prompt: `השומר סידר ${z.food} בקבוצות. כמה קבוצות יש, וכמה בכל קבוצה? כתבו תרגיל כפל.`,
          visual: groupsPic(k, n, z.f), widget: inputs(mulLine(T)), ...mulAns(k, n),
          hints: ['ספרו את הקבוצות, ואז ספרו כמה יש בקבוצה אחת.', `יש ${k} קבוצות, ובכל אחת ${n}: ${M(`${sumOf(n, k)} = ${T}`)}.`],
          explain: `${k} קבוצות של ${n}: ${M(`${sumOf(n, k)} = ${T}`)}, כלומר ${M(`${X(k, n)} = ${T}`)}.`,
        };
      }
      if (t === 1) {
        const k = rnd(2, 4), n = rnd(2, 5), T = k * n;
        return {
          prompt: `בנו ${k} כלובים, ובכל כלוב ${n} ${z.many}. כמה ${z.many} יש בסך הכול?`,
          widget: pens({ item: z.a, ask: `בסך הכול: ${bx('t', T)}` }),
          answer: { c: Array(k).fill(n), t: T },
          check: v => v.c.length === k && v.c.every(x => x === n) && v.t === T,
          wrongMsg: v => (v.c.length !== k || v.c.some(x => x !== n) ? `צריך ${k} כלובים, ובכל כלוב ${n}.` : 'הכלובים בנויים נכון. ספרו שוב את כולם.'),
          hints: [`לחצו על + עד שיהיו ${k} כלובים. אחר כך לחצו על כל כלוב ${n} פעמים.`, `${M(`${sumOf(n, k)} = ${T}`)}`],
          explain: `${k} כלובים של ${n}: ${M(`${sumOf(n, k)} = ${T}`)}, כלומר ${M(`${X(k, n)} = ${T}`)}.`,
        };
      }
      let k, n;
      do {
        k = rnd(2, 5);
        n = rnd(2, 9);
      } while (k === n || k * n > 50);
      return pickOne({
        prompt: 'איזה תרגיל כפל שווה לתרגיל החיבור?',
        visual: sumPic(n, k) + (k * n <= 30 ? groupsPic(k, n, z.f) : ''),
        opts: [X(k, n), `${k} + ${n}`, X(k + 1, n), X(k, n + 1)].map(M), right: M(X(k, n)), cls: 'nums',
        hints: [`כמה פעמים מופיע המספר ${n} בתרגיל?`, `המספר ${n} מופיע ${k} פעמים.`],
        explain: `${n} מופיע ${k} פעמים, לכן ${M(`${sumOf(n, k)} = ${X(k, n)} = ${k * n}`)}.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        let k, n;
        do {
          k = rnd(6, 10);
          n = rnd(3, 9);
        } while (k * n > 90);
        return {
          prompt: 'השומר חיבר שוב ושוב את אותו מספר. כתבו את זה כתרגיל כפל ומצאו את התוצאה.',
          visual: sumPic(n, k), widget: inputs(mulLine(k * n)), ...mulAns(k, n),
          hints: [`כמה פעמים מופיע ${n}? ספרו בזהירות.`, `${n} מופיע ${k} פעמים, אז זה ${M(X(k, n))}.`],
          explain: `${n} מופיע ${k} פעמים: ${M(`${X(k, n)} = ${k * n}`)}.`,
        };
      }
      if (t === 1) {
        const n = rnd(3, 9), k = rnd(3, 9), dir = pick([1, -1]), k2 = k + dir, s = dir > 0 ? '+' : '−';
        return eq({
          prompt: `ידוע ש־${M(`${X(k, n)} = ${k * n}`)}. בלי לחשב מההתחלה: כמה זה ${M(X(k2, n))}?`,
          expr: `${X(k2, n)} = □`, ans: k2 * n,
          hints: [`${M(X(k2, n))} זה קבוצה אחת של ${n} ${dir > 0 ? 'יותר' : 'פחות'} מ־${M(X(k, n))}.`, `${M(`${k * n} ${s} ${n}`)}`],
          explain: `${k2} קבוצות של ${n} הן קבוצה אחת ${dir > 0 ? 'יותר' : 'פחות'} מ־${k} קבוצות: ${M(`${k * n} ${s} ${n} = ${k2 * n}`)}.`,
        });
      }
      const a = rnd(2, 5), b = rnd(2, 5), x = rnd(2, 9);
      let y;
      do y = rnd(2, 9); while (y === x);
      const T = a * x + b * y;
      return num({
        prompt: `${a} סלים, ובכל סל ${x} ${z.food}. עוד ${b} סלים, ובכל סל ${y} ${z.food}. כמה ${z.food} יש בכל הסלים יחד?`,
        pre: 'בסך הכול: ', answer: T,
        hints: ['חשבו כל סוג של סלים לחוד, ואז חברו.', `${M(`${X(a, x)} = ${a * x}`)} ו־${M(`${X(b, y)} = ${b * y}`)}.`],
        explain: `${M(`${X(a, x)} + ${X(b, y)} = ${a * x} + ${b * y} = ${T}`)}`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const k = rnd(3, 4), m = rnd(3, 6), c = Array(k).fill(m);
      while (c.every(x => x === m))
        for (let s = 0; s < 4; s++) {
          const i = rnd(0, k - 1), j = rnd(0, k - 1), q = rnd(1, 2);
          if (i !== j && c[i] - q >= 1 && c[j] + q <= 9) {
            c[i] -= q;
            c[j] += q;
          }
        }
      return {
        prompt: `החשבונאים בלבלו את ה${z.food}: בכל סל יש מספר אחר. העבירו ${z.food} בין הסלים כך שבכל הסלים יהיה אותו מספר.`,
        sig: c.join(), widget: pens({ item: z.f, init: c, fixed: true, pool: true, ask: `בכל סל: ${box('t', 2)}` }),
        answer: { c: Array(k).fill(m), t: m },
        check: v => v.c.every(x => x === m) && v.t === m,
        wrongMsg: v => (v.c.every(x => x === v.c[0]) ? 'הסלים שווים. בדקו את המספר שכתבתם.' : 'עדיין יש סלים עם מספר שונה.'),
        hints: ['לחצו על − בסל מלא כדי לקחת, ועל סל חסר כדי להניח.', `יש ${k * m} ${z.food} ו־${k} סלים. כמה פעמים ${k} נכנס ב־${k * m}?`, `${M(`${X(k, m)} = ${k * m}`)}, אז בכל סל ${m}.`],
        explain: `יש ${M(`${c.join(' + ')} = ${k * m}`)} ${z.food}. כש־${k} סלים שווים, בכל סל ${m}, כי ${M(`${X(k, m)} = ${k * m}`)}.`,
      };
    }
    if (t === 1) {
      const a = rnd(6, 9), n = rnd(3, 9), f = rnd(0, 2);
      if (f === 0)
        return eq({
          prompt: 'השלימו את המספר החסר.', expr: `${X(a, n)} = ${X(5, n)} + ${X('□', n)}`, ans: a - 5,
          hints: [`${a} קבוצות של ${n} הן 5 קבוצות ועוד כמה קבוצות?`, `${M(`${a} = 5 + ${a - 5}`)}`],
          explain: `${a} קבוצות של ${n} הן 5 קבוצות ועוד ${a - 5} קבוצות: ${M(`${a * n} = ${5 * n} + ${(a - 5) * n}`)}.`,
        });
      if (f === 1)
        return eq({
          prompt: 'השלימו את המספר החסר.', expr: `${X(a, n)} = ${X(10, n)} − ${X('□', n)}`, ans: 10 - a,
          hints: [`${a} קבוצות של ${n} הן 10 קבוצות פחות כמה קבוצות?`, `${M(`${a} = 10 − ${10 - a}`)}`],
          explain: `${a} קבוצות הן 10 קבוצות פחות ${10 - a}: ${M(`${a * n} = ${10 * n} − ${(10 - a) * n}`)}.`,
        });
      return eq({
        prompt: 'השלימו את המספר החסר.', expr: `${X(a, n)} = ${X(a - 1, n)} + □`, ans: n,
        hints: [`${M(X(a, n))} זה ${a - 1} קבוצות של ${n} ועוד קבוצה אחת.`, 'כמה יש בקבוצה אחת?'],
        explain: `${a} קבוצות של ${n} הן ${a - 1} קבוצות ועוד קבוצה אחת של ${n}: ${M(`${a * n} = ${(a - 1) * n} + ${n}`)}.`,
      });
    }
    if (t === 2) {
      let k, n, m;
      do {
        k = rnd(2, 6);
        n = rnd(2, 10);
        m = rnd(2, 10);
      } while ((k * n) % m || m === n || k * n > 60);
      const T = k * n;
      return num({
        prompt: `ב־${k} כלובים יש ${n} ${z.many} בכל כלוב. השומר מעביר את כולם לכלובים חדשים, ${m} ${z.many} בכל כלוב. כמה כלובים חדשים צריך?`,
        answer: T / m,
        hints: [`כמה ${z.many} יש בסך הכול?`, `יש ${M(`${X(k, n)} = ${T}`)} ${z.many}. כמה קבוצות של ${m} יש ב־${T}?`],
        explain: `${M(`${X(k, n)} = ${T}`)}, ו־${M(`${D(T, m)} = ${T / m}`)}, כי ${M(`${X(T / m, m)} = ${T}`)}.`,
      });
    }
    let a, b, c, d;
    do {
      [a, b, c, d] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(2, 9)];
    } while ((a === c && b === d) || (a === d && b === c) || Math.abs(a * b - c * d) > (Math.random() < 0.3 ? 0 : 6));
    const P = a * b, Q = c * d, o1 = `${a} קבוצות של ${b}`, o2 = `${c} קבוצות של ${d}`, o3 = 'שווה בדיוק';
    const right = P > Q ? o1 : P < Q ? o2 : o3, sg = P > Q ? '&gt;' : P < Q ? '&lt;' : '=';
    return {
      prompt: `איפה יש יותר ${z.food}?`, tries: 1,
      widget: choice([o1, o2, o3], { cols: 1 }), answer: [o1, o2, o3].indexOf(right), check: v => v === [o1, o2, o3].indexOf(right),
      hints: [`חשבו כל צד לחוד: ${M(X(a, b))} ו־${M(X(c, d))}.`],
      explain: `${M(`${X(a, b)} = ${P}`)} ו־${M(`${X(c, d)} = ${Q}`)}, לכן ${M(`${P} ${sg} ${Q}`)}.`,
    };
  },
};

// ---------- 2. arrays ----------
const arrays = {
  id: 'zmul-arrays', title: 'שורות וטורים',
  intro: `<p><b>מערך</b> הוא סידור בשורות שוות. <b>שורה</b> הולכת לרוחב (מצד לצד), ו<b>טור</b> הולך לגובה (מלמעלה למטה).</p>
    <div class="ex">3 שורות, ובכל שורה 5 פינגווינים: ${M('3 × 5 = 15')}.<br>אם מסובבים את המערך, מקבלים 5 שורות של 3: ${M('5 × 3 = 15')}. התוצאה לא משתנה!</div>
    <p>כשצובעים מערך: לחצו על משבצות או גררו עליהן את האצבע.</p>`,
  gen(L) {
    const z = pick(ZOO);
    if (L === 1) {
      const t = rnd(0, 2), r = rnd(2, 5), c = rnd(2, 6);
      if (t === 0)
        return {
          prompt: `ה${z.many} עומדים בשורות. כמה שורות יש? כמה בכל שורה? וכמה בסך הכול?`,
          visual: arrPic(r, c, z.a),
          widget: inputs(line(`שורות: ${box('r', 2)}`) + line(`בכל שורה: ${box('c', 2)}`) + line(`בסך הכול: ${bx('t', r * c)}`)),
          answer: { r, c, t: r * c }, check: v => v.r === r && v.c === c && v.t === r * c,
          hints: ['שורה הולכת לרוחב, מצד לצד. ספרו כמה שורות יש מלמעלה למטה.', `יש ${r} שורות של ${c}: ${M(X(r, c))}.`],
          explain: `${r} שורות, ובכל שורה ${c}: ${M(`${X(r, c)} = ${r * c}`)}.`,
        };
      if (t === 1) {
        const ans = range(r * c, i => `${Math.floor(i / c)},${i % c}`);
        return {
          prompt: `צבעו מערך של ${r} שורות, ובכל שורה ${c} משבצות.`,
          widget: gridPaint({ rows: 6, cols: 7 }), answer: ans,
          check: v => {
            const R = rectOf(v);
            return !!R && R.h === r && R.w === c;
          },
          wrongMsg: v => {
            const R = rectOf(v);
            return R ? `צבעתם ${R.h} שורות של ${R.w}.` : 'המשבצות הצבועות צריכות ליצור מלבן מלא.';
          },
          hints: ['שורה הולכת לרוחב. צבעו קודם שורה אחת.', `צבעו ${c} משבצות זו ליד זו, ואז עוד ${r - 1} שורות כמוה מתחתיה.`],
          explain: `${r} שורות של ${c} משבצות: ${M(`${X(r, c)} = ${r * c}`)} משבצות.`,
        };
      }
      return {
        prompt: `כתבו תרגיל כפל שמתאים למערך של ה${z.many}.`,
        visual: arrPic(r, c, z.a), widget: inputs(mulLine(r * c)), ...mulAns(r, c),
        hints: ['ספרו כמה שורות יש, וכמה בכל שורה.', `${r} שורות של ${c}.`],
        explain: `${M(`${X(r, c)} = ${r * c}`)} (וגם ${M(`${X(c, r)} = ${r * c}`)}).`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const N = pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24]);
        const ok = range(6, i => i + 2).filter(r => N % r === 0 && N / r >= 2 && N / r <= 8);
        const r = pick(ok), c = N / r;
        return {
          prompt: `השומר רוצה לסדר ${N} ${z.many} במערך. צבעו מערך (מלבן מלא) של ${N} משבצות, עם לפחות 2 שורות ולפחות 2 בכל שורה.`,
          widget: gridPaint({ rows: 7, cols: 8 }), answer: range(N, i => `${Math.floor(i / c)},${i % c}`),
          check: v => {
            const R = rectOf(v);
            return !!R && R.h * R.w === N && R.h >= 2 && R.w >= 2;
          },
          wrongMsg: v => {
            const R = rectOf(v);
            return !R ? 'המשבצות הצבועות צריכות ליצור מלבן מלא.' : R.h * R.w !== N ? `צבעתם ${R.h * R.w} משבצות, וצריך ${N}.` : 'צריך לפחות 2 שורות ולפחות 2 בכל שורה.';
          },
          hints: [`חפשו תרגיל כפל שהתוצאה שלו ${N}.`, `למשל ${M(`${X(r, c)} = ${N}`)}: ${r} שורות של ${c}.`],
          explain: `כל מלבן מתאים, למשל: ${ok.map(x => M(X(x, N / x))).join(', ')}.`,
        };
      }
      if (t === 1) {
        let r, c;
        do {
          r = rnd(3, 8);
          c = rnd(3, 9);
        } while (r === c);
        const opts = shuffle([X(r, c), X(c, r), `${r} + ${c}`, pick([X(r - 1, c), X(r, c + 1)])].map(M));
        const good = [opts.indexOf(M(X(r, c))), opts.indexOf(M(X(c, r)))].sort((a, b) => a - b);
        return {
          prompt: 'המערך הזה מתאים לשני תרגילי כפל. בחרו את שניהם.',
          visual: dots(r, c), widget: choice(opts, { multi: true, cols: 2, cls: 'nums' }), answer: good, check: v => same(v, good),
          hints: ['ספרו את השורות ואת הטורים.', `יש ${r} שורות של ${c}, וגם ${c} טורים של ${r}.`],
          explain: `${M(`${X(r, c)} = ${X(c, r)} = ${r * c}`)}: אפשר לספור לפי שורות או לפי טורים.`,
        };
      }
      const r = rnd(6, 10), c = rnd(3, 10);
      return {
        prompt: `כמה ${z.many} במערך? כתבו תרגיל כפל.`,
        visual: dots(r, c), widget: inputs(mulLine(r * c)), ...mulAns(r, c),
        hints: ['ספרו כמה שורות יש, וכמה נקודות בכל שורה.', `${r} שורות של ${c}: ${M(X(r, c))}.`],
        explain: `${M(`${X(r, c)} = ${r * c}`)}`,
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const N = pick([12, 16, 18, 20, 24, 30, 36, 40, 42, 48, 60]);
      const opts = range(9, i => String(i + 2)), good = opts.map((o, i) => (N % +o === 0 && N / +o >= 2 ? i : -1)).filter(i => i >= 0);
      return {
        prompt: `השומר רוצה לסדר ${N} ${z.many} בשורות שוות: לפחות 2 שורות, ולפחות 2 בכל שורה. כמה שורות אפשר לעשות? סמנו את כל האפשרויות.`,
        widget: choice(opts, { multi: true, cols: 5, cls: 'nums' }), answer: good, check: v => same(v, good),
        hints: [`אפשר לעשות 4 שורות רק אם ${N} מתחלק ל־4 בלי שארית. בדקו כך כל מספר.`, `בדקו כל מספר: למשל ${M(`${N} ÷ 2 = ${N / 2}`)}, אז 2 שורות זה אפשרי.`],
        explain: `אפשר: ${good.map(i => `${opts[i]} שורות של ${N / +opts[i]}`).join(', ')}. בכל אפשרות, מספר השורות כפול מספר ה${z.many} בשורה הוא ${N}.`,
      };
    }
    if (t === 1) {
      const r = rnd(4, 9), c = rnd(4, 9);
      return num({
        prompt: `שלט גדול מסתיר חלק ממערך ה${z.many}. כמה ${z.many} יש במערך כולו?`,
        visual: dots(r, c, { cover: true }), answer: r * c, pre: 'בסך הכול: ',
        hints: ['השורה העליונה מראה כמה יש בכל שורה, והטור השמאלי מראה כמה שורות יש.', `יש ${r} שורות, ובכל שורה ${c}.`],
        explain: `בשורה העליונה ${c}, ובטור השמאלי ${r}. לכן ${M(`${X(r, c)} = ${r * c}`)}.`,
      });
    }
    const a = rnd(2, 5), b = rnd(2, 5), c = rnd(3, 9), r = a + b;
    return {
      prompt: `חתכו את המערך של ${M(X(r, c))} לשני חלקים, וחשבו כל חלק.`,
      visual: dots(r, c, { split: a }),
      widget: inputs(line(M(`${X(a, c)} = ${bx('p', a * c)}`)) + line(M(`${X(b, c)} = ${bx('q', b * c)}`)) + line(M(`${X(r, c)} = ${bx('t', r * c)}`))),
      answer: { p: a * c, q: b * c, t: r * c }, check: v => v.p === a * c && v.q === b * c && v.t === r * c,
      hints: ['חשבו את החלק העליון ואת החלק התחתון לחוד.', `המערך כולו הוא שני החלקים יחד: ${M(`${a * c} + ${b * c}`)}.`],
      explain: `${M(`${X(r, c)} = ${X(a, c)} + ${X(b, c)} = ${a * c} + ${b * c} = ${r * c}`)}`,
    };
  },
};

// ---------- 3. patterns in the multiplication table ----------
// a piece of the table; blanks are "i_j" cells that become boxes c<i><j>
function tablePiece(rs, cs, blanks, hdr = true) {
  let s = `<div class="zmul-tbl" dir="ltr" style="grid-template-columns:repeat(${cs.length + (hdr ? 1 : 0)},auto)">`;
  if (hdr) s += '<span class="hd x">×</span>' + cs.map(c => `<span class="hd">${c}</span>`).join('');
  rs.forEach((r, i) => {
    if (hdr) s += `<span class="hd">${r}</span>`;
    cs.forEach((c, j) => (s += `<span class="cl">${blanks.includes(`${i}_${j}`) ? box(`c${i}${j}`, 3) : r * c}</span>`));
  });
  return s + '</div>';
}
const seqHTML = (vals, blanks) =>
  `<div class="zmul-seq" dir="ltr">${vals.map((v, i) => (blanks.includes(i) ? box('s' + i, String(v).length + 1) : `<span>${v}</span>`)).join('')}</div>`;

const table = {
  id: 'zmul-table', title: 'תבניות בלוח הכפל',
  intro: `<p>בלוח הכפל מסתתרות תבניות. בשורה של 5 המספרים נגמרים תמיד ב־5 או ב־0. בשורה של 10 תמיד ב־0. השורה של 4 היא כפולה מהשורה של 2.</p>
    <div class="ex">קפיצות של 3: ${LST([3, 6, 9, 12, 15, '…'])} בכל צעד מוסיפים 3.<br>${M('2 × 7 = 14')}, ולכן ${M('4 × 7 = 28')} (פי 2).</div>
    <p>כשיש לוח מספרים, לחצו על מספר כדי לצבוע אותו.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2), k = pick([2, 3, 4, 5, 10]);
      if (t === 0) {
        const s = rnd(1, 5), vals = range(6, i => k * (s + i)), bl = shuffle([2, 3, 4, 5]).slice(0, 2).sort();
        return {
          prompt: `הפיל קופץ בקפיצות של ${k}. השלימו את המספרים החסרים.`,
          widget: inputs(seqHTML(vals, bl)), answer: Object.fromEntries(bl.map(i => ['s' + i, vals[i]])),
          check: v => bl.every(i => v['s' + i] === vals[i]),
          hints: [`בכל צעד מוסיפים ${k}.`, `אחרי ${vals[bl[0] - 1]} בא ${M(`${vals[bl[0] - 1]} + ${k}`)}.`],
          explain: `${LST(vals)}: בכל צעד מוסיפים ${k}.`,
        };
      }
      if (t === 1) {
        const to = k === 10 ? 100 : 10 * k, target = range(to / k, i => k * (i + 1));
        const pat = { 2: 'בכל שורה הם בטורים של 2, 4, 6, 8 ו־10: המספרים הזוגיים.', 3: 'הם יוצרים קווים באלכסון.', 4: 'כולם זוגיים, והספרה האחרונה חוזרת: 4, 8, 2, 6, 0.', 5: 'כולם בשני טורים: נגמרים ב־5 או ב־0.', 10: 'כולם בטור האחרון: נגמרים ב־0.' }[k];
        return {
          prompt: `צבעו את כל המספרים בלוח שמגיעים אליהם בקפיצות של ${k} (${LST([k, 2 * k, 3 * k, '…'])}).`,
          widget: tapChart(to), answer: target, check: v => same(v, target), wrongMsg: chartMsg(target, `בקפיצות של ${k}`),
          hints: [`התחילו ב־${k} והוסיפו ${k} בכל פעם.`, `צריך לצבוע ${target.length} מספרים: ${LST([...target.slice(0, 4), '…'])}`],
          explain: `${LST(target)}. ${pat}`,
        };
      }
      const m = range(10, i => k * (i + 1)), right = pick(m.slice(1));
      let bad;
      do bad = right + pick([-2, -1, 1, 2]) * (k === 10 ? 5 : 1); while (bad % k === 0 || bad < 1);
      const others = shuffle(m.filter(x => x !== right)).slice(0, 2);
      return pickOne({
        prompt: `איזה מספר <b>לא</b> נמצא בקפיצות של ${k}?`,
        opts: [String(bad), String(right), ...others.map(String)], right: String(bad), cols: 4, cls: 'nums',
        hints: [`המספרים בקפיצות של ${k} הם ${LST([...m.slice(0, 5), '…'])}`, `בדקו את ${bad}: מה המספר הקרוב אליו בקפיצות של ${k}?`],
        explain: `קפיצות של ${k}: ${LST(m)}. ${bad} לא ביניהם.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const r0 = rnd(2, 8), c0 = rnd(2, 7), rs = range(3, i => r0 + i), cs = range(4, i => c0 + i);
        const bl = shuffle(range(12, i => `${Math.floor(i / 4)}_${i % 4}`)).slice(0, 3);
        const key = b => 'c' + b.replace('_', ''), val = b => rs[+b[0]] * cs[+b[2]];
        return {
          prompt: 'החשבונאים מחקו מספרים מחתיכה של לוח הכפל. השלימו אותם.',
          widget: inputs(tablePiece(rs, cs, bl)), answer: Object.fromEntries(bl.map(b => [key(b), val(b)])),
          check: v => bl.every(b => v[key(b)] === val(b)),
          hints: ['כל משבצת היא מספר השורה כפול מספר הטור.', `בכל שורה המספרים גדלים במספר של השורה. למשל בשורה של ${rs[0]}: ${LST(cs.map(c => rs[0] * c))}.`],
          explain: bl.map(b => M(`${X(rs[+b[0]], cs[+b[2]])} = ${val(b)}`)).join(', ') + '.',
        };
      }
      if (t === 1) {
        const k = pick([6, 7, 8, 9]), to = 10 * k, target = range(10, i => k * (i + 1));
        const pat = { 6: 'כולם זוגיים, והם השורה של 3 בדילוג.', 7: 'הספרה האחרונה שלהם עוברת על כל הספרות מ־0 עד 9, כל אחת פעם אחת.', 8: 'כולם זוגיים, והספרה האחרונה חוזרת: 8, 6, 4, 2, 0.', 9: 'הם יורדים באלכסון, וסכום הספרות שלהם תמיד 9.' }[k];
        return {
          prompt: `צבעו את כל המספרים שבשורה של ${k} בלוח הכפל (${LST([k, 2 * k, 3 * k, '…'])}).`,
          widget: tapChart(to), answer: target, check: v => same(v, target), wrongMsg: chartMsg(target, `בשורה של ${k}`),
          hints: [`התחילו ב־${k} והוסיפו ${k} בכל פעם.`, `${LST([...target.slice(0, 5), '…'])}`],
          explain: `${LST(target)}. ${pat}`,
        };
      }
      const [k, K] = pick([[2, 4], [3, 6], [4, 8], [5, 10]]), m = rnd(3, 9), up = Math.random() < 0.6;
      const [a, b] = up ? [k, K] : [K, k];
      return eq({
        prompt: `ידוע ש־${M(`${X(a, m)} = ${a * m}`)}. השורה של ${K} כפולה מהשורה של ${k}. כמה זה ${M(X(b, m))}?`,
        expr: `${X(b, m)} = □`, ans: b * m,
        hints: [up ? `${M(X(b, m))} גדול פי 2 מ־${M(X(a, m))}.` : `${M(X(b, m))} הוא חצי מ־${M(X(a, m))}.`, up ? `${M(`${a * m} + ${a * m}`)}` : `חצי של ${a * m}.`],
        explain: up ? `${M(`${X(b, m)} = ${a * m} + ${a * m} = ${b * m}`)}` : `${M(X(b, m))} הוא חצי של ${a * m}, כלומר ${b * m}.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const a = rnd(2, 9), b = rnd(2, 8), rs = [a, a + 1], cs = [b, b + 1, b + 2], blank = `${rnd(0, 1)}_${rnd(0, 2)}`;
      const ans = rs[+blank[0]] * cs[+blank[2]];
      return {
        prompt: 'זו חתיכה מלוח הכפל, בלי מספרי השורות והטורים. איזה מספר חסר?',
        widget: inputs(tablePiece(rs, cs, [blank], false)), answer: { ['c' + blank.replace('_', '')]: ans },
        check: v => v['c' + blank.replace('_', '')] === ans,
        hints: ['בכל שורה המספרים גדלים באותו מספר. כמה?', `בשורה העליונה גדלים ב־${a}, ובתחתונה ב־${a + 1}. זו השורה של ${a} והשורה של ${a + 1}.`],
        explain: `זו השורה של ${a} והשורה של ${a + 1}, בטורים ${LST(cs)}. החסר: ${M(`${X(rs[+blank[0]], cs[+blank[2]])} = ${ans}`)}.`,
      };
    }
    if (t === 1) {
      const [p, q, to] = pick([[2, 3, 40], [3, 4, 60], [4, 6, 60], [2, 5, 60], [3, 5, 60], [6, 8, 100], [4, 10, 100], [6, 9, 100], [4, 5, 100], [3, 6, 50]]);
      const target = range(to, i => i + 1).filter(x => x % p === 0 && x % q === 0);
      return {
        prompt: `צבעו את המספרים שמגיעים אליהם <b>גם</b> בקפיצות של ${p} <b>וגם</b> בקפיצות של ${q}.`,
        widget: tapChart(to), answer: target, check: v => same(v, target), wrongMsg: chartMsg(target, `גם בקפיצות של ${p} וגם בקפיצות של ${q}`),
        hints: [`מהו המספר הראשון שנמצא בשתי הרשימות? התחילו לספור בקפיצות של ${q} ובדקו.`, `הראשון הוא ${target[0]}, ומשם ממשיכים בקפיצות של ${target[0]}.`],
        explain: `${LST(target)}: הקפיצות של ${target[0]}.`,
      };
    }
    const N = pick([4, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 25, 30, 36, 40, 48, 49, 60, 64]);
    const pairs = range(10, i => i + 1).filter(a => N % a === 0 && N / a <= 10).map(a => X(a, N / a));
    return num({
      prompt: `בכמה משבצות בלוח הכפל (מ־${M('1 × 1')} עד ${M('10 × 10')}) כתוב המספר ${N}?`,
      answer: pairs.length, pre: 'במשבצות: ',
      hints: [`חפשו את כל התרגילים בלוח שהתוצאה שלהם ${N}. גם ${M('2 × 3')} וגם ${M('3 × 2')} נחשבים, כי הם במשבצות שונות.`, `אחד מהם: ${M(pairs[0])}. חפשו עוד.`],
      explain: `${pairs.map(M).join(', ')}: ${pairs.length === 1 ? 'משבצת אחת' : `${pairs.length} משבצות`}.`,
    });
  },
};

// ---------- 4. sharing equally ----------
const share = {
  id: 'zmul-share', title: 'חלוקה שווה',
  intro: `<p><b>חילוק</b> הוא חלוקה שווה: כל אחד מקבל אותו מספר. מחלקים אחד לכל כלוב, שוב ושוב, עד שהערמה נגמרת.</p>
    <div class="ex">12 דגים ל־3 פינגווינים: ${M('12 ÷ 3 = 4')}, כי ${M('3 × 4 = 12')}.</div>
    <p>לחצו על כלוב כדי לתת לו אחד מהערמה, או על "אחד לכל כלוב" כדי לתת אחד לכל הכלובים בבת אחת. בסוף כתבו את התשובה.</p>`,
  gen(L) {
    const z = pick(ZOO);
    const deal = (k, q) => {
      const n = k * q;
      return {
        prompt: `השומר מחלק ${n} ${z.food} שווה בשווה בין ${k} ${z.many}. כמה יקבל כל ${z.one}?`,
        widget: dealer({ n, k, z, ask: line(M(`${D(n, k)} = ${bx('q', q)}`)) }), answer: { q }, check: v => v.q === q,
        hints: ['תנו אחד לכל כלוב, שוב ושוב, עד שהערמה נגמרת.', `איזה מספר כפול ${k} נותן ${n}? ${M(`${k} × ? = ${n}`)}`],
        explain: `כל ${z.one} מקבל ${q}, כי ${M(`${X(k, q)} = ${n}`)}. לכן ${M(`${D(n, k)} = ${q}`)}.`,
      };
    };
    if (L === 1) {
      if (Math.random() < 0.65) return deal(rnd(2, 5), rnd(2, 5));
      const q = rnd(2, 5), k = rnd(2, 5), n = k * q;
      return eq({
        prompt: `יש ${n} ${z.food}. כל ${z.one} מקבל ${q}. לכמה ${z.many} יספיקו ה${z.food}?`,
        visual: `<div class="zmul-pile">${items(z.f, n)}</div>`, expr: `${D(n, q)} = □`, ans: k,
        hints: [`כמה קבוצות של ${q} אפשר לעשות מ־${n}?`, `ספרו בקפיצות של ${q}: ${LST(range(k, i => q * (i + 1)))}.`],
        explain: `${M(`${D(n, q)} = ${k}`)}, כי ${M(`${X(k, q)} = ${n}`)}. יספיקו ל־${k} ${z.many}.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 3);
      if (t === 0) {
        let k, q;
        do {
          k = rnd(3, 8);
          q = rnd(3, 8);
        } while (k * q > 48);
        return deal(k, q);
      }
      const k = rnd(3, 10), q = rnd(3, 10), n = k * q;
      if (t === 1)
        return eq({
          prompt: `${n} ${z.food} מחולקים שווה בשווה בין ${k} ${z.many}. כמה מקבל כל ${z.one}?`,
          expr: `${D(n, k)} = □`, ans: q,
          hints: ['חילוק הוא הפוך מכפל.', `חפשו: ${M(`${k} × ? = ${n}`)}`],
          explain: `${M(`${D(n, k)} = ${q}`)}, כי ${M(`${X(k, q)} = ${n}`)}.`,
        });
      if (t === 2)
        return eq({
          prompt: `יש ${n} ${z.food}. בכל דלי שמים ${q}. כמה דליים ממלאים?`,
          expr: `${D(n, q)} = □`, ans: k,
          hints: [`כמה פעמים ${q} נכנס ב־${n}?`, `חפשו: ${M(`? × ${q} = ${n}`)}`],
          explain: `${M(`${D(n, q)} = ${k}`)}, כי ${M(`${X(k, q)} = ${n}`)}.`,
        });
      return pickOne({
        prompt: `איזה תרגיל כפל עוזר לפתור את ${M(D(n, k))}?`,
        opts: [`${X(k, q)} = ${n}`, `${n} + ${k} = ${n + k}`, `${n} − ${k} = ${n - k}`, `${X(k, q + 1)} = ${k * (q + 1)}`].map(M), right: M(`${X(k, q)} = ${n}`), cols: 1,
        hints: [`חילוק הוא הפוך מכפל: מחפשים מספר שכשכופלים אותו ב־${k} יוצא ${n}.`],
        explain: `${M(`${X(k, q)} = ${n}`)}, ולכן ${M(`${D(n, k)} = ${q}`)}.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const k = rnd(2, 5), q = rnd(2, 9), n = q * (k + 2);
      return num({
        prompt: `${n} בוטנים מתחלקים בין ${k} פילים קטנים ופיל אחד גדול. הפיל הגדול מקבל פי 2 מכל פיל קטן. כמה מקבל כל פיל קטן?`,
        answer: q, pre: 'כל פיל קטן: ',
        hints: [`הפיל הגדול מקבל כמו 2 פילים קטנים. אז זה כאילו יש ${k + 2} פילים קטנים.`, `מחלקים ${n} ל־${k + 2} חלקים שווים.`],
        explain: `הפיל הגדול שווה 2 חלקים, אז יש ${M(`${k} + 2 = ${k + 2}`)} חלקים. ${M(`${D(n, k + 2)} = ${q}`)}: כל פיל קטן מקבל ${q}, והגדול ${2 * q}.`,
      });
    }
    if (t === 1) {
      let T, k1, k2;
      do {
        T = pick([12, 18, 20, 24, 30, 36, 40, 48, 60]);
        const ds = range(9, i => i + 2).filter(d => T % d === 0 && T / d <= 12);
        k1 = pick(ds);
        k2 = pick(ds);
      } while (k1 === k2);
      return num({
        prompt: `${z.food} חולקו שווה בשווה בין ${k1} ${z.many}, וכל ${z.one} קיבל ${T / k1}. עכשיו מחלקים את אותה כמות בין ${k2} ${z.many}. כמה יקבל כל ${z.one}?`,
        answer: T / k2, pre: 'כל אחד יקבל: ',
        hints: [`כמה ${z.food} יש בסך הכול?`, `יש ${M(`${X(k1, T / k1)} = ${T}`)}. עכשיו מחלקים ל־${k2}.`],
        explain: `בסך הכול ${M(`${X(k1, T / k1)} = ${T}`)}, ו־${M(`${D(T, k2)} = ${T / k2}`)}.`,
      });
    }
    const k = rnd(3, 8), q = rnd(3, 9), r = rnd(2, 9), n = k * q + r;
    if (Math.random() < 0.5)
      return num({
        prompt: `השומר הביא ${n} ${z.food}. ${r} הוא שמר לארוחת הערב, ואת כל השאר חילק שווה בשווה בין ${k} ${z.many}. כמה קיבל כל ${z.one}?`,
        answer: q, pre: 'כל אחד קיבל: ',
        hints: ['קודם מורידים את מה שהשומר שמר.', `${M(`${n} − ${r} = ${n - r}`)}. עכשיו מחלקים ל־${k}.`],
        explain: `${M(`${n} − ${r} = ${n - r}`)}, ו־${M(`${D(n - r, k)} = ${q}`)}.`,
      });
    return num({
      prompt: `השומר חילק ${z.food} בין ${k} ${z.many}, וכל ${z.one} קיבל ${q}. נשארו לשומר עוד ${r}. כמה ${z.food} היו לשומר בהתחלה?`,
      answer: n, pre: 'בהתחלה: ',
      hints: [`כמה ${z.food} קיבלו כל ה${z.many} יחד?`, `${M(`${X(k, q)} = ${k * q}`)}, ועוד ${r} שנשארו.`],
      explain: `${M(`${X(k, q)} + ${r} = ${k * q} + ${r} = ${n}`)}`,
    });
  },
};

// ---------- 5. fact families ----------
// three cards a, b, a×b hidden among two others, with no other triple x × y = z
function familyCards() {
  for (;;) {
    const a = rnd(2, 9);
    let b;
    do b = rnd(2, 9); while (b === a);
    const P = a * b, pool = [a + 1, b + 1, a + b, P - a, P + b, P + 2, a * (b + 1), 2 * a, b - 1].filter(x => x > 1 && ![a, b, P].includes(x));
    const extra = shuffle([...new Set(pool)]).slice(0, 2), cards = [a, b, P, ...extra];
    const bad = cards.some((x, i) => cards.some((y, j) => j > i && cards.some((w, l) => l !== i && l !== j && x * y === w && !(new Set([x, y, w]).size === 3 && [a, b, P].every(v => [x, y, w].includes(v))))));
    if (extra.length === 2 && !bad) return { a, b, P, cards: shuffle(cards) };
  }
}

const family = {
  id: 'zmul-family', title: 'משפחות עובדות',
  intro: `<p>שלושה מספרים כמו 3, 6 ו־18 הם <b>משפחה</b>: אפשר לכתוב מהם שני תרגילי כפל ושני תרגילי חילוק.</p>
    <div class="ex">${M('3 × 6 = 18')}<br>${M('6 × 3 = 18')}<br>${M('18 ÷ 3 = 6')}<br>${M('18 ÷ 6 = 3')}</div>
    <p>במשולש: המספר הגדול (המכפלה) למעלה, ושני המספרים שכופלים למטה.</p>`,
  gen(L) {
    if (L === 1) {
      const a = rnd(2, 5);
      let b;
      do b = rnd(2, 10); while (b === a);
      const P = a * b;
      if (Math.random() < 0.6)
        return {
          prompt: 'השלימו את ארבעת התרגילים של המשפחה מהמשולש.',
          visual: tri(P, a, b),
          widget: inputs(`<div class="zmul-fam">${[[X(a, b), 'w', P], [X(b, a), 'x', P], [D(P, a), 'y', b], [D(P, b), 'z', a]].map(([e, k, v]) => line(M(`${e} = ${bx(k, v)}`))).join('')}</div>`),
          answer: { w: P, x: P, y: b, z: a }, check: v => v.w === P && v.x === P && v.y === b && v.z === a,
          hints: ['בכפל מקבלים את המספר שלמעלה. בחילוק מתחילים מהמספר שלמעלה.', `${M(`${X(a, b)} = ${P}`)}, ולכן ${M(`${D(P, a)} = ${b}`)}.`],
          explain: `${M(`${X(a, b)} = ${P}`)}, ${M(`${X(b, a)} = ${P}`)}, ${M(`${D(P, a)} = ${b}`)}, ${M(`${D(P, b)} = ${a}`)}.`,
        };
      const intr = pick([`${a} + ${b} = ${a + b}`, `${P} − ${a} = ${P - a}`, `${X(a, b + 1)} = ${a * (b + 1)}`]);
      return pickOne({
        prompt: `איזה תרגיל <b>לא</b> שייך למשפחה של ${M(`${a}, ${b}, ${P}`)}?`,
        visual: tri(P, a, b),
        opts: [`${X(a, b)} = ${P}`, `${D(P, a)} = ${b}`, `${D(P, b)} = ${a}`, intr].map(M), right: M(intr),
        hints: ['במשפחה יש רק כפל וחילוק, ורק שלושת המספרים מהמשולש.'],
        explain: `${M(intr)} לא שייך. במשפחה: ${M(`${X(a, b)} = ${P}`)}, ${M(`${X(b, a)} = ${P}`)}, ${M(`${D(P, a)} = ${b}`)}, ${M(`${D(P, b)} = ${a}`)}.`,
      });
    }
    if (L === 2) {
      const a = rnd(2, 10), b = rnd(2, 10), P = a * b;
      if (Math.random() < 0.55) {
        const miss = rnd(0, 2), m = [P, a, b][miss];
        const hint1 = miss === 0 ? `כפלו את שני המספרים שלמטה: ${M(X(a, b))}.` : `חלקו את המספר שלמעלה במספר השני שלמטה: ${M(D(P, miss === 1 ? b : a))}.`;
        return {
          prompt: 'מצאו את המספר החסר במשולש, ואז השלימו תרגיל חילוק מאותה משפחה.',
          visual: tri(miss === 0 ? null : P, miss === 1 ? null : a, miss === 2 ? null : b),
          widget: inputs(line(`המספר החסר: ${bx('m', m)}`) + line(M(`${P === m ? box('p', 3) : P} ÷ ${box('x', 2)} = ${box('y', 2)}`))),
          answer: miss === 0 ? { m, p: P, x: a, y: b } : { m, x: a, y: b },
          check: v => v.m === m && (miss !== 0 || v.p === P) && ((v.x === a && v.y === b) || (v.x === b && v.y === a)),
          hints: [hint1, `המשפחה היא ${M(`${a}, ${b}, ${P}`)}. בחילוק מתחילים מ־${P}.`],
          explain: `החסר הוא ${m}, כי ${M(`${X(a, b)} = ${P}`)}. תרגיל חילוק: ${M(`${D(P, a)} = ${b}`)} (או ${M(`${D(P, b)} = ${a}`)}).`,
        };
      }
      const a2 = rnd(2, 10), b2 = rnd(2, 10), P2 = a2 * b2;
      const forms = [
        [`□ × ${b} = ${P}`, a, `${M(`${D(P, b)} = ${a}`)}`],
        [`${D(P, '□')} = ${b}`, a, `${M(`${X(a, b)} = ${P}`)}`],
        [`□ ÷ ${a} = ${b}`, P, `${M(`${X(a, b)} = ${P}`)}`],
      ];
      const forms2 = [
        [`${a2} × □ = ${P2}`, b2, `${M(`${D(P2, a2)} = ${b2}`)}`],
        [`${D(P2, a2)} = □`, b2, `${M(`${X(a2, b2)} = ${P2}`)}`],
        [`□ ÷ ${b2} = ${a2}`, P2, `${M(`${X(a2, b2)} = ${P2}`)}`],
      ];
      const [e1, v1, w1] = pick(forms), [e2, v2, w2] = pick(forms2);
      return {
        prompt: 'השלימו את המספרים החסרים. היעזרו בתרגיל מאותה משפחה.',
        widget: inputs(line(M(e1.replace('□', bx('p', v1)))) + line(M(e2.replace('□', bx('q', v2))))),
        answer: { p: v1, q: v2 }, check: v => v.p === v1 && v.q === v2,
        hints: ['כל תרגיל כפל אפשר להפוך לתרגיל חילוק, ולהפך.', `למשל: ${w1}.`],
        explain: `${M(e1.replace('□', v1))}, כי ${w1}. ${M(e2.replace('□', v2))}, כי ${w2}.`,
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const { a, b, P, cards } = familyCards(), good = [a, b, P].map(x => cards.indexOf(x)).sort((x, y) => x - y);
      return {
        prompt: 'שלושה מהקלפים הם משפחה של כפל וחילוק. בחרו אותם.',
        widget: choice(cards.map(String), { multi: true, cols: 5, cls: 'nums' }), answer: good, check: v => same(v, good),
        hints: ['חפשו שני מספרים שהמכפלה שלהם היא קלף אחר.', `התחילו מהקלף הגדול ביותר שמתאים: איזה שני קלפים כופלים ומקבלים ${P}?`],
        explain: `${M(`${a}, ${b}, ${P}`)}, כי ${M(`${X(a, b)} = ${P}`)}.`,
      };
    }
    if (t === 1) {
      const y = rnd(2, 4), q = rnd(2, 5), x = q * y, P = x * y;
      return {
        prompt: `החשבונאית חושבת על שני מספרים. כשכופלים אותם יוצא ${P}. כשמחלקים את הגדול בקטן יוצא ${q}. מה המספרים?`,
        widget: inputs(line(`הגדול: ${bx('x', x)}`) + line(`הקטן: ${bx('y', y)}`)), answer: { x, y }, check: v => v.x === x && v.y === y,
        hints: [`הגדול הוא פי ${q} מהקטן. נסו מספרים קטנים בתור הקטן.`, `אם הקטן הוא ${y}, הגדול הוא ${M(X(q, y))}. בדקו את הכפל.`],
        explain: `הקטן ${y} והגדול ${x}: ${M(`${X(x, y)} = ${P}`)} ו־${M(`${D(x, y)} = ${q}`)}.`,
      };
    }
    const a = rnd(2, 9), b = rnd(2, 9), B = b * pick([10, 100]), P = a * B;
    return {
      prompt: `גם למספרים עגולים יש משפחות. ידוע ש־${M(`${X(a, B)} = ${P}`)}. השלימו:`,
      visual: tri(P, a, B),
      widget: inputs(line(M(`${D(P, a)} = ${bx('x', B)}`)) + line(M(`${D(P, B)} = ${bx('y', a)}`))),
      answer: { x: B, y: a }, check: v => v.x === B && v.y === a,
      hints: ['אלה אותם שלושה מספרים מהמשולש, רק בחילוק.', `${M(`${X(a, B)} = ${P}`)}, ולכן ${M(`${D(P, a)} = ${B}`)}.`],
      explain: `${M(`${D(P, a)} = ${B}`)} ו־${M(`${D(P, B)} = ${a}`)}.`,
    };
  },
};

// ---------- 6. division with a remainder ----------
const remLines = (n, k, q, r) => line(M(`${D(n, k)} = ${bx('q', q)}`)) + line(`שארית: ${bx('r', r)}`);

const remainder = {
  id: 'zmul-rem', title: 'חילוק עם שארית',
  intro: `<p>לפעמים אי אפשר לחלק הכול שווה בשווה. מה שנשאר ואי אפשר לחלק נקרא <b>שארית</b>. השארית תמיד קטנה ממספר הכלובים, אחרת אפשר היה לתת עוד סיבוב.</p>
    <div class="ex">14 דגים ל־4 פינגווינים: כל אחד מקבל 3 (כי ${M('4 × 3 = 12')}), ונשארים 2.<br>${M('14 ÷ 4 = 3')} ושארית 2.</div>
    <p>כשיש כלובים, חלקו כמו בחלוקה שווה (לחיצה על כלוב, או "אחד לכל כלוב"), וראו מה נשאר בערמה.</p>`,
  gen(L) {
    const z = pick(ZOO);
    const deal = (n, k) => {
      const q = Math.floor(n / k), r = n % k;
      return {
        prompt: `השומר מחלק ${n} ${z.food} שווה בשווה בין ${k} ${z.many}. מה שלא אפשר לחלק נשאר אצלו. כמה יקבל כל ${z.one}, וכמה יישארו?`,
        widget: dealer({ n, k, z, ask: remLines(n, k, q, r) }), answer: { q, r }, check: v => v.q === q && v.r === r,
        hints: ['תנו אחד לכל כלוב, שוב ושוב, עד שאין מספיק לכולם.', `${M(`${X(k, q)} = ${k * q}`)}. כמה חסר עד ${n}?`],
        explain: `כל ${z.one} מקבל ${q}, כי ${M(`${X(k, q)} = ${k * q}`)}, ונשארים ${M(`${n} − ${k * q} = ${r}`)}. ${M(`${D(n, k)} = ${q}`)} ושארית ${r}.`,
      };
    };
    const any = (lo, hi, kl, kh) => {
      let n, k;
      do {
        k = rnd(kl, kh);
        n = rnd(lo, hi);
      } while (n % k === 0 || n < 2 * k);
      return [n, k];
    };
    if (L === 1) {
      if (Math.random() < 0.6) return deal(...any(7, 20, 2, 4));
      const [n, q] = any(7, 22, 2, 5), k = Math.floor(n / q), r = n % q;
      return {
        prompt: `יש ${n} ${z.food}. בכל שקית שמים ${q}. כמה שקיות מלאות יהיו, וכמה ${z.food} יישארו בחוץ?`,
        visual: `<div class="zmul-pile">${items(z.f, n)}</div>`,
        widget: inputs(line(`שקיות מלאות: ${bx('q', k)}`) + line(`נשארו בחוץ: ${bx('r', r)}`)), answer: { q: k, r }, check: v => v.q === k && v.r === r,
        hints: [`ספרו בקפיצות של ${q} עד שאי אפשר להמשיך בלי לעבור את ${n}.`, `${LST(range(k, i => q * (i + 1)))}: ${k} שקיות.`],
        explain: `${M(`${X(k, q)} = ${k * q}`)}, ונשארים ${M(`${n} − ${k * q} = ${r}`)}. ${k} שקיות מלאות ו־${r} בחוץ.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) return deal(...any(13, 40, 3, 6));
      const [n, k] = any(20, 89, 3, 9), q = Math.floor(n / k), r = n % k;
      if (t === 1)
        return {
          prompt: `חלקו ${n} ${z.food} בין ${k} ${z.many}. כמה מקבל כל אחד, וכמה נשארים?`,
          widget: inputs(remLines(n, k, q, r)), answer: { q, r }, check: v => v.q === q && v.r === r,
          hints: [`חפשו בשורה של ${k} את המספר הגדול ביותר שלא עובר את ${n}.`, `${M(`${X(k, q)} = ${k * q}`)}. כמה חסר עד ${n}?`],
          explain: `${M(`${X(k, q)} = ${k * q}`)}, ו־${M(`${n} − ${k * q} = ${r}`)}. לכן ${M(`${D(n, k)} = ${q}`)} ושארית ${r}.`,
        };
      const opt = (a, b) => `${M(`${D(n, k)} = ${a}`)} שארית ${b}`;
      const wrong = shuffle([opt(q - 1, r + k), opt(q, r + 1 < k ? r + 1 : r - 1), opt(q + 1, r)]);
      return pickOne({
        prompt: 'איזו תשובה נכונה?', tries: 1, cols: 1,
        opts: [opt(q, r), ...wrong], right: opt(q, r),
        hints: [`השארית חייבת להיות קטנה מ־${k}. בדקו כל תשובה: כפל ועוד שארית צריכים לתת ${n}.`],
        explain: `${M(`${X(k, q)} + ${r} = ${n}`)}, והשארית ${r} קטנה מ־${k}. לכן ${opt(q, r)}.`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const [n, k] = any(20, 60, 3, 8), up = Math.random() < 0.5, q = Math.floor(n / k), ans = up ? q + 1 : q;
      return num({
        prompt: up
          ? `${n} ילדים נוסעים ברכבת של גן החיות. בכל קרון יש ${k} מקומות. כמה קרונות צריך כדי שכל הילדים ייסעו?`
          : `השומר אורז ${n} ${z.food} בשקיות של ${k}. רק שקית מלאה נשלחת ל${z.many}. כמה שקיות יישלחו?`,
        answer: ans, pre: up ? 'קרונות: ' : 'שקיות: ',
        hints: [`${M(`${D(n, k)} = ${q}`)} ושארית ${n % k}.`, up ? `מה עושים עם ${n % k} הילדים שנשארו?` : 'השקית שאינה מלאה לא נשלחת.'],
        explain: up ? `${M(`${D(n, k)} = ${q}`)} ושארית ${n % k}. לילדים שנשארו צריך עוד קרון: ${M(`${q} + 1 = ${ans}`)}.` : `${M(`${D(n, k)} = ${q}`)} ושארית ${n % k}. רק ${q} שקיות מלאות.`,
      });
    }
    if (t === 1) {
      const k = rnd(3, 9), q = rnd(3, 9), r = rnd(1, k - 1), n = k * q + r;
      return num({
        prompt: `החשבונאית חשבה על מספר. כשחילקה אותו ב־${k}, יצא ${q} ושארית ${r}. על איזה מספר חשבה?`,
        answer: n, pre: 'המספר: ',
        hints: ['עשו את הדרך ההפוכה: קודם כפל, ואז מוסיפים את השארית.', `${M(`${X(k, q)} = ${k * q}`)}`],
        explain: `${M(`${X(k, q)} + ${r} = ${n}`)}. בדיקה: ${M(`${D(n, k)} = ${q}`)} ושארית ${r}.`,
      });
    }
    if (t === 2) {
      const k = rnd(3, 9), q = rnd(3, 9), r = rnd(1, k - 1), n = k * q + r, d1 = rnd(1, k - 1), d2 = rnd(1, k - d1);
      return num({
        prompt: `איזה מספר גדול מ־${n - d1} וקטן מ־${n + d2}, וכשמחלקים אותו ב־${k} נשארת שארית ${r}?`,
        answer: n, pre: 'המספר: ',
        hints: [`בדקו כל מספר שבין ${n - d1} ל־${n + d2}.`, `${M(`${X(k, q)} = ${k * q}`)}, ומה צריך להוסיף כדי לקבל שארית ${r}?`],
        explain: `${M(`${X(k, q)} + ${r} = ${n}`)}, ו־${n} בין ${n - d1} ל־${n + d2}.`,
      });
    }
    const k = rnd(3, 9);
    return num({
      prompt: `מחלקים מספר כלשהו של ${z.food} בין ${k} ${z.many}. מה השארית <b>הגדולה ביותר</b> שיכולה להישאר?`,
      answer: k - 1, pre: 'השארית: ',
      hints: [`מה קורה אם נשארו ${k} ${z.food}?`, `אם נשארו ${k} או יותר, אפשר לתת עוד אחד לכל ${z.one}.`],
      explain: `השארית תמיד קטנה מ־${k}, אז הכי הרבה ${k - 1}. אם היו נשארים ${k}, היינו נותנים עוד סיבוב.`,
    });
  },
};

// ---------- 7. multiplying tens and hundreds ----------
const tens = {
  id: 'zmul-tens', title: 'כפל בעשרות ובמאות',
  intro: `<p>${M('3 × 40')} הם 3 פעמים 4 עשרות, כלומר 12 עשרות, שהן 120. מחשבים ${M('3 × 4')} ומוסיפים את האפס.</p>
    <div class="ex">${M('3 × 40 = 120')} (12 עשרות)<br>${M('6 × 300 = 1800')} (18 מאות)<br>${M('5 × 40 = 200')}: ${M('5 × 4 = 20')}, ועוד אפס. כאן יש שני אפסים!</div>`,
  gen(L) {
    const z = pick(ZOO);
    if (L === 1) {
      const t = rnd(0, 2), k = rnd(2, 5), m = rnd(2, 5), T = k * m * 10;
      if (t === 0)
        return {
          prompt: `${M(X(k, m * 10))} זה ${k} קבוצות של ${m} עשרות. כמה עשרות יש בסך הכול? וכמה זה?`,
          visual: blocks(k, m, 't'),
          widget: inputs(line(`עשרות: ${bx('d', k * m)}`) + line(M(`${X(k, m * 10)} = ${bx('t', T)}`))),
          answer: { d: k * m, t: T }, check: v => v.d === k * m && v.t === T,
          hints: [`בכל קבוצה ${m} מקלות של 10. ${M(`${X(k, m)} = ${k * m}`)} מקלות.`, `${k * m} עשרות הן ${T}.`],
          explain: `${M(`${X(k, m)} = ${k * m}`)} עשרות, ו־${k * m} עשרות הן ${T}. לכן ${M(`${X(k, m * 10)} = ${T}`)}.`,
        };
      if (t === 1)
        return eq({
          prompt: `ב־${k} ארגזים יש ${m * 10} ${z.food} בכל ארגז. כמה ${z.food} יש בכל הארגזים?`,
          visual: blocks(k, m, 't'), expr: `${X(k, m * 10)} = □`, ans: T,
          hints: [`כל מקל הוא 10. ${M(`${X(k, m)} = ${k * m}`)} מקלות.`, `${k * m} עשרות.`],
          explain: `${M(`${X(k, m * 10)} = ${T}`)}, כי ${M(`${X(k, m)} = ${k * m}`)} עשרות.`,
        });
      return pickOne({
        prompt: `כמה זה ${M(X(k, m * 10))}?`, tries: 1, cls: 'nums',
        opts: [T, k * m, T * 10, k + m * 10].map(String), right: String(T),
        hints: [`${M(`${X(k, m)} = ${k * m}`)}, ואלה עשרות.`],
        explain: `${M(`${X(k, m)} = ${k * m}`)}, ו־${k * m} עשרות הן ${T}.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 2), k = rnd(2, 9), m = rnd(2, 9), z10 = pick([10, 100]), B = m * z10, T = k * B, name = z10 === 10 ? 'עשרות' : 'מאות';
      if (t === 0) {
        const sw = Math.random() < 0.3;
        return eq({
          prompt: 'פתרו בעזרת עובדת כפל שאתם מכירים.',
          visual: z10 === 100 && k * m <= 12 ? blocks(k, m, 'h') : '', expr: `${sw ? X(B, k) : X(k, B)} = □`, ans: T,
          hints: [`${M(`${X(k, m)} = ${k * m}`)}`, `${k * m} ${name}.`],
          explain: `${M(`${X(k, m)} = ${k * m}`)}, ולכן ${M(`${sw ? X(B, k) : X(k, B)} = ${T}`)} (${k * m} ${name}).`,
        });
      }
      if (t === 1)
        return num({
          prompt: `${k} משאיות הביאו לפילים חציר. כל משאית הביאה ${B} קילו. כמה קילו חציר הביאו כל המשאיות?`,
          answer: T, pre: 'קילו: ',
          hints: [`צריך לחשב ${M(X(k, B))}.`, `${M(`${X(k, m)} = ${k * m}`)}, ואלה ${name}.`],
          explain: `${M(`${X(k, B)} = ${T}`)}, כי ${M(`${X(k, m)} = ${k * m}`)} ${name}.`,
        });
      let kk, mm;
      do {
        kk = rnd(2, 9);
        mm = rnd(2, 9);
      } while (Math.random() < 0.5 && (kk * mm) % 10);
      const BB = mm * z10, TT = kk * BB, zeros = String(TT).length - String(TT).replace(/0+$/, '').length;
      return num({
        prompt: `כמה אפסים יש בסוף התוצאה של ${M(X(kk, BB))}? חשבו לפני שאתם עונים.`,
        answer: zeros, pre: 'אפסים: ',
        hints: [`חשבו קודם ${M(X(kk, mm))}.`, `${M(`${X(kk, mm)} = ${kk * mm}`)}, ואז ${M(`${X(kk, BB)} = ${TT}`)}.`],
        explain: `${M(`${X(kk, BB)} = ${TT}`)}: ${zeros} אפסים.${(kk * mm) % 10 ? '' : ` אפס אחד בא מ־${M(`${X(kk, mm)} = ${kk * mm}`)} עצמו!`}`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const a = rnd(2, 9), b = rnd(2, 9), A = a * 10, B = b * pick([10, 10, 100]), T = A * B;
      return eq({
        prompt: 'כפלו שני מספרים עגולים.', expr: `${X(A, B)} = □`, ans: T,
        hints: [`${M(`${X(a, b)} = ${a * b}`)}. כמה אפסים יש בשני המספרים יחד?`, `מוסיפים ל־${a * b} את כל ${String(A * B / (a * b)).length - 1} האפסים.`],
        explain: `${M(`${X(a, b)} = ${a * b}`)}, ומוסיפים ${String(A * B / (a * b)).length - 1} אפסים: ${M(`${X(A, B)} = ${T}`)}.`,
      });
    }
    if (t === 1) {
      const a = rnd(2, 9), b = rnd(2, 9), z10 = pick([10, 100]), B = b * z10, T = a * B, left = Math.random() < 0.5;
      return eq({
        prompt: 'מצאו את המספר החסר.', expr: left ? `□ × ${B} = ${T}` : `${a} × □ = ${T}`, ans: left ? a : B,
        hints: [left ? `כמה פעמים ${B} נכנס ב־${T}? חשבו בלי האפסים.` : `${T} הוא ${a * b} ${z10 === 10 ? 'עשרות' : 'מאות'}.`, left ? `${M(`□ × ${b} = ${a * b}`)}` : `${M(`${a} × □ = ${a * b}`)}, ואלה ${z10 === 10 ? 'עשרות' : 'מאות'}.`],
        explain: `${M(`${X(a, B)} = ${T}`)}, כי ${M(`${X(a, b)} = ${a * b}`)} ${z10 === 10 ? 'עשרות' : 'מאות'}.`,
      });
    }
    if (t === 2) {
      let a, b, c, d;
      do {
        [a, b, c, d] = [rnd(2, 9), rnd(2, 9), rnd(2, 9), rnd(2, 9)];
      } while (Math.abs(a * b - c * d) > (Math.random() < 0.35 ? 0 : 8) || (a === c && b === d));
      const L1 = X(a, b * 100), R1 = X(c * 10, d * 10), P = a * b * 100, Q = c * d * 100, idx = Math.sign(P - Q) + 1;
      return {
        prompt: 'איזה סימן מתאים?', tries: 1,
        visual: M(`<span class="zmul-cmp">${L1}<span class="qm">?</span>${R1}</span>`),
        widget: choice(['&lt;', '=', '&gt;'], { cols: 3, cls: 'signs' }), answer: idx, check: v => v === idx,
        hints: ['חשבו את שני הצדדים. ספרו אפסים בזהירות.', `${M(`${L1} = ${P}`)}`],
        explain: `${M(`${L1} = ${P}`)} ו־${M(`${R1} = ${Q}`)}, לכן ${M(`${L1} ${['&lt;', '=', '&gt;'][idx]} ${R1}`)}.`,
      };
    }
    const k = rnd(2, 4), m = rnd(2, 9);
    return num({
      prompt: `כל ${z.one} אוכל ${m * 10} ${z.food} בשבוע. כמה ${z.food} יאכלו ${k} ${z.many} ב־3 שבועות?`,
      answer: k * m * 30, pre: 'בסך הכול: ',
      hints: ['חשבו קודם כמה אוכל אחד בשבוע, ואז כמה כולם בשבוע, ואז ב־3 שבועות.', `${M(`${X(k, m * 10)} = ${k * m * 10}`)} בשבוע.`],
      explain: `${M(`${X(k, m * 10)} = ${k * m * 10}`)} בשבוע, ו־${M(`${X(k * m * 10, 3)} = ${k * m * 30}`)} ב־3 שבועות.`,
    });
  },
};

// ---------- 8. word problems ----------
// each story returns { q: question, ex: [a, op, b] the exercise, ans, why }
const STORIES1 = [
  z => {
    const k = rnd(2, 9);
    return { q: `בדיר יש ${k} זברות. לכל זברה 4 רגליים. כמה רגליים יש לכל הזברות יחד?`, ex: [k, '×', 4], ans: 4 * k };
  },
  z => {
    const k = rnd(2, 5), n = rnd(2, 10);
    return { q: `בגן יש ${k} כלובים, ובכל כלוב ${n} ${z.many}. כמה ${z.many} יש בגן?`, ex: [k, '×', n], ans: k * n };
  },
  z => {
    const k = rnd(2, 5), q = rnd(2, 6);
    return { q: `השומר חילק ${k * q} ${z.food} שווה בשווה בין ${k} ${z.many}. כמה קיבל כל ${z.one}?`, ex: [k * q, '÷', k], ans: q };
  },
  z => {
    const k = rnd(2, 6), q = rnd(2, 5);
    return { q: `יש ${k * q} ${z.food}. בכל שקית שמים ${q}. כמה שקיות ממלאים?`, ex: [k * q, '÷', q], ans: k };
  },
  () => {
    const k = rnd(2, 5), p = rnd(2, 9);
    return { q: `סיבוב על הקרוסלה עולה ${p} ₪. כמה ישלמו ${k} ילדים?`, ex: [k, '×', p], ans: k * p };
  },
];
const exStr = ([a, o, b]) => `${a} ${o} ${b}`;
const exVal = ([a, o, b]) => (o === '×' ? a * b : o === '÷' ? a / b : o === '+' ? a + b : a - b);


const words = {
  id: 'zmul-words', title: 'בעיות מילוליות',
  intro: `<p>קוראים את הסיפור ושואלים: יש כאן קבוצות שוות? אם מחברים כמה קבוצות שוות, זה <b>כפל</b>. אם מחלקים לקבוצות שוות, זה <b>חילוק</b>.</p>
    <div class="ex">"ב־4 כלובים יש 3 קופים בכל כלוב" ← ${M('4 × 3 = 12')}.<br>"12 דגים ל־4 פינגווינים" ← ${M('12 ÷ 4 = 3')}.</div>`,
  gen(L) {
    const z = pick(ZOO);
    if (L === 1) {
      let s, wrong;
      do {
        s = pick(STORIES1)(z);
        const [a, o, b] = s.ex;
        wrong = o === '×' ? [[a, '+', b], a > b ? [a, '−', b] : [b, '−', a]] : [[a, '×', b], [a, '−', b], [a, '+', b]];
      } while (s.ex[0] === s.ex[2] || wrong.some(w => exVal(w) === s.ans));
      const mul = s.ex[1] === '×';
      if (Math.random() < 0.5) {
        return pickOne({
          prompt: `${s.q}<br>איזה תרגיל פותר את הבעיה?`, opts: [s.ex, ...wrong].map(e => M(exStr(e))), right: M(exStr(s.ex)), cols: mul ? 3 : 2, cls: 'nums',
          hints: [mul ? 'יש כאן קבוצות שוות שמצטרפות יחד.' : 'כאן מחלקים לקבוצות שוות.', mul ? 'זה כפל.' : 'זה חילוק.'],
          explain: `${M(`${exStr(s.ex)} = ${s.ans}`)}`,
        });
      }
      return num({
        prompt: s.q, answer: s.ans, pre: 'תשובה: ',
        hints: [mul ? 'יש כאן קבוצות שוות: זה כפל.' : 'מחלקים לקבוצות שוות: זה חילוק.', `התרגיל: ${M(`${exStr(s.ex)} = ?`)}`],
        explain: `${M(`${exStr(s.ex)} = ${s.ans}`)}`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 4);
      if (t === 0) {
        const k = rnd(3, 6), n = rnd(4, 10), m = rnd(2, k * n - 5);
        return num({
          prompt: `בכלוב התוכים יש ${k} ענפים, ועל כל ענף ${n} תוכים. ${m} תוכים עפו לשתות. כמה תוכים נשארו על הענפים?`,
          answer: k * n - m, pre: 'נשארו: ',
          hints: ['קודם מוצאים כמה תוכים היו בהתחלה.', `${M(`${X(k, n)} = ${k * n}`)}`],
          explain: `${M(`${X(k, n)} = ${k * n}`)}, ו־${M(`${k * n} − ${m} = ${k * n - m}`)}.`,
        });
      }
      if (t === 1) {
        const k = rnd(3, 8), q = rnd(4, 10), e = rnd(1, q - 1);
        return num({
          prompt: `${k * q} ${z.food} חולקו שווה בשווה בין ${k} ${z.many}. כל ${z.one} אכל ${e} מהמנה שלו. כמה נשארו לכל ${z.one}?`,
          answer: q - e, pre: 'לכל אחד: ',
          hints: ['קודם מוצאים כמה קיבל כל אחד.', `${M(`${D(k * q, k)} = ${q}`)}`],
          explain: `${M(`${D(k * q, k)} = ${q}`)}, ו־${M(`${q} − ${e} = ${q - e}`)}.`,
        });
      }
      if (t === 2) {
        const k = rnd(3, 6), p = rnd(6, 15), bill = k * p <= 50 ? 50 : k * p <= 100 ? 100 : 200;
        return num({
          prompt: `כרטיס לגן החיות עולה ${p} ₪. משפחה של ${k} אנשים קנתה כרטיסים לכולם ושילמה בשטר של ${bill} ₪. כמה עודף קיבלה?`,
          answer: bill - k * p, pre: 'עודף: ',
          hints: ['קודם מוצאים כמה עלו כל הכרטיסים.', `${M(`${X(k, p)} = ${k * p}`)}`],
          explain: `${M(`${X(k, p)} = ${k * p}`)}, ו־${M(`${bill} − ${k * p} = ${bill - k * p}`)}.`,
        });
      }
      if (t === 3) {
        const a = rnd(2, 5), b = rnd(2, 5), x = rnd(6, 10), y = rnd(2, 5);
        return num({
          prompt: `פיל אוכל ${x} ערימות חציר ביום, וג׳ירפה אוכלת ${y}. כמה ערימות צריך ביום ל־${a} פילים ול־${b} ג׳ירפות?`,
          answer: a * x + b * y, pre: 'ערימות: ',
          hints: ['חשבו לחוד את הפילים ואת הג׳ירפות.', `${M(`${X(a, x)} = ${a * x}`)} ו־${M(`${X(b, y)} = ${b * y}`)}.`],
          explain: `${M(`${X(a, x)} + ${X(b, y)} = ${a * x} + ${b * y} = ${a * x + b * y}`)}`,
        });
      }
      const q = rnd(4, 9), c = rnd(3, 10), n = q * c;
      return num({
        prompt: `${n} ילדים עולים לרכבת של גן החיות. בכל קרון יושבים ${q} ילדים, וכל הקרונות מלאים. כמה קרונות יש ברכבת?`,
        answer: c, pre: 'קרונות: ',
        hints: [`כמה קבוצות של ${q} יש ב־${n}?`, `חפשו: ${M(`? × ${q} = ${n}`)}`],
        explain: `${M(`${D(n, q)} = ${c}`)}, כי ${M(`${X(c, q)} = ${n}`)}.`,
      });
    }
    const t = rnd(0, 4);
    if (t === 0) {
      const b = rnd(2, 12), m = rnd(2, 5);
      return num({
        prompt: `לפיל יש פי ${m} יותר בוטנים מלקוף. יחד יש להם ${(m + 1) * b} בוטנים. כמה בוטנים יש לקוף?`,
        answer: b, pre: 'לקוף: ',
        hints: [`אם לקוף יש חלק אחד, לפיל יש ${m} חלקים כאלה. כמה חלקים יש יחד?`, `יחד ${m + 1} חלקים שווים. ${M(`${(m + 1) * b} ÷ ${m + 1}`)}`],
        explain: `יחד יש ${m + 1} חלקים שווים: ${M(`${D((m + 1) * b, m + 1)} = ${b}`)}. לקוף ${b}, ולפיל ${m * b}.`,
      });
    }
    if (t === 1) {
      const a = rnd(2, 5), k = rnd(2, 4);
      return num({
        prompt: `כל פינגווין אוכל ${a} דגים ביום. כמה דגים יאכלו ${k} פינגווינים בשבוע שלם?`,
        answer: a * k * 7, pre: 'דגים: ',
        hints: ['בשבוע יש 7 ימים.', `ביום אחד כל הפינגווינים אוכלים ${M(`${X(k, a)} = ${k * a}`)}.`],
        explain: `ביום: ${M(`${X(k, a)} = ${k * a}`)}. בשבוע: ${M(`${X(k * a, 7)} = ${k * a * 7}`)}.`,
      });
    }
    if (t === 2) {
      const H = rnd(5, 10), zb = rnd(1, H - 1), Lg = 4 * zb + 2 * (H - zb);
      return num({
        prompt: `בחווה יש יענים (2 רגליים) וזברות (4 רגליים). ספרו ${H} ראשים ו־${Lg} רגליים. כמה זברות יש?`,
        answer: zb, pre: 'זברות: ',
        hints: [`נניח שכל ה־${H} הם יענים. כמה רגליים היו?`, `${M(`${X(H, 2)} = ${2 * H}`)}. כל זברה מוסיפה עוד 2 רגליים. כמה רגליים עודפות יש?`],
        explain: `אם כולם יענים: ${M(`${X(H, 2)} = ${2 * H}`)} רגליים. יש ${M(`${Lg} − ${2 * H} = ${Lg - 2 * H}`)} רגליים עודפות, ולכל זברה 2 עודפות: ${M(`${D(Lg - 2 * H, 2)} = ${zb}`)} זברות.`,
      });
    }
    if (t === 3) {
      let n, k;
      do {
        k = rnd(4, 9);
        n = rnd(20, 70);
      } while (n % k === 0);
      const q = Math.floor(n / k), need = k - (n % k);
      return num({
        prompt: `השומר אורז ${n} ${z.food} בשקיות של ${k}. כמה ${z.food} עוד חסרים לו כדי שכל השקיות יהיו מלאות?`,
        answer: need, pre: 'חסרים: ',
        hints: [`${M(`${D(n, k)} = ${q}`)} ושארית ${n % k}. השארית היא שקית לא מלאה.`, `בשקית האחרונה יש ${n % k}, וצריך ${k}.`],
        explain: `${M(`${X(k, q)} = ${k * q}`)}, נשארו ${n % k} בשקית האחרונה. חסרים ${M(`${k} − ${n % k} = ${need}`)}.`,
      });
    }
    const k = rnd(2, 5), p = rnd(3, 12), m = rnd(2, 9);
    return num({
      prompt: `${k} כרטיסים לסיור בגן החיות עלו ${k * p} ₪. כמה יעלו ${m === k ? m + 1 : m} כרטיסים?`,
      answer: p * (m === k ? m + 1 : m), pre: '₪: ',
      hints: ['כמה עולה כרטיס אחד?', `${M(`${D(k * p, k)} = ${p}`)}`],
      explain: `כרטיס אחד: ${M(`${D(k * p, k)} = ${p}`)}. ${m === k ? m + 1 : m} כרטיסים: ${M(`${X(m === k ? m + 1 : m, p)} = ${p * (m === k ? m + 1 : m)}`)}.`,
    });
  },
};

// ---------- 9. boss ----------
// a chain of × and ÷ steps; every step stays a whole number
function chain(len, cap) {
  for (;;) {
    let v = rnd(2, 6);
    const start = v, steps = [];
    for (let i = 0; i < len; i++) {
      const divs = range(8, j => j + 2).filter(d => v % d === 0 && v / d >= 2), muls = range(4, j => j + 2).filter(m => v * m <= cap);
      const useDiv = divs.length && (i % 2 === 1 || !muls.length);
      if (useDiv) {
        const d = pick(divs);
        v /= d;
        steps.push(['÷', d, v]);
      } else if (muls.length) {
        const m = pick(muls);
        v *= m;
        steps.push(['×', m, v]);
      } else break;
    }
    if (steps.length === len && steps.some(s => s[0] === '÷')) return { start, steps };
  }
}

const bossKinds = [arrays, table, share, family, remainder, tens, words];
const boss = {
  id: 'zmul-boss', title: 'בוס: החשבונאית כפולה',
  intro: `<p>החשבונאית כפולה נעלה את מחסן המזון של הפילים במנעול כפול, והפילים רעבים! כדי לפתוח אותו צריך לפתור חידות מכל מה שלמדתם במתחם: קבוצות, מערכים, לוח הכפל, חלוקה, שאריות, עשרות ובעיות.</p>
    <div class="ex">שרשרת של החשבונאית: ${M('3 → × 4 → 12 → ÷ 2 → 6')}</div>
    <p>פתרו 4 מתוך 5 מנעולים, והפילים יקבלו את הארוחה שלהם.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (t === 0) {
      const { start, steps } = chain(L + 1, L === 1 ? 50 : 100), back = L === 3;
      const cells = [back ? box('s0', String(start).length + 1) : `<span class="zmul-n">${start}</span>`];
      const AR = '<span class="zmul-ar">→</span>';
      steps.forEach(([o, x, v], i) => cells.push(`<span class="zmul-step">${AR}<span class="zmul-op">${o} ${x}</span>${AR}${i === steps.length - 1 && back ? `<span class="zmul-n">${v}</span>` : box('s' + (i + 1), String(v).length + 1)}</span>`));
      const ans = back ? { s0: start, ...Object.fromEntries(steps.slice(0, -1).map(([, , v], i) => ['s' + (i + 1), v])) } : Object.fromEntries(steps.map(([, , v], i) => ['s' + (i + 1), v]));
      const last = steps[steps.length - 1];
      return {
        prompt: back ? 'החשבונאית הסתירה את מספר ההתחלה! עבדו מהסוף להתחלה והשלימו את השרשרת.' : 'השלימו את השרשרת של החשבונאית: בצעו כל פעולה על המספר שלפניה.',
        widget: inputs(`<div class="zmul-chain" dir="ltr">${cells.join('')}</div>`), answer: ans,
        check: v => Object.entries(ans).every(([k, x]) => v[k] === x),
        hints: back ? ['מהסוף להתחלה עושים את הפעולה ההפוכה: במקום × מחלקים, ובמקום ÷ כופלים.', `לפני ה־${last[2]} היה ${M(`${last[2]} ${last[0] === '×' ? '÷' : '×'} ${last[1]} = ${steps.length > 1 ? steps[steps.length - 2][2] : start}`)}.`] : ['בצעו את הפעולה הראשונה על המספר הראשון, ואז המשיכו.', `${M(`${start} ${steps[0][0]} ${steps[0][1]} = ${steps[0][2]}`)}`],
        explain: `<span class="zmul-chainx" dir="ltr">${[start, ...steps.map(([o, x, v]) => `${o} ${x} → ${v}`)].join(' → ')}</span>`,
      };
    }
    if (t === 1) {
      let x, y;
      do {
        x = rnd(2, L === 1 ? 6 : 10);
        y = rnd(2, L === 1 ? 6 : 10);
      } while (L === 3 && x === y);
      const P = x * y, S = x + y, Dd = Math.abs(x - y);
      return {
        prompt: L === 3
          ? `החשבונאית חושבת על שני מספרים. כשכופלים אותם יוצא ${P}, וההפרש ביניהם ${Dd}. מה המספרים?`
          : `החשבונאית חושבת על שני מספרים. כשכופלים אותם יוצא ${P}, וכשמחברים אותם יוצא ${S}. מה המספרים?`,
        widget: inputs(line(`מספר אחד: ${box('x', 2)}`) + line(`מספר שני: ${box('y', 2)}`)), answer: { x, y },
        check: v => v.x * v.y === P && (L === 3 ? Math.abs(v.x - v.y) === Dd : v.x + v.y === S),
        hints: [`חפשו בלוח הכפל תרגילים שהתוצאה שלהם ${P}.`, `בדקו כל זוג: האם ${L === 3 ? `ההפרש ${Dd}` : `הסכום ${S}`}?`],
        explain: `${x} ו־${y}: ${M(`${X(x, y)} = ${P}`)} ו־${L === 3 ? M(`${Math.max(x, y)} − ${Math.min(x, y)} = ${Dd}`) : M(`${x} + ${y} = ${S}`)}.`,
      };
    }
    return pick(bossKinds).gen(L);
  },
};

export default {
  id: 'zmul', name: 'מתחם הפילים', icon: '🐘', color: '#60a5fa', boss: 'החשבונאית כפולה',
  tagline: 'הפילים מחכים לארוחה, אבל החשבונאים בלבלו את כל הקבוצות. כפל וחילוק יחזירו את הסדר.',
  challenges: [groups, arrays, table, share, family, remainder, tens, words, boss],
};
