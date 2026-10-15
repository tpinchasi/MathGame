// Shorthand for the most common round shapes, so challenge files stay about the maths.
import { gcd, M } from './util.js';
import { inputs, box, fbox } from './widgets.js';

// A prefix that is pure maths ("√484 =") is kept left to right together with the box;
// Hebrew words ("בסך הכול:") stay right to left.
const hebrew = s => /[\u0590-\u05FF]/.test(s.replace(/<[^>]*>/g, ''));
const lead = (pre, b) => (!pre ? b : hebrew(pre) ? pre + b : M(pre + b));

// One whole-number answer. `post` is usually a Hebrew unit after the box.
export const num = ({ prompt, visual, answer, pre = '', post = '', hints, explain, tries, wrongMsg }) => ({
  prompt, visual, hints, explain, tries, wrongMsg,
  widget: inputs(`<div class="ans-line">${lead(pre, box('a', String(answer).length + 1))}${post}</div>`),
  answer: { a: answer },
  check: v => v.a === answer,
});

// Several labelled whole-number answers: fields = [[label, answer], ...]
export const nums = ({ prompt, visual, fields, hints, explain, tries }) => ({
  prompt, visual, hints, explain, tries,
  widget: inputs(fields.map(([label, a], i) => `<div class="ans-line">${label} ${box('f' + i, String(a).length + 1)}</div>`).join('')),
  answer: Object.fromEntries(fields.map(([, a], i) => ['f' + i, a])),
  check: v => fields.every(([, a], i) => v['f' + i] === a),
});

// A fraction answer; any equivalent fraction is accepted.
export const fracAns = ({ prompt, visual, pre = '', n, d, hints, explain, tries }) => ({
  prompt, visual, hints, explain, tries,
  widget: inputs(M(`${pre}${fbox()}`)),
  answer: { n: n / gcd(n, d), d: d / gcd(n, d) },
  check: v => v.d > 0 && v.n * d === v.d * n,
});
