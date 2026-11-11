/**
 * Unit tests for the cross-script normaliser and the speech alignment engine.
 * Run: npm test   (Node 18+, no dependencies)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { CHALISA_DATA, phoneticSkeleton } = require('../js/chalisa-data.js');
const { RecitationTracker, TranscriptFeed, buildLineModel, similarity, tokenize } = require('../js/speech-matcher.js');

const VERSES = CHALISA_DATA.verses;
const LINES = VERSES.flatMap(v => v.lines);
const isPunct = w => phoneticSkeleton(w) === '';
const words = (text) => tokenize(text).filter(w => !isPunct(w));

// Deterministic PRNG so the noisy-recogniser test is reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Chant `lines` through a tracker the way a recogniser delivers them:
 *  utterances of a few lines, each sent as growing interim transcripts,
 *  then final. Returns all tracker events. */
function chant(tracker, spokenLines, { linesPerUtterance = 2 } = {}) {
  const feed = new TranscriptFeed();
  const events = [];
  for (let u = 0; u * linesPerUtterance < spokenLines.length; u++) {
    const utterance = spokenLines.slice(u * linesPerUtterance, (u + 1) * linesPerUtterance).join(' ');
    const ws = tokenize(utterance);
    for (let n = 1; n <= ws.length; n++) {
      events.push(...tracker.feed(feed.update(`u${u}`, ws.slice(0, n).join(' '), false)));
    }
    events.push(...tracker.feed(feed.update(`u${u}`, utterance, true)));
    events.push(...tracker.endOfUtterance());
  }
  return events;
}

const lineEvents = evs => evs.filter(e => e.type === 'line');
const sumAccuracy = evs => {
  const ls = lineEvents(evs);
  const m = ls.reduce((a, e) => a + e.matched, 0), t = ls.reduce((a, e) => a + e.total, 0);
  return Math.round((100 * m) / t);
};

// ---------------------------------------------------------------- normaliser

test('known cross-script pairs share one skeleton', () => {
  const same = [
    ['ज्ञान', 'জ্ঞান', 'Gyan', 'gyaan', 'jnana'],
    ['जय', 'জয়', 'Jai', 'jay'],
    ['बहुत', 'বহুত', 'Bahut'],
    ['विद्या', 'বিদ্যা', 'Vidya', 'bidya'],
    ['कपीस', 'কপীস', 'Kapis', 'capis', 'कपिश'],
    ['रघुबर', 'রঘুবর', 'Raghubar', 'रघुवर'],
    ['फल', 'ফল', 'Phal', 'fal'],
    ['कहाँ', 'কহাঁ', 'Kahan', 'कहां']
  ];
  for (const group of same) {
    const skels = group.map(phoneticSkeleton);
    assert.equal(new Set(skels).size, 1, `${group.join(' / ')} -> ${skels.join(' / ')}`);
  }
});

test('regressions from the old normaliser stay fixed', () => {
  // jn->gn used to fire inside जनेऊ / जोजन
  assert.equal(phoneticSkeleton('जनेऊ'), phoneticSkeleton('Janeu'));
  assert.equal(phoneticSkeleton('जोजन'), phoneticSkeleton('Jojan'));
  // precomposed nukta letter (U+095C) used to vanish
  assert.equal(phoneticSkeleton('पढ़ै'), phoneticSkeleton('पढ़ै'));
  assert.equal(phoneticSkeleton('पढ़ै'), 'pd');
  // punctuation-only tokens are not words
  for (const p of ['|', '||', '।', '॥', '-', ',']) assert.equal(phoneticSkeleton(p), '');
});

test('script versions of every word agree (>=97% exact, 100% within matcher tolerance)', () => {
  let total = 0, exact = 0, tolerated = 0;
  const failures = [];
  for (const line of LINES) {
    const [h, e, b] = [words(line.hi), words(line.en), words(line.bn)];
    assert.equal(h.length, e.length, `word count hi/en differs: ${line.hi}`);
    assert.equal(h.length, b.length, `word count hi/bn differs: ${line.hi}`);
    h.forEach((w, i) => {
      total++;
      const [sh, se, sb] = [w, e[i], b[i]].map(phoneticSkeleton);
      if (sh === se && sh === sb) exact++;
      // the matcher accepts a heard word if it matches ANY script's spelling,
      // so a recogniser returning any one script must reach the others' keys
      const ok = [sh, se, sb].every(x => similarity(x, sh) >= 0.6 || similarity(x, se) >= 0.6 || similarity(x, sb) >= 0.6);
      if (ok) tolerated++; else failures.push(`${w}/${e[i]}/${b[i]}`);
    });
  }
  assert.ok(exact / total >= 0.97, `exact agreement ${(100 * exact / total).toFixed(1)}%`);
  assert.equal(tolerated, total, `unmatched: ${failures.join(', ')}`);
});

test('line model: every rendered word is addressable in every script, punctuation is skipped', () => {
  const model = buildLineModel(VERSES);
  assert.equal(model.length, 86);
  for (const L of model) {
    const v = VERSES[L.verseIndex].lines[L.lineIndex];
    for (const sc of ['hi', 'en', 'bn']) {
      const toks = tokenize(v[sc]);
      const idx = L.words.map(w => w.tokenIndex[sc]);
      assert.equal(idx.length, toks.filter(t => !isPunct(t)).length);
      idx.forEach(i => assert.ok(!isPunct(toks[i]), `punctuation token addressed: ${v[sc]}`));
    }
  }
});

// ---------------------------------------------------------------- transcript feed

test('feed emits each word once and holds back the still-changing last word', () => {
  const f = new TranscriptFeed();
  assert.deepEqual(f.update('a', 'जय', false), []);
  assert.deepEqual(f.update('a', 'जय हनु', false), ['जय']);
  assert.deepEqual(f.update('a', 'जय हनुमान', false), []);           // revision of held word
  assert.deepEqual(f.update('a', 'जय हनुमान ज्ञान', false), ['हनुमान']);
  assert.deepEqual(f.update('a', 'जय हनुमान ज्ञान', true), ['ज्ञान']);
  assert.deepEqual(f.update('a', 'जय हनुमान ज्ञान', true), []);        // repeated final
  assert.deepEqual(f.update('b', 'गुन सागर', false), ['गुन']);
  assert.deepEqual(f.flush('b'), ['सागर']);
});

// ---------------------------------------------------------------- tracker

test('perfect Hindi recitation: all 86 lines complete in order at 100%', () => {
  const t = new RecitationTracker(VERSES);
  const evs = chant(t, LINES.map(l => l.hi));
  const ls = lineEvents(evs);
  assert.equal(ls.length, 86);
  ls.forEach((e, k) => {
    const v = Math.floor(k / 2); // every verse has two lines
    assert.deepEqual([e.verseIndex, e.lineIndex], [v, k % 2]);
  });
  assert.equal(sumAccuracy(evs), 100);
  assert.equal(evs.at(-1).type, 'complete');
});

test('cross-script: Bengali, romanised and Devanagari speech all track the same verses', () => {
  for (const sc of ['bn', 'en']) {
    const t = new RecitationTracker(VERSES);
    const spoken = LINES.map(l => l[sc].replace(/[|।॥]/g, '').toLowerCase());
    const evs = chant(t, spoken, { linesPerUtterance: 3 });
    assert.equal(lineEvents(evs).length, 86, sc);
    assert.equal(sumAccuracy(evs), 100, sc);
  }
});

test('the tracker never runs ahead of the reciter', () => {
  // Only the first 3 lines are chanted: exactly those 3 lines may finish.
  const t = new RecitationTracker(VERSES);
  const evs = chant(t, LINES.slice(0, 3).map(l => l.hi), { linesPerUtterance: 3 });
  assert.equal(lineEvents(evs).length, 3);
  assert.deepEqual(t.position(), { verseIndex: 1, lineIndex: 1, wordIndex: 0, done: false });
});

test('greeting / chatter does not complete a line or invent accuracy', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(2, 0); // Chaupai 1: जय हनुमान ज्ञान गुन सागर
  const evs = t.feed(tokenize('जय श्री राम हनुमान जी की जय आज मौसम बहुत अच्छा है'));
  assert.equal(lineEvents(evs).length, 0);
  const t2 = new RecitationTracker(VERSES);
  assert.equal(lineEvents(t2.feed(tokenize('hello how are you doing today ok'))).length, 0);
  assert.equal(lineEvents(t2.feed(tokenize('hmm um aaa'))).length, 0);
});

test('a missed final word is closed by the start of the next line', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(2, 0);
  // "सागर" is never recognised; the reciter moves on to "जय कपीस ..."
  const evs = t.feed(tokenize('जय हनुमान ज्ञान गुन जय कपीस तिहुँ लोक उजागर'));
  const ls = lineEvents(evs);
  assert.equal(ls.length, 2);
  assert.deepEqual([ls[0].matched, ls[0].total], [4, 5]);
  assert.deepEqual([ls[1].matched, ls[1].total], [5, 5]);
});

test('split and merged compounds still match', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(1, 0); // बुद्धिहीन तनु जानिके सुमिरौं पवन-कुमार
  const evs = t.feed(tokenize('बुद्धिहीन तनु जानिके सुमिरौं पवन कुमार'));
  assert.deepEqual(lineEvents(evs).map(e => e.accuracy), [100]);
});

test('noisy recogniser: completes in order, accuracy tracks what was really recognised', () => {
  const rand = rng(42);
  const vary = (w) => {
    const swaps = [['ब', 'व'], ['व', 'ब'], ['श', 'स'], ['ि', 'ी'], ['ु', 'ू'], ['ँ', 'ं'], ['ड़', 'ड़']];
    const [a, b] = swaps[Math.floor(rand() * swaps.length)];
    return w.includes(a) ? w.replace(a, b) : w;
  };
  const junk = ['अरे', 'हाँ', 'ओके', 'जी'];
  let dropped = 0, spokenWords = 0;
  const spoken = LINES.map(l => {
    const out = [];
    for (const w of words(l.hi)) {
      spokenWords++;
      const r = rand();
      if (r < 0.12) { dropped++; continue; }           // recogniser drops the word
      out.push(r < 0.30 ? vary(w) : w);                 // spelling variant
      if (rand() < 0.04) out.push(junk[Math.floor(rand() * junk.length)]); // filler
    }
    return out.join(' ');
  });
  const t = new RecitationTracker(VERSES);
  const evs = chant(t, spoken);
  const ls = lineEvents(evs);
  assert.equal(ls.length, 86, 'every line finished');
  ls.forEach((e, k) => assert.deepEqual([e.verseIndex, e.lineIndex], [Math.floor(k / 2), k % 2]));
  const expected = Math.round(100 * (spokenWords - dropped) / spokenWords);
  const acc = sumAccuracy(evs);
  assert.ok(Math.abs(acc - expected) <= 3, `accuracy ${acc}% vs recognised ${expected}%`);
});

test('pause after the last word is lost closes the line; a mid-line pause does not', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(42, 1); // राम लखन सीता सहित हृदय बसहु सुर भूप
  t.feed(tokenize('राम लखन सीता'));
  assert.equal(lineEvents(t.endOfUtterance()).length, 0, 'mid-line pause keeps the line open');
  t.feed(tokenize('सहित हृदय बसहु सुर'));
  const evs = t.endOfUtterance();
  assert.deepEqual(evs.filter(e => e.type !== 'word').map(e => e.type), ['line', 'complete']);
  assert.deepEqual([lineEvents(evs)[0].matched, lineEvents(evs)[0].total], [7, 8]);
});

test('a line starting with repeated weak words is reached even after a dropped word', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(37, 1);
  const prev = words(VERSES[37].lines[1].hi);
  // previous line's last word lost, then "जय (जय) जय हनुमान गोसाईं" with one जय dropped
  const evs = t.feed([...prev.slice(0, -1), 'जय', 'जय', 'हनुमान', 'गोसाईं']);
  const ls = lineEvents(evs);
  assert.deepEqual(ls.map(e => [e.verseIndex, e.lineIndex]), [[37, 1], [38, 0]]);
  assert.deepEqual([ls[1].matched, ls[1].total], [4, 5]);
});

test('setPosition re-targets the tracker (verse card tap)', () => {
  const t = new RecitationTracker(VERSES);
  t.setPosition(42, 1);
  const evs = t.feed(tokenize(LINES.at(-1).hi));
  assert.deepEqual(evs.filter(e => e.type !== 'word').map(e => e.type), ['line', 'complete']);
  assert.equal(t.position().done, true);
});
