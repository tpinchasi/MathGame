// מעבדת המדידות
import { rnd, pick, shuffle, range, M, h, near, nf } from '../../util.js';
import { inputs, box, choice, gridPaint, connected } from '../../widgets.js';
import { gridShape, cuboid } from '../../visuals.js';

// ---------- small helpers ----------
const PI_NOTE = M('π ≈ 3.14');
const PI_P = M('(π ≈ 3.14)');
const rd = x => Math.round(x * 1e6) / 1e6;
const pi = x => rd(3.14 * x); // x × 3.14 without floating-point noise
const f1 = v => String(Math.round(v * 10) / 10);
const rad = d => (d * Math.PI) / 180;
const deg = v => M(v + '°');
const sumOf = a => a.reduce((s, x) => s + x, 0);
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const unitv = (p, q) => {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};
const pt = (x, y) => M(`(${nf(x)}, ${nf(y)})`);
// a move on squared paper in words, e.g. "3 ימינה ו־2 למטה"
const step = (dx, dy) => [dx ? `${Math.abs(dx)} ${dx > 0 ? 'ימינה' : 'שמאלה'}` : '', dy ? `${Math.abs(dy)} ${dy > 0 ? 'למעלה' : 'למטה'}` : ''].filter(Boolean).join(' ו־') || 'בלי לזוז';
const named = (n, [x, y]) => M(`${n}(${nf(x)}, ${nf(y)})`);

// Number fields: fields = [[label, answer, post?]]. With dec (or any non-whole answer) the boxes take a decimal point.
function ask({ prompt, visual, fields, hints, explain, tries, wrongMsg, dec = false }) {
  const ans = fields.map(f => rd(f[1]));
  const kind = (dec || ans.some(a => !Number.isInteger(a)) ? 'd' : '') + (ans.some(a => a < 0) ? 'n' : '');
  const len = Math.max(...ans.map(a => String(a).length)) + (kind ? 2 : 1); // one size for all, so the boxes give nothing away
  const html = fields.map(([label, , post = ''], i) => `<div class="ans-line">${label} ${box('f' + i, len, false, kind)} ${post}</div>`).join('');
  return {
    prompt, visual, hints, explain, tries,
    widget: inputs(html),
    answer: Object.fromEntries(ans.map((a, i) => ['f' + i, a])),
    check: v => ans.every((a, i) => near(v['f' + i], a)),
    wrongMsg: wrongMsg && (v => wrongMsg(ans.map((_, i) => v['f' + i])) || ''),
  };
}
const one = ({ answer, pre = '', post = '', ...r }) => ask({ ...r, fields: [[pre, answer, post]] });

// ---------- pictures ----------
// Arc and label at corner V (pixel coordinates) between the directions to A and B.
function arcMark(V, A, B, d, text) {
  const u1 = unitv(V, A), u2 = unitv(V, B), r = 17, bx = u1[0] + u2[0], by = u1[1] + u2[1], bl = Math.hypot(bx, by) || 1;
  const at = (u, k) => `${f1(V[0] + u[0] * k)} ${f1(V[1] + u[1] * k)}`;
  const dist = Math.min(62, 13 / Math.sin(rad(d / 2)) + 13);
  const sweep = u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0;
  return `<path d="M${at(u1, r)}A${r} ${r} 0 0 ${sweep} ${at(u2, r)}" class="ang"/>` +
    (text != null ? `<text x="${f1(V[0] + (bx / bl) * dist)}" y="${f1(V[1] + (by / bl) * dist + 5)}" class="glabel">${text}</text>` : '');
}

// A figure in maths coordinates (y up), scaled to fit about W×H pixels.
// shapes: [{pts} | {c, r}] drawn in order; segs: [{a, b, cls}]; rights: [[V, A, B]]; angs: [{V, A, B, d, t}]; texts: [{p, t, dx, dy}]
function fig({ shapes = [], segs = [], rights = [], angs = [], texts = [] }, { W = 250, H = 150, pad = 28 } = {}) {
  const all = [...shapes.flatMap(g => (g.pts ? g.pts : [[g.c[0] - g.r, g.c[1] - g.r], [g.c[0] + g.r, g.c[1] + g.r]])), ...segs.flatMap(s => [s.a, s.b])];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), y1 = Math.max(...ys), w = Math.max(...xs) - x0 || 1, hh = y1 - Math.min(...ys) || 1;
  const k = Math.min(W / w, H / hh);
  const X = p => [(p[0] - x0) * k, (y1 - p[1]) * k];
  let s = '';
  for (const g of shapes) {
    if (g.pts) s += `<polygon points="${g.pts.map(p => X(p).map(f1).join(',')).join(' ')}" class="${g.cls || 'shape'}"/>`;
    else {
      const [cx, cy] = X(g.c);
      s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(g.r * k)}" class="${g.cls || 'shape'}"/>`;
    }
  }
  for (const g of segs) {
    const [a, b] = [X(g.a), X(g.b)];
    s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${g.cls || 'dash'}"/>`;
  }
  for (const [V, A, B] of rights) {
    const v = X(V), u1 = unitv(v, X(A)), u2 = unitv(v, X(B)), q = 10;
    s += `<path d="M${f1(v[0] + u1[0] * q)} ${f1(v[1] + u1[1] * q)}L${f1(v[0] + (u1[0] + u2[0]) * q)} ${f1(v[1] + (u1[1] + u2[1]) * q)}L${f1(v[0] + u2[0] * q)} ${f1(v[1] + u2[1] * q)}" class="ang"/>`;
  }
  for (const a of angs) s += arcMark(X(a.V), X(a.A), X(a.B), a.d, a.t);
  for (const t of texts) {
    const [x, y] = X(t.p);
    s += `<text x="${f1(x + (t.dx || 0))}" y="${f1(y + (t.dy || 0) + 5)}" class="glabel">${t.t}</text>`;
  }
  const Wd = w * k, Hd = hh * k;
  return `<svg viewBox="${-pad} ${-pad} ${f1(Wd + 2 * pad)} ${f1(Hd + 2 * pad)}" class="v-geo lgeo-fig" style="direction:ltr;max-width:${Math.round(Wd + 2 * pad)}px">${s}</svg>`;
}

const arcPts = (c, r, a0, a1, n = 36) => range(n + 1, i => [c[0] + r * Math.cos(rad(a0 + ((a1 - a0) * i) / n)), c[1] + r * Math.sin(rad(a0 + ((a1 - a0) * i) / n))]);

// The perpendicular from P to the line Q1Q2: the dashed height, a dotted extension of the side when needed, and the right-angle mark.
function drop(P, Q1, Q2) {
  const d = sub(Q2, Q1), t = dot(sub(P, Q1), d) / dot(d, d), F = [Q1[0] + t * d[0], Q1[1] + t * d[1]];
  const segs = [{ a: P, b: F }];
  if (t < -0.01 || t > 1.01) segs.push({ a: t < 0 ? Q1 : Q2, b: F, cls: 'lgeo-ext' });
  return { F, segs, right: [F, P, t > 0.5 ? Q1 : Q2] };
}

// Parallelogram: base a along the bottom, top side shifted by s, height h. Optional second height from B to the left side.
function paraFig({ a, s, h, la, lb = null, lh, lh2 = null, extra = {} }) {
  const A = [0, 0], B = [a, 0], C = [a + s, h], D = [s, h], h1 = drop(D, A, B);
  const o = { shapes: [{ pts: [A, B, C, D] }], segs: [...h1.segs], rights: [h1.right], texts: [{ p: [a / 2, 0], t: la, dy: 17 }, { p: mid(D, h1.F), t: lh, dx: 13 }] };
  if (lb != null) o.texts.push({ p: mid(A, D), t: lb, dx: -15, dy: -4 });
  if (lh2 != null) {
    const h2 = drop(B, A, D);
    o.segs.push(...h2.segs);
    o.rights.push(h2.right);
    o.texts.push({ p: mid(B, h2.F), t: lh2, dx: 12, dy: -4 });
  }
  for (const k of Object.keys(extra)) o[k] = [...(o[k] || []), ...extra[k]];
  return fig(o);
}

// Trapezoid: bottom base a, top base b starting at x = off, height h.
function trapFig({ a, b, off, h, la = null, lb = null, lh = null, lleg = null, midLabel = null }) {
  const A = [0, 0], B = [a, 0], C = [off + b, h], D = [off, h];
  const o = { shapes: [{ pts: [A, B, C, D] }], segs: [], rights: [], texts: [] };
  if (la != null) o.texts.push({ p: [a / 2, 0], t: la, dy: 17 });
  if (lb != null) o.texts.push({ p: [off + b / 2, h], t: lb, dy: -15 });
  if (off === 0) {
    o.rights.push([A, B, D]);
    if (lh != null) o.texts.push({ p: [0, h / 2], t: lh, dx: -14 });
  } else if (lh != null) {
    const hd = drop(D, A, B);
    o.segs.push(...hd.segs);
    o.rights.push(hd.right);
    o.texts.push({ p: midLabel != null ? mid(hd.F, mid(D, hd.F)) : mid(D, hd.F), t: lh, dx: 13 });
  }
  if (lleg != null) o.texts.push({ p: mid(A, D), t: lleg, dx: -15, dy: -4 });
  if (midLabel != null) {
    const m1 = mid(A, D), m2 = mid(B, C);
    o.segs.push({ a: m1, b: m2, cls: 'lgeo-midline' });
    o.texts.push({ p: mid(m1, m2), t: midLabel, dx: 18, dy: -11 });
  }
  return fig(o);
}

// Convex polygon with the given interior angles (in order), sides of random length near 1.
function polyPts(angles) {
  const n = angles.length, t = angles.map(a => rad(180 - a));
  const phi = [0];
  for (let i = 1; i < n; i++) phi.push(phi[i - 1] + t[i]);
  for (let tries = 0; tries < 400; tries++) {
    const L = range(n, () => 0.75 + Math.random() * 0.5);
    let sx = 0, sy = 0;
    for (let i = 0; i < n - 2; i++) {
      sx += L[i] * Math.cos(phi[i]);
      sy += L[i] * Math.sin(phi[i]);
    }
    const u = [Math.cos(phi[n - 2]), Math.sin(phi[n - 2])], w = [Math.cos(phi[n - 1]), Math.sin(phi[n - 1])], det = cross(u, w);
    if (Math.abs(det) < 1e-6) continue;
    const a = (-sx * w[1] + sy * w[0]) / det, b = (-u[0] * sy + u[1] * sx) / det;
    if (a < 0.55 || a > 1.6 || b < 0.55 || b > 1.6) continue;
    L[n - 2] = a;
    L[n - 1] = b;
    const pts = [[0, 0]];
    for (let i = 0; i < n - 1; i++) pts.push([pts[i][0] + L[i] * Math.cos(phi[i]), pts[i][1] + L[i] * Math.sin(phi[i])]);
    return pts;
  }
  return regPts(n);
}
// Regular polygon with a horizontal bottom side.
const regPts = n => range(n, i => [Math.cos(-Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n), Math.sin(-Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n)]);
const polyFig = (pts, angles, labels) =>
  fig({ shapes: [{ pts }], angs: pts.map((V, i) => ({ V, A: pts[(i + pts.length - 1) % pts.length], B: pts[(i + 1) % pts.length], d: angles[i], t: labels[i] })) }, { W: 230, H: 165 });

// A regular polygon cut into triangles by the diagonals from one corner.
function triFig(n) {
  const P = regPts(n), v = Math.floor(n / 2), at = i => P[(v + i) % n];
  const shapes = range(n - 2, j => ({ pts: [at(0), at(j + 1), at(j + 2)], cls: j % 2 ? 'lgeo-tri2' : 'lgeo-tri1' }));
  shapes.push({ pts: P, cls: 'lgeo-outline' });
  return fig({ shapes, segs: range(n - 3, j => ({ a: at(0), b: at(j + 2), cls: 'lgeo-diag' })) }, { W: 190, H: 170 });
}

// A box drawn in oblique projection, with its three edge labels.
function boxFig(a, b, c, [la, lb, lc] = [a, b, c]) {
  const m = Math.max(a, b, c), cl = v => Math.max(v, m * 0.3);
  const A = cl(a), B = cl(b) * 0.55, C = cl(c), dx = B * 0.8, dy = B * 0.55;
  const F = [[0, 0], [A, 0], [A, C], [0, C]], K = F.map(([x, y]) => [x + dx, y + dy]);
  return fig({
    shapes: [{ pts: [F[3], F[2], K[2], K[3]], cls: 'lgeo-bt' }, { pts: [F[1], K[1], K[2], F[2]], cls: 'lgeo-bs' }, { pts: F, cls: 'lgeo-bf' }],
    segs: [{ a: K[0], b: K[1], cls: 'lgeo-hid' }, { a: K[0], b: K[3], cls: 'lgeo-hid' }, { a: F[0], b: K[0], cls: 'lgeo-hid' }],
    texts: [{ p: [A / 2, 0], t: la, dy: 17 }, { p: [0, C / 2], t: lc, dx: -14 }, { p: mid(F[1], K[1]), t: lb, dx: 15, dy: 6 }],
  }, { W: 220, H: 135 });
}

// The net of an a×b×c box: a column of front, bottom, back and lid, with the two side flaps.
function boxNetFig(a, b, c) {
  const R = (x, y, w, hh) => ({ pts: [[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]], cls: 'lgeo-netr' });
  return fig({
    shapes: [R(c, 0, a, c), R(c, c, a, b), R(c, c + b, a, c), R(c, 2 * c + b, a, b), R(0, c, c, b), R(c + a, c, c, b)],
    texts: [{ p: [c + a / 2, 0], t: a, dy: 15 }, { p: [c, c / 2], t: c, dx: -12 }, { p: [0, c + b / 2], t: b, dx: -12 }, { p: [c + a + c / 2, c + b], t: c, dy: -15 }],
  }, { W: 230, H: 190, pad: 24 });
}

const circleFig = ({ r = 1, show = 'r', label }) =>
  fig({
    shapes: [{ c: [0, 0], r }, { c: [0, 0], r: r * 0.035, cls: 'lgeo-dot' }],
    segs: [{ a: show === 'r' ? [0, 0] : [-r, 0], b: [r, 0], cls: 'lgeo-rad' }],
    texts: [{ p: [show === 'r' ? r / 2 : 0, 0], t: label, dy: -14 }],
  }, { W: 140, H: 140, pad: 12 });

// ---------- widgets ----------
// Quadrilateral on peg-board points: its kind, area and whether a side lies along the grid.
function sortRound(pts) {
  const cx = sumOf(pts.map(p => p[0])) / pts.length, cy = sumOf(pts.map(p => p[1])) / pts.length;
  return [...pts].sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
}
function quadInfo(pts) {
  const P = sortRound(pts), e = range(4, i => sub(P[(i + 1) % 4], P[i]));
  const line = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]].some(([i, j, k]) => cross(sub(pts[j], pts[i]), sub(pts[k], pts[i])) === 0);
  const p02 = cross(e[0], e[2]) === 0, p13 = cross(e[1], e[3]) === 0;
  const area = Math.abs(sumOf(range(4, i => cross(P[i], P[(i + 1) % 4])))) / 2;
  const kind = line ? 'line' : p02 && p13 ? (dot(e[0], e[1]) === 0 ? (dot(e[0], e[0]) === dot(e[1], e[1]) ? 'square' : 'rect') : 'para') : p02 || p13 ? 'trap' : 'none';
  const bases = p02 && !p13 ? [e[0], e[2]] : p13 && !p02 ? [e[1], e[3]] : null;
  return { kind, area, bases, axis: e.some(v => v[0] === 0 || v[1] === 0) };
}
const QNAME = { square: 'ריבוע', rect: 'מלבן', para: 'מקבילית', trap: 'טרפז' };
const said = q =>
  q.kind === 'line' ? 'שלוש מהפינות נמצאות על קו ישר אחד.' : q.kind === 'none' ? 'בניתם מרובע שאין בו צלעות מקבילות.' : `בניתם ${QNAME[q.kind]} ${q.kind === 'para' ? 'ששטחה' : 'ששטחו'} ${M(nf(q.area))}.`;

// Pegs on a grid: tap 4 pegs to make the corners of a quadrilateral; tapping a corner again removes it.
function pegBoard({ cols = 8, rows = 6 } = {}) {
  const u = 36;
  let pts = [], locked = false;
  const stage = h('div', { class: 'lgeo-peg', dir: 'ltr' }), msg = h('div', { class: 'lgeo-msg' });
  const draw = () => {
    let s = `<svg viewBox="${-u / 2} ${-u / 2} ${cols * u + u} ${rows * u + u}">`;
    for (let y = 0; y <= rows; y++) s += `<line x1="0" y1="${y * u}" x2="${cols * u}" y2="${y * u}" class="lgeo-pgl"/>`;
    for (let x = 0; x <= cols; x++) s += `<line x1="${x * u}" y1="0" x2="${x * u}" y2="${rows * u}" class="lgeo-pgl"/>`;
    const S = sortRound(pts).map(([x, y]) => `${x * u},${y * u}`).join(' ');
    if (pts.length >= 3) s += `<polygon points="${S}" class="shape"/>`;
    else if (pts.length === 2) s += `<polyline points="${S}" class="lgeo-pline"/>`;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) s += `<circle cx="${x * u}" cy="${y * u}" r="4.5" class="lgeo-pin"/>`;
    for (const [x, y] of pts) s += `<circle cx="${x * u}" cy="${y * u}" r="9" class="lgeo-corner"/>`;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) s += `<rect data-p="${x},${y}" x="${x * u - u / 2}" y="${y * u - u / 2}" width="${u}" height="${u}" class="hit"/>`;
    stage.innerHTML = s + '</svg>';
  };
  stage.addEventListener('click', e => {
    const p = e.target.dataset && e.target.dataset.p;
    if (locked || !p) return;
    const i = pts.findIndex(q => q.join() === p);
    msg.textContent = '';
    if (i >= 0) pts.splice(i, 1);
    else if (pts.length < 4) pts.push(p.split(',').map(Number));
    else msg.textContent = 'כבר יש 4 פינות. לחצו על פינה כדי לבטל אותה.';
    draw();
  });
  draw();
  return {
    el: h('div', { class: 'lgeo-pegw' }, stage, msg,
      h('button', { type: 'button', class: 'btn tiny', onclick: () => { if (!locked) { pts = []; msg.textContent = ''; draw(); } } }, '↺ ניקוי')),
    value: () => (pts.length === 4 ? pts.map(p => [...p]) : null),
    set(a) {
      pts = a.map(p => [...p]);
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// Coordinate plane from min to max on both axes. pts: [{n, p, me}], poly: corners to join, hits: tap targets.
function planeSVG({ min, max, pts = [], poly = null, hits = false }) {
  const N = max - min, u = N > 8 ? 25 : 34, m = 24, S = N * u;
  const X = x => (x - min) * u, Y = y => (max - y) * u, num = i => String(i).replace('-', '−');
  let s = `<svg viewBox="${-m} ${-m} ${S + 2 * m} ${S + 2 * m}" class="lgeo-psvg" direction="ltr" style="direction:ltr;max-width:${S + 2 * m}px">`;
  for (let i = min; i <= max; i++) s += `<line x1="${X(i)}" y1="0" x2="${X(i)}" y2="${S}" class="lgeo-gl"/><line x1="0" y1="${Y(i)}" x2="${S}" y2="${Y(i)}" class="lgeo-gl"/>`;
  s += `<line x1="${X(min)}" y1="${Y(0)}" x2="${S + 14}" y2="${Y(0)}" class="lgeo-ax"/><path d="M${S + 18} ${Y(0)}l-9 -5v10z" class="lgeo-arr"/>`;
  s += `<line x1="${X(0)}" y1="${Y(min)}" x2="${X(0)}" y2="-14" class="lgeo-ax"/><path d="M${X(0)} -18l-5 9h10z" class="lgeo-arr"/>`;
  s += `<text x="${S + 12}" y="${Y(0) - 8}" class="lgeo-axn">x</text><text x="${X(0) + 12}" y="-8" class="lgeo-axn">y</text>`;
  for (let i = min; i <= max; i++) {
    if (i !== 0 || min === 0) s += `<text x="${X(i) + (i === 0 ? -7 : 0)}" y="${Y(0) + 16}" class="lgeo-num">${num(i)}</text>`;
    if (i !== 0) s += `<text x="${X(0) - 6}" y="${Y(i) + 4}" class="lgeo-num" text-anchor="end">${num(i)}</text>`;
  }
  if (poly) s += `<polygon points="${poly.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" class="lgeo-ppoly"/>`;
  for (const q of pts) s += `<circle cx="${X(q.p[0])}" cy="${Y(q.p[1])}" r="6.5" class="lgeo-pt${q.me ? ' me' : ''}"/><text x="${X(q.p[0]) + 10}" y="${Y(q.p[1]) - 8}" class="lgeo-plabel${q.me ? ' me' : ''}">${q.n}</text>`;
  if (hits) for (let x = min; x <= max; x++) for (let y = min; y <= max; y++) s += `<rect data-p="${x},${y}" x="${X(x) - u / 2}" y="${Y(y) - u / 2}" width="${u}" height="${u}" class="hit"/>`;
  return s + '</svg>';
}
// The player places the points named in `names` by tapping grid crossings.
function plane({ min = 0, max = 8, fixed = [], names = ['A'], poly = null }) {
  const placed = {};
  let cur = 0, locked = false;
  const stage = h('div', { class: 'lgeo-plane', dir: 'ltr' }), tabs = h('div', { class: 'lgeo-tabs' });
  const draw = () => {
    const all = [...fixed, ...names.filter(n => placed[n]).map(n => ({ n, p: placed[n], me: true }))], pos = Object.fromEntries(all.map(q => [q.n, q.p]));
    stage.innerHTML = planeSVG({ min, max, pts: all, poly: poly && poly.every(n => pos[n]) ? poly.map(n => pos[n]) : null, hits: true });
    tabs.innerHTML = '';
    if (names.length > 1)
      tabs.append('מסמנים עכשיו את: ', ...names.map((n, i) => h('button', { type: 'button', class: 'lgeo-tab' + (i === cur ? ' on' : ''), onclick: () => { if (!locked) { cur = i; draw(); } } }, n)));
  };
  stage.addEventListener('click', e => {
    const p = e.target.dataset && e.target.dataset.p;
    if (locked || !p) return;
    placed[names[cur]] = p.split(',').map(Number);
    const nx = names.findIndex(n => !placed[n]);
    if (nx >= 0) cur = nx;
    draw();
  });
  draw();
  return {
    el: h('div', { class: 'lgeo-planew' }, tabs, stage),
    value: () => (names.every(n => placed[n]) ? Object.fromEntries(names.map(n => [n, [...placed[n]]])) : null),
    set(a) {
      Object.assign(placed, a);
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// A toy wheel on a ruler: the player taps where the red dot touches the ruler again after one full turn.
function wheelRoll({ d, max }) {
  let k = null, locked = false;
  const ux = 600 / (max + d / 2), R = (d * ux) / 2, x0 = R + 10, base = 2 * R + 16, Ht = base + 44, X = i => x0 + i * ux;
  const el = h('div', { class: 'lgeo-wheel', dir: 'ltr' });
  const wheel = (cx, cls) =>
    `<g transform="translate(${f1(cx)} ${f1(base - R)})" class="${cls}"><circle r="${f1(R)}" class="lgeo-tire"/><line x1="${f1(-R)}" y1="0" x2="${f1(R)}" y2="0" class="lgeo-spoke"/><line x1="0" y1="${f1(-R)}" x2="0" y2="${f1(R)}" class="lgeo-spoke"/><circle r="${f1(Math.max(4, R * 0.1))}" class="lgeo-hub"/><circle cy="${f1(R)}" r="${f1(Math.max(6, R * 0.12))}" class="lgeo-red"/></g>`;
  const draw = () => {
    let s = `<svg viewBox="0 0 640 ${f1(Ht)}">`;
    s += `<rect x="${f1(X(0) - 8)}" y="${f1(base)}" width="${f1(max * ux + 16)}" height="26" rx="4" class="lgeo-ruler"/>`;
    for (let i = 0; i <= max; i++) {
      s += `<line x1="${f1(X(i))}" y1="${f1(base)}" x2="${f1(X(i))}" y2="${f1(base + (i % 5 ? 9 : 15))}" class="lgeo-rtick"/>`;
      if (max <= 12 || i % 2 === 0) s += `<text x="${f1(X(i))}" y="${f1(base + 40)}" class="lgeo-rnum">${i}</text>`;
    }
    if (k != null) s += `<line x1="${f1(X(0))}" y1="${f1(base)}" x2="${f1(X(k))}" y2="${f1(base)}" class="lgeo-trail"/>` + wheel(X(k), 'lgeo-ghost');
    s += wheel(X(0), '');
    for (let i = 0; i <= max; i++) s += `<rect data-k="${i}" x="${f1(X(i) - ux / 2)}" y="0" width="${f1(ux)}" height="${f1(Ht)}" class="hit"/>`;
    el.innerHTML = s + '</svg>';
  };
  el.addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.k;
    if (locked || v == null) return;
    k = +v;
    draw();
  });
  draw();
  return { el, value: () => k, set(a) { k = a; draw(); }, lock() { locked = true; } };
}

// A measuring cylinder: drag the water surface (or use + and −) to a volume in ml.
function beaker({ max = 1000, start = null, step = 10 }) {
  let v = start || 0, moved = false, locked = false, drag = false;
  const T = 24, B = 286, Hh = B - T;
  const stage = h('div', { class: 'lgeo-beaker-st', dir: 'ltr' }), read = h('b');
  const draw = () => {
    const y = B - (v / max) * Hh;
    let s = `<svg viewBox="0 0 210 300"><rect x="70" y="${T - 14}" width="92" height="${Hh + 14}" rx="7" class="lgeo-glass"/>`;
    if (v > 0) s += `<rect x="72.5" y="${f1(y)}" width="87" height="${f1(B - y + 0.5)}" class="lgeo-water"/>`;
    if (start != null) {
      const ys = B - (start / max) * Hh;
      s += `<line x1="72" y1="${f1(ys)}" x2="160" y2="${f1(ys)}" class="lgeo-was"/>`;
    }
    for (let i = 0; i <= 20; i++) {
      const yy = B - (i / 20) * Hh, major = i % 2 === 0;
      s += `<line x1="70" y1="${f1(yy)}" x2="${major ? 94 : 84}" y2="${f1(yy)}" class="lgeo-btick"/>`;
      if (major) s += `<text x="62" y="${f1(yy + 5)}" class="lgeo-blabel">${(max * i) / 20}</text>`;
    }
    s += `<line x1="66" y1="${f1(y)}" x2="166" y2="${f1(y)}" class="lgeo-surf"/><circle cx="180" cy="${f1(y)}" r="13" class="handle"/></svg>`;
    stage.innerHTML = s;
    read.textContent = `${v} מ"ל`;
  };
  const aim = e => {
    const svg = stage.firstChild, p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    v = Math.min(max, Math.max(0, Math.round((((B - p.y) / Hh) * max) / step) * step));
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
    v = Math.min(max, Math.max(0, v + by));
    moved = true;
    draw();
  };
  draw();
  return {
    el: h('div', { class: 'lgeo-beaker' }, stage,
      h('div', { class: 'fb-ctl' },
        h('button', { type: 'button', class: 'round', 'aria-label': 'פחות מים', onclick: nudge(-step) }, '−'),
        h('span', {}, 'במבחנה: ', read),
        h('button', { type: 'button', class: 'round', 'aria-label': 'עוד מים', onclick: nudge(step) }, '+'))),
    value: () => (moved ? v : null),
    set(a) {
      v = a;
      moved = true;
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// ---------- cube nets ----------
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const neg = v => v.map(x => -x);
const norm = cells => {
  const r0 = Math.min(...cells.map(c => c[0])), c0 = Math.min(...cells.map(c => c[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
// Folds six cells around a cube; returns the outward direction of each cell ("r,c" → "x,y,z"), or null if two cells land on one face.
function fold(cells) {
  const at = new Map(cells.map(([r, c]) => [`${r},${c}`, null]));
  if (at.size !== 6) return null;
  at.set(`${cells[0][0]},${cells[0][1]}`, { n: [0, 0, -1], x: [1, 0, 0], y: [0, 1, 0] });
  const q = [cells[0]];
  while (q.length) {
    const [r, c] = q.shift(), { n, x, y } = at.get(`${r},${c}`);
    for (const [dr, dc, s] of [[0, 1, { n: x, x: neg(n), y }], [0, -1, { n: neg(x), x: n, y }], [1, 0, { n: y, x, y: neg(n) }], [-1, 0, { n: neg(y), x, y: n }]]) {
      const k = `${r + dr},${c + dc}`;
      if (at.has(k) && !at.get(k)) {
        at.set(k, s);
        q.push([r + dr, c + dc]);
      }
    }
  }
  const f = [...at.values()];
  if (f.some(v => !v) || new Set(f.map(v => v.n.join())).size < 6) return null;
  return new Map([...at].map(([k, v]) => [k, v.n.join()]));
}
function hexo() {
  const got = new Set(['0,0']);
  while (got.size < 6) {
    const [r, c] = pick([...got]).split(',').map(Number), [dr, dc] = pick(DIRS);
    got.add(`${r + dr},${c + dc}`);
  }
  return norm([...got].map(k => k.split(',').map(Number)));
}
const randNet = (valid, fits = () => true) => {
  for (;;) {
    const c = hexo();
    if (!!fold(c) === valid && fits(c)) return c;
  }
};
const fitsIn = (rows, cols) => c => Math.max(...c.map(x => x[0])) < rows && Math.max(...c.map(x => x[1])) < cols;
const longRun = cells => {
  const s = new Set(cells.map(c => c.join()));
  return cells.some(([r, c]) => [[0, 1], [1, 0]].some(([dr, dc]) => range(4).every(i => s.has(`${r + dr * i},${c + dc * i}`))));
};
function netSVG(cells, letters = null, u = 26) {
  const R = Math.max(...cells.map(c => c[0])) + 1, C = Math.max(...cells.map(c => c[1])) + 1;
  let s = `<svg viewBox="-2 -2 ${C * u + 4} ${R * u + 4}" class="lgeo-net" style="max-width:${C * u + 4}px">`;
  cells.forEach(([r, c], i) => {
    s += `<rect x="${c * u}" y="${r * u}" width="${u}" height="${u}"/>`;
    if (letters) s += `<text x="${c * u + u / 2}" y="${r * u + u / 2 + 7}">${letters[i]}</text>`;
  });
  return s + '</svg>';
}

// =====================================================================
// 1. parallelogram
// two heights of one parallelogram: sides a and b, the height ha to side a and hb to side b
const TWO_H = [], TWO_HD = [];
for (let a = 5; a <= 18; a++)
  for (let b = 4; b <= 18; b++)
    for (let ha = 2; ha < b; ha++) {
      if (a === b || (a * ha) % b || (a * ha) / b === ha || ha / b < 0.5 || ha / b > 0.97) continue;
      if (a <= 15 && b <= 14 && ha / b <= 0.9) TWO_H.push([a, b, ha, (a * ha) / b]);
      // for the picture: both heights land on the sides themselves, not on their extensions
      const s = Math.sqrt(b * b - ha * ha);
      if (s <= a - 0.8 && a * s <= b * b - 0.25 * b) TWO_HD.push([a, b, ha, (a * ha) / b]);
    }
// slanted side c over height h, with the shift it makes
function slant(h, maxShift) {
  const ok = range(5, i => h + 1 + i).filter(c => Math.sqrt(c * c - h * h) <= maxShift && Math.sqrt(c * c - h * h) >= 1);
  if (!ok.length) return null;
  const c = pick(ok);
  return [c, Math.sqrt(c * c - h * h)];
}

const para = {
  id: 'lgeo-para', title: 'שטח מקבילית',
  intro: `<p>אפשר לחתוך משולש מצד אחד של מקבילית ולהדביק אותו בצד השני. מקבלים מלבן עם אותו בסיס ואותו גובה, ולכן:</p>
    <div class="ex"><b>שטח מקבילית = בסיס × גובה</b><br>בסיס 8 ס"מ וגובה 5 ס"מ: ${M('8 × 5 = 40')} סמ"ר.</div>
    <p>ה<b>גובה</b> הוא הקו המקווקו, שמאונך לבסיס. הצלע המשופעת היא לא הגובה!</p>
    <p>בבנייה על לוח היתדות: לוחצים על 4 יתדות, והן הופכות לפינות. לחיצה נוספת על פינה מבטלת אותה.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        let b, hh, sl;
        do [b, hh] = [rnd(5, 12), rnd(3, 9)]; while (!(sl = slant(hh, b - 1.5)));
        const [c, s] = sl;
        return one({
          prompt: 'החשבונאים ניפצו לוח זכוכית בצורת מקבילית. מה השטח שלו, בסמ"ר? (המידות בס"מ)', visual: paraFig({ a: b, s, h: hh, la: b, lh: hh, lb: c }), answer: b * hh, post: 'סמ"ר',
          hints: ['שטח מקבילית = בסיס × גובה. הגובה הוא הקו המקווקו.', `הצלע המשופעת (${c}) לא משתתפת בחישוב: ${M(`${b} × ${hh}`)}.`],
          explain: `${M(`${b} × ${hh} = ${b * hh}`)} סמ"ר. הצלע המשופעת, ${c} ס"מ, היא לא הגובה.`,
          wrongMsg: ([v]) => (v === b * c ? 'הכפלתם בצלע המשופעת. הגובה הוא הקו המקווקו.' : ''),
        });
      }
      if (t === 1) {
        const b = rnd(3, 7), hh = rnd(2, 5), s = rnd(1, 3), left = Math.random() < 0.5;
        const pts = left ? [[1 + s, 1], [1 + s + b, 1], [1 + b, 1 + hh], [1, 1 + hh]] : [[1, 1], [1 + b, 1], [1 + b + s, 1 + hh], [1 + s, 1 + hh]];
        return one({
          prompt: 'מה שטח המקבילית? כל משבצת היא יחידת שטח אחת.', visual: gridShape({ cols: b + s + 2, rows: hh + 2, polys: [{ pts }], lines: [left ? [1 + s, 1, 1 + s, 1 + hh] : [1 + b, 1, 1 + b, 1 + hh]] }), answer: b * hh,
          hints: ['חתכו בדמיון את המשולש שמחוץ לקו המקווקו והעבירו אותו לצד השני. איזו צורה מתקבלת?', `מתקבל מלבן: הבסיס ${b} והגובה ${hh}.`],
          explain: `בסיס ${b} וגובה ${hh}: ${M(`${b} × ${hh} = ${b * hh}`)}.`,
        });
      }
      // rectangle against parallelogram
      const k = rnd(0, 2), b = rnd(3, 5), hh = rnd(2, 4), s = rnd(1, 2);
      const [rb, rh, pb, ph] = k === 0 ? (Math.random() < 0.5 ? [b + 1, hh, b, hh] : [b, hh + 1, b, hh]) : k === 1 ? (Math.random() < 0.5 ? [b, hh, b + 1, hh] : [b, hh, b, hh + 1]) : [b, hh, b, hh];
      const H = Math.max(rh, ph), x2 = rb + 2;
      return {
        prompt: 'למי יש שטח גדול יותר: למלבן הכתום או למקבילית הסגולה? כל משבצת היא יחידת שטח אחת.',
        visual: gridShape({ cols: rb + pb + s + 3, rows: H + 2, polys: [{ pts: [[1, 1 + H - rh], [1 + rb, 1 + H - rh], [1 + rb, 1 + H], [1, 1 + H]], cls: 'shape lgeo-orange' }, { pts: [[x2 + s, 1 + H - ph], [x2 + s + pb, 1 + H - ph], [x2 + pb, 1 + H], [x2, 1 + H]] }] }),
        widget: choice(['למלבן', 'למקבילית', 'השטחים שווים']), answer: k, check: v => v === k, tries: 1,
        hints: ['אל תספרו משבצות חתוכות אחת אחת. השתמשו בבסיס ובגובה.', `המלבן: ${rb} על ${rh}. המקבילית: בסיס ${pb} וגובה ${ph}.`],
        explain: `שטח המלבן ${M(`${rb} × ${rh} = ${rb * rh}`)}, ושטח המקבילית ${M(`${pb} × ${ph} = ${pb * ph}`)}. ${['למלבן שטח גדול יותר.', 'למקבילית שטח גדול יותר.', 'השטחים שווים: אותו בסיס ואותו גובה.'][k]}`,
      };
    }
    if (L === 2) {
      if (t === 0) {
        const b = rnd(4, 15), hh = rnd(3, 12), A = b * hh, askH = Math.random() < 0.5, s = Math.min(b * 0.4, hh * 0.6);
        return one({
          prompt: askH ? `שטח המקבילית ${A} סמ"ר, והבסיס שלה ${b} ס"מ. מה הגובה שלה?` : `שטח המקבילית ${A} סמ"ר, והגובה שלה ${hh} ס"מ. מה אורך הבסיס?`,
          visual: paraFig({ a: b, s, h: hh, la: askH ? b : '?', lh: askH ? '?' : hh }), answer: askH ? hh : b, post: 'ס"מ',
          hints: [`שטח = בסיס × גובה, אז ${askH ? 'הגובה = שטח ÷ בסיס' : 'הבסיס = שטח ÷ גובה'}.`, askH ? `איזה מספר כפול ${b} נותן ${A}?` : `איזה מספר כפול ${hh} נותן ${A}?`],
          explain: askH ? `${M(`${A} ÷ ${b} = ${hh}`)} ס"מ. בדיקה: ${M(`${b} × ${hh} = ${A}`)}.` : `${M(`${A} ÷ ${hh} = ${b}`)} ס"מ. בדיקה: ${M(`${b} × ${hh} = ${A}`)}.`,
        });
      }
      if (t === 1) {
        const [a, b, ha, hb] = pick(TWO_HD), s = Math.sqrt(b * b - ha * ha);
        return one({
          prompt: `למקבילית יש שני גבהים: אחד לכל זוג צלעות. הצלעות שלה ${a} ס"מ ו־${b} ס"מ, והגובה לצלע של ${a} ס"מ הוא ${ha} ס"מ. מה אורך הגובה השני, המסומן בסימן שאלה?`,
          visual: paraFig({ a, s, h: ha, la: a, lb: b, lh: ha, lh2: '?' }), answer: hb, post: 'ס"מ',
          hints: ['חשבו קודם את השטח בעזרת הבסיס והגובה שידועים. אותו שטח שווה גם לצלע השנייה כפול הגובה השני.', `השטח: ${M(`${a} × ${ha} = ${a * ha}`)}. עכשיו ${M(`${b} × ? = ${a * ha}`)}.`],
          explain: `השטח ${M(`${a} × ${ha} = ${a * ha}`)}, ולכן הגובה לצלע של ${b} הוא ${M(`${a * ha} ÷ ${b} = ${hb}`)} ס"מ.`,
        });
      }
      let b, hh, s;
      do [b, hh, s] = [rnd(2, 6), rnd(2, 5), rnd(1, 3)]; while (b + s > 8 || b * hh < 6);
      const X = b * hh;
      return {
        prompt: `בנו על לוח היתדות מקבילית ששטחה ${X} יחידות ריבועיות, אבל שלא תהיה מלבן. המרחק בין שתי יתדות שכנות הוא יחידה אחת.`,
        widget: pegBoard(), answer: [[0, hh], [b, hh], [b + s, 0], [s, 0]],
        check: v => { const q = quadInfo(v); return q.kind === 'para' && q.area === X; },
        wrongMsg: v => { const q = quadInfo(v); return q.kind === 'rect' || q.kind === 'square' ? `בניתם ${QNAME[q.kind]}. הזיזו את הצלע העליונה הצידה.` : said(q); },
        hints: ['שימו את הבסיס על שורה של יתדות, ואת הצלע שמולו באותו אורך בדיוק על שורה גבוהה יותר, אבל מוזזת הצידה.', `צריך בסיס × גובה = ${X}, למשל בסיס ${b} וגובה ${hh}.`],
        explain: `למשל בסיס ${b} וגובה ${hh}, והצלע העליונה מוזזת ב־${s}: ${M(`${b} × ${hh} = ${X}`)}. כל מקבילית אחרת ששטחה ${X} נכונה גם היא.`,
      };
    }
    if (t === 0) {
      let u, v, A, xs, ys;
      do {
        u = [pick([-3, -2, -1, 1, 2, 3, 4]), pick([-3, -2, -1, 1, 2, 3])];
        v = [pick([-3, -2, -1, 1, 2, 3]), pick([-3, -2, -1, 1, 2, 3, 4])];
        A = Math.abs(cross(u, v));
        const P = [[0, 0], u, [u[0] + v[0], u[1] + v[1]], v];
        xs = P.map(p => p[0]);
        ys = P.map(p => p[1]);
      } while (A < 3 || A > 16 || Math.max(...xs) - Math.min(...xs) > 8 || Math.max(...ys) - Math.min(...ys) > 6 || cross(u, v) === 0);
      const ox = -Math.min(...xs), oy = -Math.min(...ys), ans = [[0, 0], u, [u[0] + v[0], u[1] + v[1]], v].map(([x, y]) => [x + ox, y + oy]);
      return {
        prompt: `בנו מקבילית ששטחה ${A} יחידות ריבועיות, כך שאף צלע שלה לא תהיה אופקית ולא אנכית.`,
        widget: pegBoard(), answer: ans,
        check: w => { const q = quadInfo(w); return ['para', 'rect', 'square'].includes(q.kind) && !q.axis && q.area === A; },
        wrongMsg: w => { const q = quadInfo(w); return ['para', 'rect', 'square'].includes(q.kind) && q.axis ? 'יש לכם צלע לאורך קו של הרשת.' : said(q); },
        hints: ['כדי לחשב שטח של צורה עקומה: מקיפים אותה במלבן, ומחסירים את המשולשים שבפינות.', 'נסו צלע אחת שהולכת 3 ימינה ו־1 למעלה, ושנייה שהולכת 1 ימינה ו־2 למעלה. מה השטח שיוצא? שנו עד שתגיעו לשטח הנכון.'],
        explain: `למשל מקבילית שצלע אחת שלה הולכת ${step(u[0], -u[1])}, והצלע השנייה הולכת ${step(v[0], -v[1])}. המלבן שמקיף אותה, פחות המשולשים שבפינות, נותן ${A}. גם כל מקבילית עקומה אחרת ששטחה ${A} נכונה.`,
      };
    }
    if (t === 1) {
      let b, hh;
      do [b, hh] = [rnd(6, 14), rnd(3, 10)]; while ((b * hh) % 2);
      const x = rnd(1, b - 1), s = Math.min(3, b * 0.3), white = Math.random() < 0.4, P = [s + x, hh];
      return one({
        prompt: white ? 'הנקודה P נמצאת על הצלע העליונה של המקבילית. מה השטח של שני המשולשים הלבנים יחד? (המידות בס"מ)' : 'הנקודה P נמצאת על הצלע העליונה של המקבילית. מה השטח של המשולש הצבוע? (המידות בס"מ)',
        visual: paraFig({ a: b, s, h: hh, la: b, lh: hh, extra: { shapes: [{ pts: [[0, 0], [b, 0], P], cls: 'lgeo-shade' }], texts: [{ p: P, t: 'P', dy: -15 }, { p: [s + x / 2, hh], t: x, dy: 14 }, { p: [s + (x + b) / 2, hh], t: b - x, dy: 14 }] } }),
        answer: (b * hh) / 2, post: 'סמ"ר',
        hints: ['למשולש הצבוע ולמקבילית יש אותו בסיס ואותו גובה.', `שטח המקבילית ${M(`${b} × ${hh} = ${b * hh}`)}, והמשולש הצבוע הוא בדיוק חצי ממנה, לא משנה איפה P.`],
        explain: white
          ? `המשולש הצבוע: ${M(`${b} × ${hh} ÷ 2 = ${(b * hh) / 2}`)}. הלבנים הם מה שנשאר מהמקבילית: ${M(`${b * hh} − ${(b * hh) / 2} = ${(b * hh) / 2}`)} סמ"ר.`
          : `${M(`${b} × ${hh} ÷ 2 = ${(b * hh) / 2}`)} סמ"ר. האורכים ${x} ו־${b - x} לא משנים כלום!`,
      });
    }
    const [a, b, ha, hb] = pick(TWO_H);
    return one({
      prompt: `היקף מקבילית הוא ${2 * (a + b)} ס"מ. אחת הצלעות שלה ${a} ס"מ, והגובה לצלע הזאת ${ha} ס"מ. מה אורך הגובה לצלע השנייה?`, answer: hb, post: 'ס"מ',
      hints: ['חצי מההיקף הוא סכום של שתי צלעות שכנות. מצאו את הצלע השנייה, ואחר כך את השטח.', `הצלע השנייה: ${M(`${a + b} − ${a} = ${b}`)}. השטח: ${M(`${a} × ${ha} = ${a * ha}`)}.`],
      explain: `הצלע השנייה ${b} ס"מ, השטח ${a * ha} סמ"ר, ולכן הגובה לצלע השנייה ${M(`${a * ha} ÷ ${b} = ${hb}`)} ס"מ.`,
    });
  },
};

// =====================================================================
// 2. trapezoid
const trap = {
  id: 'lgeo-trap', title: 'שטח טרפז',
  intro: `<p>ל<b>טרפז</b> יש זוג אחד של צלעות מקבילות: שני ה<b>בסיסים</b>. ה<b>גובה</b> הוא המרחק בין הבסיסים. שני טרפזים זהים, אחד מהם הפוך, יוצרים יחד מקבילית, ולכן:</p>
    <div class="ex"><b>שטח טרפז = (בסיס + בסיס) × גובה ÷ 2</b><br>בסיסים 10 ו־6, גובה 4: ${M('(10 + 6) × 4 ÷ 2 = 32')}.</div>
    <p>בבנייה על לוח היתדות: לוחצים על 4 יתדות כדי לקבוע את הפינות.</p>`,
  gen(L) {
    const t = rnd(0, 2), area = (a, b, hh) => ((a + b) * hh) / 2;
    if (L === 1) {
      if (t === 0) {
        let a, b, hh;
        do [a, b, hh] = [rnd(7, 14), rnd(3, 10), rnd(3, 9)]; while (b > a - 3 || ((a + b) * hh) % 2);
        const sl = Math.random() < 0.6 ? slant(hh, a - b - 0.7) : null, off = sl ? sl[1] : (a - b) * (0.25 + Math.random() * 0.5);
        return one({
          prompt: 'מה שטח הטרפז, בסמ"ר? (המידות בס"מ)', visual: trapFig({ a, b, off, h: hh, la: a, lb: b, lh: hh, lleg: sl ? sl[0] : null }), answer: area(a, b, hh), post: 'סמ"ר',
          hints: ['הבסיסים הם שתי הצלעות המקבילות. מחברים אותם, כופלים בגובה ומחלקים ב־2.', M(`(${a} + ${b}) × ${hh} ÷ 2`)],
          explain: `${M(`(${a} + ${b}) × ${hh} ÷ 2 = ${a + b} × ${hh} ÷ 2 = ${area(a, b, hh)}`)} סמ"ר.${sl ? ` השוק המשופעת, ${sl[0]} ס"מ, לא משתתפת בחישוב.` : ''}`,
        });
      }
      if (t === 1) {
        let a, b, hh;
        do [a, b, hh] = [rnd(5, 9), rnd(2, 7), rnd(2, 5)]; while (b > a - 2 || ((a + b) * hh) % 2);
        const s = rnd(0, a - b);
        return one({
          prompt: 'מה שטח הטרפז? כל משבצת היא יחידת שטח אחת.', visual: gridShape({ cols: a + 2, rows: hh + 2, polys: [{ pts: [[1, 1 + hh], [1 + a, 1 + hh], [1 + s + b, 1], [1 + s, 1]] }] }), answer: area(a, b, hh),
          hints: ['ספרו את אורכי שני הבסיסים (הצלעות האופקיות) ואת הגובה.', `בסיסים ${a} ו־${b}, גובה ${hh}.`],
          explain: M(`(${a} + ${b}) × ${hh} ÷ 2 = ${area(a, b, hh)}`),
        });
      }
      let a, b, hh;
      do [a, b, hh] = [rnd(6, 12), rnd(2, 9), rnd(3, 8)]; while (b > a - 2 || ((a + b) * hh) % 2);
      const p = rnd(0, a - b), A = [0, 0], D = [0, a], B = [hh, p], C = [hh, p + b];
      return one({
        prompt: 'מה שטח הטרפז, בסמ"ר? שימו לב: הפעם הבסיסים עומדים. (המידות בס"מ)',
        visual: fig({ shapes: [{ pts: [A, B, C, D] }], segs: [{ a: C, b: [0, p + b] }], rights: [[[0, p + b], C, A]], texts: [{ p: [0, a / 2 - (p + b > a / 2 ? a / 4 : 0)], t: a, dx: -14 }, { p: mid(B, C), t: b, dx: 14 }, { p: [hh / 2, p + b], t: hh, dy: -13 }] }, { W: 170, H: 160 }),
        answer: area(a, b, hh), post: 'סמ"ר',
        hints: ['הבסיסים הם שתי הצלעות המקבילות, גם כשהן עומדות. הגובה הוא הקו המקווקו שמחבר ביניהן בזווית ישרה.', `בסיסים ${a} ו־${b}, גובה ${hh}.`],
        explain: M(`(${a} + ${b}) × ${hh} ÷ 2 = ${area(a, b, hh)}`) + ' סמ"ר.',
      });
    }
    if (L === 2) {
      if (t === 0) {
        let a, b, hh;
        do [a, b, hh] = [rnd(6, 16), rnd(2, 12), rnd(2, 12)]; while (b > a - 2 || ((a + b) * hh) % 2);
        const A = area(a, b, hh), askH = Math.random() < 0.5;
        return one({
          prompt: askH ? `שטח הטרפז ${A} סמ"ר, והבסיסים שלו ${a} ס"מ ו־${b} ס"מ. מה הגובה שלו?` : `שטח הטרפז ${A} סמ"ר, הגובה שלו ${hh} ס"מ והבסיס הארוך ${a} ס"מ. מה אורך הבסיס הקצר?`,
          visual: trapFig({ a, b, off: (a - b) / 2, h: hh, la: a, lb: askH ? b : '?', lh: askH ? '?' : hh }), answer: askH ? hh : b, post: 'ס"מ',
          hints: askH
            ? [`הכפילו את השטח ב־2: ${M(`${A} × 2 = ${2 * A}`)}. זה (סכום הבסיסים) × גובה.`, `${M(`(${a} + ${b}) × ? = ${2 * A}`)}`]
            : [`הכפילו את השטח ב־2 וחלקו בגובה: ${M(`${A} × 2 ÷ ${hh}`)}. זה סכום שני הבסיסים.`, `סכום הבסיסים ${a + b}, ואחד מהם ${a}.`],
          explain: askH ? `${M(`${A} × 2 = ${2 * A}`)}, ${M(`${2 * A} ÷ ${a + b} = ${hh}`)} ס"מ.` : `${M(`${A} × 2 ÷ ${hh} = ${a + b}`)}, ולכן הבסיס הקצר ${M(`${a + b} − ${a} = ${b}`)} ס"מ.`,
        });
      }
      if (t === 1) {
        let a, b, hh;
        do [a, b, hh] = [rnd(3, 8), rnd(1, 7), rnd(2, 6)]; while (a === b || ((a + b) * hh) % 2 || area(a, b, hh) < 6 || area(a, b, hh) > 30);
        const X = area(a, b, hh), [lo, hi] = [Math.min(a, b), Math.max(a, b)], s = rnd(0, hi - lo);
        return {
          prompt: `בנו על לוח היתדות טרפז ששטחו ${X} יחידות ריבועיות. המרחק בין שתי יתדות שכנות הוא יחידה אחת.`,
          widget: pegBoard(), answer: [[0, hh], [hi, hh], [s + lo, 0], [s, 0]],
          check: v => { const q = quadInfo(v); return q.kind === 'trap' && q.area === X; },
          wrongMsg: v => said(quadInfo(v)),
          hints: ['שימו את שני הבסיסים על שורות של יתדות. הגובה הוא מספר המשבצות בין השורות, והבסיסים צריכים להיות באורכים שונים.', `למשל בסיסים ${hi} ו־${lo} וגובה ${hh}: ${M(`(${hi} + ${lo}) × ${hh} ÷ 2 = ${X}`)}.`],
          explain: `למשל טרפז עם בסיסים ${hi} ו־${lo} וגובה ${hh}: ${M(`(${hi} + ${lo}) × ${hh} ÷ 2 = ${X}`)}. כל טרפז אחר ששטחו ${X} נכון גם הוא.`,
        };
      }
      let b, d, hh;
      do [b, d, hh] = [rnd(2, 10), rnd(1, 8), rnd(2, 10)]; while (((2 * b + d) * hh) % 2);
      const a = b + d, A = area(a, b, hh);
      return ask({
        prompt: `שטח טרפז הוא ${A} סמ"ר והגובה שלו ${hh} ס"מ. בסיס אחד ארוך מהשני ב־${d} ס"מ. מה אורכי הבסיסים?`,
        visual: trapFig({ a, b, off: d / 2, h: hh, la: '?', lb: '?', lh: hh }), fields: [['הבסיס הקצר:', b, 'ס"מ'], ['הבסיס הארוך:', a, 'ס"מ']],
        hints: [`${M(`${A} × 2 ÷ ${hh} = ${a + b}`)}: זה סכום שני הבסיסים.`, `שני מספרים שהסכום שלהם ${a + b} וההפרש ביניהם ${d}. אם מורידים את ההפרש, נשארים שני בסיסים קצרים: ${M(`${a + b} − ${d} = ${2 * b}`)}.`],
        explain: `סכום הבסיסים ${a + b}. ${M(`(${a + b} − ${d}) ÷ 2 = ${b}`)}, ולכן הבסיסים ${b} ו־${a} ס"מ.`,
      });
    }
    if (t === 0) {
      const m = rnd(4, 14), e = rnd(1, Math.min(m - 1, 5)), hh = rnd(3, 10), a = m + e, b = m - e;
      return one({
        prompt: `בטרפז שבציור, הקטע הכתום מחבר את אמצעי שתי השוקיים, ואורכו ${m} ס"מ. הגובה ${hh} ס"מ. מה שטח הטרפז?`,
        visual: trapFig({ a, b, off: e * (0.6 + Math.random() * 0.8), h: hh, lh: hh, midLabel: m }), answer: m * hh, post: 'סמ"ר',
        hints: ['הקטע שמחבר את אמצעי השוקיים (קטע אמצעים) ארוך בדיוק כמו הממוצע של שני הבסיסים: (בסיס + בסיס) ÷ 2.', 'בנוסחה (בסיס + בסיס) × גובה ÷ 2, החלק (בסיס + בסיס) ÷ 2 הוא בדיוק קטע האמצעים. אז השטח = קטע אמצעים × גובה.'],
        explain: `${M(`${m} × ${hh} = ${m * hh}`)} סמ"ר. למשל, אם הבסיסים ${a} ו־${b}: ${M(`(${a} + ${b}) ÷ 2 = ${m}`)}.`,
      });
    }
    if (t === 1) {
      let a, b, hh, k;
      do [a, b, hh, k] = [rnd(8, 16), rnd(3, 9), rnd(3, 10), rnd(1, 6)]; while (b > a - 3 || a - k <= b || (k * hh) % 2 || ((a + b) * hh) % 2);
      const top = Math.random() < 0.5;
      return one({
        prompt: top ? `לטרפז בסיסים של ${a} ס"מ ו־${b} ס"מ, וגובה ${hh} ס"מ. מאריכים את הבסיס הקצר ב־${k} ס"מ (הגובה לא משתנה). בכמה סמ"ר גדל השטח?` : `לטרפז בסיסים של ${a} ס"מ ו־${b} ס"מ, וגובה ${hh} ס"מ. מקצרים את הבסיס הארוך ב־${k} ס"מ (הגובה לא משתנה). בכמה סמ"ר קטן השטח?`,
        answer: (k * hh) / 2, post: 'סמ"ר',
        hints: ['אפשר לחשב את השטח לפני ואחרי ולהחסיר. אבל יש קיצור: מה בדיוק נוסף (או נעלם) מהטרפז?', `ההבדל הוא משולש שהבסיס שלו ${k} והגובה שלו ${hh}.`],
        explain: `לפני: ${M(`(${a} + ${b}) × ${hh} ÷ 2 = ${area(a, b, hh)}`)}. אחרי: ${M(top ? `(${a} + ${b + k}) × ${hh} ÷ 2 = ${area(a, b + k, hh)}` : `(${a - k} + ${b}) × ${hh} ÷ 2 = ${area(a - k, b, hh)}`)}. ההבדל ${M(`${k} × ${hh} ÷ 2 = ${(k * hh) / 2}`)}, בלי קשר לאורכי הבסיסים.`,
      });
    }
    let r, b, hh;
    do [r, b, hh] = [rnd(2, 3), rnd(1, 4), rnd(1, 6)]; while (r * b > 8 || ((b + r * b) * hh) % 2 || area(b, r * b, hh) < 4);
    const X = area(b, r * b, hh), s = rnd(0, (r - 1) * b);
    return {
      prompt: `בנו טרפז ששטחו ${X} יחידות ריבועיות, ושבסיס אחד שלו ארוך פי ${r} מהבסיס השני.`,
      widget: pegBoard(), answer: [[0, hh], [r * b, hh], [s + b, 0], [s, 0]],
      check: v => {
        const q = quadInfo(v);
        if (q.kind !== 'trap' || q.area !== X) return false;
        const [l1, l2] = q.bases.map(e => dot(e, e));
        return Math.max(l1, l2) === r * r * Math.min(l1, l2);
      },
      wrongMsg: v => { const q = quadInfo(v); return q.kind === 'trap' && q.area === X ? `השטח נכון, אבל בסיס אחד לא ארוך פי ${r} מהשני.` : said(q); },
      hints: [`אם הבסיס הקצר הוא חלק אחד, שני הבסיסים יחד הם ${r + 1} חלקים. נסו כמה אורכים לבסיס הקצר.`, `למשל בסיסים ${b} ו־${r * b}: ${M(`(${b} + ${r * b}) × ${hh} ÷ 2 = ${X}`)}, כלומר גובה ${hh}.`],
      explain: `למשל בסיסים ${b} ו־${r * b} וגובה ${hh}: ${M(`(${b} + ${r * b}) × ${hh} ÷ 2 = ${X}`)}. גם כל טרפז אחר שמתאים לשני התנאים נכון.`,
    };
  },
};

// =====================================================================
// 3. angles of polygons
const NAME = { 5: 'מחומש', 6: 'משושה', 7: 'משובע', 8: 'מתומן', 9: 'מתושע', 10: 'מעושר' };
const nameOf = n => NAME[n] || `מצולע בעל ${n} צלעות`;
const regName = n => (NAME[n] ? `${NAME[n]} משוכלל` : `מצולע משוכלל בעל ${n} צלעות`);
const REGULAR = [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36];
const POLY_RATIOS = [];
for (const n of [5, 6]) {
  const S = (n - 2) * 180;
  const rec = arr => {
    if (arr.length === n) {
      const u = S / sumOf(arr);
      if (Number.isInteger(u) && Math.max(...arr) * u < 180 && Math.min(...arr) * u >= 45 && new Set(arr).size > 1) POLY_RATIOS.push([n, arr]);
      return;
    }
    for (let v = arr.length ? arr[arr.length - 1] : 1; v <= 7; v++) rec([...arr, v]);
  };
  rec([]);
}
// n angles (multiples of 5) of a convex polygon, k of them equal to x (x = null: none fixed)
function polyAngles(n, k = 0, x = 0) {
  const S = (n - 2) * 180, avg = S / n;
  for (;;) {
    const known = range(n - k - 1, () => 5 * rnd(Math.ceil((avg - 30) / 5), Math.floor((avg + 32) / 5)));
    const last = S - k * x - sumOf(known);
    if (last >= avg - 32 && last <= Math.min(168, avg + 38) && last % 5 === 0) return shuffle([...known, last]);
  }
}

const poly = {
  id: 'lgeo-poly', title: 'זוויות במצולע',
  intro: `<p>מקודקוד אחד של מצולע אפשר למתוח אלכסונים לכל הקודקודים שאינם שכנים לו. הם מחלקים מצולע בעל ${M('n')} צלעות ל־${M('n − 2')} משולשים, ובכל משולש יש ${deg(180)}. לכן:</p>
    <div class="ex"><b>סכום הזוויות במצולע = (מספר הצלעות − 2) × 180°</b><br>במחומש: ${M('(5 − 2) × 180 = 540')} מעלות.</div>
    <p>במצולע <b>משוכלל</b> כל הצלעות שוות וכל הזוויות שוות. כדי למצוא זווית אחת מחלקים את הסכום במספר הזוויות.</p>
    <p>ליד כל זווית של מצולע יש <b>זווית חיצונית</b>, שמשלימה אותה ל־${deg(180)}. כשמקיפים את המצולע מסתובבים בדיוק סיבוב שלם, ולכן כל הזוויות החיצוניות יחד הן ${deg(360)}.</p>`,
  gen(L) {
    const t = rnd(0, L === 3 ? 3 : 2);
    if (L === 1) {
      if (t === 0) {
        const n = rnd(5, 9);
        return ask({
          prompt: `האלכסונים המקווקווים יוצאים מקודקוד אחד ומחלקים את ה${nameOf(n)} למשולשים. כמה משולשים יש, ומה סכום הזוויות של ה${nameOf(n)}?`,
          visual: triFig(n), fields: [['מספר המשולשים:', n - 2], ['סכום הזוויות:', (n - 2) * 180, '°']],
          hints: [`ספרו את המשולשים. בכל משולש סכום הזוויות הוא ${deg(180)}.`, `יש ${n - 2} משולשים: ${M(`${n - 2} × 180`)}.`],
          explain: `${n - 2} משולשים, וסכום הזוויות ${M(`${n - 2} × 180 = ${(n - 2) * 180}`)} מעלות. תמיד יש 2 משולשים פחות ממספר הצלעות.`,
        });
      }
      if (t === 1) {
        const n = pick([5, 6]), S = (n - 2) * 180, ang = polyAngles(n), q = rnd(0, n - 1), known = sumOf(ang) - ang[q];
        return one({
          prompt: `כמה מעלות יש בזווית המסומנת בסימן שאלה? הצורה היא ${nameOf(n)}.`, visual: polyFig(polyPts(ang), ang, ang.map((a, i) => (i === q ? '?' : a + '°'))), answer: ang[q], post: '°',
          hints: [`סכום הזוויות ב${nameOf(n)}: ${M(`(${n} − 2) × 180 = ${S}`)}.`, `הזוויות הידועות יחד: ${deg(known)}.`],
          explain: `סכום הזוויות ${deg(S)}, והזוויות הידועות יחד ${deg(known)}: ${M(`${S} − ${known} = ${ang[q]}`)}.`,
        });
      }
      const n = rnd(7, 14);
      return one({
        prompt: `מה סכום הזוויות ב${nameOf(n)}?`, visual: n <= 10 ? fig({ shapes: [{ pts: regPts(n) }] }, { W: 120, H: 120, pad: 6 }) : '', answer: (n - 2) * 180, post: '°',
        hints: ['אפשר לחלק מצולע למשולשים בעזרת אלכסונים מקודקוד אחד. כמה משולשים יוצאים?', `יוצאים ${n - 2} משולשים, ובכל אחד ${deg(180)}.`],
        explain: `${M(`(${n} − 2) × 180 = ${n - 2} × 180 = ${(n - 2) * 180}`)} מעלות.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const n = pick(REGULAR.slice(0, 9)), S = (n - 2) * 180, a = S / n, P = regPts(n);
        return one({
          prompt: `כמה מעלות יש בכל זווית של ${regName(n)}?`, visual: n <= 12 ? polyFig(P, range(n, () => a), range(n, i => (i === 0 ? '?' : null))) : '', answer: a, post: '°',
          hints: ['מצאו קודם את סכום כל הזוויות.', `הסכום ${M(`(${n} − 2) × 180 = ${S}`)}, ויש ${n} זוויות שוות.`],
          explain: `סכום הזוויות ${deg(S)}, וכל זווית ${M(`${S} ÷ ${n} = ${a}`)} מעלות.`,
        });
      }
      if (t === 1) {
        const n = rnd(5, 22), S = (n - 2) * 180;
        return one({
          prompt: `סכום הזוויות של מצולע הוא ${deg(S)}. כמה צלעות יש לו?`, answer: n, post: 'צלעות',
          hints: [`כל משולש תורם ${deg(180)}. כמה משולשים יש במצולע הזה?`, `${M(`${S} ÷ 180 = ${n - 2}`)} משולשים, ומספר הצלעות גדול ב־2 ממספר המשולשים.`],
          explain: `${M(`${S} ÷ 180 = ${n - 2}`)} משולשים, ולכן ${M(`${n - 2} + 2 = ${n}`)} צלעות.`,
        });
      }
      const n = pick([5, 6]), S = (n - 2) * 180, avg = S / n, x = 5 * rnd(Math.ceil((avg - 20) / 5), Math.floor((avg + 25) / 5));
      const rest = polyAngles(n, 2, x), q = shuffle(range(n)).slice(0, 2), ang = [], labels = [];
      let j = 0;
      for (let i = 0; i < n; i++) {
        ang.push(q.includes(i) ? x : rest[j++]);
        labels.push(q.includes(i) ? '?' : ang[i] + '°');
      }
      const known = S - 2 * x;
      return one({
        prompt: `ב${nameOf(n)} שבציור, שתי הזוויות המסומנות בסימן שאלה שוות זו לזו. כמה מעלות יש בכל אחת מהן?`, visual: polyFig(polyPts(ang), ang, labels), answer: x, post: '°',
        hints: [`סכום הזוויות ב${nameOf(n)} הוא ${deg(S)}. החסירו ממנו את הזוויות הידועות.`, `לשתי הזוויות החסרות יחד נשארות ${M(`${S} − ${known} = ${2 * x}`)} מעלות.`],
        explain: `הזוויות הידועות יחד ${deg(known)}. ${M(`(${S} − ${known}) ÷ 2 = ${x}`)} מעלות לכל אחת.`,
      });
    }
    if (t === 0) {
      const n = pick(REGULAR), a = 180 - 360 / n;
      return one({
        prompt: `כל זווית של מצולע משוכלל היא ${deg(a)}. כמה צלעות יש לו?`, answer: n, post: 'צלעות',
        hints: [`ליד כל זווית פנימית יש זווית חיצונית, ויחד הן ${deg(180)}. וכל הזוויות החיצוניות של מצולע (כשהולכים מסביב) הן יחד סיבוב שלם: ${deg(360)}.`, `כל זווית חיצונית: ${M(`180 − ${a} = ${180 - a}`)} מעלות.`],
        explain: `כל זווית חיצונית ${deg(180 - a)}, ו־${M(`360 ÷ ${180 - a} = ${n}`)}. יש ${n} צלעות. בדיקה: ${M(`(${n} − 2) × 180 ÷ ${n} = ${a}`)}.`,
      });
    }
    if (t === 1) {
      let a;
      if (Math.random() < 0.5) a = 180 - 360 / pick(REGULAR);
      else do a = rnd(92, 178); while (360 % (180 - a) === 0);
      const yes = 360 % (180 - a) === 0, ans = yes ? 0 : 1;
      return {
        prompt: `האם יש מצולע משוכלל שכל זווית שלו היא ${deg(a)}?`, widget: choice(['כן, יש', 'לא, אין'], { cols: 2 }), answer: ans, check: v => v === ans, tries: 1,
        hints: [`הזווית החיצונית שליד כל קודקוד היא ${M(`180 − ${a} = ${180 - a}`)} מעלות. כל הזוויות החיצוניות יחד הן ${deg(360)}.`, `כמה פעמים ${180 - a} נכנס ב־360? האם יוצא מספר שלם?`],
        explain: yes
          ? `כן. הזווית החיצונית ${deg(180 - a)}, ו־${M(`360 ÷ ${180 - a} = ${360 / (180 - a)}`)}: זה ${regName(360 / (180 - a))}.`
          : `לא. הזווית החיצונית הייתה צריכה להיות ${deg(180 - a)}, אבל 360 לא מתחלק ב־${180 - a} בלי שארית, אז מספר הצלעות לא יוצא שלם.`,
      };
    }
    if (t === 2) {
      const [n, r0] = pick(POLY_RATIOS), r = shuffle(r0), S = (n - 2) * 180, s = sumOf(r), u = S / s, big = Math.max(...r);
      return one({
        prompt: `הזוויות של ${nameOf(n)} הן ביחס ${M(r.join(' : '))}. כמה מעלות יש בזווית הגדולה ביותר?`, answer: big * u, post: '°',
        hints: [`סכום הזוויות ב${nameOf(n)} הוא ${deg(S)}, ויש ${M(`${r.join(' + ')} = ${s}`)} חלקים שווים.`, `כל חלק: ${M(`${S} ÷ ${s} = ${u}`)} מעלות.`],
        explain: `כל חלק ${deg(u)}, והזווית הגדולה ${M(`${big} × ${u} = ${big * u}`)} מעלות.`,
      });
    }
    const k = rnd(2, 8), n = 2 * k + 2;
    return one({
      prompt: `סכום הזוויות של מצולע גדול פי ${k} מסכום הזוויות מסביב לנקודה (${deg(360)}). כמה צלעות יש לו?`, answer: n, post: 'צלעות',
      hints: [`סכום הזוויות שלו: ${M(`${k} × 360 = ${360 * k}`)} מעלות.`, `${M(`${360 * k} ÷ 180 = ${2 * k}`)} משולשים, ויש תמיד 2 צלעות יותר ממספר המשולשים.`],
      explain: `${M(`${k} × 360 = ${360 * k}`)}, ${M(`${360 * k} ÷ 180 = ${2 * k}`)} משולשים, ולכן ${M(`${2 * k} + 2 = ${n}`)} צלעות.`,
    });
  },
};

// =====================================================================
// 4. radius, diameter and circumference
const ROUND = ['צלחת פטרי', 'המכסה של צנצנת', 'שעון הקיר של המעבדה', 'העדשה של זכוכית מגדלת', 'צלחת הסיבוב של הצנטריפוגה'];
const circ = {
  id: 'lgeo-circ', title: 'רדיוס, קוטר והיקף',
  intro: `<p><b>רדיוס</b> הוא הקטע מהמרכז אל המעגל. <b>קוטר</b> עובר דרך המרכז מצד לצד, והוא פי 2 מהרדיוס.</p>
    <p>ההיקף של כל מעגל גדול מהקוטר שלו פי π (פאי), מספר שקרוב מאוד ל־3.14. כאן תמיד משתמשים ב־${PI_NOTE}:</p>
    <div class="ex"><b>היקף = קוטר × 3.14</b><br>רדיוס 5 ס"מ: הקוטר 10 ס"מ, וההיקף ${M('10 × 3.14 = 31.4')} ס"מ.</div>
    <p>תשובות עם נקודה עשרונית כותבים בעזרת כפתור הנקודה שבמקלדת. בשאלת הגלגל לוחצים על הסרגל.</p>`,
  gen(L) {
    const t = rnd(0, L === 3 ? 3 : 2), obj = pick(ROUND);
    if (L === 1) {
      if (t === 0) {
        const byR = Math.random() < 0.5, r = byR ? rnd(1, 12) : null, d = byR ? 2 * r : rnd(2, 20);
        return ask({
          prompt: `ה${byR ? 'רדיוס' : 'קוטר'} של ${obj} הוא ${byR ? r : d} ס"מ. מה ה${byR ? 'קוטר' : 'רדיוס'} ומה ההיקף? ${PI_P}`,
          visual: circleFig({ show: byR ? 'r' : 'd', label: byR ? r : d }), fields: [[byR ? 'קוטר:' : 'רדיוס:', byR ? d : d / 2, 'ס"מ'], ['היקף:', pi(d), 'ס"מ']], dec: true,
          hints: ['הקוטר הוא פי 2 מהרדיוס. ההיקף הוא קוטר × 3.14.', `הקוטר ${d}, וההיקף ${M(`${d} × 3.14`)}.`],
          explain: `${byR ? `קוטר ${M(`2 × ${r} = ${d}`)}` : `רדיוס ${M(`${d} ÷ 2 = ${nf(d / 2)}`)}`} ס"מ. היקף ${M(`${d} × 3.14 = ${nf(pi(d))}`)} ס"מ.`,
          wrongMsg: ([, c]) => (byR && near(c, pi(r)) ? 'בהיקף כופלים ב־3.14 את הקוטר, לא את הרדיוס.' : ''),
        });
      }
      if (t === 1) {
        const byR = Math.random() < 0.4, d = byR ? 2 * rnd(1, 3) : rnd(1, 6), ans = Math.round(3.14 * d);
        return {
          prompt: `ל${pick(['גלגל של מכונית צעצוע', 'גלגל המדידה של המעבדה', 'גלגלת של חוט'])} יש ${byR ? `רדיוס של ${d / 2}` : `קוטר של ${d}`} ס"מ. הוא מתגלגל על הסרגל סיבוב שלם אחד. איפה הנקודה האדומה תיגע שוב בסרגל? לחצו על הסרגל, לסנטימטר הקרוב.`,
          widget: wheelRoll({ d, max: ans + rnd(2, 4) }), answer: ans, check: v => v === ans, wrongMsg: v => `סימנתם ${v} ס"מ.`,
          hints: ['בסיבוב אחד הגלגל עובר מרחק ששווה בדיוק להיקף שלו.', `ההיקף: ${M(`${d} × 3.14 = ${nf(pi(d))}`)} ס"מ. לאיזה מספר שלם זה הכי קרוב?`],
          explain: `${byR ? `הקוטר ${M(`2 × ${d / 2} = ${d}`)}, ו` : ''}ההיקף ${M(`${d} × 3.14 = ${nf(pi(d))}`)} ס"מ, כלומר בערך ${ans} ס"מ. בכל סיבוב הגלגל עובר קצת יותר מפי 3 מהקוטר שלו.`,
        };
      }
      const r = rnd(3, 15);
      return one({
        prompt: `מחוג הדקות של שעון המעבדה ארוך ${r} ס"מ. כמה ס"מ עובר הקצה שלו בשעה אחת? ${PI_P}`, answer: pi(2 * r), post: 'ס"מ', dec: true,
        hints: ['בשעה אחת המחוג עושה סיבוב שלם, והקצה שלו מצייר מעגל. אורך המחוג הוא הרדיוס.', `הקוטר ${M(`2 × ${r} = ${2 * r}`)}, וההיקף ${M(`${2 * r} × 3.14`)}.`],
        explain: `קוטר ${2 * r} ס"מ, והקצה עובר ${M(`${2 * r} × 3.14 = ${nf(pi(2 * r))}`)} ס"מ.`,
        wrongMsg: ([v]) => (near(v, pi(r)) ? 'אורך המחוג הוא הרדיוס. הכפילו אותו כדי לקבל את הקוטר.' : ''),
      });
    }
    if (L === 2) {
      if (t === 0) {
        const d = rnd(2, 25), askR = d % 2 === 0 && Math.random() < 0.5;
        return one({
          prompt: `ההיקף של ${obj} הוא ${nf(pi(d))} ס"מ. מה ה${askR ? 'רדיוס' : 'קוטר'}? ${PI_P}`,
          answer: askR ? d / 2 : d, post: 'ס"מ', dec: true,
          hints: ['היקף = קוטר × 3.14, ולכן קוטר = היקף ÷ 3.14.', `${M(`${nf(pi(d))} ÷ 3.14 = ${d}`)}: זה הקוטר.${askR ? ' ומה הרדיוס?' : ''}`],
          explain: `הקוטר ${M(`${nf(pi(d))} ÷ 3.14 = ${d}`)} ס"מ${askR ? `, והרדיוס ${M(`${d} ÷ 2 = ${d / 2}`)} ס"מ` : ''}.`,
        });
      }
      if (t === 1) {
        const d = rnd(2, 20), arc = rd(1.57 * d);
        return one({
          prompt: `חותכים חצי עיגול מדף נייר. הקוטר שלו ${d} ס"מ. מה ההיקף של חצי העיגול (הקשת ועוד הקוטר)? ${PI_P}`,
          visual: fig({ shapes: [{ pts: arcPts([0, 0], 1, 0, 180) }], segs: [{ a: [-1, 0], b: [1, 0], cls: 'lgeo-rad' }], texts: [{ p: [0, 0], t: d, dy: 15 }] }, { W: 200, H: 100, pad: 22 }),
          answer: rd(arc + d), post: 'ס"מ', dec: true,
          hints: ['הקשת היא חצי מההיקף של עיגול שלם.', `הקשת: ${M(`${d} × 3.14 ÷ 2 = ${nf(arc)}`)}. אל תשכחו להוסיף את הקוטר.`],
          explain: `הקשת ${M(`${d} × 3.14 ÷ 2 = ${nf(arc)}`)}, ועוד הקוטר: ${M(`${nf(arc)} + ${d} = ${nf(arc + d)}`)} ס"מ.`,
          wrongMsg: ([v]) => (near(v, arc) ? 'זו רק הקשת. ההיקף כולל גם את הקוטר הישר.' : ''),
        });
      }
      const D = pick([40, 50, 60, 70, 80]), k = pick([10, 20, 25, 50, 100]), C = pi(D), m = rd((C * k) / 100), fwd = Math.random() < 0.5;
      return one({
        prompt: fwd ? `גלגל של עגלת מעבדה, שהקוטר שלו ${D} ס"מ, הסתובב ${k} סיבובים שלמים. כמה מטרים עברה העגלה? ${PI_P}` : `גלגל של עגלת מעבדה, שהקוטר שלו ${D} ס"מ, עבר ${nf(m)} מטרים. כמה סיבובים שלמים הוא עשה? ${PI_P}`,
        answer: fwd ? m : k, post: fwd ? 'מטרים' : 'סיבובים', dec: fwd,
        hints: ['בכל סיבוב העגלה מתקדמת בדיוק כמו היקף הגלגל.', `היקף הגלגל: ${M(`${D} × 3.14 = ${nf(C)}`)} ס"מ. ${fwd ? `כפלו ב־${k}, ואז המירו למטרים (100 ס"מ הם מטר).` : `המירו את המרחק לס"מ: ${nf(m * 100)} ס"מ.`}`],
        explain: fwd ? `${M(`${nf(C)} × ${k} = ${nf(C * k)}`)} ס"מ, שהם ${nf(m)} מטרים.` : `${nf(m)} מטרים הם ${nf(m * 100)} ס"מ, ו־${M(`${nf(m * 100)} ÷ ${nf(C)} = ${k}`)} סיבובים.`,
      });
    }
    if (t === 0) {
      const k = pick([1, 2, 3, 4, 5, 0.5]), [what, size, away] = pick([['את כדור הארץ לאורך קו המשווה', 'הרדיוס של כדור הארץ בערך 6,371 ק"מ', 'מעל הקרקע'], ['עמוד עגול', 'הרדיוס של העמוד 1 מ\'', 'מהעמוד'], ['את מגדל המים העגול של המעבדה', 'הרדיוס של המגדל 7 מ\'', 'מהקיר של המגדל']]);
      return one({
        prompt: `חבל מקיף צמוד ${what} (${size}). רוצים להרחיק את החבל כך שבכל מקום הוא יהיה ${nf(k)} מ' ${away}. בכמה מטרים צריך להאריך את החבל? ${PI_P}`,
        answer: rd(6.28 * k), post: 'מטרים', dec: true,
        hints: [`הרדיוס של המעגל שהחבל יוצר גדל ב־${nf(k)}, אז הקוטר גדל ב־${nf(2 * k)}. מה קורה להיקף?`, `ההיקף גדל ב־${M(`${nf(2 * k)} × 3.14`)}. הרדיוס המקורי לא משנה בכלל!`],
        explain: `הקוטר גדל ב־${nf(2 * k)} מ', ולכן ההיקף גדל ב־${M(`${nf(2 * k)} × 3.14 = ${nf(6.28 * k)}`)} מטרים, בלי קשר לגודל של מה שהחבל מקיף. מפתיע, נכון?`,
      });
    }
    if (t === 1) {
      const d = pick([20, 30, 40, 50, 60, 64]), Ls = 10 * rnd(5, 10), Lf = rd(2 * Ls + pi(d)), A = [0, 0], B = [Ls, 0];
      const pts = [A, B, ...arcPts([Ls, d / 2], d / 2, -90, 90).slice(1), [0, d], ...arcPts([0, d / 2], d / 2, 90, 270).slice(1)];
      return one({
        prompt: `מסלול ריצה בנוי משני קטעים ישרים באורך ${Ls} מ' ומשני חצאי מעגל. המרחק בין הקטעים הישרים ${d} מ'. מה אורך המסלול? ${PI_P}`,
        visual: fig({ shapes: [{ pts }], segs: [{ a: [Ls, 0], b: [Ls, d] }], texts: [{ p: [Ls / 2, 0], t: Ls, dy: 16 }, { p: [Ls, d / 2], t: d, dx: -14 }] }, { W: 240, H: 110 }),
        answer: Lf, post: 'מטרים', dec: true,
        hints: ['שני חצאי המעגל יחד הם מעגל שלם אחד. מה הקוטר שלו?', `המעגל: ${M(`${d} × 3.14 = ${nf(pi(d))}`)}. הקטעים הישרים: ${M(`2 × ${Ls} = ${2 * Ls}`)}.`],
        explain: `${M(`${2 * Ls} + ${nf(pi(d))} = ${nf(Lf)}`)} מטרים.`,
      });
    }
    if (t === 2) {
      const r = rnd(2, 20), arc = rd(1.57 * r);
      return one({
        prompt: `מה ההיקף של רבע העיגול שבציור? (המידות בס"מ, ${PI_NOTE})`,
        visual: fig({ shapes: [{ pts: [[0, 0], ...arcPts([0, 0], 1, 0, 90)] }], rights: [[[0, 0], [1, 0], [0, 1]]], texts: [{ p: [0.5, 0], t: r, dy: 15 }, { p: [0, 0.5], t: r, dx: -13 }] }, { W: 140, H: 140, pad: 22 }),
        answer: rd(2 * r + arc), post: 'ס"מ', dec: true,
        hints: ['ההיקף בנוי משני רדיוסים ישרים ומרבע של המעגל השלם.', `רבע מעגל: ${M(`2 × ${r} × 3.14 ÷ 4 = ${nf(arc)}`)}.`],
        explain: `${M(`${r} + ${r} + ${nf(arc)} = ${nf(2 * r + arc)}`)} ס"מ.`,
      });
    }
    const d = pick([5, 8, 10, 12, 15, 20]), m = rnd(2, 4), D = d * m, k = rnd(2, 10);
    return one({
      prompt: `שני גלגלים מחוברים ברצועה. הקוטר של הגלגל הגדול ${D} ס"מ, ושל הקטן ${d} ס"מ. הגלגל הגדול הסתובב ${k} פעמים. כמה פעמים הסתובב הקטן?`, answer: k * m, post: 'פעמים',
      hints: ['הרצועה עוברת אותו אורך על שני הגלגלים. כמה רצועה עוברת בסיבוב אחד של כל גלגל?', `סיבוב של הגדול: ${M(`${D} × 3.14`)} ס"מ. סיבוב של הקטן: ${M(`${d} × 3.14`)} ס"מ. ההיקף של הגדול ארוך פי ${m}.`],
      explain: `${M(`${D} ÷ ${d} = ${m}`)}, אז בכל סיבוב של הגדול הקטן מסתובב ${m} פעמים: ${M(`${k} × ${m} = ${k * m}`)}. ה־3.14 בכלל לא חשוב כאן!`,
    });
  },
};

// =====================================================================
// 5. area of a circle
const disk = {
  id: 'lgeo-disk', title: 'שטח עיגול',
  intro: `<p>חותכים עיגול לפרוסות דקות ומסדרים אותן כמעט כמו מלבן: האורך שלו חצי היקף, והרוחב שלו רדיוס. לכן:</p>
    <div class="ex"><b>שטח עיגול = רדיוס × רדיוס × 3.14</b><br>רדיוס 10 ס"מ: ${M('10 × 10 × 3.14 = 314')} סמ"ר.</div>
    <p>שימו לב: אם נתון הקוטר, מחלקים אותו קודם ב־2 כדי לקבל את הרדיוס. גם כאן ${PI_NOTE}.</p>`,
  gen(L) {
    const t = rnd(0, L === 1 ? 2 : 3), A = r => pi(r * r);
    if (L === 1) {
      if (t < 2) {
        const byD = t === 1, r = rnd(1, 12), d = 2 * r;
        return one({
          prompt: `${byD ? 'הקוטר' : 'הרדיוס'} של ${pick(ROUND)} הוא ${byD ? d : r} ס"מ. מה השטח, בסמ"ר? ${PI_P}`,
          visual: circleFig({ show: byD ? 'd' : 'r', label: byD ? d : r }), answer: A(r), post: 'סמ"ר', dec: true,
          hints: byD ? ['שימו לב: נתון הקוטר. מצאו קודם את הרדיוס.', `הרדיוס ${M(`${d} ÷ 2 = ${r}`)}, והשטח ${M(`${r} × ${r} × 3.14`)}.`] : ['שטח עיגול = רדיוס × רדיוס × 3.14.', M(`${r} × ${r} × 3.14`)],
          explain: `${byD ? `הרדיוס ${M(`${d} ÷ 2 = ${r}`)}. ` : ''}${M(`${r} × ${r} = ${r * r}`)}, ו־${M(`${r * r} × 3.14 = ${nf(A(r))}`)} סמ"ר.`,
          wrongMsg: ([v]) => (byD && near(v, A(d)) ? 'הכפלתם את הקוטר בעצמו. צריך את הרדיוס.' : near(v, pi(2 * r)) ? 'זה ההיקף, לא השטח.' : ''),
        });
      }
      const r = rnd(3, 6), u = 26, S = 2 * r * u, opts = shuffle([Math.round(A(r)), r * r, 2 * r * r, 4 * r * r]), ans = opts.indexOf(Math.round(A(r)));
      let s = `<svg viewBox="-3 -3 ${S + 6} ${S + 6}" class="v-geo" style="max-width:${Math.min(220, S + 6)}px">`;
      for (let i = 0; i <= 2 * r; i++) s += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${S}" class="gl"/><line x1="0" y1="${i * u}" x2="${S}" y2="${i * u}" class="gl"/>`;
      s += `<circle cx="${S / 2}" cy="${S / 2}" r="${r * u}" class="shape"/><line x1="${S / 2}" y1="${S / 2}" x2="${S}" y2="${S / 2}" class="lgeo-rad"/></svg>`;
      return {
        prompt: `הרדיוס של העיגול הוא ${r} משבצות. בערך כמה משבצות שלמות הוא מכסה? ${PI_P}`, visual: s,
        widget: choice(opts.map(o => `בערך ${o}`), { cols: 2 }), answer: ans, check: v => v === ans, tries: 1,
        hints: [`הריבוע שמקיף את העיגול הוא ${2 * r} על ${2 * r}, כלומר ${4 * r * r} משבצות. העיגול קטן ממנו, אבל לא בהרבה.`, `שטח העיגול: ${M(`${r} × ${r} × 3.14`)}.`],
        explain: `${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}, כלומר בערך ${Math.round(A(r))} משבצות: קצת יותר מפי 3 מריבוע של ${r} על ${r}.`,
      };
    }
    if (L === 2) {
      if (t === 0) {
        const r = rnd(2, 12);
        return one({
          prompt: `השטח של עיגול הוא ${nf(A(r))} סמ"ר. מה הרדיוס שלו? ${PI_P}`, answer: r, post: 'ס"מ', dec: true,
          hints: ['חלקו את השטח ב־3.14. מה שיוצא הוא רדיוס × רדיוס.', `${M(`${nf(A(r))} ÷ 3.14 = ${r * r}`)}. איזה מספר כפול עצמו נותן ${r * r}?`],
          explain: `${M(`${nf(A(r))} ÷ 3.14 = ${r * r}`)}, ו־${M(`${r} × ${r} = ${r * r}`)}, ולכן הרדיוס ${r} ס"מ.`,
        });
      }
      if (t === 1) {
        const R = rnd(3, 10), r = rnd(1, R - 1), ans = rd(A(R) - A(r));
        return one({
          prompt: `מה השטח של הטבעת הצבועה? הרדיוס הגדול ${R} ס"מ והרדיוס הקטן ${r} ס"מ. ${PI_P}`,
          visual: fig({ shapes: [{ c: [0, 0], r: R }, { c: [0, 0], r, cls: 'lgeo-white' }, { c: [0, 0], r: R * 0.03, cls: 'lgeo-dot' }], segs: [{ a: [0, 0], b: [R, 0], cls: 'lgeo-rad' }, { a: [0, 0], b: [-r * 0.6, r * 0.8], cls: 'lgeo-rad2' }], texts: [{ p: [(r + R) / 2, 0], t: R, dy: -13 }, { p: [-r * 0.3, r * 0.4], t: r, dx: -12 }] }, { W: 150, H: 150, pad: 10 }),
          answer: ans, post: 'סמ"ר', dec: true,
          hints: ['השטח הצבוע הוא העיגול הגדול פחות העיגול הקטן.', `גדול: ${M(`${R} × ${R} × 3.14 = ${nf(A(R))}`)}. קטן: ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}.`],
          explain: `העיגול הגדול ${M(`${R} × ${R} × 3.14 = ${nf(A(R))}`)}, הקטן ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}, והטבעת ${M(`${nf(A(R))} − ${nf(A(r))} = ${nf(ans)}`)} סמ"ר.`,
        });
      }
      if (t === 2) {
        const r = rnd(2, 12), q = pick([2, 4]), ans = rd(A(r) / q);
        const pts = q === 2 ? arcPts([0, 0], 1, 0, 180) : [[0, 0], ...arcPts([0, 0], 1, 0, 90)];
        return one({
          prompt: `מה השטח של ${q === 2 ? 'חצי העיגול' : 'רבע העיגול'} שבציור, בסמ"ר? (המידות בס"מ, ${PI_NOTE})`,
          visual: fig({ shapes: [{ pts }], segs: [{ a: [0, 0], b: [1, 0], cls: 'lgeo-rad' }], texts: [{ p: [0.5, 0], t: r, dy: 15 }] }, { W: q === 2 ? 200 : 130, H: 110, pad: 20 }),
          answer: ans, post: 'סמ"ר', dec: true,
          hints: [`חשבו את השטח של העיגול השלם, וקחו ממנו ${q === 2 ? 'חצי' : 'רבע'}.`, `העיגול השלם: ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}.`],
          explain: `${M(`${nf(A(r))} ÷ ${q} = ${nf(ans)}`)} סמ"ר.`,
        });
      }
      const r = rnd(2, 10);
      return one({
        prompt: `ההיקף של עיגול הוא ${nf(pi(2 * r))} ס"מ. מה השטח שלו, בסמ"ר? ${PI_P}`, answer: A(r), post: 'סמ"ר', dec: true,
        hints: ['מצאו קודם את הקוטר: היקף ÷ 3.14. ממנו מגיעים לרדיוס.', `הקוטר ${M(`${nf(pi(2 * r))} ÷ 3.14 = ${2 * r}`)}, והרדיוס ${r}.`],
        explain: `קוטר ${2 * r}, רדיוס ${r}, ושטח ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)} סמ"ר.`,
      });
    }
    if (t === 0) {
      const s = 2 * rnd(1, 10), r = s / 2, ans = rd(s * s - A(r));
      return one({
        prompt: `בתוך ריבוע שהצלע שלו ${s} ס"מ יש עיגול שנוגע בכל הצלעות. מה השטח הצבוע, בארבע הפינות שמחוץ לעיגול? ${PI_P}`,
        visual: fig({ shapes: [{ pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]] }, { c: [0, 0], r: 1, cls: 'lgeo-white' }], texts: [{ p: [0, -1], t: s, dy: 16 }] }, { W: 140, H: 140, pad: 22 }),
        answer: ans, post: 'סמ"ר', dec: true,
        hints: ['השטח הצבוע = שטח הריבוע פחות שטח העיגול. מה הרדיוס של העיגול?', `הרדיוס ${r}. ריבוע: ${M(`${s} × ${s} = ${s * s}`)}. עיגול: ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}.`],
        explain: `הריבוע ${M(`${s} × ${s} = ${s * s}`)}, העיגול (רדיוס ${r}) ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}, והפינות ${M(`${s * s} − ${nf(A(r))} = ${nf(ans)}`)} סמ"ר.`,
      });
    }
    if (t === 1) {
      let D, k, d, big, small;
      do {
        D = pick([20, 24, 30, 36, 40]);
        k = pick([2, 3, 4]);
        d = Math.random() < 0.25 ? ((k = 4), D / 2) : 2 * rnd(Math.ceil(D / 6), D / 2 - 1);
        big = (D / 2) ** 2;
        small = k * (d / 2) ** 2;
      } while (big !== small && Math.abs(big - small) / big < 0.08);
      const ans = big > small ? 0 : big < small ? 1 : 2, R = D / 2, r = d / 2;
      return {
        prompt: `במזנון של המעבדה: פיצה אחת בקוטר ${D} ס"מ, או ${k} פיצות בקוטר ${d} ס"מ (באותו עובי). איפה יש יותר פיצה? 🍕`,
        widget: choice(['בפיצה הגדולה', `ב־${k} הקטנות`, 'אותה כמות בדיוק']), answer: ans, check: v => v === ans, tries: 1,
        hints: ['משווים שטחים, לא קטרים. חשבו רדיוס × רדיוס × 3.14 לכל פיצה.', `אפשר לוותר על ה־3.14 כי הוא משותף: השוו את ${M(`${R} × ${R}`)} ל־${M(`${k} × ${r} × ${r}`)}.`],
        explain: `הגדולה: ${M(`${R} × ${R} × 3.14 = ${nf(A(R))}`)} סמ"ר. ${k} הקטנות: ${M(`${k} × ${r} × ${r} × 3.14 = ${nf(k * A(r))}`)} סמ"ר. ${['בגדולה יש יותר.', 'בקטנות יש יותר.', 'בדיוק אותה כמות!'][ans]}`,
      };
    }
    if (t === 2) {
      const k = rnd(2, 6), what = pick(['הרדיוס', 'הקוטר', 'ההיקף']);
      return one({
        prompt: `מגדילים פי ${k} את ${what} של עיגול. פי כמה גדל השטח שלו?`, answer: k * k, pre: 'פי',
        hints: [`נסו עם עיגול שהרדיוס שלו 1, ואחר כך עם עיגול שהרדיוס שלו ${k}.`, `${what === 'הרדיוס' ? 'הרדיוס' : `אם ${what} גדל פי ${k}, גם הרדיוס`} גדל פי ${k}, והשטח תלוי ברדיוס כפול רדיוס.`],
        explain: `${what === 'הרדיוס' ? '' : `${what} גדל פי ${k}, ולכן גם `}הרדיוס גדל פי ${k}. השטח הוא רדיוס × רדיוס × 3.14, ושני הרדיוסים בו גדלו פי ${k}, ולכן השטח גדל פי ${M(`${k} × ${k} = ${k * k}`)}.`,
      });
    }
    const r = rnd(1, 10), ans = rd(A(r) - 2 * r * r);
    return one({
      prompt: `בתוך עיגול שהרדיוס שלו ${r} ס"מ יש ריבוע, והפינות שלו נוגעות במעגל. מה השטח הצבוע, מחוץ לריבוע? ${PI_P}`,
      visual: fig({ shapes: [{ c: [0, 0], r: 1 }, { pts: [[1, 0], [0, 1], [-1, 0], [0, -1]], cls: 'lgeo-white' }], segs: [{ a: [-1, 0], b: [1, 0], cls: 'lgeo-diag' }, { a: [0, -1], b: [0, 1], cls: 'lgeo-diag' }, { a: [0, 0], b: [1, 0], cls: 'lgeo-rad' }], texts: [{ p: [0.5, 0], t: r, dy: -13 }] }, { W: 140, H: 140, pad: 10 }),
      answer: ans, post: 'סמ"ר', dec: true,
      hints: ['האלכסונים של הריבוע הם קטרים של העיגול. ריבוע הוא גם מעוין, ושטח מעוין = אלכסון × אלכסון ÷ 2.', `האלכסון ${2 * r}: שטח הריבוע ${M(`${2 * r} × ${2 * r} ÷ 2 = ${2 * r * r}`)}. שטח העיגול ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}.`],
      explain: `העיגול ${M(`${r} × ${r} × 3.14 = ${nf(A(r))}`)}. הריבוע (אלכסונים של ${2 * r}) ${M(`${2 * r} × ${2 * r} ÷ 2 = ${2 * r * r}`)}. השטח הצבוע ${M(`${nf(A(r))} − ${2 * r * r} = ${nf(ans)}`)} סמ"ר.`,
    });
  },
};

// =====================================================================
// 6. volume and units
const CONV1 = [
  [x => `${M(nf(x))} ליטר =`, 'מ"ל', [0.5, 1.5, 2, 2.5, 3, 0.25, 0.75, 1.2, 4.5, 0.1], x => x * 1000, x => `ליטר הוא 1000 מ"ל: ${M(`${nf(x)} × 1000 = ${nf(x * 1000)}`)}.`],
  [x => `${M(x)} מ"ל =`, 'ליטר', [500, 1500, 2000, 2500, 250, 750, 3000, 1200, 100, 4500], x => x / 1000, x => `1000 מ"ל הם ליטר: ${M(`${x} ÷ 1000 = ${nf(x / 1000)}`)}.`],
  [x => `${M(nf(x))} ליטר =`, 'סמ"ק', [1, 2, 0.5, 1.5, 3, 0.2, 2.5, 4], x => x * 1000, x => `ליטר הוא 1000 סמ"ק: ${M(`${nf(x)} × 1000 = ${nf(x * 1000)}`)}.`],
  [x => `${M(x)} סמ"ק =`, 'ליטר', [1000, 2000, 500, 3500, 1500, 250, 6000], x => x / 1000, x => `1000 סמ"ק הם ליטר: ${M(`${x} ÷ 1000 = ${nf(x / 1000)}`)}.`],
];
const CONV2 = [
  [x => `${M(nf(x))} מ"ק =`, 'ליטר', [1.2, 2, 0.5, 3.5, 0.25, 1.75, 4], x => x * 1000, x => `מ"ק (קובייה של מטר על מטר על מטר) הוא 1000 ליטר: ${M(`${nf(x)} × 1000 = ${nf(x * 1000)}`)}.`],
  [x => `${M(x)} ליטר =`, 'מ"ק', [3000, 500, 1500, 250, 12000, 800], x => x / 1000, x => `1000 ליטר הם מ"ק אחד: ${M(`${x} ÷ 1000 = ${nf(x / 1000)}`)}.`],
  [x => `${M(x)} סמ"ק =`, 'דמ"ק', [2500, 1000, 4000, 750, 1250, 300], x => x / 1000, x => `דמ"ק הוא קובייה של 10 על 10 על 10 ס"מ, כלומר 1000 סמ"ק: ${M(`${x} ÷ 1000 = ${nf(x / 1000)}`)}.`],
  [x => `${M(nf(x[0]))} ליטר + ${M(x[1])} מ"ל =`, 'מ"ל', [[0.75, 350], [1.2, 800], [2.5, 250], [0.3, 450], [1.05, 950], [3, 125]], x => x[0] * 1000 + x[1], x => `${M(nf(x[0]))} ליטר הם ${nf(x[0] * 1000)} מ"ל: ${M(`${nf(x[0] * 1000)} + ${x[1]} = ${nf(x[0] * 1000 + x[1])}`)}.`],
  [x => `${M(x)} דמ"ק =`, 'מ"ל', [2, 0.5, 3.5, 1.25, 7], x => x * 1000, x => `דמ"ק אחד הוא ליטר, כלומר 1000 מ"ל: ${M(`${nf(x)} × 1000 = ${nf(x * 1000)}`)}.`],
];
function convert(list) {
  const [lhs, unit, xs, f, why] = pick(list), x = pick(xs), ans = rd(f(x));
  return ask({
    prompt: 'המירו את היחידות. השלימו את המספר החסר.', fields: [[lhs(x), ans, unit]], dec: true,
    hints: ['1 ליטר = 1000 מ"ל = 1000 סמ"ק = 1 דמ"ק. ו־1 מ"ק = 1000 ליטר.', why(x)],
    explain: why(x),
  });
}
const boxDims = (lo, hi, ok) => {
  for (;;) {
    const d = [rnd(lo, hi), rnd(lo, hi), rnd(lo, hi)];
    if (ok(d[0] * d[1] * d[2])) return d;
  }
};
const vol = {
  id: 'lgeo-vol', title: 'נפח ויחידות נפח',
  intro: `<p><b>נפח תיבה = אורך × רוחב × גובה</b>. אם המידות בס"מ, הנפח יוצא בסמ"ק (סנטימטר מעוקב): כמה קוביות של ס"מ אחד נכנסות בתיבה.</p>
    <p>יחידות של נוזלים: <b>1 ליטר = 1000 מ"ל = 1000 סמ"ק</b>. קובייה של ${M('10 × 10 × 10')} ס"מ (דמ"ק אחד) מכילה בדיוק ליטר, ומ"ק אחד הוא 1000 ליטר.</p>
    <div class="ex">מכל של ${M('10 × 5 × 4')} ס"מ: ${M('10 × 5 × 4 = 200')} סמ"ק, כלומר 200 מ"ל.</div>
    <p>במבחנת המדידה גוררים את פני המים למעלה ולמטה, או לוחצים על + ועל −.</p>`,
  gen(L) {
    const t = rnd(0, L === 1 ? 2 : 3);
    if (L === 1) {
      if (t === 0) {
        const [a, b, c] = [rnd(2, 12), rnd(2, 12), rnd(2, 12)];
        return one({
          prompt: 'מה הנפח של מכל הניסויים שבציור, בסמ"ק? (המידות בס"מ)', visual: boxFig(a, b, c), answer: a * b * c, post: 'סמ"ק',
          hints: ['נפח = אורך × רוחב × גובה.', `${M(`${a} × ${b} = ${a * b}`)}, ועכשיו כפול ${c}.`],
          explain: `${M(`${a} × ${b} × ${c} = ${a * b * c}`)} סמ"ק.`,
        });
      }
      if (t === 1) {
        const [a, b, c] = boxDims(2, 10, v => v % 10 === 0 && v >= 60 && v <= 500), V = a * b * c;
        return {
          prompt: `ממלאים במים מכל בצורת תיבה של ${M(`${a} × ${b} × ${c}`)} ס"מ, ושופכים את כל המים למבחנת המדידה. גררו את פני המים לגובה הנכון.`,
          visual: boxFig(a, b, c), widget: beaker({ max: 500 }), answer: V, check: v => v === V, wrongMsg: v => `במבחנה עכשיו ${v} מ"ל.`,
          hints: ['נפח המים הוא הנפח של המכל: אורך × רוחב × גובה. כל סמ"ק הוא מ"ל אחד.', M(`${a} × ${b} × ${c}`)],
          explain: `${M(`${a} × ${b} × ${c} = ${V}`)} סמ"ק, כלומר ${V} מ"ל.`,
        };
      }
      return convert(CONV1);
    }
    if (L === 2) {
      if (t === 0) {
        const [a, b] = pick([[50, 20], [40, 25], [30, 20], [50, 30], [60, 25], [40, 30], [20, 25]]), hh = rnd(8, 40), V = rd((a * b * hh) / 1000);
        return one({
          prompt: `לאקווריום של המעבדה יש בסיס מלבני של ${a} על ${b} ס"מ. שופכים לתוכו ${nf(V)} ליטר מים. לאיזה גובה יגיעו המים, בס"מ?`, visual: boxFig(a, b, 45, [a, b, '?']), answer: hh, post: 'ס"מ', dec: true,
          hints: ['המירו את הליטרים לסמ"ק: ליטר אחד הוא 1000 סמ"ק. אחר כך חלקו בשטח הבסיס.', `${nf(V)} ליטר = ${nf(V * 1000)} סמ"ק. שטח הבסיס: ${M(`${a} × ${b} = ${a * b}`)}.`],
          explain: `${nf(V)} ליטר הם ${nf(V * 1000)} סמ"ק, ו־${M(`${nf(V * 1000)} ÷ ${a * b} = ${hh}`)} ס"מ.`,
        });
      }
      if (t === 1) {
        let a, b, k;
        do [a, b, k] = [rnd(10, 30), rnd(10, 25), pick([1, 2, 3, 0.5, 1.5, 2.5])]; while (!Number.isInteger(a * b * k));
        return one({
          prompt: `באקווריום שהבסיס שלו ${a} על ${b} ס"מ מכניסים אבן, ופני המים עולים ב־${nf(k)} ס"מ. מה הנפח של האבן, בסמ"ק?`, answer: a * b * k, post: 'סמ"ק', dec: true,
          hints: ['האבן דוחקת מים בדיוק כמו הנפח שלה. המים "הנוספים" הם תיבה דקה.', `התיבה של המים הנוספים: ${M(`${a} × ${b} × ${nf(k)}`)}.`],
          explain: `${M(`${a} × ${b} × ${nf(k)} = ${a * b * k}`)} סמ"ק.`,
        });
      }
      if (t === 2) {
        const X = 50 * rnd(2, 8), [a, b, c] = boxDims(2, 10, v => v % 10 === 0 && v >= 60 && v + X <= 1000), V = a * b * c;
        return {
          prompt: `במבחנה כבר יש ${X} מ"ל. מוסיפים את כל המים ממכל בצורת תיבה של ${M(`${a} × ${b} × ${c}`)} ס"מ. גררו את פני המים לגובה החדש.`,
          widget: beaker({ max: 1000, start: X }), answer: X + V, check: v => v === X + V, wrongMsg: v => `במבחנה עכשיו ${v} מ"ל.`,
          hints: ['חשבו כמה מ"ל יש במכל (אורך × רוחב × גובה), והוסיפו למה שכבר במבחנה.', `במכל: ${M(`${a} × ${b} × ${c} = ${V}`)} מ"ל.`],
          explain: `במכל ${M(`${a} × ${b} × ${c} = ${V}`)} מ"ל, ובסך הכול ${M(`${X} + ${V} = ${X + V}`)} מ"ל.`,
        };
      }
      return convert(CONV2);
    }
    if (t === 0) {
      let s, a, b, c, fa, fb, fc, naive;
      do {
        s = rnd(2, 5);
        [a, b, c] = [rnd(s, 5 * s), rnd(s, 5 * s), rnd(s, 4 * s)];
        [fa, fb, fc] = [a, b, c].map(x => Math.floor(x / s));
        naive = Math.floor((a * b * c) / s ** 3);
      } while (naive === fa * fb * fc || fa * fb * fc > 150);
      return one({
        prompt: `כמה קוביות שלמות, שאורך הצלע שלהן ${s} ס"מ, אפשר להכניס לקופסה של ${M(`${a} × ${b} × ${c}`)} ס"מ? (אסור לחתוך קוביות)`, visual: boxFig(a, b, c), answer: fa * fb * fc, post: 'קוביות',
        hints: ['זהירות: לא מספיק לחלק נפח בנפח! בדקו כמה קוביות נכנסות לאורך, כמה לרוחב וכמה לגובה.', `לאורך נכנסות ${fa} קוביות שלמות, לרוחב ${fb} ולגובה ${fc}.`],
        explain: `${M(`${fa} × ${fb} × ${fc} = ${fa * fb * fc}`)} קוביות. חלוקת הנפחים הייתה נותנת בערך ${naive}, אבל חלק מהמקום בקופסה נשאר ריק כי קובייה לא נכנסת בו.`,
      });
    }
    if (t === 1) {
      const [a, b, c] = [pick([2, 2.5, 3, 4, 5]), pick([1, 1.2, 1.5, 2]), pick([0.5, 0.8, 1, 1.2])], V = rd(a * b * c);
      return one({
        prompt: `בריכה לניסויים בצורת תיבה: ${M(`${nf(a)} × ${nf(b)} × ${nf(c)}`)} מטרים. כמה ליטרים של מים צריך כדי למלא אותה?`, answer: rd(V * 1000), post: 'ליטר', dec: true,
        hints: ['חשבו את הנפח במ"ק, ואחר כך המירו: מ"ק אחד (קובייה של מטר על מטר על מטר) הוא 1000 ליטר.', `הנפח: ${M(`${nf(a)} × ${nf(b)} × ${nf(c)} = ${nf(V)}`)} מ"ק.`],
        explain: `${M(`${nf(a)} × ${nf(b)} × ${nf(c)} = ${nf(V)}`)} מ"ק, שהם ${M(`${nf(V)} × 1000 = ${nf(V * 1000)}`)} ליטר.`,
      });
    }
    if (t === 2) {
      let a, b, c, R, V;
      do [a, b, c, R] = [pick([20, 30, 40, 50, 60]), pick([20, 25, 30, 40, 50]), pick([20, 30, 40, 50]), pick([2, 4, 5, 6, 8, 10])]; while (!Number.isInteger((V = (a * b * c) / 1000)) || V % R);
      return one({
        prompt: `ברז ממלא ${R} ליטרים בדקה. כמה דקות ייקח לו למלא מכל ריק בצורת תיבה של ${M(`${a} × ${b} × ${c}`)} ס"מ?`, answer: V / R, post: 'דקות',
        hints: ['חשבו את נפח המכל בסמ"ק, והמירו לליטרים (1000 סמ"ק = ליטר).', `הנפח: ${M(`${a} × ${b} × ${c} = ${a * b * c}`)} סמ"ק, שהם ${V} ליטר.`],
        explain: `${a * b * c} סמ"ק הם ${V} ליטר, ו־${M(`${V} ÷ ${R} = ${V / R}`)} דקות.`,
      });
    }
    const k = rnd(2, 4), V = pick([6, 10, 12, 15, 20, 24, 30, 40]), [what, f, why] = pick([['את האורך, את הרוחב ואת הגובה', k ** 3, 'שלוש מידות'], ['רק את האורך ואת הרוחב', k * k, 'שתי מידות'], ['רק את הגובה', k, 'מידה אחת']]);
    return one({
      prompt: `לתיבה יש נפח של ${V} סמ"ק. מגדילים פי ${k} ${what}. מה הנפח החדש, בסמ"ק?`, answer: V * f, post: 'סמ"ק',
      hints: ['נסו על תיבה פשוטה, למשל של 1 על 1 על 1, ובדקו מה קורה.', `כל מידה שגדלה פי ${k} מגדילה את הנפח פי ${k}. כאן גדלו ${why}.`],
      explain: `הנפח גדל פי ${f === k ? k : M(f === k * k ? `${k} × ${k} = ${f}` : `${k} × ${k} × ${k} = ${f}`)}: ${M(`${V} × ${f} = ${V * f}`)} סמ"ק.`,
    });
  },
};

// =====================================================================
// 7. nets and surface area
const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
const net = {
  id: 'lgeo-net', title: 'פריסה ושטח פנים',
  intro: `<p><b>פריסה</b> של תיבה היא כל הפאות שלה, פרושות על הנייר כמו קופסת קרטון שפתחו. לתיבה 6 פאות: שלושה זוגות של פאות זהות. <b>שטח הפנים</b> הוא השטח של כל 6 הפאות יחד.</p>
    <div class="ex"><b>שטח פנים = 2 × (אורך × רוחב + אורך × גובה + רוחב × גובה)</b><br>תיבה של ${M('5 × 3 × 2')}: ${M('2 × (15 + 10 + 6) = 62')}.</div>
    <p>בציור פריסה על המשבצות: לוחצים או גוררים כדי לצבוע ריבועים, ולחיצה נוספת מוחקת.</p>`,
  gen(L) {
    const t = rnd(0, 2), surf = (a, b, c) => 2 * (a * b + a * c + b * c);
    if (L === 1) {
      if (t === 0) {
        const [a, b, c] = [rnd(2, 10), rnd(2, 8), rnd(2, 9)];
        return one({
          prompt: 'מה שטח הפנים של התיבה, בסמ"ר? (המידות בס"מ)', visual: boxFig(a, b, c), answer: surf(a, b, c), post: 'סמ"ר',
          hints: ['לתיבה 3 זוגות של פאות זהות: מלפנים ומאחור, למעלה ולמטה, מימין ומשמאל.', `הפאות: ${M(`${a} × ${b} = ${a * b}`)}, ${M(`${a} × ${c} = ${a * c}`)}, ${M(`${b} × ${c} = ${b * c}`)}. כל אחת פעמיים.`],
          explain: M(`2 × (${a * b} + ${a * c} + ${b * c}) = ${surf(a, b, c)}`) + ' סמ"ר.',
          wrongMsg: ([v]) => (v === a * b + a * c + b * c ? 'ספרתם כל פאה פעם אחת. לכל פאה יש תאומה בצד השני.' : v === a * b * c ? 'זה הנפח, לא שטח הפנים.' : ''),
        });
      }
      if (t === 1) {
        const rows = 5, cols = 6, c = randNet(true, fitsIn(rows - 1, cols));
        let gone, rest;
        do {
          gone = pick(c);
          rest = c.filter(x => x !== gone);
        } while (!connected(rest.map(x => x.join())));
        const R = Math.max(...c.map(x => x[0])) + 1, C = Math.max(...c.map(x => x[1])) + 1, r0 = rnd(0, rows - R), c0 = rnd(0, cols - C);
        const at = ([r, cc]) => `${r + r0},${cc + c0}`, locked = rest.map(at), want = at(gone);
        return {
          prompt: 'חסר ריבוע אחד כדי שהצורה הכתומה תהיה פריסה של קובייה. צבעו אותו.', sig: locked.join(' '),
          widget: gridPaint({ rows, cols, locked }), answer: [want],
          check: v => v.length === 1 && !!fold([...locked, v[0]].map(k => k.split(',').map(Number))),
          wrongMsg: v => (v.length !== 1 ? `צבעתם ${v.length} ריבועים, וצריך בדיוק אחד.` : 'בקיפול, הריבוע הזה נופל על פאה שכבר יש לה ריבוע.'),
          hints: ['דמיינו שאתם מקפלים את הריבועים סביב קובייה. איזו פאה של הקובייה עדיין לא מכוסה?', `אפשר למשל לצבוע את הריבוע בשורה ${+want.split(',')[0] + 1} מלמעלה ובעמודה ${+want.split(',')[1] + 1} משמאל.`],
          explain: 'עכשיו יש 6 ריבועים, וכל אחד מהם נופל בקיפול על פאה אחרת של הקובייה. אם יש עוד מקום שמתאים, גם הוא נכון.',
        };
      }
      const [a, b, c] = [rnd(3, 8), rnd(2, 5), rnd(2, 5)];
      return one({
        prompt: 'זו פריסה של תיבה. מה השטח של כל הפריסה, בסמ"ר? (המידות בס"מ)', visual: boxNetFig(a, b, c), answer: surf(a, b, c), post: 'סמ"ר',
        hints: ['השטח של הפריסה הוא שטח הפנים של התיבה: הסכום של 6 המלבנים. יש שלושה זוגות של מלבנים זהים.', `המלבנים: ${M(`${a} × ${c}`)} פעמיים, ${M(`${a} × ${b}`)} פעמיים, ${M(`${b} × ${c}`)} פעמיים.`],
        explain: M(`2 × (${a * c} + ${a * b} + ${b * c}) = ${surf(a, b, c)}`) + ' סמ"ר.',
      });
    }
    if (L === 2) {
      if (t === 0) {
        const rows = 5, cols = 6, no4 = Math.random() < 0.4, c = randNet(true, x => fitsIn(rows, cols)(x) && (!no4 || !longRun(x)));
        const R = Math.max(...c.map(x => x[0])) + 1, C = Math.max(...c.map(x => x[1])) + 1, r0 = rnd(0, rows - R), c0 = rnd(0, cols - C);
        return {
          prompt: no4 ? 'צבעו פריסה של קובייה: 6 ריבועים מחוברים שאפשר לקפל לקובייה סגורה. הפעם אסור שיהיו 4 ריבועים בשורה אחת.' : 'צבעו פריסה של קובייה: 6 ריבועים מחוברים שאפשר לקפל לקובייה סגורה.',
          widget: gridPaint({ rows, cols }), answer: c.map(([r, cc]) => `${r + r0},${cc + c0}`),
          check: v => v.length === 6 && !!fold(v.map(k => k.split(',').map(Number))) && (!no4 || !longRun(v.map(k => k.split(',').map(Number)))),
          wrongMsg: v => (v.length !== 6 ? `צבעתם ${v.length} ריבועים, וצריך 6.` : !connected(v) ? 'הריבועים צריכים להיות מחוברים בצלעות.' : !fold(v.map(k => k.split(',').map(Number))) ? 'הצורה הזאת לא מתקפלת לקובייה: שני ריבועים נופלים על אותה פאה.' : 'יש לכם 4 ריבועים בשורה אחת.'),
          hints: no4 ? ['נסו מדרגות: שורה של 3 ריבועים, ומתחתיה עוד שורה של 3 שמוזזת הצידה.', 'למשל: 2 ריבועים בשורה העליונה, 3 באמצע (מוזזים בריבוע אחד) ו־1 למטה בקצה.'] : ['שורה של 4 ריבועים מתקפלת מסביב לקובייה. מה חסר עוד?', 'הוסיפו לשורה של 4 ריבוע אחד מעליה וריבוע אחד מתחתיה (למשל בצורת צלב).'],
          explain: 'יש 11 פריסות שונות של קובייה. אחת מהן מסומנת על הלוח.',
        };
      }
      if (t === 1) {
        const [a, b, c] = [rnd(10, 40), rnd(10, 30), rnd(10, 30)], S = a * b + 2 * a * c + 2 * b * c;
        return one({
          prompt: `בונים אקווריום מזכוכית, בלי מכסה: אורך ${a} ס"מ, רוחב ${b} ס"מ וגובה ${c} ס"מ. כמה סמ"ר של זכוכית צריך?`, visual: boxFig(a, b, c), answer: S, post: 'סמ"ר',
          hints: ['אין מכסה, אז יש רק 5 פאות: תחתית אחת ו־4 דפנות.', `תחתית: ${M(`${a} × ${b} = ${a * b}`)}. דפנות: שתיים של ${M(`${a} × ${c}`)} ושתיים של ${M(`${b} × ${c}`)}.`],
          explain: `${M(`${a * b} + 2 × ${a * c} + 2 × ${b * c} = ${S}`)} סמ"ר.`,
          wrongMsg: ([v]) => (v === surf(a, b, c) ? 'זה עם מכסה. לאקווריום אין מכסה.' : ''),
        });
      }
      const s = rnd(2, 12), k = rnd(0, 2);
      return one({
        prompt: k === 0 ? `שטח הפנים של קובייה הוא ${6 * s * s} סמ"ר. מה אורך הצלע שלה?` : k === 1 ? `הנפח של קובייה הוא ${s ** 3} סמ"ק. מה שטח הפנים שלה?` : `צובעים את כל הפאות של קובייה שהצלע שלה ${s} ס"מ. כמה סמ"ר צובעים?`,
        answer: k === 0 ? s : 6 * s * s, post: k === 0 ? 'ס"מ' : 'סמ"ר',
        hints: k === 0 ? ['לקובייה 6 פאות ריבועיות זהות.', `שטח פאה אחת: ${M(`${6 * s * s} ÷ 6 = ${s * s}`)}. איזה מספר כפול עצמו נותן ${s * s}?`] : k === 1 ? ['מצאו קודם את אורך הצלע: איזה מספר כפול עצמו כפול עצמו נותן את הנפח?', `הצלע ${s}, כי ${M(`${s} × ${s} × ${s} = ${s ** 3}`)}. לקובייה 6 פאות.`] : ['לקובייה 6 פאות ריבועיות זהות.', `פאה אחת: ${M(`${s} × ${s} = ${s * s}`)}.`],
        explain: k === 0 ? `פאה אחת: ${M(`${6 * s * s} ÷ 6 = ${s * s}`)} סמ"ר. ${M(`${s} × ${s} = ${s * s}`)}, ולכן הצלע ${s} ס"מ.` : `${k === 1 ? `הצלע ${s} ס"מ. ` : ''}${M(`6 × ${s} × ${s} = ${6 * s * s}`)} סמ"ר.`,
      });
    }
    if (t === 0) {
      const good = randNet(true), bad = [];
      while (bad.length < 3) {
        const c = randNet(false), key = c.join(' ');
        if (!bad.some(b => b.join(' ') === key)) bad.push(c);
      }
      const opts = shuffle([good, ...bad]), ans = opts.indexOf(good);
      return {
        prompt: 'רק אחת מהצורות האלה היא פריסה של קובייה. איזו?', widget: choice(opts.map(c => netSVG(c)), { cols: 2, cls: 'lgeo-nets' }), answer: ans, check: v => v === ans, tries: 1, sig: opts.map(c => c.join(' ')).join('|'),
        hints: ['בחרו ריבוע אחד כבסיס וקפלו בדמיון את השאר סביבו. אם שני ריבועים נופלים על אותה פאה, זו לא פריסה.', 'שימו לב: אסור שיהיו 5 ריבועים בשורה, וגם ריבוע של 2 על 2 לא יכול להופיע בפריסה של קובייה.'],
        explain: 'בצורה הנכונה כל אחד מ־6 הריבועים נופל בקיפול על פאה אחרת. בכל אחת מהאחרות שני ריבועים נופלים על אותה פאה, ופאה אחרת נשארת פתוחה.',
      };
    }
    if (t === 1) {
      const c = randNet(true), letters = shuffle(LETTERS), dirs = fold(c), X = rnd(0, 5), nx = dirs.get(c[X].join()).split(',').map(Number);
      const opp = c.findIndex(x => dirs.get(x.join()) === neg(nx).join()), options = LETTERS.filter(l => l !== letters[X]), ans = options.indexOf(letters[opp]);
      return {
        prompt: `מקפלים את הפריסה לקובייה. איזו אות תהיה בפאה שמול האות ${letters[X]}?`, visual: netSVG(c, letters, 40),
        widget: choice(options, { cols: 5, cls: 'lgeo-letters' }), answer: ans, check: v => v === ans, tries: 1,
        hints: ['בשורה של שלושה ריבועים, הראשון והשלישי תמיד נגדיים: ביניהם יש פאה אחת שמתקפלת.', `קפלו בדמיון סביב הריבוע של ${letters[X]}. הפאה שמולו לא נוגעת בו בשום צלע אחרי הקיפול.`],
        explain: `אחרי הקיפול, ${letters[opp]} נמצאת מול ${letters[X]}. הפאה הנגדית אף פעם לא צמודה בצלע בפריסה.`,
      };
    }
    if (Math.random() < 0.5) {
      const k = rnd(2, 6), s = rnd(1, 5);
      return one({
        prompt: `מדביקים ${k} קוביות זהות, שאורך הצלע של כל אחת ${s} ס"מ, בשורה אחת: פאה לפאה. מה שטח הפנים של הגוף שנוצר?`, visual: cuboid(k, 1, 1), answer: (4 * k + 2) * s * s, post: 'סמ"ר',
        hints: ['כל הדבקה מסתירה 2 פאות: אחת מכל קובייה.', `${k} קוביות נפרדות: ${M(`${k} × 6 = ${6 * k}`)} פאות. יש ${k - 1} הדבקות, והן מסתירות ${M(`2 × ${k - 1} = ${2 * (k - 1)}`)} פאות.`],
        explain: `נשארות ${M(`${6 * k} − ${2 * (k - 1)} = ${4 * k + 2}`)} פאות, כל אחת ${M(`${s} × ${s} = ${s * s}`)} סמ"ר: ${M(`${4 * k + 2} × ${s * s} = ${(4 * k + 2) * s * s}`)} סמ"ר.`,
      });
    }
    const [a, b, c] = [rnd(6, 15), rnd(3, 9), rnd(3, 9)];
    return one({
      prompt: `חותכים תיבה של ${M(`${a} × ${b} × ${c}`)} ס"מ לשתי תיבות, בחיתוך שמקביל לפאה של ${b} על ${c}. בכמה סמ"ר גדל שטח הפנים של שתי התיבות יחד, לעומת התיבה המקורית?`, visual: boxFig(a, b, c), answer: 2 * b * c, post: 'סמ"ר',
      hints: ['כל הפאות הישנות נשארות. מה נוסף בחיתוך?', `החיתוך יוצר שתי פאות חדשות, אחת בכל תיבה. כל אחת היא ${b} על ${c}.`],
      explain: `נוספו שתי פאות של ${M(`${b} × ${c} = ${b * c}`)}: ${M(`2 × ${b * c} = ${2 * b * c}`)} סמ"ר. המידה ${a} בכלל לא משנה.`,
    });
  },
};

// =====================================================================
// 8. coordinates
const same = (p, q) => !!p && p[0] === q[0] && p[1] === q[1];
const coordHint = ([x, y]) => `התחילו בראשית הצירים ${pt(0, 0)}. ${x ? `לכו ${Math.abs(x)} ${x > 0 ? 'ימינה' : 'שמאלה'}` : 'אל תזוזו ימינה או שמאלה'}, ו${y ? `אחר כך ${Math.abs(y)} ${y > 0 ? 'למעלה' : 'למטה'}` : 'אל תעלו בכלל'}.`;
const coord = {
  id: 'lgeo-coord', title: 'מערכת צירים',
  intro: `<p>כל נקודה במערכת צירים מתוארת בשני מספרים ${M('(x, y)')}: הראשון אומר כמה ללכת ימינה, לאורך ציר ה־${M('x')}, והשני כמה לעלות, לאורך ציר ה־${M('y')}.</p>
    <div class="ex">הנקודה ${M('A(3, 5)')}: מראשית הצירים ${M('(0, 0)')} הולכים 3 ימינה, ואז 5 למעלה.</div>
    <p>כדי לסמן נקודה לוחצים על המפגש של קווי הרשת. ברמה 3 יש גם מספרים שליליים: שמאלה מהראשית או מתחת לה.</p>`,
  gen(L) {
    const t = rnd(0, L === 1 ? 2 : L === 2 ? 3 : 4);
    if (L === 1) {
      if (t === 0) {
        let x, y;
        do [x, y] = [rnd(0, 8), rnd(0, 8)]; while (x + y === 0);
        return {
          prompt: `החיישן החדש של המעבדה צריך לעמוד בנקודה ${named('A', [x, y])}. סמנו אותה.`,
          widget: plane({}), answer: { A: [x, y] }, check: v => same(v.A, [x, y]),
          wrongMsg: v => `סימנתם את ${pt(...v.A)}. ${v.A[0] === y && v.A[1] === x ? `הפכתם בין ${M('x')} ל־${M('y')}: קודם הולכים ימינה, ואחר כך למעלה.` : ''}`,
          hints: [`המספר הראשון אומר כמה ימינה (ציר ה־${M('x')}), והשני כמה למעלה (ציר ה־${M('y')}).`, coordHint([x, y])],
          explain: `מהראשית הולכים ${x} ימינה ו־${y} למעלה. הנקודה מסומנת על הלוח.`,
        };
      }
      if (t === 1) {
        let x, y;
        do [x, y] = [rnd(0, 8), rnd(0, 8)]; while (x + y === 0);
        return ask({
          prompt: `מה השיעורים של הנקודה ${M('A')}?`, visual: planeSVG({ min: 0, max: 8, pts: [{ n: 'A', p: [x, y] }] }),
          fields: [['<span dir="ltr">x =</span>', x], ['<span dir="ltr">y =</span>', y]],
          hints: [`השיעור ${M('x')} הוא כמה הנקודה רחוקה ימינה מציר ה־${M('y')}. השיעור ${M('y')} הוא כמה היא גבוהה מעל ציר ה־${M('x')}.`, `רדו מהנקודה ישר למטה אל ציר ה־${M('x')}, וקראו את המספר.`],
          explain: `${named('A', [x, y])}: ${x} ימינה ו־${y} למעלה.`,
          wrongMsg: ([a, b]) => (a === y && b === x ? `הפכתם בין ${M('x')} ל־${M('y')}.` : ''),
        });
      }
      let x1, x2, y1, y2;
      do [x1, x2, y1, y2] = [rnd(0, 7), rnd(1, 8), rnd(0, 7), rnd(1, 8)]; while (x2 - x1 < 2 || y2 - y1 < 2);
      const C4 = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], s = rnd(0, 3), P = range(4, i => C4[(s + i) % 4]), N = ['A', 'B', 'C', 'D'];
      return {
        prompt: `${M('A')}, ${M('B')} ו־${M('C')} הם שלושה קודקודים של המלבן ${M('ABCD')}. סמנו את הקודקוד ${M('D')}.`,
        widget: plane({ fixed: range(3, i => ({ n: N[i], p: P[i] })), names: ['D'], poly: N }), answer: { D: P[3] }, check: v => same(v.D, P[3]),
        wrongMsg: v => `סימנתם את ${pt(...v.D)}.`,
        hints: [`במלבן הצלעות כאן אופקיות ואנכיות. ל־${M('D')} יש אותו ${M('x')} כמו לאחד מהשכנים שלו, ואותו ${M('y')} כמו לשני.`, `${M('D')} שכן של ${M('A')} ושל ${M('C')}: ${M(`x = ${P[3][0]}`)}.`],
        explain: `${named('D', P[3])}: אותו ${M('x')} כמו ${M(P[3][0] === P[0][0] ? 'A' : 'C')} ואותו ${M('y')} כמו ${M(P[3][1] === P[0][1] ? 'A' : 'C')}.`,
      };
    }
    if (L === 2) {
      if (t === 0) {
        let A, B, C, D;
        do {
          [A, B, C] = range(3, () => [rnd(0, 8), rnd(0, 8)]);
          D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
        } while (D.some(v => v < 0 || v > 8) || cross(sub(B, A), sub(C, B)) === 0 || dot(sub(B, A), sub(C, B)) === 0 || Math.abs(cross(sub(B, A), sub(C, B))) < 8 || Math.hypot(...sub(C, B)) < 2 || Math.hypot(...sub(B, A)) < 2);
        return {
          prompt: `${M('ABCD')} היא מקבילית, והקודקודים שלה מסודרים לפי הסדר. סמנו את הקודקוד ${M('D')}.`,
          widget: plane({ fixed: [{ n: 'A', p: A }, { n: 'B', p: B }, { n: 'C', p: C }], names: ['D'], poly: ['A', 'B', 'C', 'D'] }), answer: { D }, check: v => same(v.D, D),
          wrongMsg: v => `סימנתם את ${pt(...v.D)}.`,
          hints: [`במקבילית הצלעות הנגדיות מקבילות ושוות. הצעד מ־${M('A')} ל־${M('D')} שווה לצעד מ־${M('B')} ל־${M('C')}.`, `מ־${M('B')} ל־${M('C')} הולכים ${step(C[0] - B[0], C[1] - B[1])}. עשו אותו צעד מ־${M('A')}.`],
          explain: `מ־${M('B')} ל־${M('C')}: ${step(C[0] - B[0], C[1] - B[1])}. אותו צעד מ־${named('A', A)} מגיע ל־${named('D', D)}.`,
        };
      }
      if (t === 1) {
        let A, d, B;
        do {
          A = [rnd(0, 8), rnd(0, 8)];
          d = [rnd(-5, 5), rnd(-5, 5)];
          B = [A[0] + d[0], A[1] + d[1]];
        } while (!d[0] || !d[1] || B.some(v => v < 0 || v > 8));
        return {
          prompt: `מזיזים את הנקודה ${named('A', A)}: ${step(...d)}. סמנו את המקום החדש שלה, ${M('B')}.`,
          widget: plane({ fixed: [{ n: 'A', p: A }], names: ['B'] }), answer: { B }, check: v => same(v.B, B),
          wrongMsg: v => `סימנתם את ${pt(...v.B)}.`,
          hints: [`ימינה ושמאלה משנים רק את ה־${M('x')}. למעלה ולמטה משנים רק את ה־${M('y')}.`, `${M(`x = ${A[0]} ${d[0] > 0 ? '+' : '−'} ${Math.abs(d[0])} = ${B[0]}`)}`],
          explain: `${M(`${A[0]} ${d[0] > 0 ? '+' : '−'} ${Math.abs(d[0])} = ${B[0]}`)} ו־${M(`${A[1]} ${d[1] > 0 ? '+' : '−'} ${Math.abs(d[1])} = ${B[1]}`)}, לכן ${named('B', B)}.`,
        };
      }
      if (t === 2) {
        if (Math.random() < 0.5) {
          let x1, x2, y1, y3, x3;
          do [x1, x2, y1, y3, x3] = [rnd(0, 4), rnd(3, 9), rnd(0, 4), rnd(3, 9), rnd(0, 9)]; while (x2 - x1 < 3 || y3 - y1 < 2 || ((x2 - x1) * (y3 - y1)) % 2);
          const b = x2 - x1, hh = y3 - y1;
          return one({
            prompt: `מה השטח של המשולש שהקודקודים שלו ${named('A', [x1, y1])}, ${named('B', [x2, y1])} ו־${named('C', [x3, y3])}? כל משבצת היא יחידת שטח אחת.`, answer: (b * hh) / 2,
            hints: [`לנקודות ${M('A')} ו־${M('B')} יש אותו ${M('y')}, אז הצלע ${M('AB')} אופקית. היא הבסיס.`, `הבסיס: ${M(`${x2} − ${x1} = ${b}`)}. הגובה הוא כמה ${M('C')} גבוהה מהבסיס: ${M(`${y3} − ${y1} = ${hh}`)}.`],
            explain: `בסיס ${b}, גובה ${hh}: ${M(`${b} × ${hh} ÷ 2 = ${(b * hh) / 2}`)}.`,
          });
        }
        let x1, x2, y1, y2;
        do [x1, x2, y1, y2] = [rnd(0, 5), rnd(2, 9), rnd(0, 5), rnd(2, 9)]; while (x2 - x1 < 2 || y2 - y1 < 2);
        const w = x2 - x1, hh = y2 - y1;
        return ask({
          prompt: `הקודקודים של מלבן הם ${named('A', [x1, y1])}, ${named('B', [x2, y1])}, ${named('C', [x2, y2])} ו־${named('D', [x1, y2])}. מה השטח ומה ההיקף שלו?`,
          fields: [['שטח:', w * hh], ['היקף:', 2 * (w + hh)]],
          hints: [`האורך הוא ההפרש בין ערכי ה־${M('x')}, והרוחב הוא ההפרש בין ערכי ה־${M('y')}.`, `האורך ${M(`${x2} − ${x1} = ${w}`)}, והרוחב ${M(`${y2} − ${y1} = ${hh}`)}.`],
          explain: `מלבן של ${w} על ${hh}: שטח ${M(`${w} × ${hh} = ${w * hh}`)}, היקף ${M(`2 × (${w} + ${hh}) = ${2 * (w + hh)}`)}.`,
        });
      }
      let A, B;
      do [A, B] = [[rnd(0, 8), rnd(0, 8)], [rnd(0, 8), rnd(0, 8)]]; while ((A[0] - B[0]) % 2 || (A[1] - B[1]) % 2 || Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) < 4);
      const Mp = mid(A, B);
      return {
        prompt: `סמנו את הנקודה שנמצאת בדיוק באמצע הקטע ${M('AB')}. קראו לה ${M('M')}.`,
        widget: plane({ fixed: [{ n: 'A', p: A }, { n: 'B', p: B }], names: ['M'], poly: ['A', 'B'] }), answer: { M: Mp }, check: v => same(v.M, Mp),
        wrongMsg: v => `סימנתם את ${pt(...v.M)}.`,
        hints: [`האמצע נמצא בחצי הדרך גם בכיוון ${M('x')} וגם בכיוון ${M('y')}.`, `ה־${M('x')} של האמצע: ${M(`(${A[0]} + ${B[0]}) ÷ 2 = ${Mp[0]}`)}.`],
        explain: `${M(`(${A[0]} + ${B[0]}) ÷ 2 = ${Mp[0]}`)} ו־${M(`(${A[1]} + ${B[1]}) ÷ 2 = ${Mp[1]}`)}, לכן ${named('M', Mp)}.`,
      };
    }
    const Q = { min: -6, max: 6 }, rp = () => [rnd(-6, 6), rnd(-6, 6)];
    if (t === 0) {
      let P;
      do P = rp(); while (P[0] >= 0 && P[1] >= 0);
      return {
        prompt: `סמנו את הנקודה ${named('A', P)}.`, widget: plane({ ...Q }), answer: { A: P }, check: v => same(v.A, P),
        wrongMsg: v => `סימנתם את ${pt(...v.A)}.`,
        hints: [`${M('x')} שלילי: הולכים שמאלה מהראשית. ${M('y')} שלילי: יורדים למטה.`, coordHint(P)],
        explain: `מהראשית: ${step(P[0], P[1])}. הנקודה מסומנת על הלוח.`,
      };
    }
    if (t === 1) {
      let P;
      do P = rp(); while (!P[0] || !P[1]);
      const k = rnd(0, 2), B = k === 0 ? [P[0], -P[1]] : k === 1 ? [-P[0], P[1]] : [-P[0], -P[1]];
      return {
        prompt: k === 2 ? `מסובבים את הנקודה ${M('A')} חצי סיבוב (${deg(180)}) סביב ראשית הצירים. סמנו את המקום החדש שלה, ${M('B')}.` : `שקפו את הנקודה ${M('A')} בציר ה־${M(k === 0 ? 'x' : 'y')}, כאילו הוא מראה. סמנו את ההשתקפות, ${M('B')}.`,
        widget: plane({ ...Q, fixed: [{ n: 'A', p: P }], names: ['B'] }), answer: { B }, check: v => same(v.B, B),
        wrongMsg: v => `סימנתם את ${pt(...v.B)}.`,
        hints: [k === 2 ? 'בחצי סיבוב סביב הראשית, הנקודה עוברת לצד השני גם שמאלה־ימינה וגם למעלה־למטה.' : `בשיקוף בציר ה־${M(k === 0 ? 'x' : 'y')}, הנקודה נשארת באותו מרחק מהציר, אבל בצד השני שלו.`, k === 0 ? `ה־${M('x')} לא משתנה, וה־${M('y')} מחליף סימן.` : k === 1 ? `ה־${M('y')} לא משתנה, וה־${M('x')} מחליף סימן.` : 'שני המספרים מחליפים סימן.'],
        explain: `${named('A', P)} עוברת ל־${named('B', B)}.`,
      };
    }
    if (t === 2) {
      let P;
      do P = rp(); while (P[0] >= 0 && P[1] >= 0);
      return ask({
        prompt: `מה השיעורים של הנקודה ${M('A')}?`, visual: planeSVG({ ...Q, pts: [{ n: 'A', p: P }] }),
        fields: [['<span dir="ltr">x =</span>', P[0]], ['<span dir="ltr">y =</span>', P[1]]],
        hints: [`נקודה משמאל לציר ה־${M('y')} מקבלת ${M('x')} שלילי. נקודה מתחת לציר ה־${M('x')} מקבלת ${M('y')} שלילי. את סימן המינוס כותבים בכפתור −.`, `ה־${M('x')} של ${M('A')} הוא ${M(nf(P[0]))}.`],
        explain: `${named('A', P)}: ${step(P[0], P[1])} מהראשית.`,
      });
    }
    if (t === 3) {
      let A, v, w1, w2, C1, D1, C2, D2, inn;
      do {
        A = rp();
        v = [rnd(-3, 3), rnd(-3, 3)];
        w1 = [-v[1], v[0]];
        w2 = [v[1], -v[0]];
        const B = [A[0] + v[0], A[1] + v[1]];
        [C1, D1, C2, D2] = [[B[0] + w1[0], B[1] + w1[1]], [A[0] + w1[0], A[1] + w1[1]], [B[0] + w2[0], B[1] + w2[1]], [A[0] + w2[0], A[1] + w2[1]]];
        inn = p => p.every(c => c >= -6 && c <= 6);
      } while (!v[0] || !v[1] || Math.abs(v[0]) + Math.abs(v[1]) < 3 || A.includes(0) || [A[0] + v[0], A[1] + v[1]].includes(0) || ![A[0] + v[0], A[1] + v[1]].every(c => c >= -6 && c <= 6) || !((inn(C1) && inn(D1)) || (inn(C2) && inn(D2))));
      const B = [A[0] + v[0], A[1] + v[1]], [C, D] = inn(C1) && inn(D1) ? [C1, D1] : [C2, D2];
      return {
        prompt: `${M('A')} ו־${M('B')} הם שני קודקודים שכנים של הריבוע ${M('ABCD')}. סמנו את ${M('C')} ואת ${M('D')}.`,
        widget: plane({ ...Q, fixed: [{ n: 'A', p: A }, { n: 'B', p: B }], names: ['C', 'D'], poly: ['A', 'B', 'C', 'D'] }), answer: { C, D },
        check: x => (same(x.C, C1) && same(x.D, D1)) || (same(x.C, C2) && same(x.D, D2)),
        wrongMsg: x => (same(x.C, x.D) ? 'שתי הנקודות באותו מקום.' : 'זה עוד לא ריבוע: כל הצלעות צריכות להיות שוות, וכל הזוויות ישרות.'),
        hints: [`מ־${M('A')} ל־${M('B')} הולכים ${step(...v)}. בצלע הבאה מסתובבים ברבע סיבוב: מה שהיה ימינה הופך ללמעלה, ומה שהיה למעלה הופך לשמאלה.`, `מ־${M('B')} ל־${M('C')} הולכים ${step(C[0] - B[0], C[1] - B[1])}, ואותו צעד מ־${M('A')} ל־${M('D')}.`],
        explain: `למשל ${named('C', C)} ו־${named('D', D)}. יש עוד ריבוע אחד אפשרי, בצד השני של ${M('AB')}, וגם הוא נכון.`,
      };
    }
    let x1, x2, y1, x3, y3;
    do [x1, x2, y1, x3, y3] = [rnd(-6, 0), rnd(0, 6), rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)]; while (x2 - x1 < 3 || Math.abs(y3 - y1) < 2 || ((x2 - x1) * Math.abs(y3 - y1)) % 2 || (y1 >= 0 && y3 >= 0));
    const b = x2 - x1, hh = Math.abs(y3 - y1);
    return one({
      prompt: `מה השטח של המשולש שהקודקודים שלו ${named('A', [x1, y1])}, ${named('B', [x2, y1])} ו־${named('C', [x3, y3])}? כל משבצת היא יחידת שטח אחת.`, answer: (b * hh) / 2,
      hints: [`לנקודות ${M('A')} ו־${M('B')} יש אותו ${M('y')}, אז הצלע ${M('AB')} אופקית. אורך: המרחק בין ערכי ה־${M('x')}, גם כשהם משני צדי האפס.`, `הבסיס: ${M(`${nf(x2)} − (${nf(x1)}) = ${b}`)}. הגובה: המרחק בין ${M(`y = ${nf(y1)}`)} ל־${M(`y = ${nf(y3)}`)}, כלומר ${hh}.`],
      explain: `בסיס ${b}, גובה ${hh}: ${M(`${b} × ${hh} ÷ 2 = ${(b * hh) / 2}`)}.`,
    });
  },
};

// =====================================================================
// 9. boss
const boss = {
  id: 'lgeo-boss', title: 'בוס: החשבונאית פאי',
  intro: `<p>החשבונאית פאי טוענת ש־π שווה בדיוק 3, ובגלל זה כל מכשירי המדידה במעבדה מראים שטויות. הוכיחו לה שאתם יודעים למדוד באמת: שטחים, זוויות, מעגלים ונפחים, לפעמים כולם באותה שאלה.</p>
    <div class="ex">חלון בצורת מלבן של 4 על 2 מ', ומעליו חצי עיגול שהקוטר שלו 4 מ': ${M('4 × 2 + 2 × 2 × 3.14 ÷ 2 = 14.28')} מ"ר.</div>
    <p>זכרו: גם כאן ${PI_NOTE}.</p>`,
  gen(L) {
    const t = rnd(0, 4);
    if (L === 1) {
      if (t === 0) {
        const r = rnd(2, 10);
        return ask({
          prompt: `החשבונאית פאי חישבה עם ${M('π = 3')}. תקנו אותה: מה ההיקף ומה השטח של עיגול שהרדיוס שלו ${r} ס"מ? ${PI_P}`,
          visual: circleFig({ show: 'r', label: r }), fields: [['היקף:', pi(2 * r), 'ס"מ'], ['שטח:', pi(r * r), 'סמ"ר']], dec: true,
          hints: ['היקף = קוטר × 3.14. שטח = רדיוס × רדיוס × 3.14.', `הקוטר ${2 * r}. ${M(`${2 * r} × 3.14`)} ו־${M(`${r} × ${r} × 3.14`)}.`],
          explain: `היקף ${M(`${2 * r} × 3.14 = ${nf(pi(2 * r))}`)} ס"מ. שטח ${M(`${r} × ${r} × 3.14 = ${nf(pi(r * r))}`)} סמ"ר.`,
        });
      }
      if (t === 1) {
        let b, hh, w;
        do [b, hh, w] = [rnd(4, 12), rnd(3, 10), rnd(3, 12)]; while ((b * hh) % w || w === b || w === hh);
        return one({
          prompt: `למקבילית שהבסיס שלה ${b} ס"מ והגובה שלה ${hh} ס"מ יש אותו שטח כמו למלבן שהרוחב שלו ${w} ס"מ. מה האורך של המלבן?`, answer: (b * hh) / w, post: 'ס"מ',
          hints: ['חשבו קודם את שטח המקבילית: בסיס × גובה.', `השטח ${M(`${b} × ${hh} = ${b * hh}`)}. עכשיו ${M(`${w} × ? = ${b * hh}`)}.`],
          explain: `שטח ${b * hh} סמ"ר, ואורך המלבן ${M(`${b * hh} ÷ ${w} = ${(b * hh) / w}`)} ס"מ.`,
        });
      }
      if (t === 2) {
        const [a, b, c] = [pick([10, 20, 30, 40, 50]), pick([10, 20, 25, 30]), pick([10, 20, 40])], V = rd((a * b * c) / 1000);
        return one({
          prompt: `כמה ליטרים נכנסים במכל בצורת תיבה של ${M(`${a} × ${b} × ${c}`)} ס"מ?`, visual: boxFig(a, b, c), answer: V, post: 'ליטר', dec: true,
          hints: ['חשבו את הנפח בסמ"ק. ליטר הוא 1000 סמ"ק.', `${M(`${a} × ${b} × ${c} = ${a * b * c}`)} סמ"ק.`],
          explain: `${M(`${a} × ${b} × ${c} = ${a * b * c}`)} סמ"ק, ו־${M(`${a * b * c} ÷ 1000 = ${nf(V)}`)} ליטר.`,
        });
      }
      if (t === 3) {
        const n = pick([5, 6, 8, 9, 10, 12]), S = (n - 2) * 180;
        return ask({
          prompt: `החשבונאית פאי טוענת שבכל ${regName(n)} סכום הזוויות הוא ${deg(360)}. מה הסכום באמת, וכמה מעלות יש בכל זווית?`,
          fields: [['סכום הזוויות:', S, '°'], ['כל זווית:', S / n, '°']],
          hints: ['סכום הזוויות = (מספר הצלעות − 2) × 180°.', `הסכום ${M(`(${n} − 2) × 180 = ${S}`)}, ויש ${n} זוויות שוות.`],
          explain: `${M(`(${n} − 2) × 180 = ${S}`)}, וכל זווית ${M(`${S} ÷ ${n} = ${S / n}`)}.`,
        });
      }
      let x1, y1, x2, y2;
      do [x1, y1, x2, y2] = [rnd(0, 4), rnd(0, 4), rnd(3, 9), rnd(3, 9)]; while (x2 - x1 < 2 || y2 - y1 < 2);
      return one({
        prompt: `${named('A', [x1, y1])} ו־${named('C', [x2, y2])} הם שני קודקודים נגדיים של מלבן, שהצלעות שלו מקבילות לצירים. מה השטח של המלבן?`, answer: (x2 - x1) * (y2 - y1),
        visual: planeSVG({ min: 0, max: 9, pts: [{ n: 'A', p: [x1, y1] }, { n: 'C', p: [x2, y2] }], poly: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]] }),
        hints: [`האורך הוא ההפרש בין ערכי ה־${M('x')}, והרוחב הוא ההפרש בין ערכי ה־${M('y')}.`, `${M(`${x2} − ${x1} = ${x2 - x1}`)} ו־${M(`${y2} − ${y1} = ${y2 - y1}`)}.`],
        explain: `מלבן של ${x2 - x1} על ${y2 - y1}: ${M(`${x2 - x1} × ${y2 - y1} = ${(x2 - x1) * (y2 - y1)}`)}.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const w = pick([2, 4, 6]), hh = rnd(1, 4) + (w > 2 ? rnd(0, 2) : 0), r = w / 2, semi = rd(1.57 * r * r), ans = rd(w * hh + semi);
        return one({
          prompt: `חלון המעבדה בנוי ממלבן של ${w} על ${hh} מטרים, ומעליו חצי עיגול שהקוטר שלו ${w} מטרים. מה השטח של כל החלון, במ"ר? ${PI_P}`,
          visual: fig({ shapes: [{ pts: [[0, 0], [w, 0], ...arcPts([w / 2, hh], w / 2, 0, 180)] }], segs: [{ a: [0, hh], b: [w, hh] }], texts: [{ p: [w / 2, 0], t: w, dy: 16 }, { p: [0, hh / 2], t: hh, dx: -13 }] }, { W: 150, H: 160 }),
          answer: ans, post: 'מ"ר', dec: true,
          hints: ['חשבו בנפרד את המלבן ואת חצי העיגול. הרדיוס של חצי העיגול הוא חצי מהקוטר.', `מלבן: ${M(`${w} × ${hh} = ${w * hh}`)}. חצי עיגול: ${M(`${r} × ${r} × 3.14 ÷ 2 = ${nf(semi)}`)}.`],
          explain: `מלבן: ${M(`${w} × ${hh} = ${w * hh}`)}. חצי עיגול ברדיוס ${r}: ${M(`${r} × ${r} × 3.14 ÷ 2 = ${nf(semi)}`)}. יחד: ${M(`${w * hh} + ${nf(semi)} = ${nf(ans)}`)} מ"ר.`,
        });
      }
      if (t === 1) {
        let a, b, x;
        do [a, b, x] = [rnd(10, 30), rnd(10, 30), rnd(1, 4)]; while (a - 2 * x < 3 || b - 2 * x < 3);
        const V = (a - 2 * x) * (b - 2 * x) * x;
        return one({
          prompt: `מדף קרטון של ${a} על ${b} ס"מ חותכים בכל פינה ריבוע שהצלע שלו ${x} ס"מ, ומקפלים את השוליים למעלה. מתקבלת קופסה בלי מכסה. מה הנפח שלה?`,
          visual: sheetFig(a, b, x), answer: V, post: 'סמ"ק',
          hints: ['הגובה של הקופסה הוא הצלע של הריבוע שנחתך. מכל צלע של הדף נחתכו שני ריבועים.', `הבסיס: ${M(`${a} − ${2 * x} = ${a - 2 * x}`)} על ${M(`${b} − ${2 * x} = ${b - 2 * x}`)}, והגובה ${x}.`],
          explain: `${M(`${a - 2 * x} × ${b - 2 * x} × ${x} = ${V}`)} סמ"ק.`,
        });
      }
      if (t === 2) {
        let a, b, hh, p;
        do [a, b, hh, p] = [rnd(6, 16), rnd(2, 12), rnd(2, 10), rnd(3, 12)]; while (b > a - 2 || ((a + b) * hh) % 2 || (((a + b) * hh) / 2) % p);
        const A = ((a + b) * hh) / 2;
        return one({
          prompt: `לטרפז יש בסיסים של ${a} ס"מ ו־${b} ס"מ וגובה ${hh} ס"מ. למקבילית שהבסיס שלה ${p} ס"מ יש אותו שטח. מה הגובה של המקבילית?`, answer: A / p, post: 'ס"מ',
          hints: ['חשבו קודם את שטח הטרפז.', `שטח הטרפז ${M(`(${a} + ${b}) × ${hh} ÷ 2 = ${A}`)}. עכשיו ${M(`${p} × ? = ${A}`)}.`],
          explain: `שטח ${A} סמ"ר, וגובה המקבילית ${M(`${A} ÷ ${p} = ${A / p}`)} ס"מ.`,
        });
      }
      if (t === 3) {
        const n = pick([5, 6, 8, 9, 10, 12, 15, 18, 20]), e = 360 / n, S = (n - 2) * 180;
        return one({
          prompt: `הזווית החיצונית של מצולע משוכלל היא ${deg(e)}. מה סכום הזוויות הפנימיות שלו?`, answer: S, post: '°',
          hints: ['כל הזוויות החיצוניות של מצולע יחד הן 360°. כמה צלעות יש לו?', `${M(`360 ÷ ${e} = ${n}`)} צלעות.`],
          explain: `${n} צלעות, וסכום הזוויות ${M(`(${n} − 2) × 180 = ${S}`)} מעלות.`,
        });
      }
      let x1, x2, y;
      do [x1, x2, y] = [rnd(0, 5), rnd(2, 12), rnd(0, 8)]; while (x2 - x1 < 4);
      const d = x2 - x1;
      return one({
        prompt: `הנקודות ${named('A', [x1, y])} ו־${named('B', [x2, y])} הן שני הקצוות של קוטר של מעגל. מה ההיקף של המעגל? ${PI_P}`, answer: pi(d), post: 'יחידות', dec: true,
        hints: [`הקוטר הוא המרחק בין ${M('A')} ל־${M('B')}. הן באותו גובה, אז מספיק להחסיר את ערכי ה־${M('x')}.`, `הקוטר ${M(`${x2} − ${x1} = ${d}`)}.`],
        explain: `קוטר ${d}, והיקף ${M(`${d} × 3.14 = ${nf(pi(d))}`)}.`,
      });
    }
    if (t === 0) {
      const r = rnd(1, 15), ans = rd(0.28 * r), P = regPts(6).map(([x, y]) => [x * Math.cos(rad(30)) - y * Math.sin(rad(30)), x * Math.sin(rad(30)) + y * Math.cos(rad(30))]);
      return one({
        prompt: `משושה משוכלל חסום במעגל שהרדיוס שלו ${r} ס"מ: כל הקודקודים שלו על המעגל, וכל צלע שלו שווה לרדיוס. בכמה ס"מ היקף המעגל ארוך מהיקף המשושה? ${PI_P}`,
        visual: fig({ shapes: [{ c: [0, 0], r: 1, cls: 'lgeo-pale' }, { pts: P }, { c: [0, 0], r: 0.035, cls: 'lgeo-dot' }], segs: [{ a: [0, 0], b: P[0], cls: 'lgeo-rad' }], texts: [{ p: mid([0, 0], P[0]), t: r, dy: -13 }] }, { W: 140, H: 140, pad: 10 }),
        answer: ans, post: 'ס"מ', dec: true,
        hints: ['היקף המשושה: 6 צלעות, כל אחת באורך הרדיוס.', `המעגל: ${M(`2 × ${r} × 3.14 = ${nf(pi(2 * r))}`)}. המשושה: ${M(`6 × ${r} = ${6 * r}`)}.`],
        explain: `${M(`${nf(pi(2 * r))} − ${6 * r} = ${nf(ans)}`)} ס"מ. (וזו גם הסיבה ש־π גדול מ־3: המעגל תמיד קצת יותר ארוך מהמשושה!)`,
      });
    }
    if (t === 1) {
      const a = pick([12, 16, 18, 20, 24, 30]), V = x => (a - 2 * x) ** 2 * x, best = range(a / 2 - 1, i => i + 1).reduce((b, x) => (V(x) > V(b) ? x : b), 1);
      const lo = Math.max(1, best - rnd(1, 2)), xs = range(4, i => lo + i), ans = xs.indexOf(best);
      return {
        prompt: `מדף קרטון ריבועי של ${a} על ${a} ס"מ בונים קופסה בלי מכסה: חותכים ריבוע זהה בכל פינה ומקפלים את השוליים. איזה גודל של ריבוע נותן את הקופסה עם הנפח הגדול ביותר?`, visual: sheetFig(a, a, best, '?'),
        widget: choice(xs.map(x => `ריבוע של ${x} ס"מ`), { cols: 2 }), answer: ans, check: v => v === ans, tries: 1,
        hints: ['חשבו את הנפח לכל אפשרות: (צלע הדף פחות פעמיים החיתוך) בריבוע, כפול החיתוך.', `למשל, חיתוך של ${xs[0]}: ${M(`${a - 2 * xs[0]} × ${a - 2 * xs[0]} × ${xs[0]} = ${V(xs[0])}`)}.`],
        explain: xs.map(x => `חיתוך ${x}: ${M(`${a - 2 * x} × ${a - 2 * x} × ${x} = ${V(x)}`)}`).join('<br>') + `<br>הכי גדול: ריבוע של ${best} ס"מ.`,
      };
    }
    if (t === 2) {
      const r = rnd(2, 10), ans = rd(2 * r * r - 1.57 * r * r);
      return one({
        prompt: `בתוך מלבן של ${2 * r} על ${r} ס"מ יש חצי עיגול, שהקוטר שלו הוא הצלע הארוכה של המלבן. מה השטח הצבוע, מחוץ לחצי העיגול? ${PI_P}`,
        visual: fig({ shapes: [{ pts: [[-1, 0], [1, 0], [1, 1], [-1, 1]] }, { pts: arcPts([0, 0], 1, 0, 180), cls: 'lgeo-white' }], texts: [{ p: [0, 0], t: 2 * r, dy: 16 }, { p: [1, 0.5], t: r, dx: 14 }] }, { W: 200, H: 100, pad: 22 }),
        answer: ans, post: 'סמ"ר', dec: true,
        hints: ['השטח הצבוע = המלבן פחות חצי העיגול. הרדיוס של חצי העיגול שווה לרוחב המלבן.', `מלבן: ${M(`${2 * r} × ${r} = ${2 * r * r}`)}. חצי עיגול: ${M(`${r} × ${r} × 3.14 ÷ 2 = ${nf(1.57 * r * r)}`)}.`],
        explain: `מלבן: ${M(`${2 * r} × ${r} = ${2 * r * r}`)}. חצי עיגול: ${M(`${r} × ${r} × 3.14 ÷ 2 = ${nf(1.57 * r * r)}`)}. השטח הצבוע: ${M(`${2 * r * r} − ${nf(1.57 * r * r)} = ${nf(ans)}`)} סמ"ר.`,
      });
    }
    if (t === 3) {
      const n = pick(REGULAR.slice(0, 9)), a = 180 - 360 / n;
      return ask({
        prompt: `כל זווית של מצולע משוכלל היא ${deg(a)}. כמה צלעות יש לו, וכמה אלכסונים יוצאים מקודקוד אחד שלו?`, fields: [['צלעות:', n], ['אלכסונים:', n - 3]],
        hints: [`הזווית החיצונית: ${M(`180 − ${a} = ${180 - a}`)}, וכל הזוויות החיצוניות יחד הן ${deg(360)}.`, `מקודקוד אחד אפשר למתוח אלכסון לכל הקודקודים, חוץ ממנו עצמו ומשני השכנים שלו.`],
        explain: `${M(`360 ÷ ${180 - a} = ${n}`)} צלעות, ו־${M(`${n} − 3 = ${n - 3}`)} אלכסונים מכל קודקוד.`,
      });
    }
    const e = rnd(1, 5), V = e ** 3, side = 10 * e;
    return one({
      prompt: `מכל זכוכית בצורת קובייה, בלי מכסה, מחזיק בדיוק ${V} ליטר כשהוא מלא. כמה סמ"ר של זכוכית יש בו?`, answer: 5 * side * side, post: 'סמ"ר',
      hints: [`ליטר אחד הוא קובייה של 10 על 10 על 10 ס"מ. איזו קובייה מחזיקה ${V} ליטר?`, `${V} ליטר = ${V} דמ"ק = קובייה של ${e} על ${e} על ${e} דמ', כלומר צלע של ${side} ס"מ. ובלי מכסה יש 5 פאות.`],
      explain: `הצלע ${side} ס"מ, כל פאה ${M(`${side} × ${side} = ${side * side}`)}, ובלי מכסה: ${M(`5 × ${side * side} = ${5 * side * side}`)} סמ"ר.`,
    });
  },
};
// A sheet with a square cut out of each corner (the dashed lines are the folds).
function sheetFig(a, b, x, lx = x) {
  const sq = (px, py) => ({ pts: [[px, py], [px + x, py], [px + x, py + x], [px, py + x]], cls: 'lgeo-cut' });
  return fig({
    shapes: [{ pts: [[0, 0], [a, 0], [a, b], [0, b]] }, sq(0, 0), sq(a - x, 0), sq(a - x, b - x), sq(0, b - x)],
    segs: [{ a: [x, x], b: [a - x, x] }, { a: [x, b - x], b: [a - x, b - x] }, { a: [x, x], b: [x, b - x] }, { a: [a - x, x], b: [a - x, b - x] }],
    texts: [{ p: [a / 2, 0], t: a, dy: 16 }, { p: [0, b / 2], t: b, dx: -14 }, { p: [a - x / 2, b], t: lx, dy: -14 }],
  }, { W: 180, H: 150 });
}

export default {
  id: 'lgeo', name: 'מעבדת המדידות', icon: '📐', color: '#facc15', boss: 'החשבונאית פאי',
  tagline: 'החשבונאים שברו את מכשירי המדידה. מי שיודע לחשב שטחים, זוויות ונפחים יבנה אותם מחדש.',
  challenges: [para, trap, poly, circ, disk, vol, net, coord, boss],
};
