// כוכב סדר הפעולות
import { rnd, pick, shuffle, range, M, SYM } from '../util.js';
import { genExpr, hasBoth, build, steps, value, evalTokens, same, tokHTML, chainHTML, validOps, applyOp, nextOp, calc } from '../expr.js';
import { inputs, box, choice, exprTap, parenPlace, opFill, fillOps, targetBuilder } from '../widgets.js';
import { num } from '../kit.js';

const show = T => `<div class="expr" dir="ltr">${tokHTML(T)}</div>`;
const inline = (T, val) => M(`${tokHTML(T)}${val == null ? '' : ` = ${val}`}`);
const fmt = x => (Number.isFinite(x) ? M(String(Number.isInteger(x) ? x : Math.round(x * 100) / 100).replace('-', '−')) : 'משהו שאי אפשר לחשב (חילוק באפס)');
const mixedOps = ({ os }) => hasBoth(os);

const first = {
  id: 'order-first', title: 'מה פותרים קודם?',
  intro: `<p>כשיש בתרגיל כמה פעולות, לא פותרים פשוט משמאל לימין. יש סדר:</p>
    <p><b>1.</b> כפל וחילוק. <b>2.</b> חיבור וחיסור.<br>בין פעולות מאותה דרגה פותרים משמאל לימין.</p>
    <div class="ex">${M('3 + 4 × 2 = 3 + 8 = 11')} (ולא 14!)</div>
    <p>באתגר הזה לוחצים על הפעולה שצריך לבצע עכשיו, והמחשב מחשב אותה.</p>`,
  gen(L) {
    const e = genExpr({ n: L + 2, limit: 99, ok: mixedOps });
    return {
      prompt: 'לחצו על הפעולה שצריך לבצע עכשיו. המשיכו עד שנשאר מספר אחד.', sig: tokHTML(e.T), widget: exprTap(e.T),
      hints: ['כפל וחילוק קודמים לחיבור ולחיסור.', 'בין פעולות מאותה דרגה (כפל וחילוק, או חיבור וחיסור) פותרים משמאל לימין.'],
      explain: `כך פותרים לפי הסדר:${chainHTML(e.st)}`,
    };
  },
};

const brackets = {
  id: 'order-brackets', title: 'סוגריים קודם',
  intro: `<p>סוגריים אומרים: "את זה פותרים קודם!" רק אחרי שפתרנו את מה שבתוך הסוגריים ממשיכים לשאר התרגיל.</p>
    <div class="ex">${M('2 × (3 + 4) = 2 × 7 = 14')}</div>
    <p>כשיש סוגריים בתוך סוגריים, מתחילים מהפנימיים.</p>`,
  gen(L) {
    const e = L === 1 ? genExpr({ n: 3, par: 'one', limit: 99 })
      : L === 2 ? genExpr({ n: 4, par: 'one', limit: 120 })
      : genExpr(Math.random() < 0.5 ? { n: 4, par: 'two', limit: 150 } : { n: 5, par: 'nested', limit: 150 });
    return {
      prompt: 'לחצו על הפעולה שצריך לבצע עכשיו. המשיכו עד שנשאר מספר אחד.', sig: tokHTML(e.T), widget: exprTap(e.T),
      hints: ['מה שבתוך הסוגריים נפתר קודם.', 'גם בתוך הסוגריים וגם מחוץ להם: כפל וחילוק לפני חיבור וחיסור, ומשמאל לימין.'],
      explain: `כך פותרים לפי הסדר:${chainHTML(e.st)}`,
    };
  },
};

const long = {
  id: 'order-long', title: 'תרגיל ארוך, שלב אחר שלב',
  intro: `<p>עכשיו אתם גם בוחרים את הפעולה וגם מחשבים אותה. בכל שלב: לוחצים על הפעולה הבאה בתור, מקלידים את התוצאה שלה ולוחצים ✓.</p>
    <div class="ex">${M('20 − (2 + 3) × 2')}<br>${M('= 20 − 5 × 2')}<br>${M('= 20 − 10')}<br>${M('= 10')}</div>`,
  gen(L) {
    const e = L === 1 ? genExpr({ n: 3, limit: 99, ok: mixedOps })
      : L === 2 ? genExpr({ n: 4, par: 'one', limit: 150 })
      : genExpr({ n: 5, par: pick(['one', 'nested']), limit: 200 });
    return {
      prompt: 'פתרו שלב אחר שלב: לחצו על הפעולה הבאה בתור, הקלידו את התוצאה שלה ולחצו ✓.', sig: tokHTML(e.T), widget: exprTap(e.T, { compute: true }),
      hints: ['הסדר: סוגריים, אחר כך כפל וחילוק, ובסוף חיבור וחיסור.', 'בין פעולות מאותה דרגה פותרים משמאל לימין. בדקו גם את החישוב עצמו.'],
      explain: `כך פותרים לפי הסדר:${chainHTML(e.st)}`,
    };
  },
};

const addBrackets = {
  id: 'order-add-brackets', title: 'מוסיפים סוגריים',
  intro: `<p>סוגריים יכולים לשנות את התוצאה של תרגיל. כאן התוצאה כבר נתונה, ואתם צריכים למצוא איפה לשים זוג סוגריים כדי שהיא תהיה נכונה.</p>
    <div class="ex">${M('3 + 4 × 2 = 14')} לא נכון, אבל ${M('(3 + 4) × 2 = 14')} נכון.</div>
    <p>לוחצים על המספר הראשון ועל המספר האחרון שבתוך הסוגריים.</p>`,
  gen(L) {
    const e = genExpr({ n: L + 2, par: 'one', limit: 150 }), flat = evalTokens(build(e.nums, e.os)), [i, j] = e.parens[0];
    const withPar = v => evalTokens(build(e.nums, e.os, [v]));
    return {
      prompt: 'הוסיפו זוג סוגריים אחד כך שהשוויון יהיה נכון.',
      widget: parenPlace(e.nums, e.os, e.val), answer: [i, j], check: v => same(withPar(v), e.val),
      wrongMsg: v => `עם הסוגריים האלה יוצא ${fmt(withPar(v))}.`,
      hints: [`בלי סוגריים התרגיל שווה ${fmt(flat)}, ולא ${e.val}. איזו פעולה צריכה לקרות מוקדם יותר?`, `הסוגריים צריכים להקיף ${j - i + 1} מספרים.`],
      explain: `${inline(e.T, e.val)}${chainHTML(e.st)}`,
    };
  },
};

const missing = {
  id: 'order-missing', title: 'הפעולה החסרה',
  intro: `<p>מישהו מחק פעולות מהתרגיל! השלימו אותן כך שהתוצאה תהיה נכונה. לחיצה על עיגול מחליפה בין ${M('+ − × ÷')}.</p>
    <div class="ex">${M('8 ? 2 × 3 = 14')} ← הפעולה החסרה היא ${M('+')}, כי ${M('8 + 2 × 3 = 8 + 6 = 14')}.</div>
    <p>אל תשכחו שסדר הפעולות עדיין חל.</p>`,
  gen(L) {
    const n = L === 3 ? 4 : 3, e = genExpr({ n, limit: 99, ok: L === 1 ? null : mixedOps });
    const hide = new Set(shuffle(range(n - 1)).slice(0, L));
    let k = -1;
    const T = e.T.map(t => (t.t === 'o' && hide.has(++k) ? { t: 'o', v: null } : t)), ans = e.os.filter((_, i) => hide.has(i));
    const val = v => evalTokens(fillOps(T, v));
    return {
      prompt: 'השלימו את הפעולות החסרות כך שהשוויון יהיה נכון.',
      widget: opFill(T, e.val), answer: ans, check: v => same(val(v), e.val), wrongMsg: v => `עם הפעולות האלה יוצא ${fmt(val(v))}.`,
      hints: ['הסתכלו על התוצאה: האם היא גדולה או קטנה ביחס למספרים? כך אפשר לנחש אם יש כפל או חילוק.', `אחת הפעולות החסרות היא ${M(SYM[ans[0]])}.`],
      explain: `${inline(e.T, e.val)}${chainHTML(e.st)}`,
    };
  },
};

// A worked solution in which exactly one line is wrong, and everything after follows from the wrong line.
function robotRun(L) {
  for (;;) {
    const e = genExpr(L === 1 ? { n: 4, limit: 99, ok: mixedOps } : L === 2 ? { n: 4, par: 'one', limit: 120 } : { n: 5, par: pick([null, 'one']), limit: 150, ok: mixedOps });
    const total = e.st.length - 1, badStep = rnd(0, total - 1), lines = [];
    let T = e.T, fix = '', dead = false;
    for (let s = 0; s < total; s++) {
      const c = nextOp(T), right = c < 0 ? null : applyOp(T, c);
      if (!right) {
        dead = true;
        break;
      }
      if (s !== badStep) T = right.tokens;
      else {
        const valid = validOps(T), said = `${T[c - 1].v} ${SYM[T[c].v]} ${T[c + 1].v}`;
        const outOfTurn = T.map((_, i) => i).filter(i => T[i].t === 'o' && T[i - 1].t === 'n' && T[i + 1].t === 'n' && !valid.includes(i));
        const wrong = outOfTurn.length && Math.random() < (L === 1 ? 0.8 : 0.55) ? applyOp(T, pick(outOfTurn)) : null;
        if (wrong) {
          fix = `הרובוט לא שמר על סדר הפעולות. היה צריך לחשב קודם את ${M(said)}.`;
          T = wrong.tokens;
        } else {
          const slip = right.res + pick([1, -1, 2, 10].filter(d => right.res + d >= 0));
          fix = `טעות חישוב: ${M(`${said} = ${right.res}`)}, ולא ${slip}.`;
          T = right.tokens.map((t, i) => (i === right.at ? { t: 'n', v: slip } : t));
        }
      }
      lines.push(T);
    }
    if (!dead && T.length === 1 && T[0].v !== e.val) return { e, lines, badStep, fix };
  }
}

const robot = {
  id: 'order-robot', title: 'הטעות של הרובוט',
  intro: `<p>הרובוט של החשבונאים פותר תרגילים שלב אחרי שלב, אבל בכל תרגיל הוא טועה בשורה אחת. לפעמים הוא לא שומר על סדר הפעולות, ולפעמים הוא פשוט טועה בחישוב.</p>
    <p>מצאו את <b>השורה הראשונה</b> שיש בה טעות. השורות שאחריה ממשיכות את הטעות, אז הן לא נחשבות.</p>`,
  gen(L) {
    const { e, lines, badStep, fix } = robotRun(L);
    return {
      prompt: 'הרובוט פתר את התרגיל הזה, וטעה בשורה אחת. לחצו על השורה הראשונה שיש בה טעות.', visual: show(e.T),
      widget: choice(lines.map(T => `<span class="tk o">=</span>${tokHTML(T)}`), { cls: 'lines' }), answer: badStep, check: v => v === badStep, tries: L === 3 ? 2 : 1,
      hints: ['בדקו כל שורה מול השורה שמעליה: איזו פעולה בוצעה? האם היא באמת הייתה בתור?', 'בדקו גם את החישוב עצמו בכל שורה.'],
      explain: `הטעות בשורה ${badStep + 1}. ${fix} הפתרון הנכון:${chainHTML(e.st)}`,
    };
  },
};

// Depth-first search for a way to reach the target using every tile once.
function solveTarget(tiles, target) {
  if (tiles.length === 1) return tiles[0] === target ? [] : null;
  for (let i = 0; i < tiles.length; i++)
    for (let j = 0; j < tiles.length; j++) {
      if (i === j) continue;
      for (const o of '+-*/') {
        if ((o === '+' || o === '*') && i > j) continue;
        const r = calc(tiles[i], o, tiles[j]);
        if (r == null) continue;
        const rest = solveTarget([...tiles.filter((_, k) => k !== i && k !== j), r], target);
        if (rest) return [[tiles[i], o, tiles[j]], ...rest];
      }
    }
  return null;
}

const target = {
  id: 'order-target', title: 'מספר מטרה',
  intro: `<p>יש לכם כמה מספרים ומספר מטרה. צריך להשתמש <b>בכל</b> המספרים, כל אחד פעם אחת, ולהגיע בדיוק למטרה.</p>
    <p>בוחרים מספר, פעולה ועוד מספר, ושניהם מתחברים למספר חדש. ממשיכים עד שנשאר מספר אחד.</p>
    <div class="ex">מספרים: 2, 3, 4. מטרה: 14.<br>${M('3 + 4 = 7')}, ואז ${M('7 × 2 = 14')}.</div>
    <p>אפשר לנסות כמה פעמים שרוצים.</p>`,
  gen(L) {
    for (;;) {
      const tiles = range(L === 1 ? 3 : 4, () => rnd(1, L === 3 ? 10 : 9));
      let goal = 24;
      if (L < 3) {
        // walk a random path so the target is certainly reachable and uses × or ÷
        let t = [...tiles], hi = false;
        while (t && t.length > 1) {
          const [a, b] = shuffle(range(t.length)), o = pick([...'+-*/']), r = calc(t[a], o, t[b]);
          if (o === '*' || o === '/') hi = true;
          t = r == null ? null : [...t.filter((_, k) => k !== a && k !== b), r];
        }
        if (!t || !hi) continue;
        goal = t[0];
        if (goal < (L === 1 ? 6 : 10) || goal > (L === 1 ? 40 : 60)) continue;
      }
      if (tiles.reduce((a, b) => a + b, 0) === goal || new Set(tiles).size < tiles.length - 1) continue;
      const sol = solveTarget(tiles, goal);
      if (!sol) continue;
      const said = sol.map(([a, o, b]) => M(`${a} ${SYM[o]} ${b} = ${calc(a, o, b)}`));
      return {
        prompt: `השתמשו בכל המספרים, כל אחד פעם אחת, כדי להגיע בדיוק ל־${goal}.`, sig: tiles.join() + goal, widget: targetBuilder(tiles, goal, sol),
        hints: ['חשבו מהסוף: איזה תרגיל אחרון יכול לתת את המטרה? למשל כפל של שני מספרים, או מספר קרוב ועוד תיקון קטן.', `אפשר להתחיל כך: ${said[0]}.`],
        explain: `דרך אחת: ${said.join(', ')}.`,
      };
    }
  },
};

const clever = {
  id: 'order-clever', title: 'חישוב חכם',
  intro: `<p><b>חוק הפילוג</b> מאפשר לפרק תרגיל כפל קשה לשני תרגילים קלים.</p>
    <div class="ex">${M('7 × 98 = 7 × 100 − 7 × 2 = 700 − 14 = 686')}</div>
    <p>וזה עובד גם הפוך: כשאותו מספר מופיע בשתי מכפלות, אפשר לאחד אותן.</p>
    <div class="ex">${M('37 × 6 + 37 × 4 = 37 × 10 = 370')}</div>`,
  gen(L) {
    const lines = (...rows) => `<div class="sm">${rows.map(r => `<div class="ans-line">${M(r)}</div>`).join('')}</div>`;
    const all = (ans, extra) => ({ prompt: 'השלימו את החישוב החכם.', answer: ans, check: v => Object.keys(ans).every(k => v[k] === ans[k]), ...extra });
    if (L < 3) {
      const a = rnd(3, 9), plus = L === 1, big = plus ? rnd(1, 4) * 10 : pick([50, 100, 200, 300]), small = plus ? rnd(2, 9) : rnd(1, 3);
      const n = plus ? big + small : big - small, op = plus ? '+' : '−', z = a * n;
      return all({ u: small, x: a * big, y: a * small, z }, {
        widget: inputs(lines(`${a} × ${n} = ${a} × ${big} ${op} ${a} × ${box('u', 2)}`, `= ${box('x', 4)} ${op} ${box('y', 3)} = ${box('z', 4)}`)),
        hints: [plus ? `מפרקים: ${M(`${n} = ${big} + ${small}`)}.` : `${n} הוא כמעט ${big}: ${M(`${n} = ${big} − ${small}`)}.`, `מכפילים את ${a} בכל חלק בנפרד: ${M(`${a} × ${big} = ${a * big}`)} ו־${M(`${a} × ${small} = ${a * small}`)}.`],
        explain: M(`${a} × ${n} = ${a * big} ${op} ${a * small} = ${z}`),
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const [c, m] = pick([[25, 4], [125, 8], [50, 2], [5, 2]]), k = rnd(3, 12);
      return all({ u: k, z: c * m * k }, {
        widget: inputs(lines(`${c} × ${m * k} = ${c} × ${m} × ${box('u', 3)}`, `= ${c * m} × ${box('u2', 3)} = ${box('z', 5)}`)),
        answer: { u: k, u2: k, z: c * m * k }, check: v => v.u === k && v.u2 === k && v.z === c * m * k,
        hints: [`${M(`${c} × ${m} = ${c * m}`)} הוא מספר עגול. האם ${m * k} מתחלק ב־${m}?`, `${M(`${m * k} = ${m} × ${k}`)}`],
        explain: M(`${c} × ${m * k} = ${c} × ${m} × ${k} = ${c * m} × ${k} = ${c * m * k}`),
      });
    }
    const c = rnd(12, 49), sum = pick([10, 20, 100]), plus = t === 1;
    const q = plus ? rnd(2, sum - 2) : rnd(2, 30), p = plus ? sum - q : q + sum, op = plus ? '+' : '−';
    return all({ u: sum, z: c * sum }, {
      widget: inputs(lines(`${c} × ${p} ${op} ${c} × ${q}`, `= ${c} × ${box('u', 4)} = ${box('z', 5)}`)),
      hints: [`המספר ${c} מופיע בשתי המכפלות. כמה פעמים ${c} יש בסך הכול?`, `${M(`${p} ${op} ${q} = ${sum}`)}`],
      explain: M(`${c} × ${p} ${op} ${c} × ${q} = ${c} × ${sum} = ${c * sum}`),
    });
  },
};

const PAR_SHAPES = [[[0, 1]], [[2, 3]], [[0, 1], [2, 3]], [[0, 2]], [[1, 3]], [[1, 2]]];
const boss = {
  id: 'order-boss', title: 'בוס: החשבונאית סוגריים',
  intro: `<p>החשבונאית סוגריים אוהבת תרגילים עם סוגריים בתוך סוגריים, ואת חידת "ארבע הספרות": ארבעה מספרים זהים, והפעולות ביניהם נמחקו.</p>
    <div class="ex">${M('4 ? 4 ? 4 ? 4 = 17')} ← ${M('4 × 4 + 4 ÷ 4 = 17')}</div>
    <p>לחיצה על עיגול מחליפה בין ${M('+ − × ÷')}.</p>`,
  gen(L) {
    if (L === 1) {
      const e = genExpr({ n: 5, par: 'nested', limit: 200 });
      return num({
        prompt: 'כמה שווה התרגיל?', visual: show(e.T), answer: e.val,
        hints: ['מתחילים מהסוגריים הפנימיים ביותר.', `הצעד הראשון: ${inline(e.st[1])}`],
        explain: `כך פותרים לפי הסדר:${chainHTML(e.st)}`,
      });
    }
    for (;;) {
      const d = rnd(2, 6), four = [d, d, d, d], os = range(3, () => pick([...'+-*/'])), parens = L === 2 ? [] : pick(PAR_SHAPES);
      const T = build(four, os, parens), st = steps(T, 150);
      if (!st || (parens.length && value(build(four, os)) === st[st.length - 1][0].v)) continue;
      const goal = st[st.length - 1][0].v, B = T.map(t => (t.t === 'o' ? { t: 'o', v: null } : t)), val = v => evalTokens(fillOps(B, v));
      return {
        prompt: `השלימו את הפעולות כך שארבע פעמים ${d} ייתנו ${goal}.`,
        widget: opFill(B, goal), answer: os, check: v => same(val(v), goal), tries: 3, wrongMsg: v => `עם הפעולות האלה יוצא ${fmt(val(v))}.`,
        hints: [parens.length ? 'פתרו קודם בראש את מה שבתוך הסוגריים: אילו תוצאות אפשר לקבל שם?' : `אילו תוצאות נותנים שני מספרים ${d}? ${M(`${d} + ${d} = ${d + d}`)}, ${M(`${d} × ${d} = ${d * d}`)}, ${M(`${d} ÷ ${d} = 1`)}, ${M(`${d} − ${d} = 0`)}.`, `הפעולה הראשונה משמאל היא ${M(SYM[os[0]])}.`],
        explain: `${inline(T, goal)}${chainHTML(st)}`,
      };
    }
  },
};

export default {
  id: 'order', name: 'כוכב סדר הפעולות', color: '#a78bfa', boss: 'החשבונאית סוגריים',
  tagline: 'כאן הכול תלוי בסדר. מי שפותר בסדר הלא נכון מקבל תשובה אחרת לגמרי.',
  challenges: [first, brackets, long, addBrackets, missing, robot, target, clever, boss],
};
