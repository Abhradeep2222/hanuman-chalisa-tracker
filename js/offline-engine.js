/**
 * On-device chanting recogniser: Vosk (Kaldi speech recognition, compiled to
 * WebAssembly) with a small Hindi model, listening only for the Chalisa words
 * around the reciter (GrammarSession in speech-matcher.js).
 *
 * Why: the phone's general speech service restarts after every pause (a gap
 * and a system beep each time), needs a connection, and guesses among all
 * Hindi words. This engine listens continuously, never beeps, works the same
 * online and offline, on the website and in the Android app, and copes with
 * any pace because it only has to tell the next few verse words apart.
 *
 * It exposes the same event API as the native ChantRecognizer plugin, so
 * app.js drives both the same way:
 *   partial { segment, text }, final { segment, text }, level { rms },
 *   state { listening, reason }, error { code, message, fatal }
 */
(function (root) {
  'use strict';

  // Versioned (a new model gets a new name, the cache is per URL). Not ".gz": Android's
  // packaging unpacks .gz assets and drops the extension, so the APK would not find it.
  const MODEL_URL = 'models/hindi-chant-v1.tgz';
  const VOSK_URL = 'vendor/vosk.js';
  const LEVEL_INTERVAL_MS = 100;
  const MODEL_RATE = 16000; // the model works at 16 kHz: send that, not the mic's 48 kHz

  /**
   * Streaming downsampler (e.g. 48 kHz -> 16 kHz): averages over the step
   * (a simple anti-alias filter) and carries the remainder between chunks.
   * A third of the samples means a third of the recogniser's work, which is
   * what keeps a slower phone in real time.
   */
  function makeDownsampler(from, to) {
    if (!from || from <= to) return null;
    const ratio = from / to;
    const taps = Math.max(1, Math.round(ratio));
    let carry = new Float32Array(0);
    let phase = 0;
    return (input) => {
      const buf = new Float32Array(carry.length + input.length);
      buf.set(carry);
      buf.set(input, carry.length);
      const out = new Float32Array(Math.ceil(buf.length / ratio) + 1);
      let n = 0;
      let t = phase;
      while (t + taps <= buf.length) {
        const i = Math.floor(t);
        let acc = 0;
        for (let k = 0; k < taps; k++) acc += buf[i + k];
        out[n++] = acc / taps;
        t += ratio;
      }
      const keep = Math.floor(t);
      carry = buf.slice(keep);
      phase = t - keep;
      return out.subarray(0, n);
    };
  }

  let voskLoad = null;
  let modelLoad = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  /** The model loads once per app run (the first run also unpacks it into storage). */
  function loadModel() {
    if (!modelLoad) {
      modelLoad = (async () => {
        if (!root.Vosk) {
          if (!voskLoad) voskLoad = loadScript(VOSK_URL);
          await voskLoad;
        }
        return root.Vosk.createModel(MODEL_URL);
      })().catch((err) => {
        modelLoad = null;
        voskLoad = null;
        throw err;
      });
    }
    return modelLoad;
  }

  function supported() {
    const AC = root.AudioContext || root.webkitAudioContext;
    return typeof WebAssembly === 'object' && !!AC && typeof Worker === 'function' &&
      !!(root.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  class OfflineChantEngine {
    constructor() {
      this.listeners = {};
      this.running = false;
      this.paused = false;
      this.segment = 0;
      this.tracker = null;
      this.lexicon = null;
      this.deviceId = '';
      this.rec = null;
      this.stream = null;
      this.ctx = null;
      this.node = null;
      this.source = null;
      this.session = null;
      this.lastLevelAt = 0;
      this.grammarSize = 0;
      this.listens = 0;
      this.errors = 0;
      this.micLabel = '';
      this.onVisibility = () => this.handleVisibility();
    }

    static supported() {
      return supported();
    }

    // ----- plugin-style API (same as ChantRecognizer) -----

    async available() {
      return { available: supported() };
    }

    // The browser asks for the microphone when listening starts.
    async checkPermissions() {
      return { microphone: 'granted' };
    }

    async requestPermissions() {
      return { microphone: 'granted' };
    }

    async addListener(name, fn) {
      (this.listeners[name] = this.listeners[name] || []).push(fn);
      return { remove: () => { this.listeners[name] = (this.listeners[name] || []).filter(f => f !== fn); } };
    }

    async removeAllListeners() {
      this.listeners = {};
    }

    emit(name, data) {
      (this.listeners[name] || []).slice().forEach((fn) => {
        try { fn(data); } catch (e) { console.error('offline engine listener', e); }
      });
    }

    /** What to listen for: the app's tracker and the model's spellings. */
    attach({ tracker, lexicon, deviceId }) {
      this.tracker = tracker;
      this.lexicon = lexicon;
      this.deviceId = deviceId || '';
    }

    async start() {
      if (!this.tracker || !this.lexicon) throw Object.assign(new Error('engine not attached'), { code: 'unavailable' });
      this.emit('state', { listening: false, reason: 'loading' });
      let model;
      try {
        model = await loadModel();
      } catch (e) {
        throw Object.assign(new Error('The on-device recogniser could not load: ' + (e && e.message ? e.message : e)), { code: 'unavailable' });
      }
      this.model = model;
      this.session = new root.SpeechMatcher.GrammarSession(this.tracker, this.lexicon);
      await this.openMicrophone();
      this.running = true;
      this.paused = false;
      this.newRecognizer(this.session.nextGrammar());
      document.addEventListener('visibilitychange', this.onVisibility);
      this.emit('state', { listening: true, reason: 'started' });
      return { beepMuted: true, language: 'hi-IN', service: 'on-device' };
    }

    async stop() {
      this.running = false;
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.closeMicrophone();
      this.dropRecognizer(this.rec, false);
      this.rec = null;
    }

    async setContext() {
      // The grammar follows the tracker directly; nothing to do.
    }

    async getState() {
      return {
        listening: this.running && !this.paused,
        paused: this.paused,
        attempts: this.listens,
        beepMuted: true,
        errors: this.errors ? `${this.errors}` : '',
        language: 'hi-IN',
        service: 'on-device',
        route: this.session && this.session.key === 'all' ? `whole Chalisa (${this.grammarSize} words)` : `${this.grammarSize} words around the line`,
        biasing: true,
        mic: this.micLabel
      };
    }

    // ----- microphone -----

    async openMicrophone() {
      const audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true, // a soft or a loud voice reaches the recogniser at a steady level
        channelCount: 1
      };
      if (this.deviceId) audio.deviceId = { exact: this.deviceId };
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio });
      } catch (e) {
        if (this.deviceId && e && e.name === 'OverconstrainedError') {
          this.deviceId = ''; // the chosen headset is gone: use the default microphone
          delete audio.deviceId;
          this.stream = await navigator.mediaDevices.getUserMedia({ audio });
        } else {
          const code = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'permission' : 'audio';
          throw Object.assign(new Error(e && e.message ? e.message : 'microphone unavailable'), { code });
        }
      }
      const track = this.stream.getAudioTracks()[0];
      this.micLabel = track ? track.label : '';
      if (track) track.onended = () => { if (this.running && !this.paused) this.restartMicrophone(); };
      const AC = root.AudioContext || root.webkitAudioContext;
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.node = this.ctx.createScriptProcessor(4096, 1, 1);
      this.downsample = makeDownsampler(this.ctx.sampleRate, MODEL_RATE);
      this.node.onaudioprocess = (ev) => this.onAudio(ev);
      this.source.connect(this.node);
      this.node.connect(this.ctx.destination); // ScriptProcessor only runs when connected (it outputs silence)
    }

    closeMicrophone() {
      if (this.node) { this.node.onaudioprocess = null; try { this.node.disconnect(); } catch (e) {} }
      if (this.source) { try { this.source.disconnect(); } catch (e) {} }
      if (this.stream) this.stream.getTracks().forEach(t => { t.onended = null; t.stop(); });
      if (this.ctx) this.ctx.close().catch(() => {});
      this.node = this.source = this.stream = this.ctx = null;
    }

    async restartMicrophone() {
      this.closeMicrophone();
      try {
        await this.openMicrophone();
      } catch (e) {
        this.errors++;
        this.emit('error', { code: e.code || 'audio', message: e.message, fatal: true });
      }
    }

    onAudio(ev) {
      if (!this.running || this.paused || !this.rec) return;
      const input = ev.inputBuffer;
      try {
        if (this.downsample) this.rec.acceptWaveformFloat(this.downsample(input.getChannelData(0)), MODEL_RATE);
        else this.rec.acceptWaveform(input);
      } catch (e) {
        this.errors++;
      }
      const now = Date.now();
      if (now - this.lastLevelAt >= LEVEL_INTERVAL_MS) {
        this.lastLevelAt = now;
        const data = input.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / Math.ceil(data.length / 4));
        const dbfs = 20 * Math.log10(Math.max(rms, 1e-5));
        // same scale as Android's recogniser level: about -2 in silence, ~10 when loud
        this.emit('level', { rms: (dbfs + 50) / 4 });
      }
    }

    // ----- recogniser -----

    newRecognizer(grammar) {
      if (!grammar) return;
      const old = this.rec;
      const rate = this.downsample ? MODEL_RATE : (this.ctx ? this.ctx.sampleRate : MODEL_RATE);
      const rec = new this.model.KaldiRecognizer(rate, JSON.stringify(grammar));
      rec.seg = ++this.segment;
      rec.lastPartial = '';
      this.grammarSize = grammar.length;
      this.listens++;
      rec.on('partialresult', (m) => this.onPartial(rec, m));
      rec.on('result', (m) => this.onResult(rec, m));
      rec.on('error', () => { this.errors++; });
      this.rec = rec;
      if (old) this.dropRecognizer(old, true);
    }

    /** Let an old recogniser deliver its last words, then remove it. */
    dropRecognizer(rec, deliver) {
      if (!rec || rec.dropped) return;
      rec.dropped = true;
      rec.deliver = deliver;
      try { if (deliver) rec.retrieveFinalResult(); } catch (e) {}
      setTimeout(() => { try { rec.remove(); } catch (e) {} }, deliver ? 3000 : 0);
    }

    onPartial(rec, m) {
      if (!this.running || rec !== this.rec) return;
      const text = this.session.clean(m && m.result ? m.result.partial : '', false);
      if (!text || text === rec.lastPartial) return;
      rec.lastPartial = text;
      this.emit('partial', { segment: rec.seg, text });
      // A long utterance while the reciter moved on (or got lost): switch the
      // vocabulary now instead of waiting for a pause.
      const want = this.session.lost ? 'all' : String(this.tracker.lineIdx);
      const have = this.session.key;
      if (want !== have && (want === 'all' || have === 'all' || Math.abs(Number(want) - Number(have)) >= 2)) {
        this.newRecognizer(this.session.nextGrammar());
      }
    }

    onResult(rec, m) {
      if (!this.running || (rec !== this.rec && !rec.deliver)) return;
      const text = this.session.clean(m && m.result ? m.result.text : '', true);
      this.emit('final', { segment: rec.seg, text });
      if (rec === this.rec) {
        rec.seg = ++this.segment; // the recogniser goes on with a new utterance
        rec.lastPartial = '';
        const g = this.session.nextGrammar();
        if (g) this.newRecognizer(g); // between utterances: nothing is lost
      } else {
        rec.deliver = false;
      }
    }

    // ----- background -----

    handleVisibility() {
      if (!this.running) return;
      if (document.visibilityState === 'hidden' && !this.paused) {
        this.paused = true;
        this.dropRecognizer(this.rec, true);
        this.rec = null;
        this.closeMicrophone();
        this.emit('state', { listening: false, reason: 'background' });
      } else if (document.visibilityState === 'visible' && this.paused) {
        this.paused = false;
        this.openMicrophone().then(() => {
          this.session.key = null;
          this.newRecognizer(this.session.nextGrammar());
          this.emit('state', { listening: true, reason: 'resumed' });
        }, (e) => {
          this.emit('error', { code: e.code || 'audio', message: e.message, fatal: true });
        });
      }
    }
  }

  let instance = null;
  root.getOfflineChantEngine = function () {
    if (!supported()) return null;
    if (!instance) instance = new OfflineChantEngine();
    return instance;
  };
  root.OfflineChantEngine = OfflineChantEngine;
})(typeof window !== 'undefined' ? window : globalThis);
