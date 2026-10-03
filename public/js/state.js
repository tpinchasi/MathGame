// Progress lives in this browser only. Everything is wrapped so the game still runs if storage is blocked.
const KEY = 'nekamat-hacheshbonaim-v1';
const blank = () => ({ lv: {}, st: {}, intro: {}, story: false, mute: false });

let S = blank();
try {
  S = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch {}
};

// Highest level passed for a challenge (0–3). One star per level.
export const level = id => S.lv[id] || 0;
export const stats = id => S.st[id];

// Returns true when this result earns a new star.
export function record(id, lvl, correct, total, passed) {
  const s = S.st[id] || (S.st[id] = { plays: 0, ok: 0, tot: 0 });
  s.plays++;
  s.ok += correct;
  s.tot += total;
  s.last = Date.now();
  const first = passed && level(id) < lvl;
  if (first) S.lv[id] = lvl;
  save();
  return first;
}

export function flag(k, v) {
  if (v !== undefined) {
    S[k] = v;
    save();
  }
  return S[k];
}
export const introSeen = id => !!S.intro[id];
export const markIntro = id => {
  S.intro[id] = 1;
  save();
};
export const reset = () => {
  S = blank();
  save();
};
