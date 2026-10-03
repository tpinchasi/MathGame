// Arithmetic expressions as flat token lists, so the game can show them,
// let the player choose which operation to do next, and collapse them step by step.
// Tokens: {t:'n',v} number · {t:'o',v:'+-*/'} operator · {t:'('} · {t:')'} · {t:'p',v} postfix power
import { rnd, pick, range, SYM } from './util.js';

// parens: [first, last, power?] over number indexes; pows: {numberIndex: exponent}
export function build(nums, ops, parens = [], pows = {}) {
  const T = [];
  nums.forEach((v, k) => {
    parens.filter(p => p[0] === k).forEach(() => T.push({ t: '(' }));
    T.push({ t: 'n', v });
    if (pows[k]) T.push({ t: 'p', v: pows[k] });
    parens
      .filter(p => p[1] === k)
      .sort((a, b) => b[0] - a[0])
      .forEach(p => {
        T.push({ t: ')' });
        if (p[2]) T.push({ t: 'p', v: p[2] });
      });
    if (k < ops.length) T.push({ t: 'o', v: ops[k] });
  });
  return T;
}

// Whole, non-negative results only; anything else is null.
export function calc(a, o, b) {
  if (o === '+') return a + b;
  if (o === '-') return a - b >= 0 ? a - b : null;
  if (o === '*') return a * b;
  return b !== 0 && a % b === 0 ? a / b : null;
}

const isHi = t => t && t.t === 'o' && (t.v === '*' || t.v === '/');

// Indexes of the operations that may legally be performed right now.
export function validOps(T) {
  const out = [];
  T.forEach((t, i) => {
    if (t.t === 'p') {
      if (T[i - 1] && T[i - 1].t === 'n') out.push(i);
      return;
    }
    if (t.t !== 'o') return;
    const L = T[i - 1], R = T[i + 1];
    if (!L || !R || L.t !== 'n' || R.t !== 'n') return;
    if (T[i + 2] && T[i + 2].t === 'p') return;
    const prev = T[i - 2], next = T[i + 2];
    if (isHi(t)) {
      if (isHi(prev)) return;
    } else if ((prev && prev.t === 'o') || isHi(next)) return;
    out.push(i);
  });
  return out;
}

export function applyOp(T, i) {
  const t = T[i];
  const res = t.t === 'p' ? T[i - 1].v ** t.v : calc(T[i - 1].v, t.v, T[i + 1].v);
  if (res == null) return null;
  const from = i - 1, to = t.t === 'p' ? i : i + 1;
  const N = [...T.slice(0, from), { t: 'n', v: res }, ...T.slice(to + 1)];
  let k = from;
  while (N[k - 1] && N[k - 1].t === '(' && N[k + 1] && N[k + 1].t === ')') {
    N.splice(k + 1, 1);
    N.splice(k - 1, 1);
    k--;
  }
  return { tokens: N, res, from, to, at: k };
}

// The operation a textbook would do next: deepest parentheses first, then leftmost.
export function nextOp(T) {
  const v = validOps(T);
  let depth = 0, best = -1, bestDepth = -1;
  T.forEach((t, i) => {
    if (t.t === '(') depth++;
    else if (t.t === ')') depth--;
    else if (v.includes(i) && depth > bestDepth) {
      bestDepth = depth;
      best = i;
    }
  });
  return best;
}

// Every intermediate line down to a single number, or null if a step is not a whole number.
export function steps(T, limit = 1000) {
  const out = [T];
  while (T.length > 1) {
    const i = nextOp(T);
    if (i < 0) return null;
    const r = applyOp(T, i);
    if (!r || r.res > limit) return null;
    T = r.tokens;
    out.push(T);
  }
  return out;
}

export function value(T) {
  const s = steps(T, Infinity);
  return s ? s[s.length - 1][0].v : null;
}

// Plain evaluation that tolerates fractions, for checking the player's own constructions.
export function evalTokens(T) {
  let i = 0;
  const atom = () => {
    let v;
    if (T[i].t === '(') {
      i++;
      v = expr();
      i++;
    } else v = T[i++].v;
    while (T[i] && T[i].t === 'p') v = v ** T[i++].v;
    return v;
  };
  const term = () => {
    let v = atom();
    while (isHi(T[i])) {
      const o = T[i++].v, r = atom();
      v = o === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (T[i] && T[i].t === 'o') {
      const o = T[i++].v, r = term();
      v = o === '+' ? v + r : v - r;
    }
    return v;
  };
  return expr();
}

export const same = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-9;

export const tokHTML = T =>
  T.map(t =>
    t.t === 'n' ? `<span class="tk n">${t.v}</span>`
    : t.t === 'o' ? `<span class="tk o">${t.v == null ? '?' : SYM[t.v]}</span>`
    : t.t === 'p' ? `<sup class="tk p">${t.v}</sup>`
    : `<span class="tk b">${t.t}</span>`
  ).join('');

export const chainHTML = st =>
  `<div class="chain" dir="ltr">${st.map((T, i) => `<div class="chain-line">${i ? '<span class="tk o">=</span>' : ''}${tokHTML(T)}</div>`).join('')}</div>`;

// Random expression whose every step is a whole number.
// par: null | 'one' | 'two' | 'nested'; pow: how many numbers are squared; parPow: square the bracket.
export function genExpr({ n = 3, ops = '+-*/', par = null, max = 12, limit = 150, pow = 0, parPow = false, ok } = {}) {
  for (let tries = 0; tries < 6000; tries++) {
    const os = range(n - 1, () => pick([...ops]));
    const nums = range(n, k => (isHi({ t: 'o', v: os[k - 1] }) || os[k] === '*' ? rnd(2, 9) : rnd(2, max)));
    for (let k = n - 2; k >= 0; k--) if (os[k] === '/') nums[k] = nums[k + 1] * rnd(2, 6);
    let parens = [];
    if (par === 'one') {
      const len = rnd(2, Math.max(2, n - 1)), i = rnd(0, n - len);
      parens = [[i, i + len - 1]];
    } else if (par === 'two') parens = [[0, 1], [n - 2, n - 1]];
    else if (par === 'nested') {
      const len = rnd(3, n - 1), i = rnd(0, n - len), a = rnd(i, i + len - 2);
      parens = [[i, i + len - 1], [a, a + 1]];
    }
    if (parPow && parens.length) parens[0] = [...parens[0], 2];
    const pows = {};
    for (let c = 0; c < pow; c++) {
      const k = rnd(0, n - 1);
      pows[k] = 2;
      nums[k] = rnd(2, 7);
    }
    const T = build(nums, os, parens, pows);
    const st = steps(T, limit);
    if (!st) continue;
    const val = st[st.length - 1][0].v;
    // every bracket has to change the answer, otherwise it teaches nothing
    if (parens.some(p => value(build(nums, os, parens.filter(q => q !== p), pows)) === val && !p[2])) continue;
    if (ok && !ok({ T, st, nums, os, val })) continue;
    return { T, st, nums, os, parens, val };
  }
  const T = build([2, 3, 4], ['+', '*']);
  return { T, st: steps(T), nums: [2, 3, 4], os: ['+', '*'], parens: [], val: 14 };
}

export const hasBoth = os => os.some(o => o === '*' || o === '/') && os.some(o => o === '+' || o === '-');
