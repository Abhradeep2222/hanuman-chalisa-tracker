/**
 * The on-device engine's logic (grammar window, held jumps, going back) and
 * the v1.6 features (engine choice, resume, jap counter, custom goal).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { CHALISA_DATA } = require('../js/chalisa-data.js');
const SM = require('../js/speech-matcher.js');
const { OFFLINE_LEXICON, offlineLexiconForms } = require('../js/offline-lexicon.js');
const { loadApp } = require('./helpers/fake-dom');
const { fakeChantRecognizer, nativeGlobals } = require('./helpers/fake-native');

const wait = ms => new Promise(r => setTimeout(r, ms));
const W = (v, l) => CHALISA_DATA.verses[v].lines[l].hi.split(/\s+/).filter(w => !/^[|।॥]+$/.test(w));
const at = t => { const p = t.position(); return [p.verseIndex, p.lineIndex, p.wordIndex]; };
const plain = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- tracker

test('a stray word far ahead does not close the line (केसा heard before कानन कुंडल कुंचित)', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(5, 1); // कानन कुंडल कुंचित केसा
  const early = t.feed(['केसा']);
  assert.equal(early.filter(e => e.type === 'line').length, 0, 'held, not closed');
  const rest = t.feed(['कानन', 'कुंडल', 'कुंचित', 'केसा']);
  const line = rest.find(e => e.type === 'line');
  assert.deepEqual([line.matched, line.total], [4, 4]);
  assert.equal(rest.filter(e => e.type === 'jump').length, 0, 'no jump back and forth');
});

test('a held far word is confirmed by the word after it when the middle really was not heard', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(5, 1);
  const ev = t.feed(['केसा', ...W(6, 0)]); // कानन कुंडल कुंचित lost, the chant goes on
  const line = ev.find(e => e.type === 'line' && e.verseIndex === 5);
  assert.deepEqual([line.matched, line.total], [1, 4]);
  assert.deepEqual(at(t).slice(0, 2), [6, 1]);
});

test('silence right after a held line-final word closes the line', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(5, 1);
  t.feed(['केसा']);
  const ev = t.endOfUtterance();
  assert.ok(ev.some(e => e.type === 'line' && e.verseIndex === 5 && e.lineIndex === 1));
});

test('going back: re-chanting an earlier line jumps back to it and goes on', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(4, 0);
  t.feed([...W(4, 0), ...W(4, 1), ...W(5, 0)]);
  const ev = t.feed(W(4, 1));
  assert.equal(ev.filter(e => e.type === 'jump').length, 1);
  assert.ok(ev.some(e => e.type === 'line' && e.verseIndex === 4 && e.lineIndex === 1 && e.matched === e.total));
  t.feed(W(5, 0));
  assert.deepEqual(at(t).slice(0, 2), [5, 1]);
});

test('starting in the middle of the Chalisa is found without tapping the verse', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.feed([...W(20, 0), ...W(20, 1)]);
  assert.deepEqual(at(t).slice(0, 2), [21, 0]);
});

test('chatter never relocates the tracker', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(10, 0);
  const ev = t.feed('जय श्री राम हनुमान जी की जय बोलो सब मिलकर'.split(' '));
  assert.equal(ev.filter(e => e.type === 'jump').length, 0);
  assert.deepEqual(at(t).slice(0, 2), [10, 0]);
});

// ----------------------------------------------------- grammar for the engine

test('lexicon: every Chalisa word has forms for the on-device model', () => {
  const lines = SM.buildLineModel(CHALISA_DATA.verses);
  for (const L of lines) {
    for (const w of L.words) {
      const forms = offlineLexiconForms(w.text);
      assert.ok(forms.length >= 1 && forms.every(f => f.trim()), w.text);
    }
  }
  assert.deepEqual(plain(offlineLexiconForms('पवनतनय')), ['पवन तनय']);
  assert.ok(Object.keys(OFFLINE_LEXICON).length >= 50);
});

test('grammar window: two lines back, three ahead, in the model\'s spellings, plus [unk]', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  t.setPosition(5, 0);
  const gs = new SM.GrammarSession(t, offlineLexiconForms);
  const g = gs.nextGrammar();
  assert.ok(g.includes('[unk]'));
  assert.ok(g.includes('कंचन'), 'current line');
  assert.ok(g.includes('संगी'), 'a line back (going back)');
  assert.ok(g.includes('हाथ'), 'a line ahead');
  assert.ok(!g.includes('पवनतनय') && g.length < 80, 'small, and only words the model knows');
  assert.equal(gs.nextGrammar(), null, 'unchanged while the reciter has not moved');
  t.feed(W(5, 0));
  assert.ok(gs.nextGrammar(), 'moves with the reciter');
});

test('grammar session widens to the whole Chalisa while the reciter cannot be placed', () => {
  const t = new SM.RecitationTracker(CHALISA_DATA.verses);
  const gs = new SM.GrammarSession(t, offlineLexiconForms);
  const small = gs.nextGrammar().length;
  assert.equal(gs.clean('[unk] [unk]', true), '');
  assert.equal(gs.clean('[unk]', true), '');
  const all = gs.nextGrammar();
  assert.ok(all && all.length > small * 3, 'lost: every word');
  assert.equal(gs.clean('जय हनुमान [unk]', true), 'जय हनुमान');
  assert.equal(gs.unknownRun, 0);
});

// ------------------------------------------------------------ app: engines

function fakeOfflineEngine({ startError = null } = {}) {
  const engine = fakeChantRecognizer({ initial: 'granted', startError });
  engine.attached = null;
  engine.attach = (opts) => { engine.attached = opts; };
  return engine;
}

test('AI Voice Sync uses the on-device engine first, attached to the app\'s tracker', async () => {
  const offline = fakeOfflineEngine();
  const native = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(native, { getOfflineChantEngine: () => offline, offlineLexiconForms });
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  assert.equal(app.voice.offline, true);
  assert.equal(offline.starts.length, 1);
  assert.equal(native.starts.length, 0);
  assert.equal(offline.attached.tracker, app.tracker);
  offline.emit('partial', { segment: 1, text: W(2, 0).join(' ') });
  offline.emit('final', { segment: 1, text: W(2, 0).join(' ') });
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  app.stopVoiceListening();
});

test('if the on-device engine cannot start, the phone\'s speech service takes over', async () => {
  const offline = fakeOfflineEngine({ startError: Object.assign(new Error('no wasm'), { code: 'unavailable' }) });
  const native = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(native, { getOfflineChantEngine: () => offline, offlineLexiconForms });
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.equal(app.voice.offline, false);
  assert.equal(native.starts.length, 1);
  app.stopVoiceListening();
});

test('choosing "Speech service" in Settings skips the on-device engine', async () => {
  const offline = fakeOfflineEngine();
  const native = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(native, { getOfflineChantEngine: () => offline, offlineLexiconForms });
  const { app } = loadApp({ globals, storage: { chalisa_voice_engine: 'system' } });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.equal(offline.starts.length, 0);
  assert.equal(native.starts.length, 1);
  app.stopVoiceListening();
});

test('pause and resume: Resume goes on from the very word the chant stopped at', async () => {
  const offline = fakeOfflineEngine();
  const { globals } = nativeGlobals(fakeChantRecognizer(), { getOfflineChantEngine: () => offline, offlineLexiconForms });
  const { app, getEl } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  offline.emit('final', { segment: 1, text: 'जय हनुमान ज्ञान' });
  app.stopVoiceListening(); // Pause
  assert.equal(getEl('voiceBtnText').textContent, 'Resume chanting');
  await app.startVoiceListening();
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex, app.currentWordIndex], [2, 0, 3]);
  offline.emit('final', { segment: 2, text: 'गुन सागर' });
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5]);
  app.stopVoiceListening();
});

test('a line chanted again after going back replaces its score instead of counting twice', async () => {
  const offline = fakeOfflineEngine();
  const { globals } = nativeGlobals(fakeChantRecognizer(), { getOfflineChantEngine: () => offline, offlineLexiconForms });
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(4);
  await app.startVoiceListening();
  offline.emit('final', { segment: 1, text: [...W(4, 0), ...W(4, 1)].join(' ') });
  const once = app.accuracy.total;
  offline.emit('final', { segment: 2, text: W(4, 1).join(' ') }); // went back and chanted it again
  assert.equal(app.accuracy.total, once, 'not counted twice');
  app.stopVoiceListening();
});

// ------------------------------------------------------- app: jap counter

test('jap counter: each tap counts one jap toward the goal; long-press / Undo takes it back', () => {
  const { app, getEl, storage } = loadApp({ storage: { chalisa_sankalpa_goal: '11' } });
  app.countJap();
  app.countJap();
  assert.equal(app.chantCount, 2);
  assert.equal(getEl('japCountText').textContent, '2');
  assert.equal(getEl('japGoalText').textContent, 'of 11');
  assert.equal(storage.get('chalisa_chant_count'), '2');
  app.undoJap();
  assert.equal(app.chantCount, 1);
  app.undoJap();
  app.undoJap();
  assert.equal(app.chantCount, 0, 'never below zero');
});

test('jap counter can be switched off in Settings (remembered)', () => {
  const { app, getEl } = loadApp({ storage: { chalisa_jap_counter: 'false' } });
  assert.equal(app.japCounterOn, false);
  assert.equal(getEl('japCounterBtn').hidden, true);
});

test('any goal from 1 to 1008: a custom goal shows on the "Other" pill', () => {
  const { app, getEl, storage } = loadApp();
  app.setGoal(51);
  assert.equal(app.sankalpaGoal, 51);
  assert.equal(storage.get('chalisa_sankalpa_goal'), '51');
  assert.equal(getEl('customGoalPill').textContent, '51x');
  assert.equal(getEl('japGoalText').textContent, 'of 51');
  const again = loadApp({ storage: { chalisa_sankalpa_goal: '51' } });
  assert.equal(again.app.sankalpaGoal, 51, 'kept after a restart');
});
