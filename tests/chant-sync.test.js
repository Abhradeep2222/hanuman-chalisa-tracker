/**
 * Real chanting styles, end to end through js/app.js and the fake native
 * recogniser: slow with pauses, fast with merged/dropped words, recognisers
 * that restart their partial text per phrase, soft voices, and the screen.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/fake-dom');
const { fakeChantRecognizer, nativeGlobals } = require('./helpers/fake-native');

const wait = ms => new Promise(r => setTimeout(r, ms));

/** Deterministic pseudo-random numbers, so a failure can be replayed. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function startNative({ script = 'hi', verse = 0, storage = {} } = {}) {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const env = loadApp({ storage: { chalisa_script_lang: script, ...storage }, globals });
  env.app.switchMode('voice');
  env.app.jumpToVerse(verse);
  await env.app.startVoiceListening();
  return { plugin, ...env };
}

const lineWords = (ctx, v, l) => ctx.CHALISA_DATA.verses[v].lines[l].hi.split(/\s+/).filter(w => !/^[|।॥]+$/.test(w));
const pos = app => [app.currentVerseIndex, app.currentLineIndex];

test('slow chanter: a pause before the last word does not close the line early', async () => {
  const { app, plugin, ctx } = await startNative({ verse: 2 });
  const words = lineWords(ctx, 2, 0); // जय हनुमान ज्ञान गुन सागर
  let seg = 0;
  // every word is its own utterance: the recogniser ends after each pause
  for (const w of words.slice(0, -1)) {
    seg++;
    plugin.emit('partial', { segment: seg, text: w });
    await wait(5);
    plugin.emit('final', { segment: seg, text: w });
  }
  await wait(20); // a breath before the last word (shorter than the silence that closes a line)
  assert.deepEqual(pos(app), [2, 0], 'still on the line, waiting for its last word');
  seg++;
  plugin.emit('partial', { segment: seg, text: words.at(-1) });
  plugin.emit('final', { segment: seg, text: words.at(-1) });
  assert.deepEqual(pos(app), [2, 1]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5], 'every slow word counted');
  app.stopVoiceListening();
});

test('slow chanter: a word lights up once the recogniser stops revising it, without saying the next one', async () => {
  const { app, plugin } = await startNative({ verse: 2 });
  plugin.emit('partial', { segment: 1, text: 'जय हनुमान' });
  assert.equal(app.currentWordIndex, 1, '"हनुमान" is still held back');
  await wait(30); // > holdReleaseMs
  assert.equal(app.currentWordIndex, 2, '"हनुमान" released by the stability timer');
  plugin.emit('partial', { segment: 1, text: 'जय हनुमान ज्ञान गुन सागर' });
  await wait(30);
  assert.deepEqual(pos(app), [2, 1], 'the last word of the line finishes it without a final');
  plugin.emit('final', { segment: 1, text: 'जय हनुमान ज्ञान गुन सागर' });
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5], 'no word counted twice');
  app.stopVoiceListening();
});

test('a last word the recogniser never delivered: the line closes after a silence', async () => {
  const { app, plugin } = await startNative({ verse: 2 });
  plugin.emit('partial', { segment: 1, text: 'जय हनुमान ज्ञान गुन' });
  plugin.emit('final', { segment: 1, text: 'जय हनुमान ज्ञान गुन' });
  assert.deepEqual(pos(app), [2, 0]);
  await wait(70); // > lineCloseSilenceMs
  assert.deepEqual(pos(app), [2, 1]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [4, 5]);
  app.stopVoiceListening();
});

test('recogniser that restarts its partial text per phrase: nothing lost, nothing doubled', async () => {
  const { app, plugin, ctx } = await startNative({ verse: 2 });
  const l0 = lineWords(ctx, 2, 0);
  const l1 = lineWords(ctx, 2, 1);
  const grow = words => words.map((_, i) => words.slice(0, i + 1).join(' '));
  for (const t of grow(l0)) plugin.emit('partial', { segment: 1, text: t });
  for (const t of grow(l1)) plugin.emit('partial', { segment: 1, text: t }); // restarted text
  plugin.emit('final', { segment: 1, text: [...l0, ...l1].join(' ') });   // final = whole utterance
  assert.deepEqual(pos(app), [3, 0]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [10, 10]);
  app.stopVoiceListening();
});

/**
 * One whole Chalisa through the app. `style` shapes what the recogniser
 * reports: segment length (pauses), word drops (soft voice / noise), merged
 * words at speed, and whether partial text restarts per line.
 */
async function reciteWholeChalisa(style, seed) {
  const { app, plugin, ctx } = await startNative({ verse: 0, storage: { chalisa_sankalpa_goal: '7' } });
  const rand = rng(seed);
  const verses = ctx.CHALISA_DATA.verses;
  let seg = 0;
  let spoken = 0;
  let delivered = 0;
  const lines = [];
  verses.forEach((v, vi) => v.lines.forEach((_, li) => lines.push(lineWords(ctx, vi, li))));
  for (let i = 0; i < lines.length; i += style.linesPerUtterance) {
    seg++;
    const utter = lines.slice(i, i + style.linesPerUtterance);
    let heard = [];
    let phrase = [];
    for (const line of utter) {
      if (style.restartPerLine) phrase = [];
      for (const w of line) {
        spoken++;
        if (rand() < style.drop) continue; // the recogniser missed it
        delivered++;
        if (style.merge && phrase.length && rand() < style.merge) {
          phrase[phrase.length - 1] += w; // "ज्ञान गुन" -> "ज्ञानगुन"
          heard[heard.length - 1] += w;
        } else {
          phrase.push(w);
          heard.push(w);
        }
        if (rand() < style.partialEvery) plugin.emit('partial', { segment: seg, text: phrase.join(' ') });
      }
      if (style.slowPauses) await wait(2);
    }
    plugin.emit('final', { segment: seg, text: heard.join(' ') });
    if (style.slowPauses) await wait(2);
  }
  await wait(80); // silence after the last line
  const result = {
    completed: app.chantCount,
    shownAccuracy: app.accuracy.total ? app.accuracy.matched / app.accuracy.total : 0,
    trueRate: delivered / spoken
  };
  app.stopVoiceListening();
  return result;
}

const STYLES = {
  'normal pace, clear voice': { linesPerUtterance: 2, drop: 0, merge: 0, partialEvery: 0.5 },
  'slow, a pause after every line': { linesPerUtterance: 1, drop: 0.05, merge: 0, partialEvery: 1, slowPauses: true },
  'fast, long breaths, merged and dropped words': { linesPerUtterance: 4, drop: 0.2, merge: 0.15, partialEvery: 0.35 },
  'soft voice: a third of the words missed': { linesPerUtterance: 2, drop: 0.33, merge: 0, partialEvery: 0.6 },
  'recogniser restarts partial text every line': { linesPerUtterance: 4, drop: 0.1, merge: 0.05, partialEvery: 0.7, restartPerLine: true }
};

for (const [name, style] of Object.entries(STYLES)) {
  test(`whole Chalisa, ${name}: completes in order and the score is honest`, async () => {
    for (const seed of [1, 7, 42]) {
      const r = await reciteWholeChalisa(style, seed);
      assert.equal(r.completed, 1, `seed ${seed}: the recitation must complete exactly once`);
      // The shown accuracy follows what the recogniser really delivered (merged
      // words count once, so allow a little below the delivered rate).
      assert.ok(r.shownAccuracy <= r.trueRate + 0.02, `seed ${seed}: never flatters (${r.shownAccuracy.toFixed(3)} vs ${r.trueRate.toFixed(3)})`);
      assert.ok(r.shownAccuracy >= r.trueRate - (style.merge ? 0.12 : 0.06), `seed ${seed}: not far below (${r.shownAccuracy.toFixed(3)} vs ${r.trueRate.toFixed(3)})`);
    }
  });
}

test('soft voice: sound without words brings a "chant a little louder" hint; clear chanting does not', async () => {
  const { app, plugin, getEl } = await startNative({ verse: 2 });
  for (let i = 0; i < 12; i++) { plugin.emit('level', { rms: 2.5 }); await wait(8); }
  assert.match(getEl('voiceHeardText').textContent, /very soft/);

  plugin.emit('partial', { segment: 1, text: 'जय हनुमान ज्ञान' });
  for (let i = 0; i < 12; i++) { plugin.emit('level', { rms: 8 }); await wait(8); }
  assert.doesNotMatch(getEl('voiceHeardText').textContent, /very soft/);
  app.stopVoiceListening();
});

test('silence (nobody chanting) shows no soft-voice hint', async () => {
  const { app, plugin, getEl } = await startNative({ verse: 2 });
  for (let i = 0; i < 12; i++) { plugin.emit('level', { rms: -2 }); await wait(8); }
  assert.doesNotMatch(getEl('voiceHeardText').textContent, /very soft/);
  app.stopVoiceListening();
});

test('the screen is kept on while listening and released after Stop', async () => {
  const { app, plugin } = await startNative({ storage: { chalisa_wakelock: 'false' } });
  assert.equal(plugin.awake.at(-1), true, 'on even with "keep awake" off: a sleeping screen stops the mic');
  app.stopVoiceListening();
  await wait(0);
  assert.equal(plugin.awake.at(-1), false);
});
