// Theme artwork: planets, collectible aliens, the accountant villain and the spaceship.

export function starfield(el) {
  let s = '';
  for (let i = 0; i < 90; i++)
    s += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--s:${(1 + Math.random() * 2).toFixed(1)}px;animation-delay:${(-Math.random() * 4).toFixed(1)}s"></i>`;
  el.innerHTML = s;
}

const shade = '<defs><radialGradient id="pshade" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient></defs>';
const PLANETS = {
  frac: `<circle r="46" fill="#d9822b"/><circle r="40" fill="#ffd166"/><path d="M0-40V40M-34.6-20L34.6 20M-34.6 20L34.6-20" stroke="#d9822b" stroke-width="2.5"/>
    <g fill="#e5484d"><circle cx="-14" cy="-22" r="5"/><circle cx="17" cy="-12" r="5"/><circle cx="22" cy="18" r="5"/><circle cx="-6" cy="24" r="5"/><circle cx="-25" cy="6" r="5"/><circle cx="6" cy="-28" r="4"/></g>
    <circle r="46" fill="url(#pshade)"/>`,
  order: `<ellipse rx="58" ry="15" fill="none" stroke="#c4b5fd" stroke-width="5" transform="rotate(-18)"/>
    <circle r="36" fill="#7c5cff"/><path d="M-34-10Q0 2 34-10M-35 6Q0 20 35 6" stroke="#a78bfa" stroke-width="5" fill="none"/><circle r="36" fill="url(#pshade)"/>
    <path d="M-58 0A58 15 0 0 0 58 0" fill="none" stroke="#ddd6fe" stroke-width="5" transform="rotate(-18)"/>`,
  sq: `<defs><pattern id="chk" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#5eead4"/><rect x="9" y="9" width="9" height="9" fill="#5eead4"/></pattern></defs>
    <circle r="44" fill="#0e9384"/><circle r="44" fill="url(#chk)"/><circle r="44" fill="url(#pshade)"/>`,
  geo: `<polygon points="0,-46 33,-33 46,0 33,33 0,46 -33,33 -46,0 -33,-33" fill="#3b82f6"/>
    <path d="M0 0L0-46L33-33ZM0 0L46 0L33 33ZM0 0L0 46L-33 33ZM0 0L-46 0L-33-33Z" fill="#60a5fa"/><path d="M0 0L33-33L46 0ZM0 0L-33 33L-46 0Z" fill="#2563eb"/>
    <circle r="46" fill="url(#pshade)"/>`,
  puz: `<circle r="44" fill="#db2777"/><path d="M-30-12C-10-36 30-26 26 0C22 22-8 24-12 8C-15-4 2-10 8 0" fill="none" stroke="#f9a8d4" stroke-width="6" stroke-linecap="round"/>
    <circle cx="-24" cy="24" r="6" fill="#f472b6"/><circle cx="28" cy="26" r="4" fill="#f472b6"/><circle r="44" fill="url(#pshade)"/>`,
};
export const planet = id => `<svg viewBox="-62 -62 124 124" class="planet">${shade}${PLANETS[id]}</svg>`;

// Deterministic random stream, so alien number i always looks the same.
function prng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BODIES = [
  '<ellipse cy="6" rx="30" ry="32"/>',
  '<rect x="-28" y="-26" width="56" height="62" rx="20"/>',
  '<path d="M0-30C24-30 36 0 34 22C32 42-32 42-34 22C-36 0-24-30 0-30Z"/>',
  '<path d="M-30-22Q0-38 30-22Q38 30 0 38Q-38 30-30-22Z"/>',
];
export function alien(i, locked = false) {
  const r = prng(i + 11), hue = Math.floor(r() * 360);
  const fill = locked ? '#2a3170' : `hsl(${hue} 72% 60%)`, dark = locked ? '#2a3170' : `hsl(${hue} 72% 38%)`;
  const body = BODIES[Math.floor(r() * BODIES.length)], eyes = 1 + Math.floor(r() * 3), ants = Math.floor(r() * 3), teeth = r() < 0.4;
  let s = `<svg viewBox="-50 -58 100 108" class="alien${locked ? ' locked' : ''}">`;
  for (let k = 0; k < ants; k++) {
    const x = ants === 1 ? 0 : k ? 14 : -14;
    s += `<path d="M${x * 0.6}-24Q${x}-40 ${x * 1.3}-48" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${x * 1.3}" cy="-50" r="5" fill="${dark}"/>`;
  }
  s += `<g fill="${dark}"><ellipse cx="-14" cy="40" rx="10" ry="6"/><ellipse cx="14" cy="40" rx="10" ry="6"/></g><g fill="${fill}">${body}</g>`;
  if (locked) return s + '<text y="18" text-anchor="middle" font-size="40" font-weight="900" fill="#4a55b0">?</text></svg>';
  const ex = eyes === 1 ? [0] : eyes === 2 ? [-12, 12] : [-17, 0, 17], er = eyes === 1 ? 12 : eyes === 2 ? 9 : 7;
  for (const x of ex) s += `<circle cx="${x}" cy="-2" r="${er}" fill="#fff"/><circle cx="${x + 1.5}" cy="-1" r="${er * 0.48}" fill="#1f2440"/>`;
  s += `<path d="M-12 18Q0 30 12 18" stroke="#1f2440" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (teeth) s += '<rect x="-4" y="21" width="8" height="7" rx="1.5" fill="#fff"/>';
  return s + '</svg>';
}

const SYL = ['זו', 'בי', 'מו', 'קי', 'לו', 'פי', 'טו', 'נו', 'גה', 'רי', 'שו', 'די', 'צי', 'וו', 'קס', 'בלו', 'פלי', 'זי'];
export function alienName(i) {
  const r = prng(i + 101), p = () => SYL[Math.floor(r() * SYL.length)];
  return p() + p() + (r() < 0.35 ? p() : '');
}

export const accountant = (color = '#9aa3c7') => `<svg viewBox="-54 -64 108 128" class="acct">
  <line x1="0" y1="-52" x2="0" y2="-40" stroke="#6b7280" stroke-width="3"/><circle cy="-56" r="4.5" fill="#ff6b6b"/>
  <rect x="-26" y="-40" width="52" height="38" rx="9" fill="${color}"/>
  <g fill="#fff" stroke="#1f2440" stroke-width="2.5"><rect x="-21" y="-31" width="18" height="14" rx="3"/><rect x="3" y="-31" width="18" height="14" rx="3"/></g>
  <path d="M-3-24H3M-9-9H9" stroke="#1f2440" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="-11" cy="-23" r="3" fill="#1f2440"/><circle cx="13" cy="-23" r="3" fill="#1f2440"/>
  <rect x="-44" y="6" width="12" height="30" rx="6" fill="${color}"/><rect x="32" y="6" width="12" height="30" rx="6" fill="${color}"/>
  <rect x="-30" y="2" width="60" height="42" rx="8" fill="#3b4270"/>
  <path d="M-9 2L0 13L9 2Z" fill="#fff"/><path d="M0 9L-5 30L0 39L5 30Z" fill="#e5484d"/>
  <rect x="28" y="24" width="22" height="28" rx="3" fill="#1f2440"/><rect x="31" y="27" width="16" height="7" rx="1" fill="#5eead4"/>
  <g fill="#9aa3c7"><circle cx="34" cy="39" r="1.8"/><circle cx="39" cy="39" r="1.8"/><circle cx="44" cy="39" r="1.8"/><circle cx="34" cy="45" r="1.8"/><circle cx="39" cy="45" r="1.8"/><circle cx="44" cy="45" r="1.8"/></g>
  <rect x="-20" y="44" width="12" height="15" rx="3" fill="#6b7280"/><rect x="8" y="44" width="12" height="15" rx="3" fill="#6b7280"/>
</svg>`;

// parts: five booleans, one upgrade per defeated boss
export function ship(parts) {
  const p = (i, on, off) => (parts[i] ? on : off);
  return `<svg viewBox="-110 -80 220 160" class="ship">
  ${p(1, '<path d="M-78-14L-104-4V4L-78 14Z" fill="#ffb020"/><path d="M-78-8L-94 0L-78 8Z" fill="#fff3c4"/>', '<path d="M-78-14L-104 0L-78 14" class="ghost"/>')}
  ${p(0, '<path d="M-40-22L-70-58H-34L-6-24ZM-40 22L-70 58H-34L-6 24Z" fill="#7c5cff"/>', '<path d="M-40-22L-70-58H-34L-6-24ZM-40 22L-70 58H-34L-6 24Z" class="ghost"/>')}
  <path d="M-78-22H30C62-22 88-8 96 0C88 8 62 22 30 22H-78Z" fill="#e8ecff"/>
  <path d="M30-22C62-22 88-8 96 0C88 8 62 22 30 22Z" fill="#ff6b6b"/>
  <rect x="-78" y="-22" width="14" height="44" rx="2" fill="#9aa3c7"/>
  ${p(3, '<circle cx="2" r="13" fill="#5eead4" stroke="#1f2440" stroke-width="3"/><path d="M-5-4A9 9 0 0 1 6-8" stroke="#fff" stroke-width="2.5" fill="none"/>', '<circle cx="2" r="13" class="ghost"/>')}
  ${p(2, '<line x1="-30" y1="-22" x2="-38" y2="-52" stroke="#9aa3c7" stroke-width="3.5"/><circle cx="-38" cy="-55" r="6" fill="#ffd166"/>', '<path d="M-30-22L-38-52" class="ghost"/>')}
  ${p(4, '<rect x="40" y="24" width="38" height="9" rx="4" fill="#db2777"/><circle cx="82" cy="28.500" r="4" fill="#f9a8d4"/>', '<rect x="40" y="24" width="38" height="9" rx="4" class="ghost"/>')}
</svg>`;
}
