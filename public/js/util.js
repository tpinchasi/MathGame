export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const range = (n, f = i => i) => Array.from({ length: n }, (_, i) => f(i));
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

// Math inside Hebrew text is always isolated as left-to-right.
export const M = s => `<span class="m" dir="ltr">${s}</span>`;
export const fr = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
export const F = (n, d) => M(fr(n, d));
export const MX = (w, n, d) => M(`<span class="whole">${w}</span>${fr(n, d)}`);

// A value n/d shown the way a textbook would: whole, proper fraction or mixed number.
export function showFrac(n, d) {
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return M(n);
  return n > d ? MX(Math.floor(n / d), n % d, d) : F(n, d);
}

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) e.append(kid);
  return e;
}
