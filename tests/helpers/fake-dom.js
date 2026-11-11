/**
 * Minimal DOM / browser stub that lets the real js/*.js files run inside a
 * Node vm context, so app wiring can be tested without a browser.
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function makeEl(id) {
  const classes = new Set();
  const attrs = new Map();
  return {
    id,
    textContent: '',
    innerHTML: '',
    value: '',
    checked: false,
    disabled: false,
    dataset: {},
    style: { setProperty() {} },
    children: [],
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
      contains: c => classes.has(c)
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: k => (attrs.has(k) ? attrs.get(k) : null),
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    scrollIntoView() {},
    closest() { return null; }
  };
}

function makeAudio() {
  const el = makeEl('chalisaAudio');
  Object.assign(el, {
    paused: true, currentTime: 0, playbackRate: 1, defaultPlaybackRate: 1, duration: NaN,
    playCalls: 0,
    play() { this.playCalls++; this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    load() {}
  });
  return el;
}

/**
 * Load the app scripts into a fresh context.
 * @param {object} opts.storage   initial localStorage values
 * @param {object} opts.globals   extra globals (Capacitor, SpeechRecognition, navigator parts ...)
 */
function loadApp(opts = {}) {
  const els = new Map();
  const audio = makeAudio();
  els.set('chalisaAudio', audio);
  const getEl = id => {
    if (!els.has(id)) els.set(id, makeEl(id));
    return els.get(id);
  };
  const storage = new Map(Object.entries(opts.storage || {}));
  const document = {
    getElementById: getEl,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => makeEl('created'),
    addEventListener() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
    visibilityState: 'visible'
  };
  const ctx = {
    console, document, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON,
    Promise, Map, Set, Number, String, Array, Object, Uint8Array,
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    },
    navigator: { vibrate() {} },
    alert() {}, confirm: () => true,
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    ...(opts.globals || {})
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['js/chalisa-meanings.js', 'js/chalisa-data.js', 'js/speech-matcher.js', 'js/app.js']) {
    let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f.endsWith('app.js')) src += '\n;globalThis.HanumanChalisaEngine = HanumanChalisaEngine;';
    vm.runInContext(src, ctx, { filename: f });
  }
  const app = new ctx.HanumanChalisaEngine();
  app.voiceTiming = { webRestartDelay: 5, holdReleaseMs: 15, lineCloseSilenceMs: 40, quietHintMs: 60 };
  return { app, ctx, getEl, audio, storage };
}

module.exports = { loadApp };
