// Static SVG illustrations used inside questions. All return HTML strings.
import { range } from './util.js';

const rad = d => (d * Math.PI) / 180;
const f = v => v.toFixed(1);

function pie(n, d, r = 34) {
  let s = `<svg viewBox="${-r - 3} ${-r - 3} ${2 * r + 6} ${2 * r + 6}" class="v-pie" width="${2 * r + 6}">`;
  if (d === 1) s += `<circle r="${r}" class="${n ? 'on' : 'off'}"/>`;
  else
    for (let i = 0; i < d; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / d, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / d;
      s += `<path class="${i < n ? 'on' : 'off'}" d="M0 0L${f(r * Math.cos(a0))} ${f(r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(r * Math.cos(a1))} ${f(r * Math.sin(a1))}Z"/>`;
    }
  return s + '</svg>';
}
// w whole pies followed by a pie showing n/d
export const pies = (w, n, d) => `<div class="v-row" dir="ltr">${range(w, () => pie(d, d)).join('')}${n ? pie(n, d) : ''}</div>`;

export function bar(n, d) {
  const w = 240 / d;
  return `<svg viewBox="0 0 244 34" class="v-bar">${range(d, i => `<rect x="${2 + i * w}" y="2" width="${w}" height="30" class="${i < n ? 'on' : 'off'}"/>`).join('')}</svg>`;
}

// a/b of the columns crossed with c/d of the rows
export function areaModel(a, b, c, d) {
  const W = 220, H = 150, cw = W / b, rh = H / d;
  let s = `<svg viewBox="-2 -2 ${W + 4} ${H + 4}" class="v-area">`;
  for (let r = 0; r < d; r++)
    for (let k = 0; k < b; k++)
      s += `<rect x="${k * cw}" y="${r * rh}" width="${cw}" height="${rh}" class="${k < a && r < c ? 'both' : k < a ? 'col' : r < c ? 'row' : 'off'}"/>`;
  return s + '</svg>';
}

// Shapes on squared paper. Coordinates are grid units with y pointing down.
export function gridShape({ cols, rows, polys = [], lines = [], labels = [] }) {
  const u = 26;
  let s = `<svg viewBox="-16 -16 ${cols * u + 32} ${rows * u + 32}" class="v-grid" style="max-width:${cols * u + 32}px">`;
  for (let i = 0; i <= cols; i++) s += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${rows * u}" class="gl"/>`;
  for (let j = 0; j <= rows; j++) s += `<line x1="0" y1="${j * u}" x2="${cols * u}" y2="${j * u}" class="gl"/>`;
  for (const p of polys) s += `<polygon points="${p.pts.map(([x, y]) => `${x * u},${y * u}`).join(' ')}" class="${p.cls || 'shape'}"/>`;
  for (const [x1, y1, x2, y2] of lines) s += `<line x1="${x1 * u}" y1="${y1 * u}" x2="${x2 * u}" y2="${y2 * u}" class="dash"/>`;
  for (const [x, y, text] of labels) s += `<text x="${x * u}" y="${y * u + 5}" class="glabel">${text}</text>`;
  return s + '</svg>';
}

export const squareArea = (inner, side = '?') =>
  `<svg viewBox="0 0 170 150" class="v-geo" style="max-width:190px"><rect x="30" y="8" width="110" height="110" class="shape"/><text x="85" y="70" class="glabel big">${inner}</text><text x="85" y="141" class="glabel">${side}</text></svg>`;

// n×n square built from L-shaped layers of 1, 3, 5, ... tiles
export function gnomon(n) {
  const u = Math.min(26, 168 / n);
  let s = `<svg viewBox="-2 -2 ${n * u + 4} ${n * u + 4}" class="v-gnomon" style="max-width:${n * u + 4}px">`;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      s += `<rect x="${c * u}" y="${(n - 1 - r) * u}" width="${u}" height="${u}" fill="hsl(${(Math.max(r, c) * 47 + 200) % 360} 75% 68%)"/>`;
  return s + '</svg>';
}

const unit = (p, q) => {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};
// Arc (or a small square for 90°) plus a label at the corner V between the directions to P1 and P2.
function corner(V, P1, P2, text, deg, out = false) {
  const u1 = unit(V, P1), u2 = unit(V, P2);
  let bx = u1[0] + u2[0], by = u1[1] + u2[1];
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl;
  by /= bl;
  const dist = out ? 34 : Math.min(62, 13 / Math.sin(rad(deg / 2)) + 13), r = 17;
  const at = (u, k) => `${f(V[0] + u[0] * k)} ${f(V[1] + u[1] * k)}`;
  const mark = Math.abs(deg - 90) < 0.5
    ? `<path d="M${at(u1, 12)}L${f(V[0] + (u1[0] + u2[0]) * 12)} ${f(V[1] + (u1[1] + u2[1]) * 12)}L${at(u2, 12)}" class="ang"/>`
    : `<path d="M${at(u1, r)}A${r} ${r} 0 0 ${u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0} ${at(u2, r)}" class="ang"/>`;
  return mark + (text != null ? `<text x="${f(V[0] + bx * dist)}" y="${f(V[1] + by * dist + 5)}" class="glabel">${text}</text>` : '');
}

// Polygon given in maths coordinates (y up), fitted to the picture, with an angle label per vertex.
function anglePoly(pts, degs, labels, { sideLabels = [], ext = null } = {}) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), hh = Math.max(...ys) - Math.min(...ys);
  const k = Math.min(230 / w, 150 / hh);
  const P = pts.map(([x, y]) => [(x - Math.min(...xs)) * k, (Math.max(...ys) - y) * k]);
  const n = P.length, cx = P.reduce((s, p) => s + p[0], 0) / n, cy = P.reduce((s, p) => s + p[1], 0) / n;
  let s = `<polygon points="${P.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" class="shape"/>`;
  P.forEach((V, i) => (s += corner(V, P[(i + n - 1) % n], P[(i + 1) % n], labels[i], degs[i])));
  sideLabels.forEach((t, i) => {
    if (t == null) return;
    const a = P[i], b = P[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, o = unit([cx, cy], [mx, my]);
    s += `<text x="${f(mx + o[0] * 16)}" y="${f(my + o[1] * 16 + 5)}" class="glabel side">${t}</text>`;
  });
  let extra = 0;
  if (ext) {
    // exterior angle at vertex 1, continuing the base to the right
    const B = P[1], E = [B[0] + 56, B[1]];
    extra = 64;
    s += `<line x1="${f(B[0])}" y1="${f(B[1])}" x2="${f(E[0])}" y2="${f(E[1])}" class="dash"/>` + corner(B, E, P[2], ext, 180 - degs[1], true);
  }
  const W = w * k + extra, H = hh * k;
  return `<svg viewBox="-34 -26 ${f(W + 68)} ${f(H + 56)}" class="v-geo" style="max-width:${Math.round(W + 68)}px">${s}</svg>`;
}

// Triangle from its angles (bottom-left, bottom-right, top). sideLabels: [bottom, right, left]
export function triangle({ angles, angleLabels = [], sideLabels = [], ext = null }) {
  const [A, B, C] = angles.map(rad), ac = Math.sin(B) / Math.sin(C);
  return anglePoly([[0, 0], [1, 0], [ac * Math.cos(A), ac * Math.sin(A)]], angles, angleLabels, { sideLabels, ext });
}

// Triangle from its side lengths [bottom, right, left]
export function triangleSides(a, b, c, labels) {
  const ang = (opp, s1, s2) => (Math.acos((s1 * s1 + s2 * s2 - opp * opp) / (2 * s1 * s2)) * 180) / Math.PI;
  return triangle({ angles: [ang(b, a, c), ang(c, a, b), ang(a, b, c)], sideLabels: labels || [a, b, c] });
}

// Convex quadrilateral from its four angles, going anticlockwise from bottom-left.
export function quadAngles(angles, labels) {
  const [A, B, C] = angles, dA = [Math.cos(rad(A)), Math.sin(rad(A))], tc = rad(360 - B - C), dC = [Math.cos(tc), Math.sin(tc)];
  for (const len of [0.75, 0.55, 1, 0.4, 1.3]) {
    const Cp = [1 + len * Math.cos(rad(180 - B)), len * Math.sin(rad(180 - B))];
    const det = dC[0] * dA[1] - dA[0] * dC[1];
    if (Math.abs(det) < 1e-6) continue;
    const t = (dC[0] * Cp[1] - dC[1] * Cp[0]) / det, s = (dA[0] * Cp[1] - dA[1] * Cp[0]) / det;
    if (t > 0.3 && s > 0.3 && t < 2.2) return anglePoly([[0, 0], [1, 0], Cp, [t * dA[0], t * dA[1]]], angles, labels);
  }
  return anglePoly([[0, 0], [1, 0], [0.9, 0.7], [0.1, 0.6]], [90, 90, 90, 90], labels);
}

// Rays from one point; the angles go all the way round.
export function aroundPoint(degs, labels) {
  let s = '<svg viewBox="-95 -95 190 190" class="v-geo" style="max-width:210px">', t = 20;
  degs.forEach((d, i) => {
    const a0 = rad(t), a1 = rad(t + d), mid = rad(t + d / 2);
    s += `<line x1="0" y1="0" x2="${f(84 * Math.cos(a0))}" y2="${f(-84 * Math.sin(a0))}" class="edge"/>`;
    s += `<path d="M${f(22 * Math.cos(a0))} ${f(-22 * Math.sin(a0))}A22 22 0 ${d > 180 ? 1 : 0} 0 ${f(22 * Math.cos(a1))} ${f(-22 * Math.sin(a1))}" class="ang"/>`;
    s += `<text x="${f(50 * Math.cos(mid))}" y="${f(-50 * Math.sin(mid) + 5)}" class="glabel">${labels[i]}</text>`;
    t += d;
  });
  return s + '</svg>';
}

const QUADS = {
  square: [[25, 10], [95, 10], [95, 80], [25, 80]],
  rect: [[8, 22], [112, 22], [112, 68], [8, 68]],
  rhombus: [[60, 12], [112, 45], [60, 78], [8, 45]],
  para: [[32, 18], [114, 18], [88, 72], [6, 72]],
  trap: [[38, 18], [80, 18], [112, 72], [8, 72]],
  kite: [[60, 4], [94, 34], [60, 88], [26, 34]],
};
export function quadShape(kind, rot = 0) {
  const P = QUADS[kind];
  let s = `<polygon points="${P.map(p => p.join(',')).join(' ')}" class="shape"/>`;
  if (kind === 'square' || kind === 'rect') P.forEach((V, i) => (s += corner(V, P[(i + 3) % 4], P[(i + 1) % 4], null, 90)));
  return `<svg viewBox="-14 -18 148 126" class="v-geo" style="max-width:190px"><g transform="rotate(${rot} 60 45)">${s}</g></svg>`;
}

// Box of unit cubes: a wide, b deep, c tall.
export function cuboid(a, b, c) {
  const u = Math.min(34, 230 / (a + b * 0.5), 170 / (c + b * 0.4)), dx = u * 0.5, dy = u * 0.4;
  const W = a * u + b * dx, H = c * u + b * dy, y0 = H, yt = H - c * u, xr = a * u;
  const quad = (pts, cls) => `<polygon points="${pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ')}" class="${cls}"/>`;
  let s = `<svg viewBox="-4 -4 ${f(W + 8)} ${f(H + 8)}" class="v-cuboid" style="max-width:${Math.round(W + 8)}px">`;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < c; j++) s += quad([[i * u, y0 - j * u], [(i + 1) * u, y0 - j * u], [(i + 1) * u, y0 - (j + 1) * u], [i * u, y0 - (j + 1) * u]], 'f1');
  for (let i = 0; i < a; i++)
    for (let k = 0; k < b; k++)
      s += quad([[i * u + k * dx, yt - k * dy], [(i + 1) * u + k * dx, yt - k * dy], [(i + 1) * u + (k + 1) * dx, yt - (k + 1) * dy], [i * u + (k + 1) * dx, yt - (k + 1) * dy]], 'f2');
  for (let k = 0; k < b; k++)
    for (let j = 0; j < c; j++)
      s += quad([[xr + k * dx, y0 - j * u - k * dy], [xr + (k + 1) * dx, y0 - j * u - (k + 1) * dy], [xr + (k + 1) * dx, y0 - (j + 1) * u - (k + 1) * dy], [xr + k * dx, y0 - (j + 1) * u - k * dy]], 'f3');
  return s + '</svg>';
}

// Balance scale. Items: {k:'A'} green alien, {k:'B'} purple alien, {k:'W', n} labelled weight.
export const rep = (k, n) => range(n, () => ({ k }));
export const W = n => ({ k: 'W', n });
const critter = (k, x, y) =>
  k === 'A'
    ? `<g transform="translate(${x} ${y})"><circle cy="-13" r="13" class="crA"/><circle cx="-4.5" cy="-16" r="3.4" class="eye"/><circle cx="4.5" cy="-16" r="3.4" class="eye"/><circle cx="-4.5" cy="-16" r="1.5"/><circle cx="4.5" cy="-16" r="1.5"/></g>`
    : `<g transform="translate(${x} ${y})"><rect x="-12" y="-25" width="24" height="25" rx="7" class="crB"/><circle cy="-15" r="4.6" class="eye"/><circle cy="-15" r="2"/></g>`;
const weight = (n, x, y) =>
  `<g transform="translate(${x} ${y})"><path d="M-15 0L-11 -25L11 -25L15 0Z" class="wt"/><text y="-7" class="wt-t">${n}</text></g>`;
export function scale(left, right) {
  const pan = (items, cx) => {
    let s = `<path d="M${cx - 82} 150L${cx + 82} 150L${cx + 64} 164L${cx - 64} 164Z" class="pan"/><line x1="${cx}" y1="164" x2="${cx}" y2="178" class="rod"/>`;
    items.forEach((it, i) => {
      const row = Math.floor(i / 5), inRow = Math.min(5, items.length - row * 5);
      const x = cx + ((i % 5) - (inRow - 1) / 2) * 31, y = 149 - row * 29;
      s += it.k === 'W' ? weight(it.n, x, y) : critter(it.k, x, y);
    });
    return s;
  };
  // crop the empty sky above the tallest pile
  const top = 112 - 29 * Math.ceil(Math.max(left.length, right.length) / 5);
  return `<svg viewBox="0 ${top} 420 ${210 - top}" class="v-scale" style="max-width:420px">${pan(left, 110)}${pan(right, 310)}<line x1="110" y1="178" x2="310" y2="178" class="beam2"/><path d="M210 178L192 206L228 206Z" class="fulcrum"/></svg>`;
}
export const critterIcon = k => `<svg viewBox="-16 -30 32 32" class="v-crit" width="30">${critter(k, 0, 0)}</svg>`;
