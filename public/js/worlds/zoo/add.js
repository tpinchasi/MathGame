// מתחם הקופים: חיבור וחיסור (כיתות ב'–ג')
import { rnd, pick, shuffle, range, h, M } from '../../util.js';
import { inputs, box, choice } from '../../widgets.js';
import { num, nums } from '../../kit.js';

// ---------- helpers ----------
const sumOf = a => a.reduce((s, x) => s + x, 0);
const dig = (n, c) => Math.floor(n / 10 ** c) % 10; // digit at place c (0 = ones)
const len = n => String(n).length;
const up = (n, k) => Math.ceil(n / k) * k;
const down = (n, k) => Math.floor(n / k) * k;
const r10 = n => Math.round(n / 10) * 10;
const r100 = n => Math.round(n / 100) * 100;
const f = v => v.toFixed(1);
const sgn = s => (s < 0 ? `−${-s}` : `+${s}`);
const opS = op => (op === '+' ? '+' : '−');
// expanded form without the zero parts: 305 -> [300, 5]
const parts = n => [...String(n)].map((d, i, a) => +d * 10 ** (a.length - 1 - i)).filter(x => x);
const partsM = n => (parts(n).length > 1 ? `: ${M(`${parts(n).join(' + ')} = ${n}`)}` : '');
// Hebrew list: "א, ב ו־ג"
const and = items => {
  if (items.length < 2) return items.join('');
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(', ')} ${/^\d/.test(last) ? 'ו־' : 'ו'}${last}`;
};
const bananas = n => (n === 1 ? 'בננה אחת' : `${n} בננות`);
const bunchesW = n => (n === 1 ? 'אשכול אחד' : `${n} אשכולות`);
const cratesW = n => (n === 1 ? 'ארגז אחד' : `${n} ארגזים`);
const describe = (c, t, o) => and([c && cratesW(c), t && bunchesW(t), o && bananas(o)].filter(Boolean));
const jumpsW = (n, s) => (n === 1 ? `קפיצה אחת של ${s}` : `${n} קפיצות של ${s}`);
const PLACE = ['אחדות', 'עשרות', 'מאות', 'אלפים'];
const SQ = '<span class="zadd-sq"></span>';
const sq = s => s.replace('□', SQ);
// an equation with one number box in place of □
const fill = ({ eq, answer, ...r }) => ({
  ...r, widget: inputs(`<div class="ans-line">${M(eq.replace('□', box('a', String(answer).length + 1)))}</div>`),
  answer: { a: answer }, check: v => v.a === answer,
});

// ---------- pictures: a single banana, a bunch of 10, a crate of 100 ----------
const IC = {
  o: '<svg viewBox="0 0 24 24" class="zadd-ic"><path d="M6.2 4.6C4.6 13.6 9.6 20.4 20 19.8c1.3-.1 1.3-1.6.2-1.9C13.4 16 10.3 11.6 9.5 4.7Z" class="zadd-ban"/><path d="M6.2 4.9 6.5 1.8 9.2 2.2 9.5 4.7Z" class="zadd-stem"/></svg>',
  t: `<svg viewBox="0 0 14 56" class="zadd-ic"><rect x="5" y="0" width="4" height="6" rx="1" class="zadd-stem"/>${range(10, i => `<rect x="1" y="${5.5 + i * 5}" width="12" height="5" rx="2.4" class="zadd-ban"/>`).join('')}</svg>`,
  h: '<svg viewBox="0 0 48 46" class="zadd-ic"><path d="M9 12C11 6 15 3 20 2.5M19 12C21 6 25 3 30 2.5M29 12C31 6 35 3 40 2.5" class="zadd-peek"/><rect x="2" y="10" width="44" height="34" rx="3" class="zadd-crate"/><path d="M2 21H46M2 34H46" class="zadd-plank"/><text x="24" y="32" class="zadd-ct">100</text></svg>',
};
// crates, bunches and single bananas, in groups from left to right
function pic(c, t, o, order = 'hto') {
  const n = { h: c, t, o };
  const grp = k => (n[k] ? `<div class="zadd-grp zadd-g${k}">${n[k] > 20 ? `${IC[k]}<b>× ${n[k]}</b>` : IC[k].repeat(n[k])}</div>` : '');
  return `<div class="zadd-pic" dir="ltr">${[...order].map(grp).join('')}</div>`;
}

// ---------- widget: build a number from crates, bunches and bananas ----------
function builder(cols) {
  const cnt = { h: 0, t: 0, o: 0 }, HEAD = { h: 'מאות', t: 'עשרות', o: 'אחדות' }, piles = {}, shown = {};
  let locked = false;
  const el = h('div', { class: `zadd-build c${cols.length}`, dir: 'ltr', style: `grid-template-columns:repeat(${cols.length},1fr)` });
  const draw = () => [...cols].forEach(k => {
    piles[k].innerHTML = IC[k].repeat(cnt[k]);
    shown[k].textContent = String(cnt[k]);
  });
  for (const k of cols) {
    const step = by => () => {
      if (locked) return;
      cnt[k] = Math.max(0, Math.min(9, cnt[k] + by));
      draw();
    };
    piles[k] = h('div', { class: `zadd-pile zadd-g${k}` });
    shown[k] = h('b', { class: 'zadd-cnt' });
    el.append(h('div', { class: 'zadd-col' },
      h('div', { class: 'zadd-head' }, HEAD[k]), piles[k], shown[k],
      h('div', { class: 'zadd-pm' },
        h('button', { type: 'button', class: 'round', 'aria-label': 'פחות', onclick: step(-1) }, '−'),
        h('button', { type: 'button', class: 'round', 'aria-label': 'עוד', onclick: step(1) }, '+'))));
  }
  draw();
  const total = () => 100 * cnt.h + 10 * cnt.t + cnt.o;
  return {
    el,
    value: () => (total() ? { ...cnt, n: total() } : null),
    set(a) {
      Object.assign(cnt, { h: 0, t: 0, o: 0 }, a);
      draw();
    },
    lock() {
      locked = true;
      el.classList.add('zadd-locked');
    },
  };
}

// ---------- widget: tap pairs of tiles that add up to the target (judges itself) ----------
function pairGame(vals, T) {
  return ctx => {
    const gone = new Set(), want = vals.filter((v, i) => vals.some((w, j) => j !== i && v + w === T)).length / 2;
    let sel = null, locked = false;
    const grid = h('div', { class: 'zadd-tiles', dir: 'ltr', style: `grid-template-columns:repeat(${vals.length > 6 ? 4 : 3},1fr)` });
    const btns = vals.map((v, i) => h('button', { type: 'button', class: 'zadd-tile', onclick: () => tap(i) }, String(v)));
    grid.append(...btns);
    const paint = () => btns.forEach((b, i) => {
      b.classList.toggle('sel', i === sel);
      b.classList.toggle('done', gone.has(i));
      b.disabled = gone.has(i);
    });
    function tap(i) {
      if (locked || gone.has(i)) return;
      if (sel == null || sel === i) {
        sel = sel === i ? null : i;
        return paint();
      }
      const a = vals[sel], b = vals[i];
      if (a + b !== T) {
        sel = null;
        paint();
        return ctx.mistake(`${M(`${a} + ${b} = ${a + b}`)}, ולא ${T}.`);
      }
      gone.add(sel);
      gone.add(i);
      sel = null;
      paint();
      if (gone.size === 2 * want) {
        locked = true;
        ctx.solved();
      }
    }
    paint();
    return {
      el: h('div', { class: 'zadd-pairs' }, h('div', { class: 'zadd-goal' }, 'כל זוג ביחד: ', h('b', {}, String(T))), grid),
      // finds every pair; used by the self-test
      auto() {
        for (let i = 0; i < vals.length; i++) {
          if (gone.has(i)) continue;
          const j = vals.findIndex((v, k) => k !== i && !gone.has(k) && v + vals[i] === T);
          if (j < 0) continue;
          sel = null;
          tap(i);
          tap(j);
        }
      },
      lock() {
        locked = true;
      },
    };
  };
}

// ---------- number lines ----------
const AX = 76; // height of the axis inside the 340 × 112 picture
function axis(lo, hi, avoid = []) {
  const span = hi - lo, X = v => 18 + ((v - lo) * 304) / span;
  const tick = span <= 60 ? 1 : 10, lab = span <= 120 ? 10 : span <= 300 ? 50 : 100;
  let s = `<line x1="6" y1="${AX}" x2="334" y2="${AX}" class="zadd-axis"/>`;
  for (let v = up(lo, tick); v <= hi; v += tick) {
    const big = v % lab === 0, t = big ? 9 : v % 10 === 0 ? 6 : 4;
    s += `<line x1="${f(X(v))}" y1="${AX - t}" x2="${f(X(v))}" y2="${AX + t}" class="zadd-tick${big ? ' big' : ''}"/>`;
    if (big && avoid.every(a => Math.abs(X(a) - X(v)) > 30)) s += `<text x="${f(X(v))}" y="${AX + 27}" class="zadd-tl">${v}</text>`;
  }
  return { s, X };
}
function arc(X, p, q, label = '') {
  const x1 = X(p), x2 = X(q), hh = Math.min(44, 7 + Math.abs(x2 - x1) * 0.5), mx = (x1 + x2) / 2, b = q < p ? ' back' : '';
  return `<path d="M${f(x1)} ${AX}Q${f(mx)} ${f(AX - 2 * hh)} ${f(x2)} ${AX}" class="zadd-arc${b}"/><circle cx="${f(x2)}" cy="${AX}" r="2.8" class="zadd-arcend${b}"/>` +
    (label ? `<text x="${f(mx)}" y="${f(AX - hh - 5)}" class="zadd-al${b}">${label}</text>` : '');
}
const vlabel = (X, v, txt, cls = '') => `<text x="${f(X(v))}" y="${AX + 27}" class="zadd-ml ${cls}">${txt}</text>`;
const mark = (X, v, icon, txt, cls = '') =>
  (icon ? `<text x="${f(X(v))}" y="${AX - 3}" class="zadd-emo">${icon}</text>` : `<circle cx="${f(X(v))}" cy="${AX}" r="5.5" class="zadd-start"/>`) +
  (txt != null ? vlabel(X, v, txt, cls) : '');
// consecutive equal jumps merged: +10 +10 +1 +1 → +20 +2
function group(js) {
  const out = [];
  js.forEach((s, i) => (i && s === js[i - 1] ? (out[out.length - 1] += s) : out.push(s)));
  return out;
}
const chainM = (start, js, end) => M(`${start} ${js.map(s => (s < 0 ? `− ${-s}` : `+ ${s}`)).join(' ')}${end != null ? ` = ${end}` : ''}`);

// A finished picture: jumps (with labels) from start, plus marks [{ v, icon, label }].
function linePic({ lo, hi, start = 0, jumps = [], marks = [] }) {
  const { s, X } = axis(lo, hi, marks.filter(m => m.label != null).map(m => m.v));
  let arcs = '', q = start, last = null;
  for (const st of jumps) {
    const x1 = X(q), x2 = X(q + st), hh = Math.min(44, 7 + Math.abs(x2 - x1) * 0.5), mx = (x1 + x2) / 2;
    let y = AX - hh - 5;
    if (last && Math.abs(last.x - mx) < 30 && Math.abs(last.y - y) < 15) y = last.y - 15;
    arcs += arc(X, q, q + st) + `<text x="${f(mx)}" y="${f(y)}" class="zadd-al${st < 0 ? ' back' : ''}">${sgn(st)}</text>`;
    last = { x: mx, y };
    q += st;
  }
  // with arcs drawn, an emoji would hide their labels: keep only the dot and the number
  const ms = marks.map(m => mark(X, m.v, jumps.length ? null : m.icon, m.label, m.cls || (m.icon ? 'now' : ''))).join('');
  return `<div dir="ltr"><svg viewBox="0 0 340 112" class="zadd-lp">${s}${arcs}${ms}</svg></div>`;
}

// The monkey jumps along the line with the buttons. value(): { pos, n } (n = number of jumps).
function jumpLine({ start, lo, hi, steps, goal = null, max = 0 }) {
  const hist = [];
  let locked = false;
  const at = () => start + sumOf(hist);
  const stage = h('div', { class: 'zadd-jl', dir: 'ltr' }), trail = h('div', { class: 'zadd-trail' }), count = max ? h('span', { class: 'zadd-jn' }) : null;
  const jump = s => {
    const p = at() + s;
    if (locked || p < lo || p > hi) return;
    hist.push(s);
    draw();
  };
  const btns = steps.map(s => h('button', { type: 'button', class: 'zadd-jb' + (s < 0 ? ' back' : ''), onclick: () => jump(s) }, sgn(s)));
  const undo = h('button', { type: 'button', class: 'btn tiny', onclick: () => !locked && hist.length && (hist.pop(), draw()) }, '↶ ביטול');
  const reset = h('button', { type: 'button', class: 'btn tiny', onclick: () => !locked && ((hist.length = 0), draw()) }, '↺ מהתחלה');
  function draw() {
    const p = at(), { s, X } = axis(lo, hi, [start, p, ...(goal != null ? [goal] : [])]);
    let arcs = '', q = start;
    for (const st of hist) {
      arcs += arc(X, q, q + st);
      q += st;
    }
    const startLbl = Math.abs(X(p) - X(start)) > 26 ? vlabel(X, start, start) : '';
    const goalPic = goal != null ? mark(X, goal, '🍌', p === goal || Math.abs(X(p) - X(goal)) < 26 ? null : goal) : '';
    stage.innerHTML = `<svg viewBox="0 0 340 112">${s}${goalPic}<circle cx="${f(X(start))}" cy="${AX}" r="5.5" class="zadd-start"/>${startLbl}${arcs}${mark(X, p, '🐒', p, 'now')}</svg>`;
    trail.innerHTML = hist.length ? chainM(start, group(hist), p) : `הקוף עומד על ${start}.`;
    if (count) count.textContent = `קפיצות: ${hist.length} מתוך ${max}`;
    btns.forEach((b, i) => (b.disabled = locked || p + steps[i] < lo || p + steps[i] > hi));
  }
  draw();
  return {
    el: h('div', { class: 'zadd-jw' }, stage, trail, h('div', { class: 'zadd-jctl', dir: 'ltr' }, btns), h('div', { class: 'zadd-jctl2' }, undo, reset, count)),
    value: () => (hist.length ? { pos: at(), n: hist.length } : null),
    set(a) {
      hist.splice(0, hist.length, ...a.jumps);
      draw();
    },
    lock() {
      locked = true;
      draw();
    },
  };
}
// the fewest jumps from a to b using the given steps, staying inside [lo, hi]
function minPath(a, b, lo, hi, steps) {
  const prev = new Map([[a, null]]), q = [a];
  for (let i = 0; i < q.length && !prev.has(b); i++)
    for (const s of steps) {
      const n = q[i] + s;
      if (n < lo || n > hi || prev.has(n)) continue;
      prev.set(n, [q[i], s]);
      q.push(n);
    }
  const path = [];
  for (let p = b; prev.get(p); p = prev.get(p)[0]) path.unshift(prev.get(p)[1]);
  // show the big jumps first when that stays on the line
  const nice = [...path].sort((x, y) => Math.abs(y) - Math.abs(x) || y - x);
  let p = a;
  return nice.every(s => ((p += s), p >= lo && p <= hi)) ? nice : path;
}
// the plain way: hundreds, then tens, then ones
const plainJumps = (b, dir = 1) => [...range(Math.floor(b / 100), () => 100 * dir), ...range(dig(b, 1), () => 10 * dir), ...range(dig(b, 0), () => dir)];

// ---------- column addition and subtraction ----------
const carries = rows => {
  const out = [0];
  let cy = 0;
  for (let c = 0; c < Math.max(...rows.map(len)); c++) {
    cy = Math.floor((sumOf(rows.map(n => dig(n, c))) + cy) / 10);
    out.push(cy);
  }
  return out; // out[c] = what was carried into place c
};
// the top number's digits after the usual borrowing
function borrowAdj(a, b) {
  const adj = range(len(a), c => dig(a, c));
  for (let c = 0; c < adj.length; c++) {
    if (adj[c] >= dig(b, c)) continue;
    let k = c + 1;
    while (adj[k] === 0) k++;
    adj[k]--;
    for (let j = k - 1; j > c; j--) adj[j] = 9;
    adj[c] += 10;
  }
  return adj;
}
function colHTML(rows, op, width, cell, aid, cls = '') {
  const R = rows.length, gc = c => width + 1 - c;
  let s = `<span class="zadd-op" style="grid-area:${R + 1}/1">${opS(op)}</span><span class="zadd-rule" style="grid-area:${R + 2}/1/${R + 3}/${width + 2}"></span>`;
  for (let c = 0; c < width; c++) {
    if (aid) s += `<span class="zadd-aidc" style="grid-area:1/${gc(c)}">${aid(c)}</span>`;
    for (let r = 0; r <= R; r++) s += `<span class="zadd-cell" style="grid-area:${r === R ? R + 3 : r + 2}/${gc(c)}">${cell(r, c)}</span>`;
  }
  return `<div class="zadd-colm ${cls}" dir="ltr" style="grid-template-columns:repeat(${width + 1},1.3em)">${s}</div>`;
}
// the finished sum, with the carries or the borrowing written in small
function colStatic(rows, op) {
  const res = op === '+' ? sumOf(rows) : rows[0] - rows[1], all = [...rows, res], width = Math.max(...all.map(len));
  const cy = op === '+' ? carries(rows) : null, adj = op === '-' ? borrowAdj(rows[0], rows[1]) : null;
  const cell = (r, c) => {
    if (c >= len(all[r])) return '';
    const changed = adj && r === 0 && adj[c] !== dig(rows[0], c);
    return changed ? `<s>${dig(all[r], c)}</s>` : String(dig(all[r], c));
  };
  const aid = c => (cy ? (cy[c] ? `<b class="zadd-cy">${cy[c]}</b>` : '') : adj[c] !== undefined && adj[c] !== dig(rows[0], c) ? `<b class="zadd-cy">${adj[c]}</b>` : '');
  return `<div class="zadd-colw">${colHTML(rows, op, width, cell, aid, 'st')}</div>`;
}
function addSteps(rows) {
  const W = Math.max(...rows.map(len)), out = [];
  let cy = 0;
  for (let c = 0; c < W; c++) {
    const ds = [...rows.filter(n => len(n) > c).map(n => dig(n, c)), ...(cy ? [cy] : [])], s = sumOf(ds);
    const carry = Math.floor(s / 10);
    out.push(ds.length < 2 ? `${PLACE[c]}: מורידים את ה־${s} למטה.`
      : `${PLACE[c]}: ${M(`${ds.join(' + ')} = ${s}`)}${carry ? `. כותבים ${s % 10} ומעבירים ${carry} ל${PLACE[c + 1]}` : ''}.`);
    cy = carry;
  }
  if (cy) out.push(`${PLACE[W]}: כותבים את ה־${cy} שהעברנו.`);
  return out;
}
function subSteps(a, b) {
  const adj = borrowAdj(a, b), res = a - b, out = [];
  if (adj.some((x, c) => x !== dig(a, c))) out.push(`פורטים: ${M(`${a} = ${adj.map((x, c) => x * 10 ** c).reverse().filter(x => x).join(' + ')}`)}.`);
  adj.forEach((x, c) => {
    if (c >= len(res) && c >= len(b)) return;
    out.push(c < len(b) ? `${PLACE[c]}: ${M(`${x} − ${dig(b, c)} = ${x - dig(b, c)}`)}.` : `${PLACE[c]}: נשאר ${x}.`);
  });
  return out;
}
const colExplain = (rows, op) => {
  const res = op === '+' ? sumOf(rows) : rows[0] - rows[1];
  return `${colStatic(rows, op)}${(op === '+' ? addSteps(rows) : subSteps(...rows)).join('<br>')}<br>התשובה: ${M(`${rows.join(` ${opS(op)} `)} = ${res}`)}.`;
};

// Interactive column sum. hide: set of "row,place" cells that become boxes (row rows.length = the answer);
// without hide the whole answer row is boxes and the helpers (carry circles, borrowing) are on.
function column(rows, op, hide = null) {
  const R = rows.length, res = op === '+' ? sumOf(rows) : rows[0] - rows[1], all = [...rows, res];
  const resW = hide ? len(res) : op === '+' ? Math.max(...rows.map(len)) + 1 : len(rows[0]);
  const width = Math.max(resW, ...rows.map(len)), lens = [...rows.map(len), resW], answer = {};
  const cell = (r, c) => {
    if (c >= lens[r]) return '';
    if (!hide && r === R) {
      if (c < len(res)) answer['r' + c] = dig(res, c);
      return box('r' + c, 1, c > 0 && (c === resW - 1 || c >= len(res)));
    }
    if (hide && hide.has(`${r},${c}`)) {
      answer[`d${r}_${c}`] = dig(all[r], c);
      return box(`d${r}_${c}`, 1);
    }
    return !hide && op === '-' && r === 0 ? `<i class="zadd-td" data-c="${c}">${dig(all[r], c)}</i>` : String(dig(all[r], c));
  };
  const aid = hide ? null : op === '+' ? c => (c ? `<b class="zadd-cm" data-c="${c}"></b>` : '') : c => (c < len(rows[0]) ? `<b class="zadd-adj" data-c="${c}"></b>` : '');
  const w = inputs(colHTML(rows, op, width, cell, aid));
  let locked = false;
  const msg = h('div', { class: 'zadd-cmsg' });
  // carry circles: a tap cycles through the possible carries
  const marks = [...w.el.querySelectorAll('.zadd-cm')];
  marks.forEach(m => m.addEventListener('click', () => {
    if (locked) return;
    m.textContent = String(((+m.textContent || 0) + 1) % R || '');
  }));
  // borrowing: tap a digit of the top number to break one of it into ten for the place on its right
  const orig = range(len(rows[0]), c => dig(rows[0], c));
  let adj = [...orig];
  const tds = [...w.el.querySelectorAll('.zadd-td')], adjEls = [...w.el.querySelectorAll('.zadd-adj')];
  const paintAdj = () => {
    tds.forEach(t => t.classList.toggle('struck', adj[+t.dataset.c] !== orig[+t.dataset.c]));
    adjEls.forEach(e => (e.textContent = adj[+e.dataset.c] !== orig[+e.dataset.c] ? String(adj[+e.dataset.c]) : ''));
  };
  tds.forEach(t => t.addEventListener('click', () => {
    const c = +t.dataset.c;
    if (locked) return;
    msg.textContent = '';
    if (c === 0) return (msg.textContent = 'פורטים מהספרה שמשמאל לעמודה שצריכה עזרה.');
    if (adj[c - 1] >= 10) return (msg.textContent = 'בעמודה שמימין כבר יש מספיק.');
    if (adj[c] === 0) return (msg.textContent = 'כאן אין מה לפרוט. פרטו קודם מהספרה שמשמאל.');
    adj[c]--;
    adj[c - 1] += 10;
    paintAdj();
  }));
  if (tds.length) {
    w.el.insertBefore(msg, w.el.lastChild);
    w.el.insertBefore(h('div', { class: 'zadd-cbar' }, h('span', { class: 'tip' }, 'לחצו על ספרה למעלה כדי לפרוט ממנה.'),
      h('button', { type: 'button', class: 'btn tiny', onclick: () => !locked && ((adj = [...orig]), paintAdj(), (msg.textContent = '')) }, '↺')), msg);
  }
  const val = (v, r) => sumOf(range(lens[r], c => (hide && hide.has(`${r},${c}`) ? v[`d${r}_${c}`] : dig(all[r], c)) * 10 ** c));
  const check = hide
    ? v => {
      const leadOK = range(R + 1).every(r => lens[r] === 1 || !hide.has(`${r},${lens[r] - 1}`) || v[`d${r}_${lens[r] - 1}`] !== 0);
      const n = range(R + 1, r => val(v, r));
      return leadOK && (op === '+' ? sumOf(n.slice(0, R)) === n[R] : n[0] - n[1] === n[R]);
    }
    : v => sumOf(range(resW, c => (v['r' + c] || 0) * 10 ** c)) === res;
  return {
    widget: {
      el: w.el, value: w.value, key: w.key,
      set(a) {
        w.set(a);
        const cy = op === '+' ? carries(rows) : null;
        marks.forEach(m => (m.textContent = cy[+m.dataset.c] ? String(cy[+m.dataset.c]) : ''));
        if (tds.length) {
          adj = borrowAdj(rows[0], rows[1]);
          paintAdj();
        }
      },
      lock() {
        locked = true;
        w.lock();
      },
    },
    answer, check,
  };
}

// ---------- widget: the monkey eats bananas; open a bunch when the single ones run out ----------
function eatTool(a, b) {
  let rods, ones, locked = false;
  const init = () => {
    rods = range(Math.floor(a / 10), () => false);
    ones = range(a % 10, () => false);
  };
  const open = () => {
    const i = rods.indexOf(false);
    if (i < 0) return;
    rods.splice(i, 1);
    ones.push(...range(10, () => false));
  };
  const pile = h('div', { class: 'zadd-eat', dir: 'ltr' }), info = h('span', { class: 'zadd-eatinfo' });
  const openBtn = h('button', { type: 'button', class: 'btn tiny', onclick: () => !locked && (open(), draw()) }, '✂ פתחו אשכול');
  const w = inputs(`<div class="ans-line">${M(`${a} − ${b} = ${box('a', 3)}`)}</div>`);
  const item = (arr, i, ic) => h('button', {
    type: 'button', class: 'zadd-it' + (arr[i] ? ' eaten' : ''), html: ic, 'aria-label': arr[i] ? 'נאכלה' : 'לאכול',
    onclick: () => {
      if (locked) return;
      arr[i] = !arr[i];
      draw();
    },
  });
  function draw() {
    pile.innerHTML = '';
    if (rods.length) pile.append(h('div', { class: 'zadd-gt' }, rods.map((_, i) => item(rods, i, IC.t))));
    if (ones.length) pile.append(h('div', { class: 'zadd-go' }, ones.map((_, i) => item(ones, i, IC.o))));
    info.textContent = `הקוף אכל: ${10 * rods.filter(Boolean).length + ones.filter(Boolean).length}`;
    openBtn.disabled = locked || !rods.includes(false);
  }
  init();
  draw();
  return {
    el: h('div', { class: 'zadd-eatw' }, h('div', { class: 'zadd-eatctl' }, openBtn, info), pile, w.el),
    value: w.value, key: w.key,
    set(ans) {
      init();
      if (a % 10 < b % 10) open();
      for (let i = 0; i < Math.floor(b / 10); i++) rods[i] = true;
      for (let i = 0; i < b % 10; i++) ones[i] = true;
      draw();
      w.set(ans);
    },
    lock() {
      locked = true;
      w.lock();
      draw();
    },
  };
}

// ---------- widget: add the friendly pair first, then type the total (judges itself) ----------
function smartTap(vals, base, pairs) {
  const total = sumOf(vals);
  return ctx => {
    let tiles = vals.map(v => ({ v, m: false })), sel = null, merges = 0, locked = false, mini = null;
    const row = h('div', { class: 'zadd-smart', dir: 'ltr' }), log = h('div', { class: 'zadd-slog' }), sub = h('div', { class: 'zadd-ssub' });
    const tip = h('p', { class: 'tip' }, base === 10 ? 'לחצו על שני מספרים שיחד יוצאים עשרות שלמות (10, 20, 30...).' : 'לחצו על שני מספרים שיחד יוצאים מאות שלמות (100, 200...).');
    const draw = () => {
      row.innerHTML = '';
      tiles.forEach((t, i) => {
        if (i) row.append(h('span', { class: 'zadd-plus' }, '+'));
        row.append(t.m ? h('span', { class: 'zadd-tile merged' }, String(t.v))
          : h('button', { type: 'button', class: 'zadd-tile' + (i === sel ? ' sel' : ''), onclick: () => tap(i) }, String(t.v)));
      });
    };
    const submit = () => {
      const v = mini && mini.value();
      if (!v || locked) return;
      if (v.v === total) {
        locked = true;
        mini.lock();
        return ctx.solved();
      }
      mini.clear();
      ctx.mistake('החיבור לא מדויק. נסו שוב.');
    };
    const tap = i => {
      if (locked || mini || tiles[i].m) return;
      if (sel == null || sel === i) {
        sel = sel === i ? null : i;
        return draw();
      }
      const a = tiles[sel].v, b = tiles[i].v, s = a + b;
      if (s % base) {
        sel = null;
        draw();
        return ctx.mistake(`${M(`${a} + ${b} = ${s}`)}, וזה לא ${base === 10 ? 'עשרות שלמות' : 'מאות שלמות'}.`);
      }
      log.append(h('span', { html: M(`${a} + ${b} = ${s}`) }));
      const lo = Math.min(sel, i);
      tiles[lo] = { v: s, m: true };
      tiles.splice(Math.max(sel, i), 1);
      sel = null;
      merges++;
      draw();
      if (merges < pairs) return;
      tip.textContent = 'עכשיו כתבו את התוצאה ולחצו ✓';
      mini = inputs(M(`${tiles.map(t => t.v).join(' + ')} = ${box('v', 4)}`), { onOk: submit });
      sub.append(mini.el);
    };
    draw();
    return {
      el: h('div', { class: 'zadd-smartw' }, row, tip, log, sub),
      // plays the smart way; used by the self-test
      auto() {
        while (merges < pairs) {
          let found = false;
          for (let i = 0; i < tiles.length && !found; i++)
            for (let j = i + 1; j < tiles.length && !found; j++)
              if (!tiles[i].m && !tiles[j].m && (tiles[i].v + tiles[j].v) % base === 0) {
                sel = null;
                tap(i);
                tap(j);
                found = true;
              }
          if (!found) break;
        }
        mini.set({ v: total });
        submit();
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
// numbers in vals that make a multiple of base together
const friendly = (vals, base) => {
  const out = [];
  vals.forEach((a, i) => vals.forEach((b, j) => j > i && (a + b) % base === 0 && out.push([a, b])));
  return out;
};

// ---------- small pictures ----------
// part-whole bar: the whole on top, the two parts below; q marks the unknown ('W', 'a' or 'b')
function barPic(W, a, b, q) {
  const wa = Math.max(80, Math.min(220, Math.round((300 * a) / W))), lab = (k, v) => (q === k ? '?' : v);
  return `<div dir="ltr"><svg viewBox="0 0 320 92" class="zadd-bar"><rect x="10" y="4" width="300" height="38" rx="9" class="zadd-bw${q === 'W' ? ' q' : ''}"/><text x="160" y="31" class="zadd-bt">${lab('W', W)}</text>` +
    `<rect x="10" y="50" width="${wa}" height="38" rx="9" class="zadd-ba${q === 'a' ? ' q' : ''}"/><text x="${10 + wa / 2}" y="77" class="zadd-bt">${lab('a', a)}</text>` +
    `<rect x="${10 + wa}" y="50" width="${300 - wa}" height="38" rx="9" class="zadd-bb${q === 'b' ? ' q' : ''}"/><text x="${10 + wa + (300 - wa) / 2}" y="77" class="zadd-bt">${lab('b', b)}</text></svg></div>`;
}
// a stretch of the number line from lo to lo + 10 steps, with the monkey on n
function roundPic(lo, step, n) {
  const hi = lo + 10 * step, X = v => 30 + ((v - lo) * 280) / (10 * step), Y = 64;
  let s = `<line x1="14" y1="${Y}" x2="326" y2="${Y}" class="zadd-axis"/>`;
  for (let k = 0; k <= 10; k++) {
    const v = lo + k * step, end = k === 0 || k === 10, mid = k === 5, t = end ? 12 : mid ? 10 : 5;
    s += `<line x1="${f(X(v))}" y1="${Y - t}" x2="${f(X(v))}" y2="${Y + t}" class="zadd-tick${end ? ' big' : ''}${mid ? ' mid' : ''}"/>`;
  }
  s += `<text x="${f(X(lo))}" y="${Y + 32}" class="zadd-tl big">${lo}</text><text x="${f(X(hi))}" y="${Y + 32}" class="zadd-tl big">${hi}</text><text x="${f(X(lo + 5 * step))}" y="${Y + 30}" class="zadd-tl mid">${lo + 5 * step}</text>`;
  s += `<text x="${f(X(n))}" y="${Y - 6}" class="zadd-emo">🐒</text><text x="${f(X(n))}" y="18" class="zadd-nl">${n}</text>`;
  return `<div dir="ltr"><svg viewBox="0 0 340 104" class="zadd-rl">${s}</svg></div>`;
}

// =====================================================================
// 1. place value
// =====================================================================
const place = {
  id: 'zadd-place', title: 'ארגזים ואשכולות',
  intro: `<p>אצל הקופים סופרים בננות בקבוצות: <b>אשכול</b> הוא 10 בננות, ו<b>ארגז</b> הוא 100 בננות.</p>
    <div class="ex">${pic(2, 4, 7)}2 ארגזים, 4 אשכולות ו־7 בננות הם 247:<br>2 מאות, 4 עשרות ו־7 אחדות. ${M('200 + 40 + 7 = 247')}</div>
    <p>כשבונים מספר: לחצו על + ועל − כדי להוסיף או להוריד ארגז, אשכול או בננה.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 3), n = rnd(11, 99), T = dig(n, 1), O = dig(n, 0);
      if (t === 0)
        return {
          prompt: `השומר צריך ${n} בננות. הכינו לו ${n} בננות מאשכולות ומבננות בודדות.`,
          widget: builder('to'), answer: { t: T, o: O }, check: v => v.n === n, wrongMsg: v => `הכנתם ${v.n} בננות.`,
          hints: ['כל אשכול הוא 10 בננות. כמה עשרות יש במספר?', `${n} בננות הן ${describe(0, T, O)}.`],
          explain: `${n} בננות הן ${describe(0, T, O)}${partsM(n)}.`,
        };
      if (t === 1)
        return num({
          prompt: 'כמה בננות יש כאן?', visual: pic(0, T, O), answer: n,
          hints: ['כל אשכול הוא 10 בננות. ספרו את האשכולות בקפיצות של 10: 10, 20, 30...', `${bunchesW(T)} הם ${10 * T} בננות${O ? `, ועוד ${bananas(O)}` : ''}.`],
          explain: `${describe(0, T, O)}${partsM(n)}.`,
        });
      if (t === 2)
        return {
          prompt: `פרקו את ${n} לעשרות ולאחדות.`, visual: pic(0, T, O),
          widget: inputs(`<div class="ans-line zadd-words">${n} = ${box('t', 2)} עשרות ו־${box('o', 2)} אחדות</div>`),
          answer: { t: T, o: O }, check: v => v.t === T && v.o === O,
          hints: ['במספר דו־ספרתי, הספרה השמאלית היא העשרות והספרה הימנית היא האחדות.', `${M(`${n} = ${10 * T} + ${O}`)}`],
          explain: `${M(`${n} = ${10 * T} + ${O}`)}: ${T} עשרות ו־${O} אחדות.`,
        };
      let m;
      do m = rnd(11, 99); while (dig(m, 0) === dig(m, 1) || !dig(m, 0));
      const pos = rnd(0, 1), d = dig(m, pos);
      return {
        prompt: `במספר ${m}, כמה שווה הספרה ${d}?`,
        widget: choice([d, 10 * d, 100 * d].map(String), { cols: 3, cls: 'signs' }), answer: pos, check: v => v === pos,
        hints: ['הספרה הימנית היא האחדות, והספרה שמשמאלה היא העשרות.', `הספרה ${d} נמצאת במקום ה${PLACE[pos]}.`],
        explain: `${M(`${m} = ${10 * dig(m, 1)} + ${dig(m, 0)}`)}. הספרה ${d} נמצאת במקום ה${PLACE[pos]}, ולכן היא שווה ${d * 10 ** pos}.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 3);
      if (t === 0) {
        let n = rnd(101, 999);
        if (Math.random() < 0.35) n = Math.random() < 0.5 ? rnd(1, 9) * 100 + rnd(1, 9) : rnd(1, 9) * 100 + rnd(1, 9) * 10;
        const [C, T, O] = [dig(n, 2), dig(n, 1), dig(n, 0)];
        return {
          prompt: `הכינו לקופים ${n} בננות מארגזים, מאשכולות ומבננות בודדות.`,
          widget: builder('hto'), answer: { h: C, t: T, o: O }, check: v => v.n === n, wrongMsg: v => `הכנתם ${v.n} בננות.`,
          hints: ['ארגז הוא 100, אשכול הוא 10. התחילו מהמאות.', `${n} בננות הן ${describe(C, T, O)}.`],
          explain: `${n} בננות הן ${describe(C, T, O)}${partsM(n)}.`,
        };
      }
      if (t === 1) {
        const C = rnd(1, 8), messy = Math.random() < 0.5, T = Math.random() < 0.25 ? 0 : rnd(1, messy ? 8 : 9), O = messy ? rnd(11, 17) : rnd(1, 9), n = 100 * C + 10 * T + O;
        return num({
          prompt: 'כמה בננות יש כאן?', visual: pic(C, T, O, pick(['hto', 'hto', 'oth', 'tho'])), answer: n,
          hints: ['ספרו כל סוג לחוד: ארגזים (מאות), אשכולות (עשרות) ובננות (אחדות).', messy ? `שימו לב: יש ${O} בננות בודדות. זה עוד אשכול, ועוד ${bananas(O - 10)}.` : `יש כאן ${describe(C, T, O)}.`],
          explain: `${describe(C, T, O)}: ${M(`${[100 * C, 10 * T, O].filter(Boolean).join(' + ')} = ${n}`)}.`,
        });
      }
      let n;
      do n = rnd(111, 999); while (new Set(String(n)).size < 3 || String(n).includes('0'));
      if (t === 2) {
        const pos = rnd(0, 2), d = dig(n, pos);
        return {
          prompt: `במספר ${n}, כמה שווה הספרה ${d}?`,
          widget: choice([d, 10 * d, 100 * d].map(String), { cols: 3, cls: 'signs' }), answer: pos, check: v => v === pos,
          hints: ['מימין לשמאל: אחדות, עשרות, מאות.', `הספרה ${d} נמצאת במקום ה${PLACE[pos]}.`],
          explain: `${M(`${n} = ${parts(n).join(' + ')}`)}. הספרה ${d} נמצאת במקום ה${PLACE[pos]}, ולכן היא שווה ${d * 10 ** pos}.`,
        };
      }
      const P = parts(n);
      return {
        prompt: `פרקו את ${n} למאות, לעשרות ולאחדות.`,
        widget: inputs(`<div class="ans-line">${M(`${n} =`)}</div><div class="ans-line">${M(`${box('a', 3)} + ${box('b', 3)} + ${box('c', 2)}`)}</div>`),
        answer: { a: P[0], b: P[1], c: P[2] }, check: v => [v.a, v.b, v.c].sort((x, y) => y - x).join() === P.join(),
        hints: [`כמה שווה כל ספרה במספר ${n}?`, `הספרה ${dig(n, 2)} היא ${dig(n, 2)} מאות, כלומר ${P[0]}.`],
        explain: M(`${n} = ${P.join(' + ')}`),
      };
    }
    const t = rnd(0, 4);
    if (t === 0) {
      const d = pick([1, 10]), dir = pick([1, -1]);
      let n;
      do n = rnd(101, 989);
      while (dir > 0 ? (d === 1 ? dig(n, 0) !== 9 : dig(n, 1) !== 9 || dig(n, 2) === 9) : d === 1 ? dig(n, 0) !== 0 : dig(n, 1) !== 0 || n < 200);
      const m = n + dir * d, [C, T, O] = [dig(m, 2), dig(m, 1), dig(m, 0)];
      return {
        prompt: `הכינו מספר בננות ש${dir > 0 ? 'גדול' : 'קטן'} ב־${d} מ־${n}.`,
        widget: builder('hto'), answer: { h: C, t: T, o: O }, check: v => v.n === m, wrongMsg: v => `הכנתם ${v.n} בננות.`,
        hints: [d === 1 ? (dir > 0 ? `מה בא אחרי ${n}? שימו לב: 10 בננות בודדות הופכות לאשכול.` : `מה בא לפני ${n}? אין בננות בודדות, אז צריך לפתוח אשכול.`)
          : dir > 0 ? `הוסיפו אשכול. אבל 10 אשכולות הם ארגז שלם!` : 'צריך להוריד אשכול, ואין אשכולות. פתחו ארגז ל־10 אשכולות.',
        `${M(`${n} ${dir > 0 ? '+' : '−'} ${d} = ${m}`)}`],
        explain: `${M(`${n} ${dir > 0 ? '+' : '−'} ${d} = ${m}`)}: ${describe(C, T, O)}.`,
      };
    }
    if (t === 1) {
      const C = rnd(1, 3), T = rnd(10, 15), O = rnd(10, 16), n = 100 * C + 10 * T + O;
      return num({
        prompt: 'הקופים ערבבו את הבננות. כמה בננות יש כאן בסך הכול?', visual: pic(C, T, O, pick(['hto', 'oth'])), answer: n,
        hints: ['ספרו כל סוג לחוד, ואז חברו.', `${cratesW(C)} הם ${100 * C}, ${bunchesW(T)} הם ${10 * T}, ויש עוד ${bananas(O)}.`],
        explain: M(`${100 * C} + ${10 * T} + ${O} = ${n}`),
      });
    }
    if (t === 2) {
      const C = rnd(2, 6), T = rnd(11, 19), O = rnd(10, 19), n = 100 * C + 10 * T + O;
      return num({
        prompt: `איזה מספר הוא ${C} מאות, ${T} עשרות ו־${O} אחדות?`, answer: n,
        hints: [`${T} עשרות הן ${10 * T}, כלומר יותר ממאה!`, `${M(`${100 * C} + ${10 * T} + ${O}`)}`],
        explain: M(`${100 * C} + ${10 * T} + ${O} = ${n}`),
      });
    }
    if (t === 3) {
      let ds;
      do ds = shuffle(range(10)).slice(0, 3); while (ds.filter(Boolean).length < 2);
      const big = Math.random() < 0.5, sorted = [...ds].sort((a, b) => b - a);
      let ans;
      if (big) ans = +sorted.join('');
      else {
        const asc = [...ds].sort((a, b) => a - b), first = asc.find(Boolean);
        asc.splice(asc.indexOf(first), 1);
        ans = +[first, ...asc].join('');
      }
      return num({
        prompt: `על שלושה כרטיסים כתובות הספרות ${M(ds.join(', '))}. מה המספר התלת־ספרתי ה${big ? 'גדול' : 'קטן'} ביותר שאפשר לבנות מהם? (כל כרטיס פעם אחת.)`, answer: ans,
        hints: [big ? 'שימו את הספרה הגדולה ביותר במקום המאות.' : 'שימו במקום המאות את הספרה הקטנה ביותר, אבל לא 0: מספר לא מתחיל ב־0.', big ? `במקום המאות: ${sorted[0]}.` : `במקום המאות: ${dig(ans, 2)}.`],
        explain: `${big ? 'מהגדולה לקטנה' : 'מהקטנה לגדולה (בלי 0 בהתחלה)'}: ${ans}.`,
      });
    }
    const n = rnd(120, 999);
    return num({
      prompt: `לקופים יש ${n} בננות. כמה אשכולות מלאים של 10 אפשר להכין מהן?`, answer: Math.floor(n / 10),
      hints: ['בכל ארגז של 100 יש 10 אשכולות.', `${dig(n, 2)} מאות הן ${10 * dig(n, 2)} עשרות, ועוד ${dig(n, 1)} עשרות.`],
      explain: `ב־${n} יש ${Math.floor(n / 10)} עשרות${n % 10 ? `, ונשארות ${n % 10} בננות בודדות` : ''}. לכן אפשר להכין ${Math.floor(n / 10)} אשכולות.`,
    });
  },
};

// =====================================================================
// 2. making 10, 100 and 1000
// =====================================================================
const bond = {
  id: 'zadd-bond', title: 'זוגות משלימים',
  intro: `<p>שני מספרים <b>משלימים</b> ל־10 כשהם יחד בדיוק 10, כמו 3 ו־7. כך גם ל־100 ול־1000.</p>
    <div class="ex">${M('64 + 36 = 100')}: האחדות משלימות ל־10: ${M('4 + 6 = 10')}. העשרות משלימות רק ל־9: ${M('6 + 3 = 9')}, כי עשרת אחת כבר באה מהאחדות.</div>
    <p>במשחק הזוגות: לחצו על שני מספרים שמשלימים זה את זה.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (t === 0) {
      let T, bases, decoys = [], hint;
      if (L === 1) {
        T = pick([10, 20, 100]);
        bases = shuffle(T === 10 ? [1, 2, 3, 4] : T === 20 ? range(9, i => i + 1) : [10, 20, 30, 40]).slice(0, 3);
        hint = T === 100 ? 'חשבו בעשרות: ל־3 עשרות חסרות 7 עשרות עד 10 עשרות, שהן 100.' : `כמה חסר לכל מספר כדי להגיע ל־${T}?`;
      } else if (L === 2) {
        T = pick([100, 1000]);
        const pool = T === 100 ? range(39, i => i + 11).filter(x => x % 10) : range(39, i => (i + 11) * 10).filter(x => x % 100);
        bases = shuffle(pool).slice(0, 3);
        hint = T === 100 ? 'האחדות משלימות ל־10, והעשרות משלימות ל־9 (כי מהאחדות עוברת עשרת).' : 'העשרות משלימות ל־10 עשרות, והמאות משלימות ל־9 מאות.';
      } else {
        T = 1000;
        const trap = x => +[...String(x)].map(d => 10 - d).join('');
        for (;;) {
          bases = range(3, () => rnd(111, 499)).filter(x => !String(x).includes('0'));
          if (bases.length < 3 || new Set(bases).size < 3) continue;
          decoys = bases.slice(0, 2).map(trap);
          const tiles = [...bases, ...bases.map(x => T - x)];
          if (new Set([...tiles, ...decoys]).size === 8 && decoys.every(d => !tiles.includes(T - d)) && decoys[0] + decoys[1] !== T) break;
        }
        hint = 'האחדות משלימות ל־10, העשרות ל־9 והמאות ל־9. שימו לב למלכודות!';
      }
      const xs = bases.map(x => (Math.random() < 0.5 ? x : T - x)), vals = shuffle([...xs, ...xs.map(x => T - x), ...decoys]);
      const list = xs.map(x => M(`${x} + ${T - x} = ${T}`)).join('<br>');
      return {
        prompt: L === 3 ? `מצאו שלושה זוגות שיחד הם בדיוק ${T}. זהירות: שני מספרים לא שייכים לאף זוג!` : `מצאו את הזוגות שיחד הם בדיוק ${T}. לחצו על שני מספרים בכל פעם.`,
        widget: pairGame(vals, T), sig: vals.join(','), tries: 3,
        hints: [hint, `למשל: ${M(`${xs[0]} + ${T - xs[0]} = ${T}`)}.`],
        explain: `הזוגות:<br>${list}${decoys.length ? `<br>המלכודות: ${decoys.join(' ו־')}. ${decoys.map((d, i) => M(`${bases[i]} + ${d} = ${bases[i] + d}`)).join(', ')}: מי שמשלים כל ספרה ל־10 מקבל 1110, לא 1000.` : ''}`,
      };
    }
    if (L === 1) {
      if (t === 1) {
        let a;
        do a = rnd(11, 89); while (a % 10 === 0);
        const T = up(a, 10), ans = T - a;
        return fill({
          prompt: `לקוף יש ${a} בננות. כמה חסרות לו עד ${T}?`, visual: barPic(T, a, ans, 'b'), eq: `${a} + □ = ${T}`, answer: ans,
          hints: [`באחדות יש ${a % 10}. כמה חסר להן עד 10?`, M(`${a % 10} + ${ans} = 10`)],
          explain: `${M(`${a} + ${ans} = ${T}`)}, כי ${M(`${a % 10} + ${ans} = 10`)}.`,
        });
      }
      const a = 5 * rnd(1, 19), ans = 100 - a, first = Math.random() < 0.5;
      return fill({
        prompt: 'כמה חסר עד 100?', visual: barPic(100, first ? ans : a, first ? a : ans, first ? 'a' : 'b'), eq: first ? `□ + ${a} = 100` : `${a} + □ = 100`, answer: ans,
        hints: [a % 10 ? `קודם השלימו לעשרת: ${M(`${a} + 5 = ${a + 5}`)}. ומשם עד 100?` : `${a} הם ${a / 10} עשרות. כמה עשרות חסרות עד 10 עשרות?`, a % 10 ? `מ־${a + 5} עד 100 חסרים ${95 - a}.` : `חסרות ${ans / 10} עשרות.`],
        explain: `${M(`${a} + ${ans} = 100`)}${a % 10 ? `: ${M(`5 + ${95 - a} = ${ans}`)}` : ''}.`,
      });
    }
    if (L === 2) {
      if (t === 1) {
        const big = Math.random() < 0.5, T = big ? 1000 : 100;
        let a;
        do a = big ? 10 * rnd(11, 89) : rnd(11, 89); while (a % (big ? 100 : 10) === 0);
        const ans = T - a, u = up(a, big ? 100 : 10);
        return fill({
          prompt: `כמה חסר ל־${a} עד ${T}?`, visual: barPic(T, a, ans, 'b'), eq: `${a} + □ = ${T}`, answer: ans,
          hints: [big ? 'העשרות משלימות ל־10 עשרות, והמאות משלימות ל־9 מאות.' : 'האחדות משלימות ל־10, והעשרות משלימות ל־9.', `${M(`${a} + ${u - a} = ${u}`)}, ומשם עוד ${T - u} עד ${T}.`],
          explain: `${M(`${u - a} + ${T - u} = ${ans}`)}, ולכן ${M(`${a} + ${ans} = ${T}`)}.`,
        });
      }
      let a;
      do a = rnd(101, 989); while (a % 100 === 0);
      const T = up(a, 100), u = up(a, 10), steps = [u - a, T - u].filter(Boolean);
      return fill({
        prompt: `השומר צריך ${T} בננות, ויש לו ${a}. כמה עוד חסרות?`, visual: barPic(T, a, T - a, 'b'), eq: `${a} + □ = ${T}`, answer: T - a,
        hints: [u > a && u < T ? `קודם לעשרת הבאה: ${M(`${a} + ${u - a} = ${u}`)}.` : `כמה צעדים יש מ־${a} עד ${T}?`, `${M(`${a} + ${steps.join(' + ')} = ${T}`)}`],
        explain: `${M(`${a} + ${steps.join(' + ')} = ${T}`)}${steps.length > 1 ? `, ובסך הכול ${M(`${steps.join(' + ')} = ${T - a}`)}` : ''}.`,
      });
    }
    if (t === 1) {
      let a;
      do a = rnd(101, 889); while (a % 10 === 0 || dig(a, 1) === 9);
      const t1 = up(a, 10), t2 = up(a, 100), s = [t1 - a, t2 - t1, 1000 - t2];
      return {
        prompt: `הקוף קופץ מ־${a} ל־1000 בשלוש קפיצות: לעשרת הבאה, למאה הבאה, ואז ל־1000. השלימו. בשורה האחרונה כתבו כמה קפץ בסך הכול.`,
        widget: inputs([`${a} + ${box('s1', 2)} = ${t1}`, `${t1} + ${box('s2', 3)} = ${t2}`, `${t2} + ${box('s3', 4)} = 1000`, `${a} + ${box('s4', 4)} = 1000`].map(x => `<div class="ans-line">${M(x)}</div>`).join('')),
        answer: { s1: s[0], s2: s[1], s3: s[2], s4: 1000 - a }, check: v => v.s1 === s[0] && v.s2 === s[1] && v.s3 === s[2] && v.s4 === 1000 - a,
        hints: [`העשרת הבאה אחרי ${a} היא ${t1}, והמאה הבאה היא ${t2}.`, `בסך הכול: ${M(`${s.join(' + ')}`)}.`],
        explain: `${M(`${a} + ${s[0]} = ${t1}`)}, ${M(`${t1} + ${s[1]} = ${t2}`)}, ${M(`${t2} + ${s[2]} = 1000`)}.<br>בסך הכול ${M(`${s.join(' + ')} = ${1000 - a}`)}.`,
      };
    }
    const T = pick([100, 1000]), d = T === 100 ? 2 * rnd(2, 30) : 20 * rnd(1, 30), lo = (T - d) / 2, hi = lo + d;
    return nums({
      prompt: `לשני קופים יש יחד ${T} בננות. לאחד יש ${d} בננות יותר מלשני. כמה בננות יש לכל קוף?`,
      fields: [['לקוף עם פחות:', lo], ['לקוף עם יותר:', hi]],
      hints: [`אם ניקח מהקוף עם יותר את ה־${d} הנוספות, לשניהם יהיה אותו מספר.`, `${M(`${T} − ${d} = ${T - d}`)}, וחצי מזה הוא ${lo}.`],
      explain: `${M(`${T} − ${d} = ${T - d}`)}, חצי מזה: ${lo}. לשני: ${M(`${lo} + ${d} = ${hi}`)}.<br>בדיקה: ${M(`${lo} + ${hi} = ${T}`)}.`,
    });
  },
};

// =====================================================================
// 3. jumps on the number line
// =====================================================================
const jump = {
  id: 'zadd-jump', title: 'הקוף קופץ',
  intro: `<p>על ישר המספרים מחברים בקפיצות קדימה ומחסרים בקפיצות אחורה. כדי לחבר 25 קופצים 2 קפיצות של 10, ועוד 5 קפיצות של 1.</p>
    <div class="ex">${M('34 + 25')}: מ־34 קופצים ל־44, ל־54, ואז עוד 5 קפיצות קטנות עד 59.${linePic({ lo: 30, hi: 62, start: 34, jumps: [10, 10, 5], marks: [{ v: 34, label: 34 }, { v: 59, icon: '🐒', label: 59 }] })}</div>
    <p>לחצו על כפתורי הקפיצה, כמו ${M('+10')} או ${M('−1')}, כדי להזיז את הקוף. ↶ מבטל את הקפיצה האחרונה.</p>`,
  gen(L) {
    const t = rnd(0, L === 2 ? 3 : 2), steps = L === 1 ? [-10, -1, 1, 10] : [-100, -10, -1, 1, 10, 100];
    if (L < 3 && t < 2) {
      const add = t === 0;
      let a, b;
      do {
        a = L === 1 ? (add ? rnd(11, 59) : rnd(41, 99)) : add ? rnd(101, 699) : rnd(300, 999);
        b = L === 1 ? rnd(12, add ? 39 : 49) : 100 * rnd(1, 2) + 10 * rnd(0, 4) + rnd(1, 5);
      } while (b % 10 === 0 || (add ? a + b > (L === 1 ? 99 : 999) : a - b < (L === 1 ? 10 : 100)));
      const end = add ? a + b : a - b, lo = Math.max(0, down(Math.min(a, end), 10) - 10), hi = Math.min(L === 1 ? 100 : 1000, up(Math.max(a, end), 10) + 10);
      const js = plainJumps(b, add ? 1 : -1), H = Math.floor(b / 100), T = dig(b, 1), O = dig(b, 0);
      const how = and([H && jumpsW(H, 100), T && jumpsW(T, 10), O && jumpsW(O, 1)].filter(Boolean));
      return {
        prompt: `הקוף עומד על ${a}. קפצו איתו ${b} ${add ? 'קדימה' : 'אחורה'}. איפה הוא ינחת?<div class="zadd-ex">${M(`${a} ${opS(add ? '+' : '-')} ${b} = ?`)}</div>`,
        widget: jumpLine({ start: a, lo, hi, steps }), answer: { jumps: js }, check: v => v.pos === end,
        wrongMsg: v => (v.pos === a ? '' : `הקוף קפץ ${Math.abs(v.pos - a)} ${v.pos > a ? 'קדימה' : 'אחורה'}, ולא ${b} ${add ? 'קדימה' : 'אחורה'}.`),
        hints: [`${M(`${b} = ${parts(b).join(' + ')}`)}. קפצו ${how} ${add ? 'קדימה' : 'אחורה'}.`, `אחרי הקפיצות הגדולות הקוף על ${a + (add ? 1 : -1) * (b - O)}. עכשיו עוד ${O} קטנות.`],
        explain: `${chainM(a, group(js), end)}`,
      };
    }
    if (L < 3 && t === 2) {
      const add = Math.random() < 0.6;
      let a, b;
      do {
        a = L === 1 ? rnd(11, 89) : rnd(110, 890);
        b = L === 1 ? rnd(12, 39) : 100 * rnd(1, 2) + 10 * rnd(1, 3) + rnd(1, 6);
      } while (b % 10 === 0 || (add ? a + b > (L === 1 ? 99 : 999) : a - b < (L === 1 ? 5 : 100)));
      const end = add ? a + b : a - b, dir = add ? 1 : -1;
      const js = L === 1 ? plainJumps(b, dir) : [...range(Math.floor(b / 100), () => 100 * dir), 10 * dig(b, 1) * dir, dig(b, 0) * dir];
      const lo = Math.max(0, down(Math.min(a, end), 10) - 10), hi = Math.min(L === 1 ? 100 : 1000, up(Math.max(a, end), 10) + 10);
      const drawn = L === 1 ? [...js.filter(s => Math.abs(s) === 10), dig(b, 0) * dir] : js;
      const visual = linePic({ lo, hi, start: a, jumps: drawn, marks: [{ v: a, label: a }, { v: end, icon: '🐒', label: '?' }] });
      if (L === 2 && Math.random() < 0.6) {
        const other = 100 * Math.floor(b / 100) + 10 * dig(b, 0) + dig(b, 1);
        const opts = shuffle([`${a} ${opS(add ? '+' : '-')} ${b}`, `${a} ${opS(add ? '-' : '+')} ${b}`, ...(other !== b ? [`${a} ${opS(add ? '+' : '-')} ${other}`] : [`${a} ${opS(add ? '+' : '-')} ${b + 10}`])]);
        const right = `${a} ${opS(add ? '+' : '-')} ${b}`, idx = opts.indexOf(right);
        return {
          prompt: 'איזה תרגיל עשה הקוף בקפיצות שלו?', visual,
          widget: choice(opts.map(o => M(o)), { cols: 1, cls: 'nums' }), answer: idx, check: v => v === idx,
          hints: [`הקשתות הולכות ${add ? 'ימינה, כלומר קדימה' : 'שמאלה, כלומר אחורה'}.`, `חברו את כל הקפיצות: ${M(drawn.map(s => Math.abs(s)).join(' + '))}.`],
          explain: `הקוף קפץ ${b} ${add ? 'קדימה' : 'אחורה'} מ־${a}: ${M(`${right} = ${end}`)}.`,
        };
      }
      return num({
        prompt: 'הקוף קפץ כמו בציור. על איזה מספר הוא נחת?', visual, answer: end,
        hints: ['כל קשת היא קפיצה. המספר שעל הקשת אומר כמה קפץ.', `בסך הכול הקוף קפץ ${b} ${add ? 'קדימה' : 'אחורה'}.`],
        explain: `${chainM(a, group(drawn), end)}`,
      });
    }
    if (L === 2) {
      let a, d;
      do {
        a = rnd(120, 800);
        d = rnd(34, 190);
      } while (a % 10 === 0 || (a + d) % 10 === 0 || a + d > 990);
      const c = a + d, s = [up(a, 10) - a, down(c, 10) - up(a, 10), c - down(c, 10)].filter(Boolean);
      return num({
        prompt: `הקוף עומד על ${a}, והבננה מחכה לו על ${c}. כמה הוא צריך לקפוץ כדי להגיע אליה?`,
        visual: linePic({ lo: down(a, 10) - 10, hi: up(c, 10) + 10, marks: [{ v: a, icon: '🐒', label: a }, { v: c, icon: '🍌', label: c }] }), answer: d,
        hints: [`קפצו קודם מ־${a} לעשרת הבאה, ${up(a, 10)}. משם בקפיצות גדולות עד ${down(c, 10)}, ואז עד ${c}.`, `${M(`${a} + ${s.join(' + ')} = ${c}`)}`],
        explain: `${M(`${a} + ${s.join(' + ')} = ${c}`)}, ובסך הכול ${M(`${s.join(' + ')} = ${d}`)}.`,
      });
    }
    // level 3
    if (t === 0) {
      for (;;) {
        const three = Math.random() < 0.5, a = three ? rnd(110, 790) : rnd(11, 70);
        const b = three ? 100 * rnd(0, 1) + 10 * rnd(1, 9) + rnd(6, 9) : 10 * rnd(1, 6) + rnd(7, 9);
        const add = Math.random() < 0.6 || a - b < (three ? 100 : 5), end = add ? a + b : a - b;
        if (end > (three ? 999 : 99) || end < 0) continue;
        const lo = three ? down(Math.min(a, end), 100) : 0, hi = three ? up(Math.max(a, end) + 1, 100) : 100;
        const path = minPath(a, end, lo, hi, [100, -100, 10, -10, 1, -1]), naive = dig(b, 0) + dig(b, 1) + dig(b, 2);
        if (naive - path.length < 3) continue;
        const N = path.length;
        return {
          prompt: `הקוף על ${a}, והבננה על ${end}. הקוף עייף: הוא מוכן לקפוץ רק ${N} קפיצות. עזרו לו להגיע לבננה!`,
          widget: jumpLine({ start: a, lo, hi, steps: [-100, -10, -1, 1, 10, 100], goal: end, max: N }), answer: { jumps: path },
          check: v => v.pos === end && v.n <= N,
          wrongMsg: v => (v.pos !== end ? `הקוף על ${v.pos}, לא על הבננה.` : `זה לקח ${v.n} קפיצות. אפשר גם ב־${N}!`),
          hints: ['לפעמים כדאי לקפוץ קצת יותר מדי, ואז לחזור אחורה.', `נסו כך: ${chainM(a, group(path))}.`],
          explain: `${chainM(a, group(path), end)}: ${N} קפיצות בלבד, כי ${M(`${add ? '+' : '−'}${b}`)} זה כמו ${M(group(path).map(sgn).join(' '))}.`,
        };
      }
    }
    if (t === 1) {
      for (;;) {
        const three = Math.random() < 0.5;
        const js = three ? [pick([100, 200, -100]), pick([-10, -20, -30, 20, 30]), pick([-1, 1]) * rnd(2, 8)] : [pick([10, 20, 30, 40]) * pick([1, -1]), pick([1, -1]) * rnd(2, 9)];
        const s = three ? rnd(150, 800) : rnd(15, 80);
        const pos = js.reduce((p, x) => [...p, p[p.length - 1] + x], [s]);
        if (Math.min(...pos) < (three ? 100 : 5) || Math.max(...pos) > (three ? 999 : 99)) continue;
        const e = pos[pos.length - 1], lo = Math.max(0, down(Math.min(...pos), 10) - 10), hi = Math.min(three ? 1000 : 100, up(Math.max(...pos), 10) + 10);
        const back = [...js].reverse().map(x => -x);
        return num({
          prompt: `הקוף קפץ ${M(js.map(sgn).join(', '))} ונחת על ${e}. מאיפה הוא התחיל?`,
          visual: linePic({ lo, hi, start: s, jumps: js, marks: [{ v: s, label: '?' }, { v: e, icon: '🐒', label: e }] }), answer: s,
          hints: ['עבדו מהסוף להתחלה: כל קפיצה קדימה הופכת לקפיצה אחורה, וכל קפיצה אחורה לקפיצה קדימה.', `מתחילים מ־${e}: ${chainM(e, [back[0]])}...`],
          explain: `מהסוף להתחלה: ${chainM(e, back, s)}.<br>בדיקה: ${chainM(s, js, e)}.`,
        });
      }
    }
    let a, c;
    do {
      a = rnd(12, 600);
      c = a + 2 * rnd(8, 120);
    } while (c > 990 || (c - a) % 20 === 0);
    const mid = (a + c) / 2;
    return num({
      prompt: `קוף אחד על ${a} וקוף שני על ${c}. הם קופצים זה לקראת זה, באותה מהירות, ונפגשים בדיוק באמצע. באיזה מספר הם נפגשים?`,
      visual: linePic({ lo: Math.max(0, down(a, 10) - 10), hi: Math.min(1000, up(c, 10) + 10), marks: [{ v: a, icon: '🐒', label: a }, { v: c, icon: '🐒', label: c }, { v: mid, label: '?' }] }), answer: mid,
      hints: ['מצאו קודם כמה רחוק הקופים זה מזה.', `המרחק הוא ${M(`${c} − ${a} = ${c - a}`)}. כל קוף עובר חצי ממנו.`],
      explain: `המרחק ${c - a}, חצי ממנו ${(c - a) / 2}. ${M(`${a} + ${(c - a) / 2} = ${mid}`)}, וגם ${M(`${c} − ${(c - a) / 2} = ${mid}`)}.`,
    });
  },
};

// =====================================================================
// 4. addition with carrying
// =====================================================================
const ADD_STORIES = [
  (a, b) => `בכלוב היו ${a} בננות, והשומר הביא עוד ${b}. כמה בננות יש עכשיו?`,
  (a, b) => `בבוקר ביקרו אצל הקופים ${a} ילדים, ובצהריים עוד ${b}. כמה ילדים ביקרו?`,
  (a, b) => `קוף אחד אסף ${a} אגוזים, וקוף שני אסף ${b}. כמה אגוזים אספו יחד?`,
  (a, b) => `חשבו: ${M(`${a} + ${b}`)}`,
];
const nCarries = rows => carries(rows).filter(Boolean).length;
const carry = {
  id: 'zadd-carry', title: 'חיבור עם המרה',
  intro: `<p>מחברים במאונך: אחדות מתחת לאחדות, עשרות מתחת לעשרות, ומתחילים מ<b>האחדות</b>.</p>
    <p>אם בעמודה יוצא 10 או יותר, זו <b>המרה</b>: 10 אחדות הן עשרת אחת. כותבים רק את ספרת האחדות, ואת העשרת מעבירים לעמודה הבאה.</p>
    <div class="ex">${colStatic([38, 47], '+')}${M('8 + 7 = 15')}: כותבים 5 ומעבירים 1.<br>${M('3 + 4 + 1 = 8')}. התשובה 85.</div>
    <p>לחצו על העיגול שמעל עמודה כדי לרשום בו מה העברתם. את התשובה כותבים בתיבות מימין לשמאל.</p>`,
  gen(L) {
    if (L === 3 && Math.random() < 0.34) {
      let a, b;
      do {
        a = rnd(101, 799);
        b = rnd(101, 899);
      } while (a + b > 999 || nCarries([a, b]) < 2);
      const hide = new Set(range(3, c => `${rnd(0, 2)},${c}`)), r0 = +[...hide][0].split(',')[0];
      const col = column([a, b], '+', hide);
      return {
        prompt: 'החשבונאי מחק כמה ספרות! השלימו את הספרות החסרות.', ...col, tries: 3,
        hints: ['התחילו מעמודת האחדות: איזו ספרה חסרה כדי שהחשבון בעמודה יסתדר?', 'זכרו את ההמרות: אם בעמודה יצא 10 או יותר, עובר 1 לעמודה הבאה.', `הספרה החסרה באחדות היא ${dig([a, b, a + b][r0], 0)}.`],
        explain: colExplain([a, b], '+'),
      };
    }
    let rows;
    for (;;) {
      if (L === 1) {
        const a = rnd(11, 89), b = Math.random() < 0.25 ? rnd(2, 9) : rnd(11, 89);
        rows = [a, b];
        if (a + b <= 99 && dig(a, 0) + dig(b, 0) >= 10) break;
      } else if (L === 2) {
        const a = rnd(100, 899), b = Math.random() < 0.3 ? rnd(11, 99) : rnd(100, 899), two = Math.random() < 0.5;
        rows = [a, b];
        if (a + b <= 999 && nCarries(rows) >= (two ? 2 : 1)) break;
      } else if (Math.random() < 0.5) {
        rows = range(3, () => (Math.random() < 0.5 ? rnd(15, 99) : rnd(101, 350)));
        if (sumOf(rows) <= 999 && sumOf(rows.map(n => dig(n, 0))) >= 10 && nCarries(rows) >= 2) break;
      } else {
        rows = [rnd(300, 899), rnd(300, 899)];
        if (sumOf(rows) >= 1000 && nCarries(rows) >= 3) break;
      }
    }
    const col = column(rows, '+'), st = addSteps(rows);
    return {
      prompt: rows.length === 3 ? `שלושה קופים אספו ${M(rows.join(', '))} אגוזים. כמה אגוזים אספו יחד? פתרו במאונך.`
        : `${pick(ADD_STORIES)(...rows)} פתרו במאונך${L === 1 ? ', והתחילו מהאחדות' : ''}.`,
      ...col,
      hints: L === 1 ? st.slice(0, 2) : ['התחילו מהאחדות. בכל עמודה, חברו גם את מה שהעברתם.', st[0], st[1]],
      explain: colExplain(rows, '+'),
    };
  },
};

// =====================================================================
// 5. subtraction with borrowing
// =====================================================================
const SUB_STORIES = [
  (a, b) => `בכלוב היו ${a} בננות. הקופים אכלו ${b}. כמה בננות נשארו?`,
  (a, b) => `בגן החיות היו ${a} מבקרים, ו־${b} מהם כבר הלכו הביתה. כמה מבקרים נשארו?`,
  (a, b) => `לשומר היו ${a} אגוזים. הוא חילק ${b} לקופים. כמה אגוזים נשארו לו?`,
  (a, b) => `חשבו: ${M(`${a} − ${b}`)}`,
];
const needsBorrow = (a, b) => range(len(a)).some(c => dig(a, c) < dig(b, c));
const borrow = {
  id: 'zadd-borrow', title: 'חיסור עם פריטה',
  intro: `<p>מחסרים במאונך ומתחילים מהאחדות. ומה אם למעלה יש פחות ממה שצריך להוריד? <b>פורטים</b>: לוקחים עשרת אחת ופותחים אותה ל־10 אחדות.</p>
    <div class="ex">${colStatic([52, 27], '-')}2 פחות 7 אי אפשר, אז פורטים: ${M('52 = 40 + 12')}.<br>${M('12 − 7 = 5')}, ${M('4 − 2 = 2')}. התשובה 25.</div>
    <p>בתרגיל במאונך: לחצו על ספרה במספר העליון כדי לפרוט ממנה. בציור הבננות: לחצו על בננה או על אשכול כדי שהקוף יאכל אותם, ועל ✂ כדי לפתוח אשכול.</p>`,
  gen(L) {
    if (L === 1 && Math.random() < 0.5) {
      let a, b;
      do {
        a = rnd(31, 99);
        b = 10 * rnd(1, 4) + rnd(1, 9);
      } while (dig(a, 0) >= dig(b, 0) || dig(b, 1) >= dig(a, 1));
      const ao = dig(a, 0), bo = dig(b, 0), at = dig(a, 1), bt = dig(b, 1);
      return {
        prompt: `בכלוב יש ${a} בננות. הקוף רוצה לאכול ${b}. כמה בננות יישארו? אפשר להיעזר בבננות.`,
        widget: eatTool(a, b), answer: { a: a - b }, check: v => v.a === a - b,
        hints: [`צריך לאכול ${bananas(bo)} בודדות, אבל ${ao ? `יש רק ${ao}` : 'אין בכלל בננות בודדות'}. פתחו אשכול אחד!`, `אחרי שפותחים אשכול יש ${10 + ao} בודדות: ${M(`${10 + ao} − ${bo} = ${10 + ao - bo}`)}. ונשארו ${bunchesW(at - 1)}, מהם הקוף אוכל ${bt}.`],
        explain: colExplain([a, b], '-'),
      };
    }
    let a, b, story = true;
    for (;;) {
      if (L === 1) {
        a = rnd(30, 99);
        b = rnd(11, a - 5);
        if (dig(a, 0) < dig(b, 0)) break;
      } else if (L === 2) {
        const zero = Math.random() < 0.3;
        a = zero ? 100 * rnd(2, 9) + rnd(0, 8) : rnd(200, 999);
        b = Math.random() < 0.3 ? rnd(11, 99) : rnd(100, a - 50);
        if (a - b >= 10 && (zero ? dig(b, 0) > dig(a, 0) : needsBorrow(a, b))) break;
      } else {
        const k = rnd(0, 2);
        a = k === 0 ? 1000 : k === 1 ? 100 * rnd(3, 9) : 100 * rnd(3, 9) + rnd(0, 6);
        b = rnd(101, a - 30);
        story = false;
        if (dig(b, 0) > dig(a, 0) && dig(b, 1) > 0) break;
      }
    }
    if (L === 3) {
      const t = rnd(0, 2);
      if (t === 1) {
        let x, y;
        do {
          x = Math.random() < 0.5 ? rnd(41, 99) : rnd(300, 999);
          y = len(x) === 2 ? rnd(12, x - 10) : rnd(110, x - 100);
        } while (!needsBorrow(x, y) || range(len(x)).some(c => dig(x, c) === 0));
        const wrong = sumOf(range(len(x), c => Math.abs(dig(x, c) - dig(y, c)) * 10 ** c)), c0 = range(len(x)).find(c => dig(x, c) < dig(y, c));
        return num({
          prompt: `קוף אחד חישב: ${M(`${x} − ${y} = ${wrong}`)}. הוא טעה! מה התשובה הנכונה?`, answer: x - y,
          hints: [`בדקו את ה${PLACE[c0]}: ${M(`${dig(x, c0)} − ${dig(y, c0)}`)}. מה הקוף עשה שם?`, 'הקוף חיסר את הספרה הקטנה מהגדולה, במקום לפרוט. פתרו במאונך עם פריטה.'],
          explain: `הקוף חישב ${M(`${dig(y, c0)} − ${dig(x, c0)}`)} במקום לפרוט.<br>${colExplain([x, y], '-')}`,
        });
      }
      if (t === 2) {
        let x, y;
        do {
          x = rnd(300, 999);
          y = rnd(101, x - 100);
        } while (!needsBorrow(x, y) || x - y < 100);
        const hide = new Set(range(3, c => `${rnd(0, 2)},${c}`)), r0 = +[...hide][0].split(',')[0];
        return {
          prompt: 'החשבונאי מחק כמה ספרות! השלימו את הספרות החסרות.', ...column([x, y], '-', hide), tries: 3,
          hints: ['התחילו מעמודת האחדות: איזו ספרה חסרה כדי שהחשבון בעמודה יסתדר?', 'זכרו לפרוט: אם למעלה יש פחות, לוקחים 1 מהעמודה שמשמאל.', `הספרה החסרה באחדות היא ${dig([x, y, x - y][r0], 0)}.`],
          explain: colExplain([x, y], '-'),
        };
      }
    }
    const st = subSteps(a, b);
    return {
      prompt: story ? `${pick(SUB_STORIES)(a, b)} פתרו במאונך.` : `פתרו במאונך: ${M(`${a} − ${b}`)}. יש כאן אפסים, אז צריך לפרוט כמה פעמים.`,
      ...column([a, b], '-'),
      hints: [L === 3 ? 'באחדות אין מספיק, ובעשרות יש 0. פורטים מהספרה הראשונה שאינה 0, צעד אחרי צעד.' : 'התחילו מהאחדות. אם למעלה יש פחות ממה שמורידים, פרטו עשרת מהעמודה שמשמאל.', ...st.slice(0, 2)],
      explain: colExplain([a, b], '-'),
    };
  },
};

// =====================================================================
// 6. the missing number
// =====================================================================
// □ + b = W, a + □ = W, W − □ = a, □ − a = b
function missingForm(a, b, form) {
  const W = a + b;
  return [
    { eq: `□ + ${b} = ${W}`, ans: a, q: 'a', how: `${W} − ${b}`, hint: `השלם הוא ${W}, וחלק אחד ממנו הוא ${b}. כדי למצוא את החלק החסר מחסרים.` },
    { eq: `${a} + □ = ${W}`, ans: b, q: 'b', how: `${W} − ${a}`, hint: `השלם הוא ${W}, וחלק אחד ממנו הוא ${a}. כדי למצוא את החלק החסר מחסרים.` },
    { eq: `${W} − □ = ${a}`, ans: b, q: 'b', how: `${W} − ${a}`, hint: `מ־${W} הורידו מספר, ונשאר ${a}. כמה הורידו?` },
    { eq: `□ − ${a} = ${b}`, ans: W, q: 'W', how: `${b} + ${a}`, hint: `מהמספר החסר הורידו ${a}, ונשאר ${b}. כלומר הוא השלם, וצריך לחבר.` },
  ][form];
}
const missing = {
  id: 'zadd-missing', title: 'המספר החסר',
  intro: `<p>בתרגיל חסר מספר. הציור עוזר להבין מה <b>השלם</b> ומה <b>החלקים</b>: השלם הוא שני החלקים יחד.</p>
    <div class="ex">${M(sq('□ + 37 = 82'))}: השלם הוא 82, וחלק אחד הוא 37. החלק החסר: ${M('82 − 37 = 45')}.${barPic(82, 45, 37, 'a')}</div>
    <p>תמיד אפשר לבדוק: ${M('45 + 37 = 82')} ✓</p>`,
  gen(L) {
    if (L < 3) {
      let a, b;
      do {
        a = L === 1 ? rnd(11, 70) : rnd(100, 700);
        b = L === 1 ? rnd(11, 99 - a) : rnd(40, 999 - a);
      } while (b < 11 || (L === 1 && (a % 10) + (b % 10) < 10 && Math.random() < 0.6));
      const F = missingForm(a, b, rnd(0, 3)), W = a + b, check = M(F.eq.replace('□', F.ans));
      if (L === 2 && Math.random() < 0.3) {
        const known = F.q === 'W' ? null : F.how.split(' − ')[1];
        const opts = shuffle(F.q === 'W' ? [`${b} + ${a}`, `${b} − ${a}`, `${a} − ${b}`].filter(o => !o.startsWith(`${a} − `) || a > b) : [F.how, `${W} + ${known}`, `${known} + ${known}`]);
        const idx = opts.indexOf(F.how);
        return {
          prompt: `איזה תרגיל עוזר למצוא את המספר החסר? ${M(sq(F.eq))}`, visual: barPic(W, a, b, F.q),
          widget: choice(opts.map(o => M(o)), { cols: 1, cls: 'nums' }), answer: idx, check: v => v === idx, tries: 1,
          hints: [F.hint], explain: `${M(`${F.how} = ${F.ans}`)}, ובדיקה: ${check}.`,
        };
      }
      return fill({
        prompt: pick(['מצאו את המספר החסר.', 'הקוף הסתיר מספר מאחורי בננה. איזה מספר?', 'השלימו את התרגיל.']),
        visual: barPic(W, a, b, F.q), eq: F.eq, answer: F.ans,
        hints: [F.hint, M(F.how)], explain: `${M(`${F.how} = ${F.ans}`)}.<br>בדיקה: ${check}.`,
      });
    }
    const t = rnd(0, 4);
    if (t === 0) {
      const q = pick([100, 200, 500]), r = rnd(12, q / 2), right = q - r, p = rnd(11, right - 11);
      return fill({
        prompt: 'מצאו את המספר החסר. קודם חשבו את הצד הימני.', eq: `□ + ${p} = ${q} − ${r}`, answer: right - p,
        hints: [`${M(`${q} − ${r} = ${right}`)}. עכשיו: ${M(sq(`□ + ${p} = ${right}`))}`, M(`${right} − ${p}`)],
        explain: `${M(`${q} − ${r} = ${right}`)}, ואז ${M(`${right} − ${p} = ${right - p}`)}.`,
      });
    }
    if (t === 1) {
      const T = pick([100, 200, 500, 1000]), x = rnd(11, T / 3), y = rnd(11, T / 3), ans = T - x - y;
      return fill({
        prompt: 'מצאו את המספר החסר.', eq: `${x} + □ + ${y} = ${T}`, answer: ans,
        hints: [`חברו קודם את שני המספרים הידועים: ${M(`${x} + ${y} = ${x + y}`)}.`, M(`${T} − ${x + y}`)],
        explain: `${M(`${x} + ${y} = ${x + y}`)}, ו־${M(`${T} − ${x + y} = ${ans}`)}.`,
      });
    }
    if (t === 2) {
      const k = rnd(12, 49), c = rnd(11, 60);
      return nums({
        prompt: 'כל פרי מסתיר מספר. אותו פרי הוא תמיד אותו מספר. גלו את שניהם.',
        visual: `<div class="eqs" dir="ltr"><div>🍌 + 🍌 = ${2 * k}</div><div>🍌 + 🥥 = ${k + c}</div></div>`,
        fields: [['🍌 =', k], ['🥥 =', c]],
        hints: [`שתי בננות הן ${2 * k}. כמה שווה בננה אחת?`, `🍌 = ${k}. עכשיו: ${M(sq(`${k} + □ = ${k + c}`))}`],
        explain: `${M(`${k} + ${k} = ${2 * k}`)}, לכן ${M(`🍌 = ${k}`)}.<br>${M(`${k + c} − ${k} = ${c}`)}, לכן ${M(`🥥 = ${c}`)}.`,
      });
    }
    if (t === 3) {
      const x = rnd(20, 300), p = rnd(15, 150), m = rnd(10, x + p - 5), r = x + p - m;
      return num({
        prompt: `חשבתי על מספר. הוספתי לו ${p}, אחר כך הורדתי ${m}, וקיבלתי ${r}. על איזה מספר חשבתי?`, answer: x,
        hints: ['עבדו מהסוף להתחלה, עם הפעולות ההפוכות.', `${M(`${r} + ${m} = ${r + m}`)}. עכשיו הורידו ${p}.`],
        explain: `${M(`${r} + ${m} − ${p} = ${x}`)}.<br>בדיקה: ${M(`${x} + ${p} − ${m} = ${r}`)}.`,
      });
    }
    const a2 = rnd(20, 400), b2 = rnd(20, 400), b1 = rnd(15, a2 + b2 - 15);
    return fill({
      prompt: 'שני הצדדים שווים. מצאו את המספר החסר.', eq: `□ + ${b1} = ${a2} + ${b2}`, answer: a2 + b2 - b1,
      hints: [`חשבו קודם את הצד הימני: ${M(`${a2} + ${b2} = ${a2 + b2}`)}.`, M(`${a2 + b2} − ${b1}`)],
      explain: `${M(`${a2} + ${b2} = ${a2 + b2}`)}, ו־${M(`${a2 + b2} − ${b1} = ${a2 + b2 - b1}`)}.`,
    });
  },
};

// =====================================================================
// 7. rounding and estimating
// =====================================================================
function pickRound(T, unit, n) {
  const half = unit / 2, ok = range(unit, i => T - half + i), bad = [...range(half - 1, i => T - unit + 1 + i), ...range(half, i => T + half + i)];
  const k = rnd(2, 4), mustOk = Math.random() < 0.6 ? [T - half] : [], mustBad = Math.random() < 0.6 ? [T + half] : [];
  const good = [...mustOk, ...shuffle(ok.filter(x => !mustOk.includes(x))).slice(0, k - mustOk.length)];
  const wrong = [...mustBad, ...shuffle(bad.filter(x => !mustBad.includes(x))).slice(0, n - k - mustBad.length)];
  return { vals: [...good, ...wrong].sort((a, b) => a - b), good };
}
const round = {
  id: 'zadd-round', title: 'עיגול ואומדן',
  intro: `<p><b>עיגול לעשרת</b>: מחפשים את העשרת הכי קרובה. 43 קרוב ל־40, ו־47 קרוב ל־50. כשספרת האחדות היא 5 בדיוק, מעגלים <b>למעלה</b>: 45 מתעגל ל־50.</p>
    <p><b>עיגול למאה</b>: מסתכלים על ספרת העשרות. 349 מתעגל ל־300, ו־350 מתעגל ל־400.</p>
    <div class="ex"><b>אומדן</b> הוא חישוב "בערך": ${M('48 + 31')} זה בערך ${M('50 + 30 = 80')}.</div>`,
  gen(L) {
    const t = rnd(0, L === 3 ? 3 : 2);
    if (L < 3 && t === 0) {
      const hund = L === 2 && Math.random() < 0.5, unit = hund ? 100 : 10;
      let n;
      do n = L === 1 ? rnd(11, 99) : rnd(101, 989); while (n % unit === 0 || (Math.random() < 0.6 && n % unit === unit / 2));
      const lo = down(n, unit), hi = lo + unit, r = Math.round(n / unit) * unit, idx = r === hi ? 1 : 0, mid = lo + unit / 2;
      return {
        prompt: `עגלו את ${n} ${hund ? 'למאה הקרובה' : 'לעשרת הקרובה'}.`, visual: roundPic(lo, unit / 10, n),
        widget: choice([String(lo), String(hi)], { cols: 2, cls: 'signs' }), answer: idx, check: v => v === idx, tries: 1,
        hints: [`${n} נמצא בין ${lo} ל־${hi}. האמצע הוא ${mid}. ${hund ? 'הסתכלו על ספרת העשרות.' : 'הסתכלו על ספרת האחדות.'}`],
        explain: `${n === mid ? `${n} נמצא בדיוק באמצע, ובמקרה כזה מעגלים למעלה` : `${n} קרוב יותר ל־${r} מאשר ל־${r === hi ? lo : hi}`}. לכן ${n} מתעגל ל־${r}.`,
      };
    }
    if (L < 3 && t === 1) {
      const unit = L === 1 ? 10 : 100, T = unit * rnd(2, 9), { vals, good } = pickRound(T, unit, 6), idx = good.map(g => vals.indexOf(g)).sort((a, b) => a - b);
      const edge = vals.includes(T + unit / 2) ? ` שימו לב: ${T + unit / 2} כבר מתעגל ל־${T + unit}.` : '';
      return {
        prompt: `סמנו את כל המספרים שמתעגלים ל־${T} (${unit === 10 ? 'לעשרת הקרובה' : 'למאה הקרובה'}).`,
        widget: choice(vals.map(String), { multi: true, cols: 3, cls: 'signs' }), answer: idx, check: v => v.join() === idx.join(),
        hints: [`איזה מספרים קרובים ל־${T} יותר מאשר ל־${T - unit} או ל־${T + unit}?`, `המספרים שמתעגלים ל־${T} הם מ־${T - unit / 2} עד ${T + unit / 2 - 1}.`],
        explain: `מתעגלים ל־${T}: ${good.sort((a, b) => a - b).join(', ')}.${edge}`,
      };
    }
    if (L < 3) {
      const unit = L === 1 ? 10 : 100, minus = L === 2 && Math.random() < 0.4;
      let a, b;
      do {
        a = L === 1 ? rnd(11, 89) : rnd(110, 890);
        b = L === 1 ? rnd(11, 89) : rnd(110, 890);
        if (minus && a < b) [a, b] = [b, a];
      } while ([a, b].some(x => [0, 5].includes(dig(x, L === 1 ? 0 : 1))) || (minus && Math.round(a / unit) - Math.round(b / unit) < 2) || (!minus && a + b > (L === 1 ? 150 : 1000)));
      const ra = Math.round(a / unit) * unit, rb = Math.round(b / unit) * unit, est = minus ? ra - rb : ra + rb;
      const opts = [est - unit, est, est + unit].filter(x => x > 0), idx = opts.indexOf(est);
      return {
        prompt: `בערך כמה זה ${M(`${a} ${minus ? '−' : '+'} ${b}`)}? עגלו כל מספר ${unit === 10 ? 'לעשרת הקרובה' : 'למאה הקרובה'}, ואז ${minus ? 'חסרו' : 'חברו'}.`,
        widget: choice(opts.map(String), { cols: opts.length, cls: 'nums zadd-ltr' }), answer: idx, check: v => v === idx, tries: 1,
        hints: [`${a} מתעגל ל־${ra}, ו־${b} מתעגל ל־${rb}.`],
        explain: `${M(`${ra} ${minus ? '−' : '+'} ${rb} = ${est}`)}.<br>התשובה המדויקת היא ${minus ? a - b : a + b}, קרובה לאומדן.`,
      };
    }
    // level 3
    if (t === 0) {
      const unit = pick([10, 100]), X = unit === 10 ? 10 * rnd(3, 99) : 100 * rnd(2, 9), big = Math.random() < 0.5, ans = big ? X + unit / 2 - 1 : X - unit / 2;
      return num({
        prompt: `מהו המספר השלם ה${big ? 'גדול' : 'קטן'} ביותר שמתעגל ל־${X} ${unit === 10 ? '(לעשרת הקרובה)' : '(למאה הקרובה)'}?`, answer: ans,
        hints: [`האמצע בין ${X} ל־${big ? X + unit : X - unit} הוא ${big ? X + unit / 2 : X - unit / 2}. לאן מתעגל מספר שנמצא בדיוק באמצע?`, big ? `${X + unit / 2} כבר מתעגל ל־${X + unit}, אז לא הוא.` : `${X - unit / 2} מתעגל למעלה, ל־${X}.`],
        explain: `המספרים שמתעגלים ל־${X} הם מ־${X - unit / 2} עד ${X + unit / 2 - 1}. ה${big ? 'גדול' : 'קטן'} ביותר: ${ans}.`,
      });
    }
    if (t === 1) {
      const T = 10 * rnd(2, 9), H = 100 * rnd(2, 9);
      const [q, ans, why] = pick([
        ['כמה מספרים דו־ספרתיים מתעגלים ל־100 כשמעגלים לעשרת הקרובה?', 5, 'אלה 95, 96, 97, 98, 99. (מ־100 והלאה המספרים כבר תלת־ספרתיים.)'],
        ['כמה מספרים דו־ספרתיים מתעגלים ל־10 כשמעגלים לעשרת הקרובה?', 5, 'אלה 10, 11, 12, 13, 14. (5 עד 9 מתעגלים גם ל־10, אבל הם חד־ספרתיים.)'],
        [`כמה מספרים שלמים מתעגלים ל־${T} כשמעגלים לעשרת הקרובה?`, 10, `אלה המספרים מ־${T - 5} עד ${T + 4}: ${range(10, i => T - 5 + i).join(', ')}.`],
        ['כמה מספרים תלת־ספרתיים מתעגלים ל־100 כשמעגלים למאה הקרובה?', 50, 'אלה המספרים מ־100 עד 149. (50 עד 99 מתעגלים גם ל־100, אבל הם דו־ספרתיים.)'],
        [`כמה מספרים שלמים מתעגלים ל־${H} כשמעגלים למאה הקרובה?`, 100, `אלה המספרים מ־${H - 50} עד ${H + 49}.`],
      ]);
      return num({
        prompt: q, answer: ans,
        hints: ['מצאו את המספר הקטן ביותר ואת הגדול ביותר שמתאימים, ואז ספרו כמה יש ביניהם.', 'שימו לב: מספר דו־ספרתי הוא מ־10 עד 99, ותלת־ספרתי מ־100 עד 999.'],
        explain: why,
      });
    }
    if (t === 2) {
      let a, b;
      do {
        a = rnd(110, 690);
        b = rnd(110, 690);
      } while (Math.abs(a - r100(a)) > 20 || Math.abs(b - r100(b)) > 20 || a + b > 999);
      const ok = Math.random() < 0.4, claim = ok ? a + b : a + b + pick([200, -200, 300]);
      if (claim < 100) return round.gen(L);
      return {
        prompt: `השומר חישב: ${M(`${a} + ${b} = ${claim}`)}. בלי לחשב בדיוק, בעזרת אומדן: האם התשובה שלו יכולה להיות נכונה?`,
        widget: choice(['כן, זה יכול להיות נכון', 'לא, זה רחוק מדי'], { cols: 2 }), answer: ok ? 0 : 1, check: v => v === (ok ? 0 : 1), tries: 1,
        hints: [`עגלו למאה: ${a} מתעגל ל־${r100(a)}, ו־${b} מתעגל ל־${r100(b)}.`],
        explain: `באומדן: ${M(`${r100(a)} + ${r100(b)} = ${r100(a) + r100(b)}`)}. ${claim} ${ok ? 'קרוב לזה, ולכן זה יכול להיות נכון (ובאמת' : 'רחוק מזה מאוד, ולכן זה לא נכון (התשובה המדויקת'} ${M(`${a} + ${b} = ${a + b}`)}).`,
      };
    }
    const H = 100 * rnd(1, 8), n = H + pick([40, 50]) + rnd(5, 9), lo = H, r = r100(n), opts = [lo, lo + 50, lo + 100], idx = opts.indexOf(r);
    return {
      prompt: `עגלו את ${n} למאה הקרובה.`, visual: roundPic(lo, 10, n),
      widget: choice(opts.map(String), { cols: 3, cls: 'signs' }), answer: idx, check: v => v === idx, tries: 1,
      hints: ['כשמעגלים למאה, מסתכלים רק על ספרת העשרות. לא מעגלים פעמיים!'],
      explain: `ספרת העשרות של ${n} היא ${dig(n, 1)}, ולכן ${n} מתעגל ל־${r}.${dig(n, 1) === 4 ? ` (מי שמעגל קודם לעשרת, ל־${up(n, 10)}, ואחר כך למאה, טועה ומקבל ${lo + 100}.)` : ''}`,
    };
  },
};

// =====================================================================
// 8. smart calculation
// =====================================================================
const smart = {
  id: 'zadd-smart', title: 'חישוב חכם',
  intro: `<p>לפעמים אפשר לחשב מהר יותר בעזרת טריק:</p>
    <div class="ex"><b>זוג עגול קודם:</b> ${M('26 + 9 + 4 = 30 + 9 = 39')}<br><b>קרוב לעגול:</b> ${M('47 + 9 = 47 + 10 − 1 = 56')}<br><b>אותו הפרש:</b> ${M('83 − 48 = 85 − 50 = 35')}</div>
    <p>בחיסור, אם מוסיפים <b>אותו מספר</b> לשני המספרים, ההפרש לא משתנה.</p>
    <p>בתרגילי הזוג העגול: לחצו על שני המספרים שכדאי לחבר קודם, ואז כתבו את התוצאה.</p>`,
  gen(L) {
    const t = rnd(0, L === 3 ? 3 : 2);
    if (t === 0) {
      let vals, base = L === 1 ? 10 : 100, pairs = L === 3 ? 2 : 1;
      for (;;) {
        if (L === 1) {
          const u = pick([1, 2, 3, 4, 6, 7, 8, 9]), a = 10 * rnd(0, 4) + u, c = 10 * rnd(0, 4) + 10 - u, b = 10 * rnd(0, 3) + rnd(1, 9);
          vals = shuffle([a, b, c]);
        } else if (L === 2) {
          const a = rnd(11, 89), b = rnd(11, 89);
          vals = shuffle([a, b, 100 - a]);
        } else {
          const a = rnd(11, 89), b = rnd(111, 189);
          vals = shuffle([a, 100 - a, b, 200 - b]);
        }
        if (vals.every(v => v % 10) && friendly(vals, base).length === pairs && new Set(vals).size === vals.length && sumOf(vals) <= (L === 1 ? 99 : 999)) break;
      }
      const pr = friendly(vals, base), rest = vals.filter(v => !pr.flat().includes(v)), sums = pr.map(p => sumOf(p));
      const last = pairs === 2 ? M(`${sums[0]} + ${sums[1]} = ${sumOf(vals)}`) : M(`${sums[0]} + ${rest[0]} = ${sumOf(vals)}`);
      return {
        prompt: `חברו בחוכמה: ${M(vals.join(' + '))}`, widget: smartTap(vals, base, pairs), sig: vals.join('+'), tries: 3,
        hints: [base === 10 ? 'חפשו שני מספרים שהאחדות שלהם יחד הן 10.' : 'חפשו שני מספרים שיחד הם 100 או 200: האחדות משלימות ל־10, והעשרות ל־9.', pr.map(p => M(`${p[0]} + ${p[1]} = ${sumOf(p)}`)).join(' ו־')],
        explain: `${pr.map(p => M(`${p[0]} + ${p[1]} = ${sumOf(p)}`)).join(', ')}, ואז ${last}.`,
      };
    }
    if (L === 1) {
      if (t === 1) {
        const d = pick([9, 8]), add = Math.random() < 0.6, a = add ? rnd(12, 85) : rnd(25, 95), r = add ? a + d : a - d, k = 10 - d;
        return {
          prompt: `${add ? 'לחבר' : 'להחסיר'} ${d} זה כמו ${add ? 'לחבר' : 'להחסיר'} 10 ו${add ? 'להוריד' : 'להוסיף'} ${k}. השלימו.`,
          widget: inputs(`<div class="ans-line">${M(`${a} ${add ? '+' : '−'} ${d} = ${a} ${add ? '+' : '−'} 10 ${add ? '−' : '+'} ${box('k', 2)}`)}</div><div class="ans-line">${M(`= ${box('r', 3)}`)}</div>`),
          answer: { k, r }, check: v => v.k === k && v.r === r,
          hints: [`${d} זה ${M(`10 − ${k}`)}.`, `${M(`${a} ${add ? '+' : '−'} 10 = ${add ? a + 10 : a - 10}`)}, ועכשיו ${add ? 'מורידים' : 'מוסיפים'} ${k}.`],
          explain: M(`${a} ${add ? '+' : '−'} ${d} = ${a} ${add ? '+' : '−'} 10 ${add ? '−' : '+'} ${k} = ${r}`),
        };
      }
      const n = rnd(6, 45), k = pick([1, 1, 2]);
      return {
        prompt: 'כמעט כפולה! השלימו.',
        widget: inputs(`<div class="ans-line">${M(`${n} + ${n + k} = ${n} + ${n} + ${box('k', 2)}`)}</div><div class="ans-line">${M(`= ${box('r', 3)}`)}</div>`),
        answer: { k, r: 2 * n + k }, check: v => v.k === k && v.r === 2 * n + k,
        hints: [`${n + k} זה ${M(`${n} + ${k}`)}.`, `${M(`${n} + ${n} = ${2 * n}`)}`],
        explain: M(`${n} + ${n + k} = ${n} + ${n} + ${k} = ${2 * n} + ${k} = ${2 * n + k}`),
      };
    }
    if (L === 2 && t === 1) {
      const d = pick([99, 98, 199, 198]), add = Math.random() < 0.6, a = add ? rnd(110, 999 - d) : rnd(d + 20, 999), r = add ? a + d : a - d, R = up(d, 100), k = R - d;
      return {
        prompt: `חשבו בחוכמה: ${d} קרוב ל־${R}. השלימו.`,
        widget: inputs([`${a} ${add ? '+' : '−'} ${d}`, `= ${a} ${add ? '+' : '−'} ${box('x', 4)} ${add ? '−' : '+'} ${box('y', 2)}`, `= ${box('r', 4)}`].map(x => `<div class="ans-line">${M(x)}</div>`).join('')),
        answer: { x: R, y: k, r }, check: v => v.x - v.y === d && v.x % 100 === 0 && v.y >= 0 && v.r === r,
        hints: [`${M(`${d} = ${R} − ${k}`)}`, `${M(`${a} ${add ? '+' : '−'} ${R} = ${add ? a + R : a - R}`)}, ועכשיו ${add ? 'מורידים' : 'מוסיפים'} ${k}.`],
        explain: M(`${a} ${add ? '+' : '−'} ${d} = ${a} ${add ? '+' : '−'} ${R} ${add ? '−' : '+'} ${k} = ${r}`),
      };
    }
    if (L === 2) {
      let a, b;
      do {
        b = Math.random() < 0.5 ? rnd(16, 89) : rnd(116, 389);
        a = rnd(b + 20, 999);
      } while (dig(b, 0) < 6);
      const b2 = up(b, 10), k = b2 - b;
      return {
        prompt: `הוסיפו ${k} לשני המספרים. ההפרש לא ישתנה, והחיסור יהיה קל!`,
        widget: inputs(`<div class="ans-line">${M(`${a} − ${b} = ${box('x', 4)} − ${b2}`)}</div><div class="ans-line">${M(`= ${box('r', 4)}`)}</div>`),
        answer: { x: a + k, r: a - b }, check: v => v.x === a + k && v.r === a - b,
        hints: [`${M(`${b} + ${k} = ${b2}`)}, אז גם ל־${a} מוסיפים ${k}.`, `${M(`${a + k} − ${b2}`)}`],
        explain: M(`${a} − ${b} = ${a + k} − ${b2} = ${a - b}`),
      };
    }
    if (t === 1) {
      const cnt = pick([10, 12, 14, 16, 18, 20]), s = pick([1, 1, 1, 11, 21]), e = s + cnt - 1, ans = (cnt / 2) * (s + e);
      return num({
        prompt: `השומר רוצה לחבר את כל המספרים מ־${s} עד ${e}: ${M(`${s} + ${s + 1} + ${s + 2} + … + ${e}`)}. חשבו בחוכמה!`, answer: ans,
        hints: [`חברו את הראשון עם האחרון: ${M(`${s} + ${e} = ${s + e}`)}. ואת השני עם הלפני אחרון: ${M(`${s + 1} + ${e - 1} = ${s + e}`)}...`, `יש ${cnt / 2} זוגות כאלה, וכל זוג הוא ${s + e}.`],
        explain: `הזוגות: ${M(`${s} + ${e}`)}, ${M(`${s + 1} + ${e - 1}`)}, ${M(`${s + 2} + ${e - 2}`)} וכן הלאה. כל זוג הוא ${s + e}.<br>יש ${cnt / 2} זוגות: ${M(`${cnt / 2} × ${s + e} = ${ans}`)}.`,
      });
    }
    if (t === 2) {
      const d = pick([99, 98, 199, 198, 299]), k = pick([2, 3, 4]), R = up(d, 100), miss = R - d;
      if (k * d > 999) return smart.gen(L);
      return num({
        prompt: `חשבו בחוכמה: ${M(range(k, () => d).join(' + '))}`, answer: k * d,
        hints: [`כל ${d} זה ${M(`${R} − ${miss}`)}.`, `${M(range(k, () => R).join(' + '))} = ${k * R}, ועכשיו מורידים ${k} פעמים ${miss}.`],
        explain: `${M(`${k * R} − ${range(k, () => miss).join(' − ')} = ${k * d}`)}.`,
      });
    }
    const top = pick([1000, 100 * rnd(3, 9)]);
    let b;
    do b = rnd(101, top - 11); while (b % 10 === 0);
    return {
      prompt: `קשה לפרוט מ־${top}. הורידו 1 משני המספרים, ואז אין צורך לפרוט בכלל!`,
      widget: inputs(`<div class="ans-line">${M(`${top} − ${b} = ${top - 1} − ${box('x', 4)}`)}</div><div class="ans-line">${M(`= ${box('r', 4)}`)}</div>`),
      answer: { x: b - 1, r: top - b }, check: v => v.x === b - 1 && v.r === top - b,
      hints: [`מורידים 1 גם מ־${b}: ${M(`${b} − 1 = ${b - 1}`)}.`, `${M(`${top - 1} − ${b - 1}`)}: בכל עמודה למעלה יש 9, אז אין פריטה.`],
      explain: M(`${top} − ${b} = ${top - 1} − ${b - 1} = ${top - b}`),
    };
  },
};

// =====================================================================
// 9. boss
// =====================================================================
const WORDS = {
  1: [
    () => {
      let a, b;
      do [a, b] = [rnd(15, 68), rnd(12, 49)]; while (a + b > 99 || dig(a, 0) + dig(b, 0) < 10);
      return num({
        prompt: `בבוקר היו בכלוב ${a} בננות. השומר הביא עוד ${b}. כמה בננות יש עכשיו בכלוב?`, answer: a + b,
        hints: ['השומר הוסיף בננות, אז מחברים.', addSteps([a, b])[0]], explain: colExplain([a, b], '+'),
      });
    },
    () => {
      let a, b;
      do [a, b] = [rnd(40, 95), rnd(12, 39)]; while (dig(a, 0) >= dig(b, 0) || a - b < 10);
      return num({
        prompt: `לקוף היו ${a} בננות. הוא נתן ${b} לחבר שלו. כמה בננות נשארו לו?`, answer: a - b,
        hints: ['הקוף נתן בננות, אז מחסרים.', subSteps(a, b)[0]], explain: colExplain([a, b], '-'),
      });
    },
    () => {
      let a, b;
      do [a, b] = [rnd(40, 95), rnd(15, 60)]; while (a - b < 8 || dig(a, 0) >= dig(b, 0));
      return num({
        prompt: `בעץ הגדול יושבים ${a} קופים, ובעץ הקטן ${b}. בכמה קופים יש יותר בעץ הגדול?`, answer: a - b,
        hints: ['"בכמה יותר" פותרים בחיסור: הגדול פחות הקטן.', M(`${a} − ${b}`)], explain: colExplain([a, b], '-'),
      });
    },
    () => {
      const a = rnd(23, 87);
      return num({
        prompt: `השומר צריך 100 בננות למסיבה של הקופים. יש לו ${a}. כמה בננות עוד חסרות?`, answer: 100 - a,
        hints: ['כמה חסר מ־' + a + ' עד 100?', `${M(`${a} + ${up(a, 10) - a} = ${up(a, 10)}`)}, ועוד ${100 - up(a, 10)} עד 100.`],
        explain: `${M(`${a} + ${100 - a} = 100`)}, לכן חסרות ${100 - a}.`,
      });
    },
    () => {
      let T, O, e;
      do [T, O, e] = [rnd(4, 9), rnd(0, 6), rnd(12, 39)]; while (10 * T + O - e < 5 || O >= dig(e, 0));
      const n = 10 * T + O;
      return num({
        prompt: `במחסן יש ${describe(0, T, O)}. הקופים אכלו ${e} בננות. כמה בננות נשארו?`, visual: pic(0, T, O), answer: n - e,
        hints: [`כמה בננות יש במחסן? ${bunchesW(T)} הם ${10 * T}.`, `${M(`${n} − ${e}`)}`], explain: `במחסן ${n} בננות.<br>${colExplain([n, e], '-')}`,
      });
    },
  ],
  2: [
    () => {
      let C, T, O, n, e;
      do {
        [C, T, O] = [rnd(3, 8), rnd(0, 9), rnd(0, 9)];
        n = 100 * C + 10 * T + O;
        e = rnd(120, n - 30);
      } while (!needsBorrow(n, e));
      return num({
        prompt: `במחסן יש ${describe(C, T, O)}. הקופים אכלו ${e} בננות. כמה בננות נשארו?`, answer: n - e,
        hints: [`במחסן יש ${n} בננות.`, `${M(`${n} − ${e}`)}. פתרו במאונך.`], explain: `במחסן ${n} בננות.<br>${colExplain([n, e], '-')}`,
      });
    },
    () => {
      const a = rnd(120, 380), d = rnd(15, 140);
      return num({
        prompt: `קוף אחד אכל השנה ${a} בננות, וקוף שני אכל ${d} בננות יותר ממנו. כמה בננות אכלו שניהם יחד?`, answer: 2 * a + d,
        hints: [`קודם מצאו כמה אכל הקוף השני: ${M(`${a} + ${d}`)}.`, `השני אכל ${a + d}. עכשיו חברו: ${M(`${a} + ${a + d}`)}.`],
        explain: `השני: ${M(`${a} + ${d} = ${a + d}`)}. יחד: ${M(`${a} + ${a + d} = ${2 * a + d}`)}.`,
      });
    },
    () => {
      const a = rnd(150, 450), b = rnd(120, 400), c = rnd(100, a + b - 50);
      return num({
        prompt: `לגן החיות הגיעו ${a} מבקרים בבוקר ועוד ${b} אחר הצהריים. בערב יצאו ${c}. כמה מבקרים עוד נמצאים בגן?`, answer: a + b - c,
        hints: [`כמה מבקרים הגיעו בסך הכול? ${M(`${a} + ${b}`)}`, `הגיעו ${a + b}. עכשיו מחסרים את מי שיצאו: ${M(`${a + b} − ${c}`)}.`],
        explain: `${M(`${a} + ${b} = ${a + b}`)}, ו־${M(`${a + b} − ${c} = ${a + b - c}`)}.`,
      });
    },
    () => {
      const a = rnd(180, 420), b = rnd(150, 380);
      return num({
        prompt: `השומר רוצה 1000 בננות. ביום ראשון קנה ${a}, וביום שני ${b}. כמה בננות עוד חסרות לו?`, answer: 1000 - a - b,
        hints: [`כמה קנה בסך הכול? ${M(`${a} + ${b}`)}`, `קנה ${a + b}. כמה חסר עד 1000?`],
        explain: `${M(`${a} + ${b} = ${a + b}`)}, ו־${M(`1000 − ${a + b} = ${1000 - a - b}`)}.`,
      });
    },
  ],
  3: [
    () => {
      const small = rnd(80, 400), d = rnd(12, 150), S = 2 * small + d;
      return num({
        prompt: `לשני קופים יש יחד ${S} בננות. לאחד יש ${d} בננות יותר מלשני. כמה בננות יש לקוף שיש לו יותר?`, answer: small + d,
        hints: [`אם ניקח מהקוף העשיר את ה־${d} הנוספות, לשניהם יהיה אותו מספר: ${M(`${S} − ${d} = ${S - d}`)}.`, `חצי מ־${S - d} הוא ${small}. זה הקוף עם פחות.`],
        explain: `${M(`${S} − ${d} = ${S - d}`)}, חצי: ${small}. לעשיר: ${M(`${small} + ${d} = ${small + d}`)}.<br>בדיקה: ${M(`${small} + ${small + d} = ${S}`)}.`,
      });
    },
    () => {
      const s = rnd(120, 600), x = rnd(30, Math.min(150, s - 20)), y = rnd(40, 300), z = s - x + y;
      return num({
        prompt: `לקוף היו בננות. הוא אכל ${x}, אחר כך השומר נתן לו ${y}, ועכשיו יש לו ${z}. כמה בננות היו לו בהתחלה?`, answer: s,
        hints: ['עבדו מהסוף להתחלה: מה שהשומר נתן מורידים, ומה שהקוף אכל מחזירים.', `${M(`${z} − ${y} = ${z - y}`)}. עכשיו הוסיפו את מה שאכל.`],
        explain: `${M(`${z} − ${y} + ${x} = ${s}`)}.<br>בדיקה: ${M(`${s} − ${x} + ${y} = ${z}`)}.`,
      });
    },
    () => {
      const a = rnd(80, 250), b = rnd(20, 120), c = rnd(10, a + b - 10), A = a, B = a + b, C = a + b - c;
      return num({
        prompt: `לקוף הראשון יש ${a} בננות. לשני יש ${b} יותר מלראשון, ולשלישי יש ${c} פחות מלשני. כמה בננות יש לשלושתם יחד?`, answer: A + B + C,
        hints: [`לשני: ${M(`${a} + ${b} = ${B}`)}. לשלישי: ${M(`${B} − ${c} = ${C}`)}.`, `עכשיו חברו: ${M(`${A} + ${B} + ${C}`)}.`],
        explain: `${M(`${A} + ${B} + ${C} = ${A + B + C}`)}.`,
      });
    },
    () => {
      let ds;
      do ds = shuffle(range(9, i => i + 1)).slice(0, 3); while (new Set(ds).size < 3);
      const big = +[...ds].sort((x, y) => y - x).join(''), small = +[...ds].sort((x, y) => x - y).join('');
      return num({
        prompt: `על שלושה כרטיסים כתובות הספרות ${M(ds.join(', '))}. בונים מהן את המספר הגדול ביותר ואת הקטן ביותר (כל כרטיס פעם אחת). מה ההפרש ביניהם?`, answer: big - small,
        hints: [`הגדול ביותר: ${big}. הקטן ביותר: ${small}.`, `${M(`${big} − ${small}`)}. פתרו במאונך.`],
        explain: `הגדול ${big}, הקטן ${small}.<br>${colExplain([big, small], '-')}`,
      });
    },
  ],
};
const boss = {
  id: 'zadd-boss', title: 'בוס: החשבונאי בננה',
  intro: `<p>החשבונאי בננה נעל את מחסן הבננות של הקופים בחמישה מנעולים. כל מנעול נפתח רק בחשבון נכון: חיבור, חיסור, השלמה, קפיצות ובעיות מילוליות.</p>
    <div class="ex">לקוף היו 52 בננות. הוא אכל 18, ואז קיבל עוד 30. כמה יש לו עכשיו? ${M('52 − 18 = 34')}, ו־${M('34 + 30 = 64')}.</div>
    <p>קראו כל שאלה לאט, וחשבו שלב אחרי שלב. הקופים סומכים עליכם!</p>`,
  gen(L) {
    if (Math.random() < 0.55) return pick(WORDS[L])();
    return pick([bond, jump, carry, borrow, missing, smart]).gen(L);
  },
};

export default {
  id: 'zadd', name: 'מתחם הקופים', icon: '🐒', color: '#f59e0b', boss: 'החשבונאי בננה',
  tagline: 'החשבונאים ערבבו את כל הבננות של הקופים. רק מי שיודע לחבר ולחסר יחזיר כל בננה למקומה.',
  challenges: [place, bond, jump, carry, borrow, missing, round, smart, boss],
};
