/**
 * Integration tests: the real js/app.js wired to fake recognisers.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/fake-dom');

const wait = ms => new Promise(r => setTimeout(r, ms));
// values created inside the app's vm context have that context's prototypes
const plain = v => JSON.parse(JSON.stringify(v));
const until = async (cond, ms = 1500) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timed out waiting for condition');
    await wait(3);
  }
};

/**
 * Fake ChantRecognizer plugin (android/.../speech/ChantRecognizerPlugin.java) as
 * exposed by the Capacitor bridge. Its native side restarts the recogniser
 * itself, so the web layer only sees partial/final/error/state events.
 */
function fakeChantRecognizer({ permission = 'granted', initial = 'prompt', available = true, startError = null } = {}) {
  const listeners = {};
  const plugin = {
    starts: [], stops: 0, permissionRequests: [],
    available: async () => ({ available }),
    checkPermissions: async () => ({ microphone: permission === 'granted' && initial === 'granted' ? 'granted' : initial }),
    requestPermissions: async (opts) => { plugin.permissionRequests.push(opts); return { microphone: permission }; },
    removeAllListeners: async () => { for (const k of Object.keys(listeners)) delete listeners[k]; },
    addListener: async (name, fn) => { listeners[name] = fn; return { remove() {} }; },
    start: async (opts) => {
      if (startError) throw startError;
      plugin.starts.push(opts);
      return { beepMuted: true };
    },
    stop: async () => { plugin.stops++; },
    emit: (name, data) => listeners[name] && listeners[name](data),
    listening: () => Object.keys(listeners).length > 0
  };
  return plugin;
}

function nativeGlobals(plugin, extra = {}) {
  const gum = { calls: 0 };
  return {
    gum,
    globals: {
      Capacitor: { isNativePlatform: () => true, Plugins: { ChantRecognizer: plugin } },
      navigator: { vibrate() {}, mediaDevices: { getUserMedia: async () => { gum.calls++; return { getTracks: () => [] }; } } },
      ...extra
    }
  };
}

/** Speak one utterance the way the plugin reports it: growing partials, then one final. */
function speak(plugin, segment, text, { final = text } = {}) {
  let acc = '';
  for (const w of text.split(' ')) {
    acc = acc ? `${acc} ${w}` : w;
    plugin.emit('partial', { segment, text: acc });
  }
  plugin.emit('final', { segment, text: final });
}

const VERSE2_LINE0 = 'जय हनुमान ज्ञान गुन सागर';
const VERSE2_LINE1 = 'जय कपीस तिहुँ लोक उजागर';

test('native: one start for the whole session; the plugin restarts itself, the web layer just follows segments', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { gum, globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  assert.equal(app.voice.engine, 'native');
  assert.deepEqual(plain(plugin.starts), [{ language: 'hi-IN', muteBeep: true }], 'asks the native side to mute the system beep');
  assert.equal(app.voice.beepMuted, true);

  speak(plugin, 1, VERSE2_LINE0);
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  speak(plugin, 2, VERSE2_LINE1);
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [3, 0]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [10, 10]);
  assert.equal(plugin.starts.length, 1, 'no JavaScript restart loop (each restart used to beep)');
  assert.equal(gum.calls, 0, 'getUserMedia must not compete with the native recogniser');
  app.stopVoiceListening();
  await wait(0);
  assert.equal(plugin.stops, 1);
});

test('native: an utterance that ends in silence still releases its held-back last word', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  let acc = '';
  for (const w of VERSE2_LINE0.split(' ')) { acc = acc ? `${acc} ${w}` : w; plugin.emit('partial', { segment: 1, text: acc }); }
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 0], 'last word is held while it may still change');
  plugin.emit('final', { segment: 1, text: '' }); // e.g. speech timeout after the line
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  app.stopVoiceListening();
});

test('native: a revised final result never counts a word twice', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  speak(plugin, 1, 'जय हनुमान ज्ञान गुण सागर', { final: VERSE2_LINE0 });
  plugin.emit('final', { segment: 1, text: VERSE2_LINE0 }); // duplicate delivery
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5]);
  app.stopVoiceListening();
});

test('native: asks for the microphone permission once, then listens', async () => {
  const plugin = fakeChantRecognizer({ initial: 'prompt', permission: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.deepEqual(plain(plugin.permissionRequests), [{ permissions: ['microphone'] }]);
  assert.equal(plugin.starts.length, 1);
  assert.equal(app.isVoiceListening, true);
  app.stopVoiceListening();
});

test('native: denied permission stops cleanly with an explanation', async () => {
  const plugin = fakeChantRecognizer({ initial: 'prompt', permission: 'denied' });
  const { globals } = nativeGlobals(plugin);
  const { app, getEl } = loadApp({ globals });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.equal(app.isVoiceListening, false);
  assert.equal(plugin.starts.length, 0);
  assert.match(getEl('voiceHeardText').textContent, /permission/i);
});

test('native: fatal errors stop with a specific message; a network notice keeps listening', async () => {
  const cases = [
    ['language', /offline हिन्दी \(hi-IN\) speech pack/],
    ['network', /internet connection/],
    ['permission', /permission/i],
    ['audio', /Another app is using the microphone/],
    ['failed', /keeps failing/]
  ];
  for (const [code, pattern] of cases) {
    const plugin = fakeChantRecognizer({ initial: 'granted' });
    const { globals } = nativeGlobals(plugin);
    const { app, getEl } = loadApp({ globals });
    app.switchMode('voice');
    await app.startVoiceListening();

    plugin.emit('error', { code: 'network', message: 'retrying', fatal: false });
    assert.equal(app.isVoiceListening, true, 'a notice is not fatal');
    assert.match(getEl('voiceHeardText').textContent, /Retrying/);

    plugin.emit('error', { code, message: 'x', fatal: true });
    assert.equal(app.isVoiceListening, false, code);
    assert.match(getEl('voiceHeardText').textContent, pattern, code);
  }
});

test('native: background pause and resume are shown, and tracking continues after resume', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app, getEl } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  plugin.emit('partial', { segment: 1, text: 'जय हनुमान ज्ञान' });
  plugin.emit('final', { segment: 1, text: 'जय हनुमान ज्ञान' }); // plugin flushes before pausing
  plugin.emit('state', { listening: false, reason: 'background' });
  assert.match(getEl('voiceHeardText').textContent, /background/);
  plugin.emit('state', { listening: true, reason: 'resumed' });
  assert.match(getEl('voiceHeardText').textContent, /Listening in हिन्दी/);
  speak(plugin, 2, 'गुन सागर');
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5]);
  app.stopVoiceListening();
});

test('native: switching to Bengali restarts in bn-IN and ignores the old session\'s events', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  app.scriptLang = 'bn';
  await app.restartVoiceListening();
  assert.deepEqual(plugin.starts.map(s => s.language), ['hi-IN', 'bn-IN']);
  speak(plugin, 7, 'জয় হনুমান জ্ঞান গুন সাগর');
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1], 'Bengali words match the same line');
  app.stopVoiceListening();
});

test('native: nothing is scored after Stop', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  app.stopVoiceListening();
  // events already in flight from the native side when Stop was tapped
  plugin.emit('partial', { segment: 1, text: VERSE2_LINE0 });
  plugin.emit('final', { segment: 1, text: VERSE2_LINE0 });
  await wait(0);
  assert.equal(plugin.stops, 1);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [0, 0]);
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 0]);
});

test('native: a recogniser that cannot start falls back to rhythm mode', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted', startError: Object.assign(new Error('No speech recognition service'), { code: 'unavailable' }) });
  const { gum, globals } = nativeGlobals(plugin);
  const { app } = loadApp({ globals: { ...globals, AudioContext: class { constructor() { this.state = 'running'; } createMediaStreamSource() { return { connect() {}, disconnect() {} }; } createAnalyser() { return { fftSize: 512, frequencyBinCount: 256, getByteFrequencyData() {}, getByteTimeDomainData(a) { a.fill(128); } }; } } } });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.equal(app.voice.engine, 'rhythm');
  assert.equal(gum.calls, 1);
  app.stopVoiceListening();
});

test('voice mode pauses the recitation track so the microphone never hears it', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app, audio } = loadApp({ globals });
  app.toggleAudioPlayback();
  app.setAudioPlayingState(true);
  assert.equal(audio.paused, false);
  app.switchMode('voice');
  assert.equal(audio.paused, true, 'entering voice mode pauses the track');
  audio.paused = false; // resumed from the lock-screen media controls
  app.setAudioPlayingState(true);
  await app.startVoiceListening();
  assert.equal(audio.paused, true, 'starting to listen pauses it again');
  app.stopVoiceListening();
});

test('finishing a recitation by native voice counts it and does NOT start the audio track', async () => {
  const plugin = fakeChantRecognizer({ initial: 'granted' });
  const { globals } = nativeGlobals(plugin);
  const { app, audio, ctx } = loadApp({ storage: { chalisa_sankalpa_goal: '7' }, globals });
  app.switchMode('voice');
  app.jumpToVerse(42);
  await app.startVoiceListening();
  ctx.CHALISA_DATA.verses[42].lines.forEach((l, i) => speak(plugin, i + 1, l.hi));
  assert.equal(app.chantCount, 1);
  assert.equal(audio.playCalls, 0);
  assert.equal(app.currentVerseIndex, 0);
  app.stopVoiceListening();
});

test('web speech: Android duplicate results are read once, recogniser restarts on end', async () => {
  const instances = [];
  class FakeSR {
    constructor() { this.startCalls = 0; instances.push(this); }
    start() { this.startCalls++; }
    stop() {}
    abort() {}
  }
  const { app } = loadApp({ globals: { webkitSpeechRecognition: FakeSR } });
  app.switchMode('voice');
  app.jumpToVerse(2);
  await app.startVoiceListening();
  assert.equal(app.voice.engine, 'web');
  const rec = instances[0];
  assert.equal(rec.lang, 'hi-IN');

  const r = (t, isFinal) => Object.assign([{ transcript: t }], { isFinal });
  // Chrome Android: every new result repeats everything before it
  const results = [r('जय हनुमान', true), r('जय हनुमान ज्ञान गुन सागर', true), r('जय हनुमान ज्ञान गुन सागर जय कपीस', false)];
  rec.onresult({ resultIndex: 0, results: results.slice(0, 1) });
  rec.onresult({ resultIndex: 1, results: results.slice(0, 2) });
  rec.onresult({ resultIndex: 2, results: results.slice(0, 3) });
  assert.deepEqual([app.currentVerseIndex, app.currentLineIndex], [2, 1]);
  assert.deepEqual([app.accuracy.matched, app.accuracy.total], [5, 5], 'no word counted twice');

  rec.onend();
  await until(() => rec.startCalls === 2);
  app.stopVoiceListening();
});

test('English display still recognises in Hindi; Bengali display in Bengali', async () => {
  const instances = [];
  class FakeSR { constructor() { instances.push(this); } start() {} stop() {} abort() {} }
  for (const [script, lang] of [['en', 'hi-IN'], ['bn', 'bn-IN'], ['hi', 'hi-IN']]) {
    const { app } = loadApp({ storage: { chalisa_script_lang: script }, globals: { webkitSpeechRecognition: FakeSR } });
    app.switchMode('voice');
    await app.startVoiceListening();
    assert.equal(instances.at(-1).lang, lang, script);
    app.stopVoiceListening();
  }
});

test('finishing a recitation by voice counts it and does NOT start the audio track', async () => {
  class FakeSR { start() {} stop() {} abort() {} }
  const { app, audio, ctx } = loadApp({ storage: { chalisa_sankalpa_goal: '7' }, globals: { webkitSpeechRecognition: FakeSR } });
  app.switchMode('voice');
  app.jumpToVerse(42);
  await app.startVoiceListening();
  const lines = ctx.CHALISA_DATA.verses[42].lines.map(l => l.hi).join(' ');
  app.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: lines }], { isFinal: true })] });
  assert.equal(app.chantCount, 1);
  assert.equal(audio.playCalls, 0);
  assert.equal(app.currentVerseIndex, 0, 'next round starts at the first doha');
  app.stopVoiceListening();
});

test('no recogniser: rhythm mode advances on chant onsets but never scores', async () => {
  const gum = { calls: 0 };
  class FakeCtx {
    constructor() { this.state = 'running'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 512, frequencyBinCount: 256, getByteFrequencyData() {}, getByteTimeDomainData(a) { a.fill(128); } }; }
  }
  const { app, getEl } = loadApp({
    globals: {
      AudioContext: FakeCtx,
      navigator: { vibrate() {}, mediaDevices: { getUserMedia: async () => { gum.calls++; return { getTracks: () => [] }; } } }
    }
  });
  app.switchMode('voice');
  await app.startVoiceListening();
  assert.equal(app.voice.engine, 'rhythm');
  assert.equal(gum.calls, 1);
  assert.equal(getEl('sacredTierBadge').textContent, 'Rhythm mode');

  // A constant loud noise produces one onset, not a word every 750 ms
  let t = 0;
  for (let i = 0; i < 200; i++) app.detectChantOnset(0.2, (t += 50));
  assert.equal(app.currentWordIndex, 1);
  // Distinct syllables (loud / quiet) advance one word each
  for (let i = 0; i < 4; i++) { app.detectChantOnset(0.0005, (t += 200)); app.detectChantOnset(0.3, (t += 200)); }
  assert.equal(app.currentWordIndex, 5);
  assert.equal(app.accuracy.total, 0);
  assert.equal(getEl('accuracyDisplay').textContent, '--%');
  app.stopVoiceListening();
});

test('tap sync: every tap advances one word (no dead tap at line start)', () => {
  const { app, ctx } = loadApp();
  app.switchMode('tap');
  const n = ctx.CHALISA_DATA.verses[0].lines[0].hi.split(/\s+/).length;
  for (let i = 0; i < n - 1; i++) app.handleTapAdvance();
  assert.deepEqual([app.currentLineIndex, app.currentWordIndex], [0, n - 1]);
  app.handleTapAdvance();
  assert.deepEqual([app.currentLineIndex, app.currentWordIndex], [1, 0]);
});

test('stored preferences are applied at start-up', () => {
  const { app, audio } = loadApp({ storage: { chalisa_speed: '1.25', chalisa_sankalpa_goal: 'abc', chalisa_font_size: '9' } });
  assert.equal(audio.playbackRate, 1.25);
  assert.equal(audio.defaultPlaybackRate, 1.25);
  assert.equal(app.sankalpaGoal, 1, 'corrupt goal falls back to 1');
  assert.equal(app.fontSizeLevel, 1, 'out-of-range font size falls back');
});
