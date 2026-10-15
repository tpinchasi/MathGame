// מתחם הזברות
import { h, rnd, pick, shuffle, range, M } from '../../util.js';
import { inputs, box, choice, gridPaint, rectOf, perimOf, connected } from '../../widgets.js';
import { num, nums } from '../../kit.js';

const rad = d => (d * Math.PI) / 180;
const f1 = v => (Math.round(v * 10) / 10).toString();
const pad = m => String(m).padStart(2, '0');
const norm = t => ((t % 720) + 720) % 720;
const hr12 = t => Math.floor(norm(t) / 60) || 12;
const tm = (H, m) => M(`${H}:${pad(m)}`);
const TM = t => tm(hr12(t), norm(t) % 60);
// "a, b ו־c"
const andJoin = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ${/^[\d<]/.test(a[a.length - 1]) ? 'ו־' : 'ו'}${a[a.length - 1]}`);
const lockedGrid = w => (w.el.classList.add('zgeo-g'), w);

// ---------- polygons ----------
const NAMES = { 3: 'משולש', 4: 'מרובע', 5: 'מחומש', 6: 'משושה', 7: 'משובע', 8: 'מתומן' };
const PLURAL = { 3: 'משולשים', 4: 'מרובעים', 5: 'מחומשים', 6: 'משושים' };

// Fits points (any units, y down) into about W×H pixels; returns the mapping and the size.
function fit(pts, W = 220, H = 150) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, hh = Math.max(...ys) - y0 || 1;
  const k = Math.min(W / w, H / hh);
  return { map: ([x, y]) => [(x - x0) * k, (y - y0) * k], w: w * k, h: hh * k };
}
const ptsAttr = P => P.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ');
const frame = (w, hh, m, body, cls = 'zgeo-shape') =>
  `<svg viewBox="${-m} ${-m} ${f1(w + 2 * m)} ${f1(hh + 2 * m)}" class="${cls}" style="max-width:${Math.round(w + 2 * m)}px">${body}</svg>`;
function shapeSVG(pts, { W = 220, H = 150, m = 16, extra = () => '', fill = 'zgeo-fill' } = {}) {
  const { map, w, h: hh } = fit(pts, W, H), P = pts.map(map);
  return frame(w, hh, m, `<polygon points="${ptsAttr(P)}" class="${fill}"/>${extra(P)}`);
}
const vnum = (P, cls = '') => P.map((p, i) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="10" class="zgeo-vdot${cls}"/><text x="${f1(p[0])}" y="${f1(p[1] + 4.5)}" class="zgeo-vnum">${i + 1}</text>`).join('');
const numbered = (pts, W = 170, H = 120, fill) => shapeSVG(pts, { W, H, fill, extra: P => vnum(P) });
const rot = (pts, deg) => pts.map(([x, y]) => [x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), x * Math.sin(rad(deg)) + y * Math.cos(rad(deg))]);
const regular = (n, off = -90) => range(n, i => [Math.cos(rad(off + (360 * i) / n)), Math.sin(rad(off + (360 * i) / n))]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const sideLen = (P, i) => Math.hypot(P[(i + 1) % P.length][0] - P[i][0], P[(i + 1) % P.length][1] - P[i][1]);

// signed turn at each vertex, in degrees
function turns(P) {
  const n = P.length;
  return range(n, i => {
    const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    return (Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * 180) / Math.PI;
  });
}
// a random convex n-gon whose corners are all clearly visible
function convex(n, minTurn = 26) {
  const st = (2 * Math.PI) / n, big = n >= 7;
  for (let g = 0; g < 400; g++) {
    const off = Math.random() * 2 * Math.PI;
    const P = range(n, i => {
      const a = off + st * i + (Math.random() - 0.5) * st * (big ? 0.25 : 0.45), r = 1 - Math.random() * (big ? 0.05 : 0.2);
      return [r * Math.cos(a), r * Math.sin(a)];
    });
    const t = turns(P), s = Math.sign(t[0]);
    if (t.every(x => x * s > minTurn) && Math.min(...range(n, i => sideLen(P, i))) > 0.32) return P;
  }
  return regular(n);
}
// a polygon with one or two corners pushed inwards
function dented(n) {
  const st = (2 * Math.PI) / n;
  for (let g = 0; g < 400; g++) {
    const off = Math.random() * 2 * Math.PI, d0 = rnd(0, n - 1), dents = new Set([d0]);
    if (n >= 6 && Math.random() < 0.5) dents.add((d0 + Math.floor(n / 2)) % n);
    const P = range(n, i => {
      const a = off + st * i + (Math.random() - 0.5) * st * 0.3;
      const r = dents.has(i) ? 0.12 + Math.random() * Math.max(0.05, Math.cos(st) * 0.5) : 0.88 + Math.random() * 0.12;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
    const t = turns(P), s = Math.sign(t.reduce((x, y) => x + y, 0));
    if (t.every(x => Math.abs(x) > 24) && t.some(x => x * s < 0) && Math.min(...range(n, i => sideLen(P, i))) > 0.3) return P;
  }
  return convex(n);
}
const STAR = range(10, i => [(i % 2 ? 0.42 : 1) * Math.cos(rad(-90 + 36 * i)), (i % 2 ? 0.42 : 1) * Math.sin(rad(-90 + 36 * i))]);
const HAND = [
  [[0, 1], [3, 1], [3, 0], [5, 2], [3, 4], [3, 3], [0, 3]],
  [[0, 0], [2, 0], [2, 3], [4, 3], [4, 5], [0, 5]],
  [[0, 0], [6, 0], [6, 2], [4, 2], [4, 5], [2, 5], [2, 2], [0, 2]],
  [[2, 0], [4, 0], [4, 2], [6, 2], [6, 4], [4, 4], [4, 6], [2, 6], [2, 4], [0, 4], [0, 2], [2, 2]],
  [[0, 0], [4, 2], [0, 4], [1.5, 2]],
  [[0, 2], [2, 0], [4, 2], [4, 5], [0, 5]],
  [[0, 0], [1.5, 0], [1.5, 3], [3.5, 3], [3.5, 0], [5, 0], [5, 4.5], [0, 4.5]],
  [[1, 0], [4, 0], [2.5, 2], [4, 2], [0, 6], [1.5, 3], [0, 3]],
  STAR,
];

// Tap the corners of a shape. Points on the middle of a side are decoys.
function vertexTap(pts, extras) {
  const { map, w, h: hh } = fit(pts, 230, 160), all = [...pts, ...extras].map(map), n = pts.length;
  const on = new Set();
  let locked = false;
  const stage = h('div', { class: 'zgeo-vt' });
  const draw = () => {
    let s = `<polygon points="${ptsAttr(all.slice(0, n))}" class="zgeo-fill"/>`;
    all.forEach((p, i) => {
      s += `<g data-i="${i}" class="zgeo-dot${on.has(i) ? ' on' : ''}"><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="19" class="zgeo-hit"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${on.has(i) ? 11 : 8}" class="d"/></g>`;
    });
    stage.innerHTML = frame(w, hh, 24, s);
  };
  stage.addEventListener('click', e => {
    const g = e.target.closest && e.target.closest('[data-i]');
    if (locked || !g) return;
    const i = +g.dataset.i;
    on.has(i) ? on.delete(i) : on.add(i);
    draw();
  });
  draw();
  return {
    el: h('div', { class: 'zgeo-vtw' }, stage, h('p', { class: 'tip' }, 'לחצו על נקודה כדי לסמן אותה. לחיצה נוספת מבטלת.')),
    value: () => (on.size ? [...on].sort((a, b) => a - b) : null),
    set(a) {
      on.clear();
      a.forEach(i => on.add(i));
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// ---------- squared paper ----------
const K = (r, c) => `${r},${c}`;
const RC = k => k.split(',').map(Number);
function blob(n, ok, r0, c0) {
  const got = new Set([K(r0, c0)]);
  for (let g = 0; got.size < n && g < 600; g++) {
    const [r, c] = RC(pick([...got])), [dr, dc] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (ok(r + dr, c + dc)) got.add(K(r + dr, c + dc));
  }
  return [...got];
}
function hasHole(cells) {
  const S = new Set(cells), rs = cells.map(k => RC(k)[0]), cs = cells.map(k => RC(k)[1]);
  const r0 = Math.min(...rs) - 1, r1 = Math.max(...rs) + 1, c0 = Math.min(...cs) - 1, c1 = Math.max(...cs) + 1;
  const seen = new Set([K(r0, c0)]), q = [[r0, c0]];
  while (q.length) {
    const [r, c] = q.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const R = r + dr, C = c + dc, k = K(R, C);
      if (R < r0 || R > r1 || C < c0 || C > c1 || S.has(k) || seen.has(k)) continue;
      seen.add(k);
      q.push([R, C]);
    }
  }
  return seen.size + S.size < (r1 - r0 + 1) * (c1 - c0 + 1);
}
// unit edges around the shape, walked in order so they can be numbered
function boundary(cells) {
  const S = new Set(cells), out = [];
  for (const k of cells) {
    const [r, c] = RC(k);
    if (!S.has(K(r - 1, c))) out.push({ a: [c, r], b: [c + 1, r], n: [0, -1] });
    if (!S.has(K(r, c + 1))) out.push({ a: [c + 1, r], b: [c + 1, r + 1], n: [1, 0] });
    if (!S.has(K(r + 1, c))) out.push({ a: [c + 1, r + 1], b: [c, r + 1], n: [0, 1] });
    if (!S.has(K(r, c - 1))) out.push({ a: [c, r + 1], b: [c, r], n: [-1, 0] });
  }
  const left = new Set(out), order = [];
  while (left.size) {
    let e = [...left][0];
    while (e) {
      left.delete(e);
      order.push(e);
      const end = e.b;
      e = [...left].find(x => x.a[0] === end[0] && x.a[1] === end[1]);
    }
  }
  return order;
}
function cellsSVG(cells, rows, cols, { u = 28, line = null, nums = false, mw = 0 } = {}) {
  const S = new Set(cells), W = cols * u, H = rows * u;
  let s = '';
  for (let i = 0; i <= cols; i++) s += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${H}" class="zgeo-gl"/>`;
  for (let j = 0; j <= rows; j++) s += `<line x1="0" y1="${j * u}" x2="${W}" y2="${j * u}" class="zgeo-gl"/>`;
  for (const k of S) {
    const [r, c] = RC(k);
    s += `<rect x="${c * u}" y="${r * u}" width="${u}" height="${u}" class="zgeo-cell"/>`;
  }
  const edges = boundary([...S]);
  for (const e of edges) s += `<line x1="${e.a[0] * u}" y1="${e.a[1] * u}" x2="${e.b[0] * u}" y2="${e.b[1] * u}" class="zgeo-edge"/>`;
  if (line === 'v') s += `<line x1="${W / 2}" y1="-6" x2="${W / 2}" y2="${H + 6}" class="zgeo-axis"/>`;
  if (line === 'h') s += `<line x1="-6" y1="${H / 2}" x2="${W + 6}" y2="${H / 2}" class="zgeo-axis"/>`;
  if (nums)
    edges.forEach((e, i) => {
      const x = ((e.a[0] + e.b[0]) / 2) * u, y = ((e.a[1] + e.b[1]) / 2) * u;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(u * 0.32)}" class="zgeo-ebg"/><text x="${f1(x)}" y="${f1(y + u * 0.13)}" class="zgeo-enum" style="font-size:${f1(u * 0.36)}px">${i + 1}</text>`;
    });
  return `<svg viewBox="-8 -8 ${W + 16} ${H + 16}" class="zgeo-cells" style="max-width:${mw || W + 16}px">${s}</svg>`;
}
const shapeCells = n => {
  for (;;) {
    const c = blob(n, (r, k) => r >= 0 && r < 5 && k >= 0 && k < 6, 2, 2);
    if (c.length === n && !hasHole(c)) return c;
  }
};
// moves a set of cells so it starts one cell in from the top left corner
function place(cells) {
  const rs = cells.map(k => RC(k)[0]), cs = cells.map(k => RC(k)[1]), r0 = Math.min(...rs), c0 = Math.min(...cs);
  const out = cells.map(k => K(RC(k)[0] - r0 + 1, RC(k)[1] - c0 + 1));
  return { cells: out, rows: Math.max(...rs) - r0 + 3, cols: Math.max(...cs) - c0 + 3 };
}
const rectCells = (w, ht, r0 = 1, c0 = 1) => range(w * ht, i => K(r0 + Math.floor(i / w), c0 + (i % w)));

function riddle() {
  const [a, b] = pick([[3, 4], [3, 5], [4, 5], [4, 6], [3, 6], [5, 6]]), x = rnd(1, 6), y = rnd(1, 6), N = x + y, S = a * x + b * y;
  return num({
    prompt: `על הגדר תלויים ${N} שלטים: חלקם ${PLURAL[a]} וחלקם ${PLURAL[b]}. לכל השלטים יחד יש ${S} צלעות. כמה שלטים הם ${PLURAL[a]}?`,
    answer: x,
    hints: [`נניח שכל ${N} השלטים היו ${PLURAL[a]}. כמה צלעות היו להם?`, `${M(`${N} × ${a} = ${N * a}`)}. כל ${NAMES[b]} מוסיף עוד ${b - a} ${b - a === 1 ? 'צלע' : 'צלעות'}, וחסרות ${S - N * a}.`],
    explain: `${M(`${S - N * a} ÷ ${b - a} = ${y}`)} שלטים הם ${PLURAL[b]}, ולכן ${M(`${N} − ${y} = ${x}`)} הם ${PLURAL[a]}. בדיקה: ${M(`${x} × ${a} + ${y} × ${b} = ${S}`)}.`,
  });
}
// =====================================================================
const poly = {
  id: 'zgeo-poly', title: 'צלעות וקודקודים',
  intro: `<p><b>מצולע</b> הוא צורה סגורה שכל הקווים שלה ישרים. כל קו ישר הוא <b>צלע</b>, וכל פינה שבה שתי צלעות נפגשות היא <b>קודקוד</b>.</p>
    <div class="ex">למשולש יש 3 צלעות ו־3 קודקודים. למרובע יש 4, למחומש 5 ולמשושה 6. ברמות הגבוהות פוגשים גם משובע (7) ומתומן (8).</div>
    <p>בכל מצולע יש בדיוק אותו מספר של צלעות ושל קודקודים. נקודה באמצע קו ישר היא <b>לא</b> קודקוד.</p>
    <p>כשצריך לסמן קודקודים, לוחצים על הנקודות.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2), n = rnd(3, 6), pts = convex(n, 30);
      const ex = `${numbered(pts)}לצורה יש ${n} צלעות ו־${n} קודקודים, ולכן היא ${NAMES[n]}.`;
      if (t === 0) {
        const sides = shuffle(range(n).filter(i => sideLen(pts, i) > 0.75)).slice(0, rnd(1, 2));
        const extras = sides.map(i => lerp(pts[i], pts[(i + 1) % n], 0.4 + Math.random() * 0.2));
        return {
          prompt: 'הזברה רוצה לעמוד בכל פינה של המכלאה. לחצו על כל הקודקודים.',
          widget: vertexTap(pts, extras), answer: range(n),
          check: v => v.length === n && v.every(i => i < n),
          wrongMsg: v => (v.some(i => i >= n) ? 'סימנתם נקודה שנמצאת באמצע קו ישר.' : 'חסר עוד קודקוד.'),
          hints: ['קודקוד הוא פינה: מקום שבו הקו משנה כיוון.', `לצורה יש ${n} פינות. נקודה באמצע קו ישר היא לא קודקוד.`],
          explain: `${ex}${extras.length ? ' הנקודות שבאמצע הקווים הישרים אינן קודקודים.' : ''}`,
        };
      }
      if (t === 1)
        return {
          prompt: 'איך קוראים לצורה הזאת?', visual: shapeSVG(pts),
          widget: choice(['משולש', 'מרובע', 'מחומש', 'משושה'], { cols: 2 }), answer: n - 3, check: v => v === n - 3,
          hints: ['ספרו את הצלעות של הצורה.', `לצורה יש ${n} צלעות.`], explain: ex,
        };
      return nums({
        prompt: 'כמה צלעות וכמה קודקודים יש לצורה?', visual: shapeSVG(pts), fields: [['צלעות:', n], ['קודקודים:', n]],
        hints: ['צלע היא קו ישר, וקודקוד הוא פינה. התחילו מפינה אחת והמשיכו מסביב.', 'בכל מצולע יש אותו מספר של צלעות ושל קודקודים.'],
        explain: ex,
      });
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const target = rnd(4, 8), others = shuffle([3, 4, 5, 6, 7, 8].filter(k => k !== target)).slice(0, 3), ns = shuffle([target, ...others]);
        const opts = ns.map(k => shapeSVG(k >= 5 && Math.random() < 0.5 ? dented(k) : convex(k, 20), { W: 110, H: 84, m: 6 })), ans = ns.indexOf(target);
        return {
          prompt: `איזו מהצורות היא ${NAMES[target]}?`, widget: choice(opts, { cols: 2, cls: 'zgeo-pics' }), answer: ans, check: v => v === ans,
          hints: [`ל${NAMES[target]} יש ${target} צלעות. ספרו את הצלעות בכל צורה.`, 'פינה שפונה פנימה היא גם קודקוד.'],
          explain: `ל${NAMES[target]} יש ${target} צלעות. לצורות האחרות יש ${andJoin(others.sort((a, b) => a - b).map(String))} צלעות.`,
        };
      }
      if (t === 1) {
        let pts = Math.random() < 0.5 ? dented(rnd(5, 8)) : rot(pick(HAND), pick([0, 90, 180, 270]));
        if (Math.random() < 0.5) pts = pts.map(([x, y]) => [-x, y]);
        const n = pts.length;
        return num({
          prompt: 'כמה קודקודים יש לצורה? שימו לב גם לפינות שפונות פנימה.', visual: shapeSVG(pts), answer: n, post: ' קודקודים',
          hints: ['קודקוד הוא כל מקום שבו הקו משנה כיוון, גם פינה שפונה פנימה.', 'אפשר לספור את הצלעות במקום: יש אותו מספר של צלעות ושל קודקודים.'],
          explain: `${numbered(pts)}לצורה יש ${n} קודקודים ו־${n} צלעות.`,
        });
      }
      const [k1, k2] = shuffle([3, 4, 5, 6]).slice(0, 2), a = rnd(2, 4), b = rnd(2, 4), tot = a * k1 + b * k2;
      return num({
        prompt: `השומרים בנו ${a} מכלאות בצורת ${NAMES[k1]} ו־${b} מכלאות בצורת ${NAMES[k2]}. כל צלע היא גדר אחת. כמה גדרות בנו?`,
        answer: tot, post: ' גדרות',
        hints: [`לכל ${NAMES[k1]} יש ${k1} צלעות, ולכל ${NAMES[k2]} יש ${k2}.`, `${M(`${a} × ${k1} = ${a * k1}`)} ועוד ${M(`${b} × ${k2} = ${b * k2}`)}.`],
        explain: `${M(`${a} × ${k1} + ${b} × ${k2} = ${a * k1} + ${b * k2} = ${tot}`)} גדרות.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      // cut a convex polygon along a line between two points on its edge
      const n = rnd(3, 6), pts = convex(n, 34), N = 2 * n;
      const at = p => (p % 2 ? lerp(pts[(p - 1) / 2], pts[((p - 1) / 2 + 1) % n], 0.5) : pts[p / 2]);
      const on = p => (p % 2 ? [(p - 1) / 2] : [p / 2, (p / 2 + n - 1) % n]);
      let p, q;
      do [p, q] = [rnd(0, N - 1), rnd(0, N - 1)].sort((x, y) => x - y);
      while (p === q || on(p).some(s => on(q).includes(s)) || (p % 2 === 0 && q % 2 === 0 && Math.random() < 0.6));
      const part = (from, to) => {
        const out = [];
        for (let i = from; ; i = (i + 1) % N) {
          if (i === from || i === to || i % 2 === 0) out.push(at(i));
          if (i === to) return out;
        }
      };
      let A = part(p, q), B = part(q, p);
      if (Math.random() < 0.5) [A, B] = [B, A];
      const { map, w, h: hh } = fit(pts, 220, 150), [P, Q] = [at(p), at(q)].map(map);
      const pic = frame(w, hh, 14, `<polygon points="${ptsAttr(A.map(map))}" class="zgeo-pa"/><polygon points="${ptsAttr(B.map(map))}" class="zgeo-pb"/><line x1="${f1(P[0])}" y1="${f1(P[1])}" x2="${f1(Q[0])}" y2="${f1(Q[1])}" class="zgeo-cut"/>`);
      const nm = k => (NAMES[k] ? ` (${NAMES[k]})` : '');
      return nums({
        prompt: `חותכים את ה${NAMES[n]} לאורך הקו המקווקו. כמה קודקודים יהיו לכל חלק?`, visual: pic,
        fields: [['לחלק הצהוב:', A.length], ['לחלק הכחול:', B.length]],
        hints: ['כל פינה ישנה נשארת פינה של אחד החלקים. פינה שהקו עובר דרכה נשארת פינה בשני החלקים.', 'קצה של הקו שנמצא באמצע צלע יוצר פינה חדשה בכל אחד מהחלקים.'],
        explain: `<div class="zgeo-row">${numbered(A, 120, 90, 'zgeo-pa')}${numbered(B, 120, 90, 'zgeo-pb')}</div>לחלק הצהוב יש ${A.length} קודקודים${nm(A.length)}, ולחלק הכחול ${B.length}${nm(B.length)}.`,
      });
    }
    if (t === 1) return riddle();
    const all = Math.random() < 0.4, n = all ? rnd(4, 6) : rnd(4, 8), P0 = regular(n);
    const diag = from => range(n).filter(j => j !== from && j !== (from + 1) % n && j !== (from + n - 1) % n).map(j => [from, j]);
    const lines = all ? range(n).flatMap(i => diag(i).filter(([a, b]) => a < b)) : diag(0);
    const pic = (show) => shapeSVG(P0, { W: 160, H: 140, extra: P => (show ? lines.map(([a, b]) => `<line x1="${f1(P[a][0])}" y1="${f1(P[a][1])}" x2="${f1(P[b][0])}" y2="${f1(P[b][1])}" class="zgeo-diag"/>`).join('') : '') + (all ? '' : `<circle cx="${f1(P[0][0])}" cy="${f1(P[0][1])}" r="7" class="zgeo-vdot hot"/>`) });
    return num({
      prompt: all ? `אלכסון מחבר שני קודקודים שאינם שכנים. כמה אלכסונים יש ל${NAMES[n]} בסך הכול?` : `אלכסון מחבר שני קודקודים שאינם שכנים. כמה אלכסונים יוצאים מהקודקוד המסומן של ה${NAMES[n]}?`,
      visual: pic(false), answer: lines.length,
      hints: all
        ? [`מכל קודקוד יוצאים ${n - 3} אלכסונים.`, `${M(`${n} × ${n - 3} = ${n * (n - 3)}`)}, אבל כך כל אלכסון נספר פעמיים: פעם מכל קצה שלו.`]
        : ['מהקודקוד אפשר למתוח קו לכל הקודקודים האחרים, חוץ משני השכנים שלו (אליהם יש צלע).', `יש ${n - 1} קודקודים אחרים, ושניים מהם שכנים.`],
      explain: `${pic(true)}${all ? M(`${n} × ${n - 3} ÷ 2 = ${lines.length}`) : M(`${n} − 3 = ${n - 3}`)} אלכסונים.`,
    });
  },
};

// =====================================================================
const isSym = (cells, axis, R, C) => {
  const S = new Set(cells);
  return cells.every(k => {
    const [r, c] = RC(k);
    return S.has(axis === 'v' ? K(r, C - 1 - c) : K(R - 1 - r, c));
  });
};
function symPic(axis, good) {
  const R = 6, C = 6, mir = ([r, c]) => (axis === 'v' ? K(r, C - 1 - c) : K(R - 1 - r, c));
  const inOther = (r, c) => r >= 0 && c >= 0 && r < R && c < C && (axis === 'v' ? c >= 3 : r >= 3);
  for (;;) {
    const half = blob(rnd(4, 6), axis === 'v' ? (r, c) => r >= 0 && r < R && c >= 0 && c < 3 : (r, c) => r >= 0 && r < 3 && c >= 0 && c < C, axis === 'v' ? rnd(1, 4) : 2, axis === 'v' ? 2 : rnd(1, 4));
    let cells = [...half, ...half.map(k => mir(RC(k)))];
    if (!good) {
      const mk = pick(half.map(k => mir(RC(k))));
      cells = cells.filter(k => k !== mk);
      const S = new Set(cells), cand = [];
      for (const k of cells) {
        const [r, c] = RC(k);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inOther(r + dr, c + dc) && !S.has(K(r + dr, c + dc)) && K(r + dr, c + dc) !== mk) cand.push(K(r + dr, c + dc));
      }
      if (!cand.length) continue;
      cells.push(pick(cand));
    }
    if (isSym(cells, axis, R, C) === good) return cellsSVG(cells, R, C, { u: 20, line: axis });
  }
}
const SYMSHAPES = [
  ['ריבוע', regular(4, 45), 4, 'בריבוע יש קו סימטריה אנכי, קו אופקי ושני אלכסונים.'],
  ['מלבן', [[0, 0], [3, 0], [3, 1.8], [0, 1.8]], 2, 'במלבן (שאינו ריבוע) יש קו אנכי וקו אופקי. האלכסונים אינם קווי סימטריה!'],
  ['משולש שווה צלעות', regular(3), 3, 'במשולש שווה צלעות יוצא קו סימטריה מכל קודקוד לאמצע הצלע שמולו.'],
  ['משולש שווה שוקיים', [[0, 3], [2, 0], [4, 3]], 1, 'יש קו אחד בלבד: מהקודקוד העליון לאמצע הבסיס.'],
  ['משולש שונה צלעות', [[0, 3], [1, 0], [4, 3]], 0, 'כל הצלעות שונות, ולכן אין שום קו שמחלק אותו לשני חצאים זהים.'],
  ['מחומש משוכלל', regular(5), 5, 'במצולע שכל הצלעות שלו שוות וכל הזוויות שלו שוות, יש קווי סימטריה כמספר הצלעות.'],
  ['משושה משוכלל', regular(6), 6, 'במצולע שכל הצלעות שלו שוות וכל הזוויות שלו שוות, יש קווי סימטריה כמספר הצלעות.'],
  ['מעוין', [[2, 0], [4, 1.4], [2, 2.8], [0, 1.4]], 2, 'במעוין (שאינו ריבוע) שני האלכסונים הם קווי סימטריה.'],
  ['דלתון', [[2, 0], [3.2, 1.2], [2, 4], [0.8, 1.2]], 1, 'בדלתון יש קו אחד: האלכסון שעובר בין שני הזוגות של הצלעות השוות.'],
  ['מקבילית', [[1, 0], [4, 0], [3, 2], [0, 2]], 0, 'מקבילית שאינה מלבן או מעוין אינה סימטרית: נסו לקפל אותה, החצאים לא מתלכדים.'],
  ['פלוס', HAND[3], 4, 'בצורת פלוס יש קו אנכי, קו אופקי ושני אלכסונים.'],
  ['חץ', HAND[0], 1, 'בחץ יש קו אחד בלבד: לאורך החץ, דרך החוד.'],
  ['צורת T', HAND[2], 1, 'יש קו אחד בלבד: האנכי, באמצע הרגל.'],
];
const sym = {
  id: 'zgeo-sym', title: 'משלימים סימטריה',
  intro: `<p>קו <b>סימטריה</b> הוא קו שמחלק צורה לשני חצאים זהים: אם מקפלים את הדף לאורך הקו, החצאים מתלכדים בדיוק.</p>
    <div class="ex">לכל משבצת שחורה צריכה להיות בת זוג בצד השני של הקו האדום, באותו מרחק ממנו, בדיוק ממול.</div>
    <p>לוחצים על משבצת או גוררים עליה כדי לצבוע. לחיצה נוספת מוחקת.</p>`,
  gen(L) {
    const paint = (rows, cols, kind, src, img, prompt) => {
      img.sort();
      const want = new Set(img);
      return {
        prompt, sig: src.join(' '), widget: lockedGrid(gridPaint({ rows, cols, locked: src, mirror: kind })), answer: img,
        check: v => v.length === img.length && v.every(k => want.has(k)),
        wrongMsg: v => `חסרות ${img.filter(k => !v.includes(k)).length} משבצות, ויש ${v.filter(k => !want.has(k)).length} מיותרות.`,
        hints: ['כל משבצת שחורה צריכה בת זוג באותו מרחק מהקו האדום, בצד השני.',
          kind === 'both' ? 'שקפו קודם לצד השני של הקו האנכי, ואז שקפו את כל החצי העליון למטה.' : kind === 'diag' ? 'בשיקוף באלכסון שורה הופכת לעמודה: משבצת בשורה 2 ובעמודה 5 עוברת לשורה 5 ולעמודה 2.' : 'התחילו מהמשבצות הקרובות לקו. ספרו כמה משבצות כל אחת רחוקה מהקו.'],
        explain: 'כל משבצת משתקפת למקום שנמצא באותו מרחק מהקו, בדיוק ממול. הפתרון מסומן על הלוח.',
      };
    };
    const flip = (src, f) => src.map(k => f(...RC(k)).join(','));
    if (L === 1) {
      const src = blob(rnd(4, 7), (r, c) => r >= 0 && r < 6 && c >= 0 && c < 4, rnd(1, 4), 3);
      return paint(6, 8, 'v', src, flip(src, (r, c) => [r, 7 - c]), 'החשבונאים מחקו חצי מהשלט של הזברות! צבעו את החצי השני, כך שהקו האדום יהיה קו סימטריה.');
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const src = blob(rnd(6, 9), (r, c) => r >= 0 && r < 4 && c >= 0 && c < 6, rnd(1, 3), rnd(0, 5));
        return paint(8, 6, 'h', src, flip(src, (r, c) => [7 - r, c]), 'צבעו את ההשתקפות של הצורה השחורה בקו האדום.');
      }
      if (t === 1) {
        const src = blob(rnd(5, 8), (r, c) => r >= 0 && r < 6 && c >= 0 && c < 3, rnd(1, 4), rnd(0, 2));
        return paint(6, 8, 'v', src, flip(src, (r, c) => [r, 7 - c]), 'צבעו את ההשתקפות של הצורה השחורה. שימו לב: הצורה לא נוגעת בקו.');
      }
      const axis = pick(['v', 'h']), ok = rnd(0, 3), opts = range(4, i => symPic(axis, i === ok));
      return {
        prompt: 'באיזה ציור הקו האדום הוא קו סימטריה?', widget: choice(opts, { cols: 2, cls: 'zgeo-pics' }), answer: ok, check: v => v === ok,
        hints: ['דמיינו שמקפלים את הציור לאורך הקו האדום. האם כל משבצת נופלת על משבצת צבועה?', 'בדקו כל משבצת: האם יש לה בת זוג בדיוק ממול, באותו מרחק מהקו?'],
        explain: 'רק בציור הזה לכל משבצת יש בת זוג בדיוק ממול. בכל ציור אחר יש משבצת אחת שזזה ממקומה.',
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const src = blob(rnd(5, 8), (r, c) => r >= 0 && r < 4 && c >= 0 && c < 4, 3, 3);
      const img = [...new Set([...flip(src, (r, c) => [r, 7 - c]), ...flip(src, (r, c) => [7 - r, c]), ...flip(src, (r, c) => [7 - r, 7 - c])])];
      return paint(8, 8, 'both', src, img, 'השלימו את הציור כך שיהיה סימטרי ביחס לשני הקווים האדומים.');
    }
    if (t === 1) {
      const src = blob(rnd(6, 9), (r, c) => r >= 0 && c < 8 && c > r, rnd(1, 4), rnd(5, 7));
      return paint(8, 8, 'diag', src, flip(src, (r, c) => [c, r]), 'צבעו את ההשתקפות של הצורה השחורה בקו האלכסוני.');
    }
    const [name, pts, n, why] = pick(SYMSHAPES);
    return num({
      prompt: 'כמה קווי סימטריה יש לצורה?', visual: shapeSVG(rot(pts, pick([0, 0, 30, 90, 180, -20])), { W: 180, H: 140 }), answer: n, post: ' קווים',
      hints: ['קו סימטריה מחלק את הצורה לשני חצאים זהים. נסו קווים אנכיים, אופקיים ואלכסוניים.', `הצורה היא ${name}. קפלו אותה בדמיון לאורך כל קו אפשרי.`],
      explain: `${n === 0 ? 'אין לה אף קו סימטריה' : n === 1 ? 'יש לה קו סימטריה אחד' : `יש לה ${n} קווי סימטריה`}. ${why}`,
    });
  },
};

// =====================================================================
const OBJ = { pencil: 'העיפרון', carrot: 'הגזר', ribbon: 'הסרט' };
function rulerSVG({ from = 0, to, a, b, obj = 'pencil', mm = false }) {
  const n = to - from, u = 320 / (n + 0.8), x = v => (v - from + 0.4) * u, W = (n + 0.8) * u;
  let s = `<rect x="0" y="62" width="${f1(W)}" height="46" rx="6" class="zgeo-rbody"/>`;
  for (let k = 0; k <= n * 10; k += mm ? 1 : 5) {
    const len = k % 10 === 0 ? 17 : k % 5 === 0 ? 11 : 6, X = f1(x(from + k / 10));
    s += `<line x1="${X}" y1="62" x2="${X}" y2="${62 + len}" class="zgeo-rt"/>`;
    if (k % 10 === 0) s += `<text x="${X}" y="98" class="zgeo-rn">${from + k / 10}</text>`;
  }
  const xa = x(a), xb = x(b), L = xb - xa;
  s += `<line x1="${f1(xa)}" y1="14" x2="${f1(xa)}" y2="62" class="zgeo-guide"/><line x1="${f1(xb)}" y1="14" x2="${f1(xb)}" y2="62" class="zgeo-guide"/>`;
  if (obj === 'pencil') {
    const er = Math.min(14, L * 0.12), tip = Math.min(26, L * 0.24);
    s += `<rect x="${f1(xa)}" y="27" width="${f1(er)}" height="20" rx="3" class="zgeo-eraser"/><rect x="${f1(xa + er)}" y="27" width="${f1(L - er - tip)}" height="20" class="zgeo-pencil"/>`;
    s += `<path d="M${f1(xb - tip)} 27L${f1(xb)} 37L${f1(xb - tip)} 47Z" class="zgeo-wood"/><path d="M${f1(xb - tip * 0.35)} 33.5L${f1(xb)} 37L${f1(xb - tip * 0.35)} 40.5Z" class="zgeo-lead"/>`;
  } else if (obj === 'carrot') {
    s += `<path d="M${f1(xb - 3)} 26q-8 -14 -18 -18M${f1(xb - 3)} 26q-2 -16 -8 -22M${f1(xb - 3)} 26q4 -12 0 -20" class="zgeo-leaf"/>`;
    s += `<path d="M${f1(xa)} 37L${f1(xb)} 25L${f1(xb)} 49Z" class="zgeo-carrot"/>`;
  } else {
    s += `<rect x="${f1(xa)}" y="28" width="${f1(L)}" height="18" class="zgeo-ribbon"/>`;
    for (let X = xa + 5; X < xb - 6; X += 12) s += `<path d="M${f1(X)} 28l5 0l-3 18l-5 0Z" class="zgeo-stripe"/>`;
  }
  return `<svg viewBox="-2 0 ${f1(W + 4)} 112" class="zgeo-ruler">${s}</svg>`;
}
const mcm = c => {
  const m = Math.floor(c / 100), r = c % 100, mp = m === 1 ? 'מטר אחד' : `${m} מטרים`;
  return !m ? `${r} ס"מ` : r ? `${mp} ו־${r} ס"מ` : mp;
};
const cmmm = v => (v % 10 ? `${Math.floor(v / 10)} ס"מ ו־${v % 10} מ"מ` : `${v / 10} ס"מ`);
const GUESS = [['האורך של עיפרון', 15, 0], ['הגובה של דלת', 2, 1], ['האורך של אוטובוס', 12, 1], ['הגובה של ג׳ירפה', 5, 1], ['האורך של כף יד', 10, 0],
  ['האורך של בננה', 20, 0], ['האורך של מגרש כדורגל', 100, 1], ['האורך של הזנב של זברה', 50, 0], ['האורך של מחק', 4, 0], ['האורך של בריכה', 25, 1],
  ['האורך של נוצה', 25, 0], ['הגובה של עץ', 8, 1], ['האורך של מכונית', 4, 1], ['האורך של כפית', 12, 0], ['האורך של גדר המכלאה', 60, 1], ['הגובה של כוס', 10, 0]];
const ruler = {
  id: 'zgeo-ruler', title: 'מודדים אורך',
  intro: `<p>מודדים אורך בסרגל: מניחים את הסרגל לאורך הדבר, ובודקים איפה הוא <b>מתחיל</b> ואיפה הוא <b>נגמר</b>.</p>
    <div class="ex">עיפרון שמתחיל ב־2 ונגמר ב־9 ארוך ${M('9 − 2 = 7')} סנטימטרים (ס"מ).</div>
    <p>${M('1 מ\' = 100 ס"מ')} &nbsp; ${M('1 ס"מ = 10 מ"מ')}. מטר הוא בערך צעד גדול, סנטימטר הוא בערך הרוחב של אצבע קטנה.</p>`,
  gen(L) {
    const read = (from, to, a, b, obj, mm) => {
      const len = b - a, nm = OBJ[obj], ends = mm ? [cmmm(a), cmmm(b)] : [a, b];
      return num({
        prompt: mm ? `כמה מילימטרים אורך ${nm}?` : `כמה סנטימטרים אורך ${nm}?`, visual: rulerSVG({ from, to, a: mm ? a / 10 : a, b: mm ? b / 10 : b, obj, mm }),
        answer: len, post: mm ? ' מ"מ' : ' ס"מ',
        hints: mm ? ['בין שני מספרים על הסרגל יש 10 שנתות קטנות. כל שנתה קטנה היא מילימטר אחד.', `${nm} מתחיל ב־${ends[0]} ונגמר ב־${ends[1]}.`]
          : a === 0 ? [`הקצה של ${nm} נמצא בדיוק על 0. על איזה מספר נמצא הקצה השני?`] : [`${nm} לא מתחיל ב־0! מאיזה מספר הוא מתחיל, ובאיזה מספר הוא נגמר?`, `הוא מתחיל ב־${a} ונגמר ב־${b}. כמה סנטימטרים יש ביניהם?`],
        explain: mm ? `${nm} מתחיל ב־${a} מ"מ ונגמר ב־${b} מ"מ: ${M(`${b} − ${a} = ${len}`)} מ"מ, כלומר ${cmmm(len)}.`
          : a === 0 ? `${nm} מתחיל ב־0 ונגמר ב־${b}, ולכן הוא ארוך ${b} ס"מ.` : `${nm} מתחיל ב־${a} ונגמר ב־${b}, ולכן הוא ארוך ${M(`${b} − ${a} = ${len}`)} ס"מ.`,
      });
    };
    const obj = pick(['pencil', 'carrot', 'ribbon']);
    if (L === 1) {
      const t = pick([0, 0, 1, 2]);
      if (t < 2) {
        const a = t === 0 ? 0 : rnd(1, 4), len = t === 0 ? rnd(3, 11) : rnd(3, 7);
        return read(0, 12, a, a + len, obj, false);
      }
      const [what, v, u] = pick(GUESS), opts = [`${v} סנטימטרים`, `${v} מטרים`];
      return {
        prompt: `מה ${what}, בערך?`, widget: choice(opts, { cols: 2 }), answer: u, check: x => x === u,
        hints: ['דמיינו סרגל של בית הספר, באורך 30 ס"מ. האם הדבר קצר ממנו, או ארוך ממנו בהרבה?', 'מטר אחד הוא בערך צעד גדול של מבוגר. סנטימטר אחד הוא בערך הרוחב של אצבע קטנה.'],
        explain: `${opts[u]}. ${opts[1 - u]} ${u ? 'זה קצר מדי' : 'זה ארוך מדי'}.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const from = rnd(2, 6), a = from + rnd(1, 3), len = rnd(3, 6);
        const r = read(from, from + 10, a, a + len, obj, false);
        r.prompt = `הסרגל נשבר, והוא מתחיל ב־${from}. ${r.prompt}`;
        return r;
      }
      if (t === 1) {
        const k = rnd(0, 2), m = rnd(1, 5), c = rnd(1, 19) * 5, tot = m * 100 + c;
        if (k === 0) return num({ prompt: `החבל של הנדנדה ארוך ${mcm(tot)}. כמה סנטימטרים זה?`, answer: tot, post: ' ס"מ', hints: ['במטר אחד יש 100 ס"מ.', `${m} מטרים הם ${m * 100} ס"מ. הוסיפו עוד ${c}.`], explain: `${M(`${m * 100} + ${c} = ${tot}`)} ס"מ.` });
        if (k === 1) return num({ prompt: `הג׳ירפה גבוהה ${m} מטרים. כמה סנטימטרים זה?`, answer: m * 100, post: ' ס"מ', hints: ['במטר אחד יש 100 ס"מ.', `${m} פעמים 100.`], explain: `${M(`${m} × 100 = ${m * 100}`)} ס"מ.` });
        return {
          prompt: `הנחש ארוך ${tot} ס"מ. כמה מטרים וכמה סנטימטרים זה?`,
          widget: inputs(`<div class="ans-line">${box('m', 2)} מטרים ו־${box('c', 3)} ס"מ</div>`), answer: { m, c },
          check: v => v.m === m && v.c === c,
          hints: ['כל 100 ס"מ הם מטר אחד.', `ב־${tot} יש ${m} מאות שלמות, ונשארים ${c}.`],
          explain: `${M(`${tot} = ${m * 100} + ${c}`)}, כלומר ${mcm(tot)}.`,
        };
      }
      const A = rnd(24, 32) * 5, B = rnd(16, 22) * 5;
      return num({
        prompt: `הזברה גבוהה ${mcm(A)}. הסייח שלה גבוה ${B} ס"מ. בכמה סנטימטרים הזברה גבוהה יותר?`, answer: A - B, post: ' ס"מ',
        hints: ['הפכו קודם את הגובה של הזברה לסנטימטרים.', `הזברה גבוהה ${A} ס"מ.`], explain: `${mcm(A)} הם ${A} ס"מ, ו־${M(`${A} − ${B} = ${A - B}`)} ס"מ.`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const from = rnd(0, 4), a = from * 10 + rnd(2, 18), b = a + rnd(15, 36);
      const r = read(from, from + 6, a, b, obj, true);
      if (from) r.prompt = `הסרגל נשבר, והוא מתחיל ב־${from}. ${r.prompt}`;
      return r;
    }
    if (t === 1) {
      const step = pick([2, 3, 5, 10]), k = rnd(3, 8), Lm = step * k;
      return num({
        prompt: `לאורך גדר ישרה באורך ${Lm} מטרים מציבים עמוד כל ${step} מטרים, גם בהתחלה וגם בסוף. כמה עמודים צריך?`, answer: k + 1, post: ' עמודים',
        hints: ['ציירו גדר קטנה: בגדר עם 2 קטעים יש 3 עמודים.', `הגדר מתחלקת ל־${M(`${Lm} ÷ ${step} = ${k}`)} קטעים. תמיד יש עמוד אחד יותר מקטעים.`],
        explain: `${k} קטעים של ${step} מטרים, ולכן ${M(`${k} + 1 = ${k + 1}`)} עמודים: אחד בהתחלה ועוד אחד בסוף כל קטע.`,
      });
    }
    if (t === 2) {
      const R = rnd(2, 5), p = pick([30, 40, 60, 70, 80, 90]), k = Math.floor((R * 100) / p), rest = R * 100 - k * p;
      return nums({
        prompt: `השומר חותך חבל באורך ${R} מטרים לחתיכות של ${p} ס"מ. כמה חתיכות שלמות יהיו, וכמה סנטימטרים יישארו?`,
        fields: [['חתיכות:', k], ['נשארו (ס"מ):', rest]],
        hints: [`החבל ארוך ${R * 100} ס"מ.`, `${M(`${k} × ${p} = ${k * p}`)}. עוד חתיכה כבר לא נכנסת.`],
        explain: `${k} חתיכות, ונשארים ${rest} ס"מ, כי ${M(`${R * 100} = ${k} × ${p} + ${rest}`)}.`,
      });
    }
    const parts = range(3, () => rnd(14, 38) * 5), tot = parts.reduce((x, y) => x + y, 0), m = Math.floor(tot / 100), c = tot % 100;
    return {
      prompt: `הזברה הלכה ${mcm(parts[0])}, אחר כך ${mcm(parts[1])} ובסוף ${mcm(parts[2])}. כמה היא הלכה בסך הכול?`,
      widget: inputs(`<div class="ans-line">${box('m', 2)} מטרים ו־${box('c', 3)} ס"מ</div>`), answer: { m, c },
      check: v => v.m === m && v.c === c,
      hints: ['הפכו את כל האורכים לסנטימטרים וחברו.', `${M(`${parts.join(' + ')} = ${tot}`)} ס"מ.`],
      explain: `${M(`${parts.join(' + ')} = ${tot}`)} ס"מ, כלומר ${mcm(tot)}.`,
    };
  },
};

// =====================================================================
function clockFace(t, { nums = true, minute = true, handles = false, mirror = false, cls = '' } = {}) {
  const tt = mirror ? norm(720 - t) : norm(t), m = tt % 60, ma = m * 6, ha = tt / 2;
  const P = (a, r) => `${f1(r * Math.sin(rad(a)))} ${f1(-r * Math.cos(rad(a)))}`;
  let s = `<svg viewBox="-112 -112 224 224" class="zgeo-clock ${cls}"><circle r="108" class="zgeo-rim"/><circle r="99" class="zgeo-face"/>`;
  for (let i = 0; i < 60; i++) s += `<path d="M${P(i * 6, i % 5 ? 91 : 88)}L${P(i * 6, 96)}" class="${i % 5 ? 'zgeo-tk' : 'zgeo-tk5'}"/>`;
  if (nums) for (let k = 1; k <= 12; k++) s += `<text x="${f1(76 * Math.sin(rad(k * 30)))}" y="${f1(-76 * Math.cos(rad(k * 30)) + 7)}" class="zgeo-cn">${k}</text>`;
  else s += '<path d="M-7 -78L7 -78L0 -66Z" class="zgeo-top"/>';
  s += `<path d="M0 0L${P(ha, 42)}" class="zgeo-hh"/>`;
  if (minute) s += `<path d="M0 0L${P(ma, 60)}" class="zgeo-mh"/>`;
  if (handles) s += `<circle cx="${P(ha, 42).split(' ')[0]}" cy="${P(ha, 42).split(' ')[1]}" r="9" class="zgeo-kh"/><circle cx="${P(ma, 60).split(' ')[0]}" cy="${P(ma, 60).split(' ')[1]}" r="10" class="zgeo-km"/>`;
  return s + '<circle r="7" class="zgeo-pin"/></svg>';
}
const clockPic = (t, o = {}) => `<div class="zgeo-clkpic">${clockFace(t, o)}</div>`;
const twoClocks = (t1, t2, c1, c2) => `<div class="zgeo-2clk"><figure>${clockFace(t1)}<figcaption>${c1}</figcaption></figure><figure>${clockFace(t2)}<figcaption>${c2}</figcaption></figure></div>`;

// The player sets a clock by dragging its hands (the hour hand follows the minute hand) or with buttons.
function clockSet(step = 5) {
  let t = 0, moved = false, locked = false, hand = null;
  const stage = h('div', { class: 'zgeo-clk-stage' });
  const draw = () => (stage.innerHTML = clockFace(t, { handles: true }));
  const angleOf = e => {
    const svg = stage.firstChild, p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return ((Math.atan2(p.x, -p.y) * 180) / Math.PI + 360) % 360;
  };
  const dist = (x, y) => {
    const d = Math.abs(x - y) % 360;
    return Math.min(d, 360 - d);
  };
  const move = a => {
    const m = t % 60;
    if (hand === 'm') {
      let d = (Math.round(a / 6 / step) * step) % 60 - m;
      if (d > 30) d -= 60;
      if (d < -30) d += 60;
      t = norm(t + d);
    } else t = norm(Math.round((a - m * 0.5) / 30) * 60 + m);
    moved = true;
    draw();
  };
  stage.addEventListener('pointerdown', e => {
    if (locked) return;
    e.preventDefault();
    const a = angleOf(e);
    hand = dist(a, t / 2) < dist(a, (t % 60) * 6) ? 'h' : 'm';
    try { stage.setPointerCapture(e.pointerId); } catch {}
    move(a);
  });
  stage.addEventListener('pointermove', e => hand && !locked && move(angleOf(e)));
  const stop = () => (hand = null);
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  const bump = d => () => {
    if (locked) return;
    t = norm(t + d);
    moved = true;
    draw();
  };
  const pair = (label, d, a1, a2) => h('div', { class: 'fb-ctl', dir: 'ltr' },
    h('button', { type: 'button', class: 'round', 'aria-label': a1, onclick: bump(-d) }, '−'), h('span', {}, label),
    h('button', { type: 'button', class: 'round', 'aria-label': a2, onclick: bump(d) }, '+'));
  draw();
  return {
    el: h('div', { class: 'zgeo-clkset' }, stage, h('div', { class: 'zgeo-clk-ctl' }, pair('שעה', 60, 'שעה אחורה', 'שעה קדימה'), pair('דקות', step, 'דקות אחורה', 'דקות קדימה')),
      h('p', { class: 'tip' }, 'גררו את המחוגים, או לחצו על + ועל −.')),
    value: () => (moved ? { h: hr12(t), m: t % 60 } : null),
    set(a) {
      t = norm((a.h % 12) * 60 + a.m);
      moved = true;
      draw();
    },
    lock() {
      locked = true;
    },
  };
}
// a round where the player sets the clock to time T (minutes after 12:00)
const setRound = (T, step, { prompt, visual, hints, explain }) => ({
  prompt, visual, widget: clockSet(step), answer: { h: hr12(T), m: norm(T) % 60 },
  check: v => v.h % 12 === hr12(T) % 12 && v.m === norm(T) % 60,
  wrongMsg: v => (v.m !== norm(T) % 60 ? 'בדקו את המחוג הארוך, של הדקות.' : 'הדקות נכונות. בדקו את המחוג הקצר, של השעות.'),
  hints, explain,
});
const typeTime = (T, { prompt, visual, hints, explain }) => ({
  prompt, visual, widget: inputs(`<div class="ans-line">${M(`${box('h', 2)}:${box('m', 2)}`)}</div>`), answer: { h: hr12(T), m: norm(T) % 60 },
  check: v => v.h % 12 === hr12(T) % 12 && v.m === norm(T) % 60, hints, explain,
});
const nextH = H => (H % 12) + 1;
const say = T => {
  const H = hr12(T), m = norm(T) % 60;
  return m === 0 ? `${H} בדיוק` : m === 30 ? `${H} וחצי` : m === 15 ? `${H} ורבע` : m === 45 ? `רבע ל־${nextH(H)}` : m < 30 ? `${m} דקות אחרי ${H}` : `${60 - m} דקות לפני ${nextH(H)}`;
};
const readExplain = T => {
  const H = hr12(T), m = norm(T) % 60;
  return m === 0 ? `המחוג הקצר מצביע בדיוק על ${H}, והמחוג הארוך על 12. השעה ${TM(T)}.`
    : `המחוג הקצר עבר את ${H} ועוד לא הגיע ל־${nextH(H)}, ולכן השעה ${H} ומשהו. המחוג הארוך מראה ${m} דקות. השעה ${TM(T)}.`;
};
const clockRead = {
  id: 'zgeo-clock', title: 'קוראים שעון',
  intro: `<p>בשעון יש שני מחוגים. ה<b>קצר</b> מראה את השעה, וה<b>ארוך</b> מראה את הדקות. כל מספר שהמחוג הארוך עובר הוא 5 דקות.</p>
    <div class="ex">המחוג הקצר בין 3 ל־4, והארוך על 6: עברו ${M('6 × 5 = 30')} דקות מאז 3. השעה ${tm(3, 30)}, שלוש וחצי.</div>
    <p>כדי לכוון שעון, גוררים את המחוגים או לוחצים על הכפתורים + ו־−. כשהמחוג הארוך מסתובב, גם הקצר זז, כמו בשעון אמיתי.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2), m = Math.random() < 0.7 ? pick([0, 30]) : pick([15, 45]), H = rnd(1, 11), T = H * 60 + m;
      const hints = ['המחוג הקצר מראה את השעה, והארוך מראה את הדקות.', m === 0 ? 'בשעה עגולה המחוג הארוך מצביע על 12.' : m === 30 ? 'בחצי שעה המחוג הארוך מצביע על 6, והקצר באמצע בין שני מספרים.' : m === 15 ? 'ברבע אחרי, המחוג הארוך מצביע על 3.' : 'ברבע לפני, המחוג הארוך מצביע על 9, והקצר כמעט הגיע למספר הבא.'];
      if (t === 0) {
        const cands = [T, (m / 5 || 12) * 60 + H * 5, T + 60, T - 60, T + 30, T - 30].map(norm).filter((x, i, a) => a.indexOf(x) === i && (x % 60) % 5 === 0);
        const opts = shuffle([T, ...shuffle(cands.slice(1)).slice(0, 3)]), ans = opts.indexOf(T);
        return {
          prompt: 'מה השעה בשעון של המכלאה?', visual: clockPic(T), widget: choice(opts.map(x => TM(x)), { cols: 2, cls: 'nums' }), answer: ans, check: v => v === ans,
          hints, explain: readExplain(T),
        };
      }
      if (t === 1) {
        const words = Math.random() < 0.5;
        return setRound(T, 15, { prompt: `ארוחת הצהריים של הזברות ב־${words ? say(T) : TM(T)}. כוונו את השעון.`, hints, explain: `המחוג הארוך על ${m / 5 || 12}, והמחוג הקצר ${m ? `בין ${H} ל־${nextH(H)}` : `על ${H}`}.` });
      }
      const cands = [T, (m / 5 || 12) * 60 + H * 5, T + 60, T - 60, T + 30].map(norm).filter((x, i, a) => a.indexOf(x) === i && (x % 60) % 5 === 0);
      const opts = shuffle([T, ...shuffle(cands.slice(1)).slice(0, 3)]), ans = opts.indexOf(T);
      return {
        prompt: `איזה שעון מראה ${say(T)}?`, widget: choice(opts.map(x => clockFace(x)), { cols: 2, cls: 'zgeo-pics zgeo-clks' }), answer: ans, check: v => v === ans,
        hints, explain: `${say(T)} היא ${TM(T)}: המחוג הארוך על ${m / 5 || 12}, והמחוג הקצר ${m ? `בין ${H} ל־${nextH(H)}` : `על ${H}`}.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2), H = rnd(1, 12), m = rnd(1, 11) * 5, T = norm(H * 60 + m);
      const hints = ['המחוג הקצר מראה את השעה: קחו את המספר שהוא כבר עבר.', `ספרו בקפיצות של 5 מ־12 ועד המחוג הארוך: 5, 10, 15...`];
      if (t === 0) return typeTime(T, { prompt: 'מה השעה? כתבו שעות ודקות.', visual: clockPic(T), hints, explain: readExplain(T) });
      if (t === 1) {
        const words = Math.random() < 0.6;
        return setRound(T, 5, {
          prompt: `הזברות יוצאות לטיול ב־${words ? say(T) : TM(T)}. כוונו את השעון.`,
          hints: ['המחוג הארוך מראה את הדקות: כל מספר הוא 5 דקות.', `${say(T)} היא ${TM(T)}. המחוג הארוך צריך להצביע על ${m / 5}.`],
          explain: `${TM(T)}: המחוג הארוך על ${m / 5} (${M(`${m / 5} × 5 = ${m}`)} דקות), והקצר בין ${H} ל־${nextH(H)}.`,
        });
      }
      if (Math.random() < 0.5) {
        const Hh = rnd(1, 12), o = ['על 12', 'על 6', 'על 3', `על ${Hh}`].filter((x, i, a) => a.indexOf(x) === i);
        if (o.length < 4) o.push('על 9');
        const opts = shuffle(o), ans = opts.indexOf('על 12');
        return {
          prompt: `המחוג הקצר מצביע בדיוק על ${Hh}. איפה המחוג הארוך?`, visual: clockPic(Hh * 60, { minute: false }),
          widget: choice(opts, { cols: 2 }), answer: ans, check: v => v === ans,
          hints: ['המחוג הקצר מצביע בדיוק על מספר רק בשעה עגולה.', 'בשעה עגולה עברו 0 דקות.'],
          explain: `המחוג הקצר בדיוק על ${Hh} רק כשהשעה ${tm(Hh, 0)}, ואז המחוג הארוך על 12.`,
        };
      }
      const Hh = rnd(1, 12), opts = shuffle(['על 12', 'על 6', 'על 3', 'על 9']), ans = opts.indexOf('על 6');
      return {
        prompt: `המחוג הקצר נמצא בדיוק באמצע בין ${Hh} ל־${nextH(Hh)}. איפה המחוג הארוך?`, visual: clockPic(Hh * 60 + 30, { minute: false }),
        widget: choice(opts, { cols: 2 }), answer: ans, check: v => v === ans,
        hints: ['בשעה אחת המחוג הקצר עובר ממספר אחד למספר הבא. באמצע הדרך עברה חצי שעה.', 'חצי שעה היא 30 דקות.'],
        explain: `באמצע הדרך עברה חצי שעה: השעה ${tm(Hh, 30)}, והמחוג הארוך על 6.`,
      };
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const T = rnd(60, 779), plain = Math.random() < 0.5, TT = norm(T);
      return typeTime(TT, {
        prompt: plain ? 'בשעון הזה אין מספרים! מה השעה?' : 'מה השעה, בדיוק עד הדקה?', visual: clockPic(TT, { nums: plain ? false : true }),
        hints: ['בין כל שני מספרים יש 5 שנתות קטנות, וכל שנתה היא דקה אחת.', `ספרו בקפיצות של 5 עד הקו הארוך האחרון לפני המחוג, והוסיפו את השנתות הקטנות. המחוג הקצר עבר את ${hr12(TT)}.`],
        explain: readExplain(TT),
      });
    }
    if (t === 1) {
      const H = rnd(1, 11), m = rnd(1, 59), T = H * 60 + m, words = m % 5 && Math.random() < 0.5;
      return setRound(T, 1, {
        prompt: `השומר מאכיל את הזברות ב־${words ? say(T) : TM(T)}. כוונו את השעון בדיוק.`,
        hints: ['כל שנתה קטנה היא דקה אחת. אפשר לגרור, ואז לתקן בכפתורי הדקות.', `${TM(T)}: המחוג הארוך ${m % 5 ? `${m % 5} שנתות אחרי ${Math.floor(m / 5) || 12}` : `על ${m / 5}`}.`],
        explain: `${TM(T)}: המחוג הארוך על השנתה של ${m} דקות, והקצר ${m < 30 ? 'קצת אחרי' : 'יותר מחצי הדרך אחרי'} ${H}.`,
      });
    }
    if (t === 2) {
      const T = rnd(1, 11) * 60 + rnd(1, 11) * 5, seen = norm(720 - T);
      return typeTime(T, {
        prompt: 'הקוף מחזיק מראה, ובמראה רואים את השעון. מה השעה באמת?', visual: clockPic(T, { nums: false, mirror: true }),
        hints: ['במראה ימין ושמאל מתחלפים. מחוג שנראה בצד ימין נמצא באמת בצד שמאל.', `במראה נראה כאילו השעה ${TM(seen)}. דמיינו את המחוגים בצד השני של ה־12.`],
        explain: `במראה השעון נראה כמו ${TM(seen)}, אבל ימין ושמאל מתחלפים. השעה האמיתית היא ${TM(T)}. בדיקה: ${M(`${TM(seen).replace(/<[^>]+>/g, '')} + ${TM(T).replace(/<[^>]+>/g, '')} = 12:00`)}.`,
      });
    }
    const H = rnd(1, 12), m = pick([0, 15, 30, 45]), T = H * 60 + m;
    return typeTime(T, {
      prompt: 'המחוג הארוך נעלם! לפי המחוג הקצר בלבד, מה השעה?', visual: clockPic(T, { minute: false }),
      hints: ['בשעה אחת המחוג הקצר עובר ממספר אחד לבא אחריו. כמה מהדרך הוא כבר עבר?', 'רבע מהדרך הוא 15 דקות, חצי הדרך 30, ושלושה רבעים 45.'],
      explain: m === 0 ? `המחוג הקצר בדיוק על ${H}, ולכן השעה ${TM(T)}.` : `המחוג הקצר עבר ${m === 15 ? 'רבע' : m === 30 ? 'חצי' : 'שלושה רבעים'} מהדרך מ־${H} ל־${nextH(H)}, כלומר ${m} דקות. השעה ${TM(T)}.`,
    });
  },
};

// =====================================================================
const dur = d => {
  const hh = Math.floor(d / 60), mm = d % 60, H = hh === 0 ? '' : hh === 1 ? 'שעה' : hh === 2 ? 'שעתיים' : `${hh} שעות`, Mm = mm ? `${mm} דקות` : '';
  return H && Mm ? `${H} ו־${Mm}` : H || Mm;
};
const elapsed = {
  id: 'zgeo-time', title: 'כמה זמן עבר?',
  intro: `<p>כדי לדעת כמה זמן עבר, הולכים מהשעה של ההתחלה לשעה של הסוף בקפיצות נוחות: קודם עד השעה העגולה, ואחר כך הלאה.</p>
    <div class="ex">מ־${tm(9, 40)} עד ${tm(10, 15)}: עד ${tm(10, 0)} עוברות 20 דקות, ומשם עוד 15. יחד ${M('20 + 15 = 35')} דקות.</div>
    <p>בשעה יש 60 דקות. חצי שעה היא 30 דקות, ורבע שעה היא 15 דקות.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        const d = rnd(2, 4), H1 = rnd(1, 11 - d), H2 = H1 + d;
        return num({
          prompt: 'הזברות יצאו לטייל וחזרו. כמה שעות הן טיילו?', visual: twoClocks(H1 * 60, H2 * 60, 'יצאו', 'חזרו'), answer: d, post: ' שעות',
          hints: ['בדקו לאן מצביע המחוג הקצר בכל שעון.', `הן יצאו ב־${H1} וחזרו ב־${H2}. ספרו: ${range(d, i => H1 + i + 1).join(', ')}.`],
          explain: `מ־${tm(H1, 0)} עד ${tm(H2, 0)} עוברות ${dur(d * 60)}, כי ${M(`${H2} − ${H1} = ${d}`)}.`,
        });
      }
      if (t === 1) {
        const LB = ['חצי שעה', 'שעה', 'שעה וחצי', 'שעתיים', 'שעתיים וחצי'], k = rnd(0, 4), D = (k + 1) * 30, S = rnd(2, 18) * 30;
        const lo = k === 0 ? 0 : k === 4 ? 1 : rnd(0, 1), opts = LB.slice(lo, lo + 4), ans = opts.indexOf(LB[k]);
        return {
          prompt: 'כמה זמן נמשכה ההופעה של התוכים?', visual: twoClocks(S, S + D, 'התחילה', 'נגמרה'), widget: choice(opts, { cols: 2 }), answer: ans, check: v => v === ans,
          hints: ['קראו את השעה בכל שעון.', `ההופעה התחילה ב־${TM(S)} ונגמרה ב־${TM(S + D)}. קפצו בחצאי שעות.`],
          explain: `מ־${TM(S)} עד ${TM(S + D)} עוברות ${LB[k]}.`,
        };
      }
      const S = rnd(1, 9) * 60 + pick([0, 0, 30]), d = rnd(1, 3);
      return setRound(S + d * 60, 30, {
        prompt: `ההאכלה מתחילה ב־${TM(S)} ונמשכת ${dur(d * 60)}. כוונו את השעון לשעה שבה היא נגמרת.`,
        hints: ['בכל שעה המחוג הקצר זז מספר אחד קדימה, והמחוג הארוך עושה סיבוב שלם.', `${TM(S)} ועוד ${dur(d * 60)}: הוסיפו ${d} לשעה.`],
        explain: `${TM(S)} ועוד ${dur(d * 60)} זה ${TM(S + d * 60)}.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 3);
      if (t === 0) {
        const H = rnd(1, 10), m1 = rnd(6, 11) * 5, d = rnd(Math.max(3, 13 - m1 / 5), 11) * 5, S = H * 60 + m1, E = S + d;
        return num({
          prompt: 'כמה דקות נמשך המשחק של הקופים?', visual: twoClocks(S, E, 'התחיל', 'נגמר'), answer: d, post: ' דקות',
          hints: ['קראו את שני השעונים. אחר כך חשבו כמה דקות עד השעה העגולה, וכמה אחריה.', `מ־${TM(S)} עד ${TM(H * 60 + 60)} יש ${60 - m1} דקות, ומשם עד ${TM(E)} עוד ${E % 60}.`],
          explain: `מ־${TM(S)} עד ${TM(E)} עוברות ${M(`${60 - m1} + ${E % 60} = ${d}`)} דקות.`,
        });
      }
      if (t === 1) {
        const S = rnd(7, 10) * 60 + rnd(0, 11) * 5, d = rnd(13, 34) * 5, E = S + d;
        return nums({
          prompt: `הסרט על הזברות התחיל ב־${TM(S)} ונגמר ב־${TM(E)}. כמה זמן הוא נמשך?`, fields: [['שעות:', Math.floor(d / 60)], ['דקות:', d % 60]],
          hints: ['קפצו קודם בשעות שלמות, כל עוד לא עוברים את הסוף.', `מ־${TM(S)} עד ${TM(S + Math.floor(d / 60) * 60)} עוברות ${dur(Math.floor(d / 60) * 60)}. כמה דקות נשארו עד ${TM(E)}?`],
          explain: `${dur(Math.floor(d / 60) * 60)} מביאות אותנו ל־${TM(S + Math.floor(d / 60) * 60)}, ומשם עוד ${d % 60} דקות עד ${TM(E)}. יחד ${dur(d)}.`,
        });
      }
      const S = rnd(1, 10) * 60 + rnd(0, 11) * 5, d = rnd(4, 19) * 5;
      if (t === 2)
        return setRound(S + d, 5, {
          prompt: `השחייה של הפילים מתחילה ב־${TM(S)} ונמשכת ${dur(d)}. כוונו את השעון לסוף השחייה.`,
          hints: ['הוסיפו את הדקות לאט: קודם עד השעה העגולה, ואחר כך את השאר.', `${TM(S)} ועוד ${dur(d)} זה ${TM(S + d)}.`],
          explain: `${TM(S)} ועוד ${dur(d)} זה ${TM(S + d)}.`,
        });
      return setRound(S, 5, {
        prompt: `הטיול של הזברות נגמר ב־${TM(S + d)}, והוא נמשך ${dur(d)}. כוונו את השעון לשעה שבה הטיול התחיל.`,
        hints: ['הפעם הולכים אחורה בזמן: מורידים את משך הטיול מהשעה של הסוף.', `${TM(S + d)} פחות ${dur(d)} זה ${TM(S)}.`],
        explain: `${TM(S + d)} פחות ${dur(d)} זה ${TM(S)}. בדיקה: ${TM(S)} ועוד ${dur(d)} זה ${TM(S + d)}.`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const S = rnd(8, 10) * 60 + rnd(0, 11) * 5, d1 = rnd(8, 19) * 5, b = rnd(2, 5) * 5, d2 = rnd(6, 12) * 5, E = S + d1 + b + d2;
      return setRound(E, 5, {
        prompt: `ההופעה הראשונה של הזברות מתחילה ב־${TM(S)} ונמשכת ${dur(d1)}. אחריה יש הפסקה של ${b} דקות, ואז הופעה שנייה של ${dur(d2)}. מתי נגמרת ההופעה השנייה?`,
        hints: ['חשבו שלב אחרי שלב: סוף ההופעה הראשונה, סוף ההפסקה, סוף ההופעה השנייה.', `ההופעה הראשונה נגמרת ב־${TM(S + d1)}, וההפסקה ב־${TM(S + d1 + b)}.`],
        explain: `${TM(S)} ← ${TM(S + d1)} ← ${TM(S + d1 + b)} ← ${TM(E)}.`,
      });
    }
    if (t === 1) {
      const S = rnd(7, 9) * 60 + rnd(1, 11) * 5, d = rnd(24, 45) * 5, E = S + d;
      return num({
        prompt: `השומרים עבדו מ־${TM(S)} עד ${TM(E)}. כמה דקות הם עבדו?`, answer: d, post: ' דקות',
        hints: ['חשבו קודם כמה זמן עבר בשעות ובדקות, ואחר כך הפכו הכול לדקות.', `עברו ${dur(d)}. בכל שעה יש 60 דקות.`],
        explain: `עברו ${dur(d)}: ${M(`${Math.floor(d / 60)} × 60 + ${d % 60} = ${d}`)} דקות.`,
      });
    }
    if (t === 2) {
      const S = 11 * 60 + rnd(2, 11) * 5, d = rnd(10, 30) * 5, E = S + d, eh = Math.floor(E / 60), em = E % 60;
      return num({
        prompt: `ההאכלה התחילה ב־${tm(11, S % 60)} ונגמרה ב־${tm(eh, em)}. כמה דקות היא נמשכה?`, answer: d, post: ' דקות',
        hints: [`${tm(12, 0)} היא שעה עגולה נוחה. כמה דקות עד אליה, וכמה אחריה?`, `עד ${tm(12, 0)} יש ${60 - (S % 60)} דקות, ומ־${tm(12, 0)} עד ${tm(eh, em)} יש ${E - 720} דקות.`],
        explain: `${M(`${60 - (S % 60)} + ${E - 720} = ${d}`)} דקות${eh > 12 ? `. שימו לב: ${tm(eh, em)} היא ${tm(eh - 12, em)} אחרי הצהריים` : ''}.`,
      });
    }
    const k = rnd(1, 4) * 5, slow = Math.random() < 0.5, shown = rnd(1, 11) * 60 + rnd(0, 11) * 5, real = slow ? shown + k : shown - k;
    return setRound(real, 5, {
      prompt: `השעון של המכלאה ${slow ? 'מאחר' : 'ממהר'} ב־${k} דקות, והוא מראה ${TM(shown)}. כוונו את השעון לשעה האמיתית.`,
      hints: [slow ? 'שעון שמאחר נשאר מאחור: הוא מראה פחות מהשעה האמיתית.' : 'שעון שממהר רץ קדימה: הוא מראה יותר מהשעה האמיתית.', slow ? `צריך להוסיף ${k} דקות.` : `צריך להוריד ${k} דקות.`],
      explain: `${TM(shown)} ${slow ? 'ועוד' : 'פחות'} ${k} דקות זה ${TM(real)}.`,
    });
  },
};

// =====================================================================
const COINS = {
  10: ['10', 'אג׳', 19, 'cu'], 50: ['50', 'אג׳', 22, 'cu'], 100: ['1', '₪', 20, 'ag'], 200: ['2', '₪', 23, 'ag'], 500: ['5', '₪', 25, 'ag'], 1000: ['10', '₪', 26, 'bi'],
  2000: ['20', 'n20'], 5000: ['50', 'n50'], 10000: ['100', 'n100'], 20000: ['200', 'n200'],
};
function coinSVG(d) {
  const [t, u, R, k] = COINS[d];
  if (!R) return `<svg viewBox="-38 -21 76 42" class="zgeo-coin" style="width:68px"><rect x="-36" y="-19" width="72" height="38" rx="5" class="zgeo-note zgeo-${u}"/><circle cx="-21" r="9" class="zgeo-wm"/><text x="9" y="3" class="zgeo-ct">${t}</text><text x="9" y="14" class="zgeo-cu">₪</text></svg>`;
  const body = d === 500 ? `<polygon points="${ptsAttr(range(12, i => [R * Math.cos(rad(15 + 30 * i)), R * Math.sin(rad(15 + 30 * i))]))}" class="zgeo-m-${k}"/>` : `<circle r="${R}" class="zgeo-m-${k}"/>`;
  return `<svg viewBox="${-R - 1} ${-R - 1} ${2 * R + 2} ${2 * R + 2}" class="zgeo-coin" style="width:${Math.round((2 * R + 2) * 1.12)}px">${body}${k === 'bi' ? `<circle r="${R - 6}" class="zgeo-m-au"/>` : ''}<text y="3" class="zgeo-ct">${t}</text><text y="${f1(R * 0.62)}" class="zgeo-cu">${u}</text></svg>`;
}
const sumM = a => (a.length > 1 ? M(`${a.join(' + ')} = ${a.reduce((x, y) => x + y, 0)}`) : M(a[0] || 0));
const coinRow = list => `<div class="zgeo-coins" dir="ltr">${[...list].sort((a, b) => b - a).map(coinSVG).join('')}</div>`;
const money = ag => {
  const s = Math.floor(ag / 100), a = ag % 100, sp = s === 1 ? 'שקל אחד' : `${s} שקלים`;
  return !a ? sp : !s ? `${a} אגורות` : `${sp} ו־${a} אגורות`;
};
const piece = (d, k) => (k === 1 ? `${d >= 2000 ? 'שטר' : 'מטבע'} של ${money(d)}` : `${k} ${d >= 2000 ? 'שטרות' : 'מטבעות'} של ${money(d)}`);
const DEN = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 10];
const greedy = (ag, dens = DEN) => {
  const out = [];
  for (const d of dens) while (ag >= d) (out.push(d), (ag -= d));
  return out;
};
const describe = list => andJoin(DEN.filter(d => list.includes(d)).map(d => piece(d, list.filter(x => x === d).length)));

// Tap coins and notes to put them on the counter; tap one on the counter to take it back.
function payWidget(dens) {
  const got = [];
  let locked = false;
  const tray = h('div', { class: 'zgeo-tray', dir: 'ltr' }), pal = h('div', { class: 'zgeo-pal', dir: 'ltr' });
  const draw = () => {
    tray.innerHTML = '';
    if (!got.length) tray.append(h('span', { class: 'zgeo-empty' }, 'הדלפק ריק'));
    [...got].sort((a, b) => b - a).forEach(d =>
      tray.append(h('button', { type: 'button', class: 'zgeo-cbtn', 'aria-label': 'להחזיר ' + money(d), html: coinSVG(d), onclick: () => {
        if (locked) return;
        got.splice(got.indexOf(d), 1);
        draw();
      } })));
  };
  dens.forEach(d => pal.append(h('button', { type: 'button', class: 'zgeo-cbtn', 'aria-label': money(d), html: coinSVG(d), onclick: () => {
    if (locked || got.length >= 30) return;
    got.push(d);
    draw();
  } })));
  draw();
  const el = h('div', { class: 'zgeo-pay' }, h('div', { class: 'zgeo-lbl' }, 'על הדלפק:'), tray, h('div', { class: 'zgeo-lbl' }, 'בארנק (לחצו כדי להניח על הדלפק):'), pal);
  return {
    el,
    value: () => (got.length ? { total: got.reduce((x, y) => x + y, 0), count: got.length } : null),
    set(a) {
      got.length = 0;
      got.push(...a);
      draw();
    },
    lock() {
      locked = true;
      el.classList.add('locked');
    },
  };
}
const payRound = (target, dens, { prompt, visual, fewest = false, hints, explain }) => {
  const best = greedy(target, dens.slice().sort((a, b) => b - a));
  return {
    prompt, visual, widget: payWidget(dens), answer: best,
    check: v => v.total === target && (!fewest || v.count === best.length),
    wrongMsg: v => (v.total === target ? `הסכום נכון, אבל אפשר עם פחות: מספיקים ${best.length}.` : v.total > target ? `שמתם ${money(v.total)}, וזה יותר מדי.` : `שמתם ${money(v.total)}, וזה פחות מדי.`),
    hints, explain,
  };
};
const shAg = () => inputs(`<div class="ans-line">${box('s', 3)} שקלים ו־${box('a', 2)} אגורות</div>`);
const agRound = (ag, { prompt, visual, hints, explain }) => ({
  prompt, visual, widget: shAg(), answer: { s: Math.floor(ag / 100), a: ag % 100 },
  check: v => v.a < 100 && v.s * 100 + v.a === ag, hints, explain,
});
const coins = {
  id: 'zgeo-money', title: 'כסף ועודף',
  intro: `<p>בשקל אחד יש 100 אגורות. המטבעות: 10 אגורות, 50 אגורות (חצי שקל), שקל, 2 שקלים, 5 שקלים ו־10 שקלים. השטרות: 20, 50, 100 ו־200 שקלים.</p>
    <div class="ex">קונים גלידה ב־7 שקלים ומשלמים 10: העודף הוא ${M('10 − 7 = 3')} שקלים.</div>
    <p>כדי לשלם, לוחצים על מטבעות ושטרות בארנק והם עוברים לדלפק. לחיצה על מטבע שעל הדלפק מחזירה אותו.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        const item = pick(['גלידה', 'בלון', 'כובע זברה', 'ספר על חיות', 'בובת זברה', 'משקפת']), p = rnd(3, 35);
        return payRound(p * 100, [100, 200, 500, 1000, 2000], {
          prompt: `בחנות של גן החיות, ${item} עולה ${money(p * 100)}. שלמו בדיוק.`,
          hints: ['התחילו מהשטר או מהמטבע הגדול ביותר שלא עובר את המחיר.', `למשל: ${describe(greedy(p * 100))}.`],
          explain: `אפשר לשלם ${describe(greedy(p * 100))}. יש גם דרכים אחרות.`,
        });
      }
      if (t === 1) {
        let list;
        do list = range(rnd(3, 6), () => pick([100, 200, 500, 1000, 1000, 2000]));
        while (list.reduce((x, y) => x + y, 0) > 5000);
        const tot = list.reduce((x, y) => x + y, 0) / 100, srt = [...list].sort((a, b) => b - a).map(x => x / 100);
        return num({
          prompt: 'כמה כסף יש בקופה של הזברה?', visual: coinRow(list), answer: tot, post: ' שקלים',
          hints: ['התחילו מהשטר או מהמטבע הגדול ביותר, והמשיכו לספור הלאה.', `${M(srt.join(' + '))}`],
          explain: `${M(`${srt.join(' + ')} = ${tot}`)} שקלים.`,
        });
      }
      const pay = pick([10, 10, 20, 20, 50]), p = rnd(pay === 10 ? 2 : 6, pay - 1);
      return num({
        prompt: `קניתם ${pick(['תירס לזברות', 'מדבקה של זברה', 'בקבוק מים', 'עפיפון'])} ב־${p} שקלים, ושילמתם ב${pay === 10 ? 'מטבע' : 'שטר'} של ${pay} שקלים. כמה עודף תקבלו?`,
        visual: coinRow([pay * 100]), answer: pay - p, post: ' שקלים',
        hints: ['העודף הוא מה שנשאר מהכסף ששילמתם, אחרי שמורידים את המחיר.', `ספרו מ־${p} עד ${pay}.`],
        explain: `${M(`${pay} − ${p} = ${pay - p}`)} שקלים.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 3), price = rnd(2, 18) * 100 + rnd(1, 9) * 10;
      if (t === 0)
        return payRound(price, [10, 50, 100, 200, 500, 1000, 2000], {
          prompt: `שקית אוכל לזברות עולה ${money(price)}. שלמו בדיוק.`,
          hints: ['שלמו קודם את השקלים, ואחר כך את האגורות.', `${money(price - (price % 100))} ועוד ${price % 100} אגורות. למשל: ${describe(greedy(price))}.`],
          explain: `אפשר לשלם ${describe(greedy(price))}.`,
        });
      if (t === 1) {
        const pay = price < 1000 && Math.random() < 0.5 ? 1000 : 2000, ch = pay - price, up = price + 100 - (price % 100);
        return agRound(ch, {
          prompt: `כובע עולה ${money(price)}. שילמו ב${pay === 1000 ? 'מטבע' : 'שטר'} של ${money(pay)}. כמה עודף מקבלים?`,
          hints: ['השלימו קודם לשקל השלם הבא, ואחר כך עד הסכום ששילמו.', `מ־${money(price)} עד ${money(up)} חסרות ${up - price} אגורות, ומשם עד ${money(pay)} עוד ${money(pay - up)}.`],
          explain: `${up - price} אגורות ועוד ${money(pay - up)}: העודף הוא ${money(ch)}.`,
        });
      }
      if (t === 2) {
        const p2 = rnd(10, 19) * 100 + pick([10, 20, 50, 60, 80, 90]), ch = 2000 - p2;
        return payRound(ch, [10, 50, 100, 200, 500, 1000], {
          prompt: `אתם בקופה של גן החיות. ילד קנה זברה מפלסטיק ב־${money(p2)} ושילם בשטר של 20 שקלים. תנו לו את העודף.`,
          hints: [`השלימו מ־${money(p2)} עד 20 שקלים.`, `העודף הוא ${money(ch)}.`],
          explain: `20 שקלים פחות ${money(p2)} הם ${money(ch)}. אפשר לתת ${describe(greedy(ch))}.`,
        });
      }
      let list;
      do list = range(rnd(4, 7), () => pick([10, 10, 50, 50, 100, 200, 500, 1000]));
      while (list.reduce((x, y) => x + y, 0) % 100 === 0);
      const tot = list.reduce((x, y) => x + y, 0), sh = list.filter(x => x >= 100).map(x => x / 100).sort((a, b) => b - a), ag = list.filter(x => x < 100).sort((a, b) => b - a);
      return agRound(tot, {
        prompt: 'כמה כסף יש כאן?', visual: coinRow(list),
        hints: ['ספרו קודם את השקלים, ואחר כך את האגורות. כל 100 אגורות הן עוד שקל.', `שקלים: ${M(sh.join(' + ') || '0')}. אגורות: ${M(ag.join(' + '))}. אם יש 100 אגורות או יותר, הפכו 100 מהן לשקל.`],
        explain: `שקלים: ${sumM(sh)}. אגורות: ${sumM(ag)}. יחד ${money(tot)}.`,
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const price = rnd(12, 189) * 100 + rnd(0, 9) * 10, best = greedy(price);
      return payRound(price, [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000], {
        prompt: `כרטיס משפחתי לגן החיות עולה ${money(price)}. שלמו בדיוק, עם כמה שפחות מטבעות ושטרות.`, fewest: true,
        hints: ['בכל פעם קחו את השטר או המטבע הגדול ביותר שעוד לא עובר את מה שנשאר לשלם.', `מספיקים ${best.length} מטבעות ושטרות.`],
        explain: `${describe(best)}: ${best.length} בסך הכול.`,
      });
    }
    if (t === 1) {
      let p, B, k, r;
      do [p, B] = [pick([120, 150, 180, 230, 250, 270, 320, 350, 380, 450, 650]), pick([1000, 2000, 5000])];
      while ((k = Math.floor(B / p)) < 2 || k > 14 || (r = B - k * p) === 0);
      return {
        prompt: `מנת אוכל לזברות עולה ${money(p)}. כמה מנות אפשר לקנות ב־${money(B)}, וכמה עודף יישאר?`,
        widget: inputs(`<div class="ans-line">${box('k', 2)} מנות</div><div class="zgeo-sub">העודף:</div><div class="ans-line">${box('s', 2)} שקלים ו־${box('a', 2)} אגורות</div>`),
        answer: { k, s: Math.floor(r / 100), a: r % 100 }, check: v => v.k === k && v.a < 100 && v.s * 100 + v.a === r,
        hints: ['הוסיפו מנה אחרי מנה, עד שהכסף כבר לא מספיק לעוד אחת.', `${k} מנות עולות ${money(k * p)}, ו־${k + 1} מנות כבר עולות ${money((k + 1) * p)}.`],
        explain: `${k} מנות עולות ${money(k * p)}, ועוד מנה כבר עולה יותר מ־${money(B)}. העודף: ${money(B)} פחות ${money(k * p)} הם ${money(r)}.`,
      };
    }
    if (t === 2) {
      const p1 = rnd(5, 30) * 100 + rnd(1, 9) * 10, p2 = rnd(3, 20) * 100 + rnd(1, 9) * 10, s = p1 + p2, pay = s < 5000 ? 5000 : 10000;
      return agRound(pay - s, {
        prompt: `קניתם חולצה עם זברה ב־${money(p1)} וספר ב־${money(p2)}, ושילמתם בשטר של ${money(pay)}. כמה עודף תקבלו?`,
        hints: ['חברו קודם את שני המחירים: שקלים עם שקלים ואגורות עם אגורות.', `יחד: ${money(s)}.`],
        explain: `יחד ${money(s)}. העודף: ${money(pay)} פחות ${money(s)} הם ${money(pay - s)}.`,
      });
    }
    const n = rnd(4, 10), ways = Math.floor(n / 2) + 1;
    return num({
      prompt: `בכמה דרכים שונות אפשר לשלם ${n} שקלים רק במטבעות של שקל ושל 2 שקלים? (הסדר לא חשוב)`, answer: ways, post: ' דרכים',
      hints: ['סדרו את הדרכים לפי מספר המטבעות של 2 שקלים: אפס, אחד, שניים...', `אפשר לשים מ־0 עד ${Math.floor(n / 2)} מטבעות של 2 שקלים, ואת השאר משלימים בשקלים.`],
      explain: `יש ${ways} דרכים:<br>${range(ways, k => M([...range(k, () => 2), ...range(n - 2 * k, () => 1)].join(' + '))).join('<br>')}`,
    });
  },
};

// =====================================================================
const fence = {
  id: 'zgeo-perim', title: 'היקף ברשת משבצות',
  intro: `<p><b>היקף</b> הוא האורך של הקו שמקיף את הצורה, כמו גדר מסביב למכלאה. ברשת משבצות סופרים את הצלעות של המשבצות שעל הגבול.</p>
    <div class="ex">מכלאה בצורת מלבן של 4 על 2: ${M('4 + 2 + 4 + 2 = 12')}.</div>
    <p>כשצריך לצייר, לוחצים על משבצות או גוררים עליהן כדי לצבוע. לחיצה נוספת מוחקת.</p>`,
  gen(L) {
    const count = (cells, prompt, extra = '') => {
      const { cells: c, rows, cols } = place(cells), P = perimOf(c), u = Math.min(30, 300 / cols);
      return num({
        prompt, visual: cellsSVG(c, rows, cols, { u }), answer: P, post: ' מטרים',
        hints: ['לכו לאורך הקו העבה וספרו כל צלע של משבצת. סמנו בעיניים איפה התחלתם.', 'שימו לב לפינות שנכנסות פנימה: גם הקווים שלהן הם חלק מהגדר.'],
        explain: `${cellsSVG(c, rows, cols, { u, nums: true, mw: 230 })}מסביב למכלאה יש ${P} צלעות של משבצות, ולכן צריך ${P} מטרים של גדר.${extra}`,
      });
    };
    const drawRound = ({ prompt, rows, cols, answer, ok, why, hints }) => ({
      prompt, widget: lockedGrid(gridPaint({ rows, cols })), answer, check: v => v.length > 0 && ok(v), wrongMsg: why, hints,
      explain: 'אחת התשובות האפשריות מסומנת על הלוח.',
    });
    const told = v => {
      const r = rectOf(v);
      return r ? `ציירתם מלבן של ${r.w} על ${r.h}, וההיקף שלו ${2 * (r.w + r.h)}.` : connected(v) ? `לצורה שציירתם יש ${v.length} משבצות, וההיקף שלה ${perimOf(v)}.` : 'המשבצות צריכות להיות מחוברות זו לזו בצלע.';
    };
    if (L === 1) {
      if (Math.random() < 0.5) {
        const w = rnd(2, 6), ht = rnd(1, 4), P = 2 * (w + ht);
        return num({
          prompt: 'כמה מטרים של גדר צריך מסביב למכלאה? כל צלע של משבצת היא מטר אחד.', visual: cellsSVG(rectCells(w, ht), ht + 2, w + 2, { u: Math.min(30, 300 / (w + 2)) }), answer: P, post: ' מטרים',
          hints: ['לכו מסביב למכלאה וספרו את הצלעות של המשבצות.', `למעלה ${w}, בצד ${ht}, למטה עוד ${w} ובצד השני עוד ${ht}.`],
          explain: `${M(`${w} + ${ht} + ${w} + ${ht} = ${P}`)} מטרים.`,
        });
      }
      return count(shapeCells(rnd(4, 6)), 'כמה מטרים של גדר צריך מסביב למכלאה? כל צלע של משבצת היא מטר אחד.');
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const s = rnd(4, 9), w = Math.ceil(s / 2), ht = s - w, P = 2 * s;
        return drawRound({
          prompt: `ציירו מכלאה בצורת מלבן שההיקף שלה ${P} מטרים. כל צלע של משבצת היא מטר אחד.`, rows: 6, cols: 8, answer: rectCells(w, ht),
          ok: v => {
            const r = rectOf(v);
            return !!r && 2 * (r.w + r.h) === P;
          },
          why: told,
          hints: ['היקף של מלבן: אורך ועוד רוחב, ועוד פעם אורך ועוד רוחב.', `אורך ועוד רוחב צריכים להיות ${s} (חצי מ־${P}). למשל ${w} ו־${ht}.`],
        });
      }
      if (t === 1) return count(shapeCells(rnd(7, 11)), 'מה ההיקף של המכלאה? כל צלע של משבצת היא מטר אחד.');
      const a = rnd(2, 12), b = rnd(2, 12), P = 2 * (a + b);
      const pic = `<svg viewBox="-30 -34 250 144" class="zgeo-shape" style="max-width:250px"><rect x="0" y="0" width="180" height="96" class="zgeo-fill"/><text x="90" y="-12" class="zgeo-lab">${a}</text><text x="194" y="55" class="zgeo-lab">?</text></svg>`;
      return num({
        prompt: `ההיקף של מכלאה בצורת מלבן הוא ${P} מטרים. צלע אחת שלה ${a} מטרים. מה האורך של הצלע שמסומנת בסימן שאלה?`, visual: pic, answer: b, post: ' מטרים',
        hints: ['במלבן יש שני זוגות של צלעות שוות.', `שתי הצלעות של ${a} מטרים הן יחד ${2 * a}. נשארו ${P - 2 * a} מטרים לשתי הצלעות האחרות.`],
        explain: `${M(`${P} − ${a} − ${a} = ${P - 2 * a}`)}, ו־${M(`${P - 2 * a} ÷ 2 = ${b}`)} מטרים.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      let ans;
      do ans = blob(rnd(5, 8), (r, c) => r >= 0 && r < 6 && c >= 0 && c < 7, rnd(1, 4), rnd(1, 5));
      while (hasHole(ans));
      const A = ans.length, P = perimOf(ans);
      return drawRound({
        prompt: `ציירו מכלאה של ${A} משבצות שההיקף שלה ${P} מטרים. המשבצות צריכות להיות מחוברות בצלע.`, rows: 6, cols: 7, answer: ans,
        ok: v => connected(v) && v.length === A && perimOf(v) === P, why: told,
        hints: ['כשמשבצות צמודות זו לזו בצלע, ההיקף קטן. כשהן מסודרות בשורה ארוכה, הוא גדל.', `שורה אחת של ${A} משבצות היא בעלת היקף ${2 * A + 2}. כל צלע משותפת נוספת מקטינה את ההיקף ב־2.`],
      });
    }
    if (t === 1) {
      const A = rnd(6, 7), big = Math.random() < 0.5;
      let shapes;
      do shapes = range(3, () => shapeCells(A));
      while (new Set(shapes.map(perimOf)).size < 3);
      const Ps = shapes.map(perimOf), ans = Ps.indexOf(big ? Math.max(...Ps) : Math.min(...Ps)), lb = ['א', 'ב', 'ג'];
      return {
        prompt: `לכל המכלאות יש ${A} משבצות. לאיזו מהן צריך ${big ? 'הכי הרבה' : 'הכי מעט'} גדר?`,
        widget: choice(shapes.map((c, i) => {
          const p = place(c);
          return `${cellsSVG(p.cells, p.rows, p.cols, { u: 16 })}<span class="zgeo-cap">${lb[i]}</span>`;
        }), { cols: 3, cls: 'zgeo-pics' }), answer: ans, check: v => v === ans,
        hints: ['ספרו את ההיקף של כל מכלאה.', 'מכלאה "מפוזרת" עם הרבה פינות צריכה יותר גדר ממכלאה צפופה.'],
        explain: `ההיקפים: ${shapes.map((c, i) => `${lb[i]}: ${Ps[i]}`).join(', ')}. ${big ? 'הגדול' : 'הקטן'} ביותר הוא ${lb[ans]}.`,
      };
    }
    const s = rnd(4, 10), P = 2 * s, ways = Math.floor(s / 2);
    return num({
      prompt: `כמה מלבנים שונים, שאורכי הצלעות שלהם מספרים שלמים, יש עם היקף ${P} מטרים? (ריבוע הוא גם מלבן, ומלבן מסובב לא נחשב חדש)`, answer: ways, post: ' מלבנים',
      hints: [`אורך ועוד רוחב צריכים להיות ${s}.`, `נסו רוחב 1, 2, 3... כל עוד הרוחב לא גדול מהאורך.`],
      explain: `יש ${ways} מלבנים: ${andJoin(range(ways, i => M(`${i + 1} × ${s - i - 1}`)))}.`,
    });
  },
};

// =====================================================================
const F_ = (a, cls) => `<polygon points="${ptsAttr(a)}" class="${cls}"/>`;
const E_ = (a, b, hid) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${hid ? 'zgeo-hid' : 'zgeo-ed'}"/>`;
const solidFrame = (body, vb = '-90 -40 180 190', mw = 170) => `<svg viewBox="${vb}" class="zgeo-solid" style="max-width:${mw}px">${body}</svg>`;
function boxSVG(w, ht, d) {
  const dx = d * 0.62, dy = d * 0.48, x0 = -(w + dx) / 2, y0 = -30 + dy;
  const f = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + ht], [x0, y0 + ht]], b = f.map(([x, y]) => [x + dx, y - dy]);
  return solidFrame(F_(f, 'zgeo-s1') + F_([f[0], f[1], b[1], b[0]], 'zgeo-s2') + F_([f[1], b[1], b[2], f[2]], 'zgeo-s3') +
    E_(b[3], b[0], 1) + E_(b[3], b[2], 1) + E_(b[3], f[3], 1) +
    [[f[0], f[1]], [f[1], f[2]], [f[2], f[3]], [f[3], f[0]], [f[0], b[0]], [f[1], b[1]], [f[2], b[2]], [b[0], b[1]], [b[1], b[2]]].map(([p, q]) => E_(p, q)).join(''),
  `-100 -40 200 ${Math.round(ht + dy + 20)}`);
}
function prismSVG(n, pyr = false) {
  const off = n === 3 ? 75 : n === 4 ? 60 : n === 5 ? 90 : 120, rx = 72, ry = 24, top = -10, bot = pyr ? 118 : 104;
  const A = range(n, i => rad(off + (360 * i) / n)), base = A.map(a => [rx * Math.cos(a), bot + ry * Math.sin(a)]);
  const up = pyr ? null : A.map(a => [rx * Math.cos(a), top + ry * Math.sin(a)]), apex = [0, -30];
  const front = range(n, i => Math.sin((A[i] + A[(i + 1) % n] + (i === n - 1 ? 2 * Math.PI : 0)) / 2) > 0.01);
  let s = '';
  range(n).forEach(i => {
    if (!front[i]) return;
    const j = (i + 1) % n;
    const mid = (A[i] + A[j] + (j === 0 ? 2 * Math.PI : 0)) / 2;
    s += F_(pyr ? [base[i], base[j], apex] : [base[i], base[j], up[j], up[i]], Math.cos(mid) < 0 ? 'zgeo-s1' : 'zgeo-s3');
  });
  if (!pyr) s += F_(up, 'zgeo-s2');
  range(n).forEach(i => {
    const j = (i + 1) % n, vis = front[i], vVis = front[i] || front[(i + n - 1) % n];
    s += E_(base[i], base[j], !vis) + E_(base[i], pyr ? apex : up[i], !vVis);
    if (!pyr) s += E_(up[i], up[j]);
  });
  return solidFrame(s, '-90 -40 180 190');
}
const cylSVG = () => solidFrame('<path d="M-60 0L-60 110A60 18 0 0 0 60 110L60 0Z" class="zgeo-s1"/><ellipse cx="0" cy="0" rx="60" ry="18" class="zgeo-s2"/><path d="M-60 110A60 18 0 0 1 60 110" class="zgeo-hid"/><path d="M-60 0L-60 110A60 18 0 0 0 60 110L60 0" class="zgeo-ed"/>', '-90 -30 180 170');
const coneSVG = () => solidFrame('<path d="M0 -20L-62 110A62 18 0 0 0 62 110Z" class="zgeo-s1"/><path d="M-62 110A62 18 0 0 1 62 110" class="zgeo-hid"/><path d="M0 -20L-62 110A62 18 0 0 0 62 110Z" class="zgeo-ed"/>', '-90 -30 180 170');
const ballSVG = () => solidFrame('<circle cx="0" cy="55" r="70" class="zgeo-s1"/><path d="M-70 55A70 20 0 0 0 70 55" class="zgeo-ed zgeo-thin"/><path d="M-70 55A70 20 0 0 1 70 55" class="zgeo-hid"/><ellipse cx="-24" cy="25" rx="16" ry="10" class="zgeo-shine"/>', '-90 -30 180 170');
const SOL = {
  cube: { name: 'קובייה', F: 6, E: 12, V: 8, pic: () => boxSVG(100, 100, 60), faces: '6 ריבועים', why: 'כל 6 הפאות שלה ריבועים שווים.' },
  box: { name: 'תיבה', F: 6, E: 12, V: 8, pic: () => boxSVG(130, 70, 70), faces: '6 מלבנים', why: 'יש לה 6 פאות בצורת מלבן.' },
  tprism: { name: 'מנסרה משולשת', F: 5, E: 9, V: 6, pic: () => prismSVG(3), faces: '2 משולשים ו־3 מלבנים', why: 'יש לה שני בסיסים משולשים, ובצדדים מלבנים.' },
  pprism: { name: 'מנסרה מחומשת', F: 7, E: 15, V: 10, pic: () => prismSVG(5), faces: '2 מחומשים ו־5 מלבנים' },
  hprism: { name: 'מנסרה משושה', F: 8, E: 18, V: 12, pic: () => prismSVG(6), faces: '2 משושים ו־6 מלבנים' },
  tpyr: { name: 'פירמידה משולשת', F: 4, E: 6, V: 4, pic: () => prismSVG(3, true), faces: '4 משולשים', why: 'הבסיס שלה משולש, והצדדים משולשים שנפגשים בקודקוד אחד.' },
  sqpyr: { name: 'פירמידה מרובעת', F: 5, E: 8, V: 5, pic: () => prismSVG(4, true), faces: 'ריבוע אחד ו־4 משולשים', why: 'הבסיס שלה ריבוע, והצדדים משולשים שנפגשים בקודקוד אחד.' },
  ppyr: { name: 'פירמידה מחומשת', F: 6, E: 10, V: 6, pic: () => prismSVG(5, true), faces: 'מחומש אחד ו־5 משולשים' },
  cyl: { name: 'גליל', m: 1, pic: cylSVG, why: 'יש לו שני בסיסים עגולים ומשטח מעוגל ביניהם.' },
  cone: { name: 'חרוט', m: 1, pic: coneSVG, why: 'יש לו בסיס עגול אחד וחוד למעלה.' },
  ball: { name: 'כדור', m: 1, pic: ballSVG, why: 'הוא עגול לגמרי, בלי פאות שטוחות.' },
};
const QTY = { F: ['פאות', 'פאה היא משטח שטוח של הגוף.'], E: ['מקצועות', 'מקצוע הוא קו שבו שתי פאות נפגשות.'], V: ['קודקודים', 'קודקוד הוא נקודה שבה כמה מקצועות נפגשים.'] };
const dims = s => `${s.F} פאות, ${s.E} מקצועות ו־${s.V} קודקודים`;
// cube nets: roll a die over the cells; it is a net when every face touches the floor once
function folds(cells) {
  const S = new Set(cells), seen = new Map([[cells[0], [0, 1, 2, 3, 4, 5]]]), q = [cells[0]];
  const mv = [[0, 1, o => [o[4], o[5], o[2], o[3], o[1], o[0]]], [0, -1, o => [o[5], o[4], o[2], o[3], o[0], o[1]]], [1, 0, o => [o[3], o[2], o[0], o[1], o[4], o[5]]], [-1, 0, o => [o[2], o[3], o[1], o[0], o[4], o[5]]]];
  while (q.length) {
    const k = q.shift(), [r, c] = RC(k), o = seen.get(k);
    for (const [dr, dc, f] of mv) {
      const n = K(r + dr, c + dc);
      if (S.has(n) && !seen.has(n)) {
        seen.set(n, f(o));
        q.push(n);
      }
    }
  }
  return new Set([...seen.values()].map(o => o[0])).size === 6;
}
const hexomino = () => {
  for (;;) {
    const c = blob(6, (r, k) => r >= 0 && r < 4 && k >= 0 && k < 5, rnd(0, 3), rnd(0, 4));
    if (c.length === 6) return place(c).cells.sort();
  }
};
const netSVG = cells => {
  const p = place(cells), u = 20;
  return `<svg viewBox="${u - 4} ${u - 4} ${(p.cols - 2) * u + 8} ${(p.rows - 2) * u + 8}" class="zgeo-net">${cells.map(k => `<rect x="${RC(k)[1] * u}" y="${RC(k)[0] * u}" width="${u}" height="${u}" class="zgeo-s2"/>`).join('')}</svg>`;
};
function glued() {
  const [what, s, why] = pick([
    ['שתי קוביות שוות, צמודות פאה אל פאה', { F: 6, E: 12, V: 8 }, 'יחד הן תיבה ארוכה. הפאות שנדבקו נעלמות, ושתי פאות שנמצאות זו ליד זו נהיות פאה אחת גדולה.'],
    ['קובייה, ועל הפאה העליונה שלה פירמידה מרובעת שהבסיס שלה בדיוק בגודל הפאה', { F: 9, E: 16, V: 9 }, 'פאות: 5 של הקובייה (העליונה מוסתרת) ועוד 4 משולשים. קודקודים: 8 ועוד הקודקוד שלמעלה. מקצועות: 12 ועוד 4 שעולים לקודקוד.'],
    ['שתי פירמידות מרובעות, צמודות בסיס אל בסיס', { F: 8, E: 12, V: 6 }, 'פאות: 4 משולשים למעלה ו־4 למטה. קודקודים: 4 באמצע ועוד 2. מקצועות: 4 באמצע, 4 למעלה ו־4 למטה.'],
    ['מנסרה משולשת, ועל אחד הבסיסים שלה פירמידה משולשת באותו גודל', { F: 7, E: 12, V: 7 }, 'פאות: 4 של המנסרה (בסיס אחד מוסתר) ועוד 3 משולשים. קודקודים: 6 ועוד 1. מקצועות: 9 ועוד 3.'],
  ]);
  const q = pick(['F', 'E', 'V']);
  return num({
    prompt: `מדביקים יחד: ${what}. כמה ${QTY[q][0]} יש לגוף החדש?`, answer: s[q], post: ` ${QTY[q][0]}`,
    hints: ['ציירו את הגוף החדש, או דמיינו אותו בידיים.', 'פאות שנדבקו זו לזו נעלמות בפנים. חשבו גם אם יש פאות שהופכות לאחת.'],
    explain: `לגוף החדש יש ${s.F} פאות, ${s.E} מקצועות ו־${s.V} קודקודים. ${why}`,
  });
}
const solids = {
  id: 'zgeo-solids', title: 'גופים',
  intro: `<p>לגוף יש <b>פאות</b> (המשטחים השטוחים), <b>מקצועות</b> (הקווים שבהם שתי פאות נפגשות) ו<b>קודקודים</b> (הפינות).</p>
    <div class="ex">לקובייה יש 6 פאות, 12 מקצועות ו־8 קודקודים.</div>
    <p>הקווים המקווקווים בציור הם מקצועות שנמצאים מאחור ולא רואים אותם. ל<b>מנסרה</b> יש שני בסיסים זהים, ול<b>פירמידה</b> בסיס אחד וקודקוד אחד למעלה.</p>`,
  gen(L) {
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        const keys = shuffle(['cube', 'box', 'tprism', 'sqpyr', 'tpyr', 'cyl', 'cone', 'ball']).slice(0, 4).filter((k, i, a) => !(k === 'box' && a.includes('cube')));
        while (keys.length < 4) keys.push(pick(['cyl', 'cone', 'ball', 'cube'].filter(k => !keys.includes(k))));
        const ans = rnd(0, 3), k = keys[ans];
        return {
          prompt: 'איך קוראים לגוף הזה?', visual: SOL[k].pic(), widget: choice(keys.map(x => SOL[x].name), { cols: 2 }), answer: ans, check: v => v === ans,
          hints: ['האם יש לגוף חלק מעוגל? האם יש לו קודקוד בודד למעלה?', 'שימו לב לצורה של הפאות שלו: ריבועים, מלבנים או משולשים?'],
          explain: `${SOL[k].m ? 'זה' : 'זו'} ${SOL[k].name}. ${SOL[k].why}`,
        };
      }
      if (t === 1) {
        const k = pick(['cube', 'box', 'sqpyr', 'tpyr', 'tprism']), q = pick(['F', 'V']), s = SOL[k], a = s[q];
        return num({
          prompt: `כמה ${QTY[q][0]} יש ל${s.name}?`, visual: s.pic(), answer: a, post: ` ${QTY[q][0]}`,
          hints: [QTY[q][1], 'אל תשכחו את מה שנמצא מאחור: הקווים המקווקווים.'],
          explain: `ל${s.name} יש ${dims(s)}.`,
        });
      }
      const flat = shuffle(['cube', 'box', 'tprism', 'sqpyr', 'tpyr']).slice(0, 3), r = pick(['cyl', 'ball']), opts = shuffle([...flat, r]), ans = opts.indexOf(r);
      return {
        prompt: 'הזברה רוצה לגלגל גוף לאורך המכלאה. איזה גוף יכול להתגלגל?', widget: choice(opts.map(k => SOL[k].pic()), { cols: 2, cls: 'zgeo-pics' }), answer: ans, check: v => v === ans,
        hints: ['גוף מתגלגל רק אם יש לו משטח מעוגל.', 'לכל הגופים האחרים יש רק פאות שטוחות.'],
        explain: `ה${SOL[r].name} יכול להתגלגל, כי יש לו משטח מעוגל. לשאר הגופים יש רק פאות שטוחות.`,
      };
    }
    if (L === 2) {
      const t = rnd(0, 2), polyKeys = ['cube', 'box', 'tprism', 'sqpyr', 'tpyr', 'pprism', 'hprism'];
      if (t === 0) {
        const k = pick(polyKeys), s = SOL[k];
        return nums({
          prompt: `כמה פאות, מקצועות וקודקודים יש ל${s.name}?`, visual: s.pic(), fields: [['פאות:', s.F], ['מקצועות:', s.E], ['קודקודים:', s.V]],
          hints: ['ספרו גם את מה שמאחור: הקווים המקווקווים הם מקצועות נסתרים.', k.includes('prism') || k === 'cube' || k === 'box' ? 'ספרו את הקודקודים למעלה ואת הקודקודים למטה, ואת המקצועות של הבסיס העליון, של התחתון ושל הצדדים.' : 'בפירמידה: קודקודי הבסיס ועוד הקודקוד שלמעלה. מקצועות: של הבסיס ועוד אלה שעולים לקודקוד.'],
          explain: `ל${s.name} יש ${dims(s)}.`,
        });
      }
      if (t === 1) {
        const k = pick(polyKeys), s = SOL[k], pool = polyKeys.filter(x => x !== k && !(k === 'cube' && x === 'box') && !(k === 'box' && x === 'cube')).map(x => SOL[x].faces);
        const opts = shuffle([s.faces, ...shuffle(pool).slice(0, 3)]), ans = opts.indexOf(s.faces);
        return {
          prompt: `מאילו צורות בנויות הפאות של ה${s.name}?`, visual: s.pic(), widget: choice(opts, { cols: 1 }), answer: ans, check: v => v === ans,
          hints: ['הסתכלו על כל פאה בנפרד: על הבסיסים ועל הצדדים.', k === 'cube' || k === 'box' ? 'יש לה 6 פאות.' : `יש ${s.F} פאות.`],
          explain: `ל${s.name} יש ${s.F} פאות: ${s.faces}.`,
        };
      }
      const pool = shuffle(polyKeys.filter(x => x !== 'box')), k = pool[0], opts = shuffle(pool.slice(0, 4)), ans = opts.indexOf(k), s = SOL[k];
      return {
        prompt: `יש לי ${dims(s)}. מי אני?`, widget: choice(opts.map(x => SOL[x].name), { cols: 2 }), answer: ans, check: v => v === ans,
        hints: ['פירמידה: לקודקודים ולפאות יש אותו מספר. מנסרה: תמיד מספר זוגי של קודקודים.', `מספר הקודקודים הוא ${s.V}. איזה גוף מתאים?`],
        explain: `ל${s.name} יש ${dims(s)}.`,
      };
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const n = rnd(5, 10), pyr = Math.random() < 0.5, BN = { 5: 'מחומש', 6: 'משושה', 7: 'משובע', 8: 'מתומן' }[n] || `מצולע עם ${n} צלעות`;
      const [F, E, V] = pyr ? [n + 1, 2 * n, n + 1] : [n + 2, 3 * n, 2 * n];
      return nums({
        prompt: `ל${pyr ? 'פירמידה' : 'מנסרה'} יש בסיס בצורת ${BN}. כמה פאות, מקצועות וקודקודים יש לה?`, visual: n <= 6 ? prismSVG(n, pyr) : undefined,
        fields: [['פאות:', F], ['מקצועות:', E], ['קודקודים:', V]],
        hints: pyr ? ['בפירמידה יש בסיס אחד, ומכל צלע של הבסיס עולה משולש אל הקודקוד העליון.', `קודקודים: ${n} בבסיס ועוד 1. מקצועות: ${n} בבסיס ועוד ${n} שעולים למעלה.`]
          : ['במנסרה יש שני בסיסים זהים, ומכל צלע של הבסיס יוצא מלבן בצד.', `קודקודים: ${n} למטה ועוד ${n} למעלה. מקצועות: ${n} למטה, ${n} למעלה ו־${n} בצדדים.`],
        explain: pyr ? `פאות: ${M(`${n} + 1 = ${F}`)}. מקצועות: ${M(`${n} + ${n} = ${E}`)}. קודקודים: ${M(`${n} + 1 = ${V}`)}.` : `פאות: ${M(`${n} + 2 = ${F}`)}. מקצועות: ${M(`3 × ${n} = ${E}`)}. קודקודים: ${M(`2 × ${n} = ${V}`)}.`,
      });
    }
    if (t === 1) {
      let g = hexomino();
      while (!folds(g)) g = hexomino();
      const opts = [g], keyOf = c => c.join(' ');
      while (opts.length < 4) {
        const b = hexomino();
        if (!folds(b) && !opts.some(o => keyOf(o) === keyOf(b))) opts.push(b);
      }
      const sh = shuffle(opts), ans = sh.indexOf(g);
      return {
        prompt: 'השומר רוצה לבנות קובייה מקרטון. איזו פריסה אפשר לקפל לקובייה?', widget: choice(sh.map(netSVG), { cols: 2, cls: 'zgeo-pics' }), answer: ans, check: v => v === ans,
        hints: ['דמיינו שאחת המשבצות היא הרצפה, ומקפלים את השאר כלפי מעלה.', 'בפריסה טובה אין שתי משבצות שנופלות על אותה פאה. ארבע משבצות בשורה מתקפלות לטבעת סביב הקובייה.'],
        explain: 'רק בפריסה הזאת כל אחת מ־6 המשבצות נופלת על פאה אחרת של הקובייה. בכל פריסה אחרת שתי משבצות נופלות על אותה פאה, ופאה אחת נשארת פתוחה.',
      };
    }
    return glued();
  },
};

// =====================================================================
const boss = {
  id: 'zgeo-boss', title: 'בוס: החשבונאית סרגל',
  intro: `<p>החשבונאית סרגל הזיזה את הגדרות של הזברות, קלקלה את השעונים וערבבה את הכסף בקופה. כדי לגרש אותה, צריך להשתמש בכל מה שלמדתם: צורות, מדידות, שעונים וכסף.</p>
    <div class="ex">מכלאה של 3 על 2 צריכה ${M('3 + 2 + 3 + 2 = 10')} מטרים של גדר. אם כל מטר עולה 2 שקלים, הגדר עולה ${M('10 × 2 = 20')} שקלים.</div>
    <p>חלק מהשאלות דורשות שני שלבים. קחו את הזמן.</p>`,
  gen(L) {
    const t = rnd(0, 5);
    if (L === 1) {
      if (t === 0) {
        const w = rnd(2, 5), ht = rnd(1, 3), P = 2 * (w + ht);
        return num({
          prompt: 'החשבונאית סרגל דורשת 2 שקלים על כל מטר של גדר. כמה שקלים עולה הגדר מסביב למכלאה? כל צלע של משבצת היא מטר.', visual: cellsSVG(rectCells(w, ht), ht + 2, w + 2, { u: Math.min(30, 300 / (w + 2)) }),
          answer: 2 * P, post: ' שקלים',
          hints: ['קודם מצאו כמה מטרים של גדר יש מסביב.', `יש ${P} מטרים של גדר, וכל מטר עולה 2 שקלים.`],
          explain: `היקף: ${M(`${w} + ${ht} + ${w} + ${ht} = ${P}`)}. מחיר: ${M(`${P} × 2 = ${2 * P}`)} שקלים.`,
        });
      }
      if (t === 1) {
        const T = rnd(1, 10) * 60 + pick([0, 30]), d = rnd(1, 2);
        return setRound(T + d * 60, 30, {
          prompt: `החשבונאית סרגל הזיזה את השעון ${d === 1 ? 'שעה אחת' : 'שעתיים'} אחורה. עכשיו הוא מראה את השעה שבתמונה. כוונו את השעון לשעה הנכונה.`, visual: clockPic(T),
          hints: ['קראו קודם את השעה שבתמונה.', `בתמונה ${TM(T)}. הוסיפו ${dur(d * 60)}.`], explain: `${TM(T)} ועוד ${dur(d * 60)} זה ${TM(T + d * 60)}.`,
        });
      }
      if (t === 2) {
        const [k1, k2] = shuffle([3, 4, 5]).slice(0, 2), a = rnd(1, 3), b = rnd(1, 3);
        return num({
          prompt: `החשבונאית סרגל גזרה מנייר ${a === 1 ? `${NAMES[k1]} אחד` : `${a} ${PLURAL[k1]}`} ו${b === 1 ? `${NAMES[k2]} אחד` : `־${b} ${PLURAL[k2]}`}. כמה קודקודים יש להם יחד?`, answer: a * k1 + b * k2, post: ' קודקודים',
          hints: [`ל${NAMES[k1]} יש ${k1} קודקודים, ול${NAMES[k2]} יש ${k2}.`, `${range(a, () => k1).concat(range(b, () => k2)).join(' + ')}`],
          explain: M(`${range(a, () => k1).concat(range(b, () => k2)).join(' + ')} = ${a * k1 + b * k2}`),
        });
      }
      if (t === 3) {
        const [p1, p2] = [rnd(2, 12), rnd(2, 12)];
        return payRound((p1 + p2) * 100, [100, 200, 500, 1000, 2000], {
          prompt: `קונים בלון ב־${p1} שקלים ומשקפת ב־${p2} שקלים. שלמו על שניהם יחד, בדיוק.`,
          hints: ['חברו קודם את שני המחירים.', `${M(`${p1} + ${p2} = ${p1 + p2}`)} שקלים.`], explain: `${M(`${p1} + ${p2} = ${p1 + p2}`)}: למשל ${describe(greedy((p1 + p2) * 100))}.`,
        });
      }
      if (t === 4) {
        const a = rnd(1, 5), len = rnd(3, 7);
        return num({
          prompt: `החשבונאית סרגל הזיזה את ${OBJ.carrot} על הסרגל! כמה סנטימטרים הוא ארוך?`, visual: rulerSVG({ to: 12, a, b: a + len, obj: 'carrot' }), answer: len, post: ' ס"מ',
          hints: ['הגזר לא מתחיל ב־0. איפה הוא מתחיל ואיפה הוא נגמר?', `מ־${a} עד ${a + len}.`], explain: `${M(`${a + len} − ${a} = ${len}`)} ס"מ.`,
        });
      }
      const src = blob(rnd(4, 6), (r, c) => r >= 0 && r < 6 && c >= 0 && c < 3, rnd(1, 4), 2);
      {
        const img = src.map(k => K(RC(k)[0], 5 - RC(k)[1])).sort(), want = new Set(img);
        return {
          prompt: 'החשבונאית סרגל מחקה חצי מהמפה של גן החיות. השלימו אותה, כך שהקו האדום יהיה קו סימטריה.', sig: src.join(' '),
          widget: lockedGrid(gridPaint({ rows: 6, cols: 6, locked: src, mirror: 'v' })), answer: img,
          check: v => v.length === img.length && v.every(k => want.has(k)),
          hints: ['כל משבצת שחורה צריכה בת זוג בצד השני של הקו, באותו מרחק ממנו.', 'התחילו מהמשבצות שנוגעות בקו.'],
          explain: 'כל משבצת משתקפת למקום שנמצא באותו מרחק מהקו, בדיוק ממול. הפתרון מסומן על הלוח.',
        };
      }
    }
    if (L === 2) {
      if (t === 0) {
        const w = rnd(3, 7), ht = rnd(2, 5), P = 2 * (w + ht), cost = 3 * P;
        return num({
          prompt: 'כל מטר של גדר עולה 3 שקלים. השומר שילם על הגדר מסביב למכלאה בשטר של 100 שקלים. כמה עודף קיבל? כל צלע של משבצת היא מטר.',
          visual: cellsSVG(rectCells(w, ht), ht + 2, w + 2, { u: Math.min(30, 300 / (w + 2)) }), answer: 100 - cost, post: ' שקלים',
          hints: [`ההיקף של המכלאה הוא ${M(`${w} + ${ht} + ${w} + ${ht}`)}.`, `${P} מטרים עולים ${M(`${P} × 3 = ${cost}`)} שקלים.`],
          explain: `היקף ${P} מטרים, מחיר ${M(`${P} × 3 = ${cost}`)}, עודף ${M(`100 − ${cost} = ${100 - cost}`)} שקלים.`,
        });
      }
      if (t === 1) {
        const S = rnd(1, 10) * 60 + rnd(0, 11) * 5, d = rnd(5, 14) * 5;
        return setRound(S + d, 5, {
          prompt: `ההופעה מתחילה בשעה שבתמונה ונמשכת ${dur(d)}. כוונו את השעון לסוף ההופעה.`, visual: clockPic(S),
          hints: ['קראו קודם את השעה שבתמונה.', `ההופעה מתחילה ב־${TM(S)}.`], explain: `${TM(S)} ועוד ${dur(d)} זה ${TM(S + d)}.`,
        });
      }
      if (t === 2) {
        const k = pick(['cube', 'tprism', 'sqpyr', 'tpyr']), s = SOL[k], m = rnd(2, 3);
        return nums({
          prompt: `בונים ${m} ${s.name === 'קובייה' ? 'קוביות' : s.name.startsWith('מנסרה') ? 'מנסרות משולשות' : s.name.endsWith('מרובעת') ? 'פירמידות מרובעות' : 'פירמידות משולשות'} מקשיות ומכדורי פלסטלינה. כל מקצוע הוא קשית, וכל קודקוד הוא כדור. כמה צריך?`,
          visual: s.pic(), fields: [['קשיות:', m * s.E], ['כדורים:', m * s.V]],
          hints: [`ל${s.name} אחת יש ${s.E} מקצועות ו־${s.V} קודקודים.`, `כפלו כל אחד מהם ב־${m}.`],
          explain: `קשיות: ${M(`${m} × ${s.E} = ${m * s.E}`)}. כדורים: ${M(`${m} × ${s.V} = ${m * s.V}`)}.`,
        });
      }
      if (t === 3) {
        const k = rnd(2, 4), b = rnd(21, 38) * 5, tot = k * b;
        return num({
          prompt: `השומר מניח ${k} קרשים בשורה, אחד אחרי השני. כל קרש ארוך ${mcm(b)}. כמה סנטימטרים אורך השורה?`, answer: tot, post: ' ס"מ',
          hints: [`כל קרש ארוך ${b} ס"מ.`, `${M(range(k, () => b).join(' + '))}`], explain: `${M(`${range(k, () => b).join(' + ')} = ${tot}`)} ס"מ, כלומר ${mcm(tot)}.`,
        });
      }
      if (t === 4) {
        const a = rnd(2, 5), b = rnd(2, 6), P = 2 * (a + b);
        return {
          prompt: `ציירו מכלאה בצורת מלבן שההיקף שלה ${P} מטרים ושאחת הצלעות שלה ${a} מטרים.`, widget: lockedGrid(gridPaint({ rows: 6, cols: 7 })), answer: rectCells(b, a),
          check: v => {
            const r = rectOf(v);
            return !!r && (r.w === a || r.h === a) && 2 * (r.w + r.h) === P;
          },
          wrongMsg: v => {
            const r = rectOf(v);
            return r ? `ציירתם מלבן של ${r.w} על ${r.h}, וההיקף שלו ${2 * (r.w + r.h)}.` : 'הצורה שציירתם אינה מלבן מלא.';
          },
          hints: [`שתי צלעות של ${a} מטרים הן יחד ${2 * a} מטרים. כמה נשאר לשתי הצלעות האחרות?`, `${M(`${P} − ${2 * a} = ${P - 2 * a}`)}, ולכן כל אחת מהן ${b} מטרים.`],
          explain: `מלבן של ${a} על ${b}, כי ${M(`${a} + ${b} + ${a} + ${b} = ${P}`)}. הוא מסומן על הלוח.`,
        };
      }
      const H = rnd(1, 10), m1 = rnd(7, 11) * 5, d = rnd(Math.max(4, 13 - m1 / 5), 23 - m1 / 5) * 5, S = H * 60 + m1;
      return num({
        prompt: `החשבונאית סרגל נעלה את הזברות מ־${TM(S)} עד ${TM(S + d)}. כמה דקות הן היו נעולות?`, answer: d, post: ' דקות',
        hints: [`כמה דקות מ־${TM(S)} עד ${TM(H * 60 + 60)}?`, `${60 - m1} דקות עד ${TM(H * 60 + 60)}, ועוד ${(S + d) % 60} אחר כך.`],
        explain: M(`${60 - m1} + ${(S + d) % 60} = ${d}`) + ' דקות.',
      });
    }
    if (t === 0) {
      const w = rnd(2, 5), ht = rnd(w + 1, 7), A = w * ht, P = 2 * (w + ht);
      return {
        prompt: `ציירו מכלאה בצורת מלבן של ${A} משבצות שההיקף שלה ${P} מטרים.`, widget: lockedGrid(gridPaint({ rows: 7, cols: 7 })), answer: rectCells(w, ht, 0, 0),
        check: v => {
          const r = rectOf(v);
          return !!r && r.w * r.h === A && 2 * (r.w + r.h) === P;
        },
        wrongMsg: v => {
          const r = rectOf(v);
          return r ? `ציירתם מלבן של ${r.w} על ${r.h}: ${r.w * r.h} משבצות והיקף ${2 * (r.w + r.h)}.` : 'הצורה שציירתם אינה מלבן מלא.';
        },
        hints: [`אורך ועוד רוחב צריכים להיות ${P / 2}, ואורך כפול רוחב צריך להיות ${A}.`, `נסו זוגות שסכומם ${P / 2}: 1 ו־${P / 2 - 1}, 2 ו־${P / 2 - 2}... איזה זוג נותן ${A}?`],
        explain: `מלבן של ${w} על ${ht}, כי ${M(`${w} × ${ht} = ${A}`)} ו־${M(`2 × (${w} + ${ht}) = ${P}`)}.`,
      };
    }
    if (t === 1) {
      const S = 10 * 60 + rnd(6, 11) * 5, d1 = rnd(9, 15) * 5, b = rnd(2, 4) * 5, d2 = rnd(6, 11) * 5, E = S + d1 + b + d2;
      return setRound(E, 5, {
        prompt: `האכלה מתחילה ב־${TM(S)} ונמשכת ${dur(d1)}. אחר כך ניקיון של ${b} דקות, ואז מקלחת לפילים של ${dur(d2)}. כוונו את השעון לסוף המקלחת.`,
        hints: ['חשבו שלב אחרי שלב.', `ההאכלה נגמרת ב־${TM(S + d1)}, והניקיון ב־${TM(S + d1 + b)}.`],
        explain: `${TM(S)} ← ${TM(S + d1)} ← ${TM(S + d1 + b)} ← ${TM(E)}${E >= 780 ? ` (כלומר ${tm(Math.floor(E / 60), E % 60)})` : ''}.`,
      });
    }
    if (t === 2) {
      const p = rnd(12, 44) * 100 + rnd(1, 9) * 10, ch = 5000 - p, best = greedy(ch);
      return payRound(ch, [10, 50, 100, 200, 500, 1000, 2000], {
        prompt: `החשבונאית סרגל קנתה סרגל זהב ב־${money(p)} ושילמה בשטר של 50 שקלים. תנו לה עודף, עם כמה שפחות מטבעות ושטרות.`, fewest: true,
        hints: [`העודף הוא ${money(ch)}.`, `בכל פעם קחו את המטבע או השטר הגדול ביותר שעוד לא עובר את מה שנשאר. מספיקים ${best.length}.`],
        explain: `העודף ${money(ch)}: ${describe(best)}.`,
      });
    }
    if (t === 3) return glued();
    if (t === 4) return riddle();
    const step = pick([2, 3]), w = step * rnd(2, 4), ht = step * rnd(1, 3), P = 2 * (w + ht);
    return num({
      prompt: `מסביב למכלאה בצורת מלבן של ${w} על ${ht} מטרים מציבים עמוד כל ${step} מטרים, ובכל פינה יש עמוד. כמה עמודים יש?`, answer: P / step, post: ' עמודים',
      hints: [`ההיקף של המכלאה הוא ${P} מטרים.`, 'כשהגדר סגורה ומקיפה את המכלאה, יש בדיוק אותו מספר של עמודים ושל קטעים.'],
      explain: `ההיקף ${P} מטרים, כלומר ${M(`${P} ÷ ${step} = ${P / step}`)} קטעים. בגדר סגורה העמוד האחרון הוא גם הראשון, ולכן יש ${P / step} עמודים.`,
    });
  },
};

export default {
  id: 'zgeo', name: 'מתחם הזברות', icon: '🦓', color: '#a3e635', boss: 'החשבונאית סרגל',
  tagline: 'החשבונאים הזיזו את הגדרות וקלקלו את השעונים. צורות ומדידות יחזירו כל דבר למקומו.',
  challenges: [poly, sym, ruler, clockRead, elapsed, coins, fence, solids, boss],
};
