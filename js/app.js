/**
 * Shri Hanuman Chalisa - Core Application Engine v5.0
 * Features:
 *  - Devotional audio playback with 43-verse karaoke synchronisation
 *  - AI Voice Sync: cross-script speech alignment (js/speech-matcher.js) fed by
 *    the Capacitor native Android recogniser or the Web Speech API, with an
 *    honest "rhythm mode" fallback when no recogniser exists
 *  - Tap Sync mode with sacred chime and haptic feedback
 *  - Hindi, Bengali and English text & meanings
 *  - Mobile-first, offline PWA / Capacitor APK
 *
 * Load order: chalisa-meanings.js, chalisa-data.js, speech-matcher.js, app.js
 */

// Verse start/end times (seconds) in audio/hanuman-chalisa.mp3 (9m 41s).
// NOTE: the 40 chaupais are spaced a uniform 11.0 s apart; re-time against the
// track if the karaoke drifts from the singer.
const VERSE_TIMESTAMPS = [
  // Opening Dohas
  { verseIndex: 0, start: 42.5, end: 74.0 },   // Doha 1
  { verseIndex: 1, start: 74.0, end: 104.5 },  // Doha 2
  // 40 Chaupais (~11.0s each)
  { verseIndex: 2, start: 104.5, end: 115.5 }, // Chaupai 1
  { verseIndex: 3, start: 115.5, end: 126.5 }, // Chaupai 2
  { verseIndex: 4, start: 126.5, end: 137.5 }, // Chaupai 3
  { verseIndex: 5, start: 137.5, end: 148.5 }, // Chaupai 4
  { verseIndex: 6, start: 148.5, end: 159.5 }, // Chaupai 5
  { verseIndex: 7, start: 159.5, end: 170.5 }, // Chaupai 6
  { verseIndex: 8, start: 170.5, end: 181.5 }, // Chaupai 7
  { verseIndex: 9, start: 181.5, end: 192.5 }, // Chaupai 8
  { verseIndex: 10, start: 192.5, end: 203.5 }, // Chaupai 9
  { verseIndex: 11, start: 203.5, end: 214.5 }, // Chaupai 10
  { verseIndex: 12, start: 214.5, end: 225.5 }, // Chaupai 11
  { verseIndex: 13, start: 225.5, end: 236.5 }, // Chaupai 12
  { verseIndex: 14, start: 236.5, end: 247.5 }, // Chaupai 13
  { verseIndex: 15, start: 247.5, end: 258.5 }, // Chaupai 14
  { verseIndex: 16, start: 258.5, end: 269.5 }, // Chaupai 15
  { verseIndex: 17, start: 269.5, end: 280.5 }, // Chaupai 16
  { verseIndex: 18, start: 280.5, end: 291.5 }, // Chaupai 17
  { verseIndex: 19, start: 291.5, end: 302.5 }, // Chaupai 18
  { verseIndex: 20, start: 302.5, end: 313.5 }, // Chaupai 19
  { verseIndex: 21, start: 313.5, end: 324.5 }, // Chaupai 20
  { verseIndex: 22, start: 324.5, end: 335.5 }, // Chaupai 21
  { verseIndex: 23, start: 335.5, end: 346.5 }, // Chaupai 22
  { verseIndex: 24, start: 346.5, end: 357.5 }, // Chaupai 23
  { verseIndex: 25, start: 357.5, end: 368.5 }, // Chaupai 24
  { verseIndex: 26, start: 368.5, end: 379.5 }, // Chaupai 25
  { verseIndex: 27, start: 379.5, end: 390.5 }, // Chaupai 26
  { verseIndex: 28, start: 390.5, end: 401.5 }, // Chaupai 27
  { verseIndex: 29, start: 401.5, end: 412.5 }, // Chaupai 28
  { verseIndex: 30, start: 412.5, end: 423.5 }, // Chaupai 29
  { verseIndex: 31, start: 423.5, end: 434.5 }, // Chaupai 30
  { verseIndex: 32, start: 434.5, end: 445.5 }, // Chaupai 31
  { verseIndex: 33, start: 445.5, end: 456.5 }, // Chaupai 32
  { verseIndex: 34, start: 456.5, end: 467.5 }, // Chaupai 33
  { verseIndex: 35, start: 467.5, end: 478.5 }, // Chaupai 34
  { verseIndex: 36, start: 478.5, end: 489.5 }, // Chaupai 35
  { verseIndex: 37, start: 489.5, end: 500.5 }, // Chaupai 36
  { verseIndex: 38, start: 500.5, end: 511.5 }, // Chaupai 37
  { verseIndex: 39, start: 511.5, end: 522.5 }, // Chaupai 38
  { verseIndex: 40, start: 522.5, end: 533.5 }, // Chaupai 39
  { verseIndex: 41, start: 533.5, end: 544.5 }, // Chaupai 40
  // Concluding Doha
  { verseIndex: 42, start: 544.5, end: 574.0 }  // Ending Doha
];

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25];
const LANG_NAMES = { 'hi-IN': 'हिन्दी (hi-IN)', 'bn-IN': 'বাংলা (bn-IN)', 'en-IN': 'English (en-IN)' };

// Safe Storage Helper (private mode / blocked storage must not break the app)
const safeStorage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
  }
};

function storedChoice(key, allowed, fallback) {
  const v = safeStorage.get(key, fallback);
  return allowed.indexOf(v) >= 0 ? v : fallback;
}

function storedInt(key, min, max, fallback) {
  const v = parseInt(safeStorage.get(key, String(fallback)), 10);
  return Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

// Singleton Web Audio Context
let sharedAudioCtx = null;
function getSharedAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function isNativeApp() {
  const cap = window.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return !!cap.platform && cap.platform !== 'web';
}

// The app's own Capacitor plugin (android/app/src/main/java/.../speech/ChantRecognizerPlugin.java),
// exposed by the Capacitor bridge.
function nativeSpeechPlugin() {
  if (!isNativeApp()) return null;
  const plugins = window.Capacitor.Plugins;
  return plugins && plugins.ChantRecognizer ? plugins.ChantRecognizer : null;
}

/** Human name of an Android recognition service package, for the diagnostics line. */
function serviceLabel(pkg) {
  const known = {
    'on-device': 'On-device recogniser (offline)',
    'com.google.android.googlequicksearchbox': 'Google app',
    'com.google.android.tts': 'Google Speech Services',
    'com.google.android.as': 'Android System Intelligence',
    'com.samsung.android.bixby.agent': 'Samsung Bixby',
    default: "phone's default recogniser"
  };
  return known[pkg] || pkg || 'unknown recogniser';
}

const MSG_MIC_PERMISSION = 'Microphone permission is off. Allow it in Android Settings → Apps → Shri Hanuman Chalisa → Permissions, then tap Start again.';

function settle(fn) {
  return Promise.resolve().then(fn).catch(() => {});
}

// Master App Engine
class HanumanChalisaEngine {
  constructor() {
    // Preferences (validated: a corrupt value must not break playback or the stats)
    this.currentMode = 'audio'; // 'audio' | 'voice' | 'tap'
    this.scriptLang = storedChoice('chalisa_script_lang', ['hi', 'bn', 'en'], 'hi');
    this.meaningLang = storedChoice('chalisa_meaning_lang', ['hi', 'bn', 'en'], 'hi');
    this.showMeaning = safeStorage.get('chalisa_show_meaning', 'true') === 'true';
    this.theme = storedChoice('chalisa_theme', ['dark', 'light'], 'dark');
    this.fontSizeLevel = storedInt('chalisa_font_size', 0, 2, 1);
    this.autoScroll = safeStorage.get('chalisa_autoscroll', 'true') === 'true';
    const speed = parseFloat(safeStorage.get('chalisa_speed', '1.0'));
    this.playbackSpeed = PLAYBACK_SPEEDS.indexOf(speed) >= 0 ? speed : 1.0;
    this.sankalpaGoal = storedInt('chalisa_sankalpa_goal', 1, 1008, 1);
    this.chantCount = storedInt('chalisa_chant_count', 0, 1e7, 0);
    this.isLooping = safeStorage.get('chalisa_loop', 'false') === 'true';
    this.keepAwake = safeStorage.get('chalisa_wakelock', 'true') === 'true';
    this.voiceEngine = storedChoice('chalisa_voice_engine', ['ondevice', 'system'], 'ondevice');
    this.micDeviceId = safeStorage.get('chalisa_mic', '');
    this.japCounterOn = safeStorage.get('chalisa_jap_counter', 'true') === 'true';

    // Position (wordIndex counts words, not punctuation tokens like "|")
    this.currentVerseIndex = 0;
    this.currentLineIndex = 0;
    this.currentWordIndex = 0;
    this.totalVerses = CHALISA_DATA.verses.length;

    // Accuracy = words recognised / words expected, over the lines finished
    this.accuracy = { matched: 0, total: 0 };
    this.verseScores = new Map(); // verseIndex -> Map(lineIndex -> {matched, total})

    // Audio Player
    this.audio = document.getElementById('chalisaAudio');
    this.isAudioPlaying = false;
    this.audioDuration = 581;
    this.audioFailed = false;

    // Speech alignment (with what it learned about this reciter's voice before)
    let learned = null;
    try { learned = JSON.parse(safeStorage.get('chalisa_voice_learning', 'null')); } catch (e) { learned = null; }
    this.tracker = new SpeechMatcher.RecitationTracker(CHALISA_DATA.verses, { aliases: learned });
    this.learningSaveTimer = null;
    this.contextLineKey = null;
    this.diagTimer = null;
    this.feed = new SpeechMatcher.TranscriptFeed();
    this.lineModel = new Map(this.tracker.lines.map(L => [`${L.verseIndex}-${L.lineIndex}`, L]));

    // Voice session
    this.isVoiceListening = false;
    this.voiceSession = 0;
    this.voice = this.freshVoiceState();
    this.voiceTiming = {
      webRestartDelay: 250,
      holdReleaseMs: 800,        // a word the recogniser stopped revising counts without waiting for the next
      offlineHoldReleaseMs: 350, // the on-device engine revises far less: light words up sooner
      lineCloseSilenceMs: 5000,  // silence that closes a line whose last word was never recognised
      quietHintMs: 7000          // window for the "voice is very soft" hint
    };
    this.recognition = null;
    this.micStream = null;
    this.micSource = null;
    this.micAnalyser = null;
    this.animFrameId = null;
    this.vad = { floor: 0.01, active: false, lastOnset: 0 };

    this.wakeLock = null;
    this.wakeLockBusy = false;
    this.nativeAwake = null;
    this.toastEl = null;
    this.toastTimer = null;

    this.bindDomElements();
    this.applyTheme();
    this.applyFontSize();
    this.renderVerses();
    this.syncControls();
    this.setupEventListeners();
    this.updateStatsDisplay();
    this.switchMode('audio');
  }

  freshVoiceState() {
    return {
      engine: null,        // 'native' | 'web' | 'rhythm'
      starting: false,
      plugin: null,
      lang: null,
      beepMuted: false,    // native: system listening beep muted for the session
      requestedLang: null, // native: language asked for (the plugin may fall back)
      routeNotice: false,  // native: a "listening in another language" note is shown
      restartTimer: null,  // web: pending restart
      holdTimer: null,     // releases a held-back word once the transcript is stable
      lineCloseTimer: null,// closes a line after silence
      lastWordAt: 0,
      levelWindowStart: 0,
      levelPeak: -2,
      softHintShown: false,
      errorStreak: 0,
      webRun: 0,
      webKeys: [],
      fatal: false
    };
  }

  bindDomElements() {
    this.els = {
      toggleMeaningBtn: document.getElementById('toggleMeaningBtn'),
      meaningBtnText: document.getElementById('meaningBtnText'),
      langBtns: document.querySelectorAll('.lang-btn'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      openSettingsBtn: document.getElementById('openSettingsBtn'),

      tabAudioMode: document.getElementById('tabAudioMode'),
      tabVoiceMode: document.getElementById('tabVoiceMode'),
      tabTapMode: document.getElementById('tabTapMode'),

      audioConsolePanel: document.getElementById('audioConsolePanel'),
      voiceConsolePanel: document.getElementById('voiceConsolePanel'),
      tapConsolePanel: document.getElementById('tapConsolePanel'),

      mainAudioPlayBtn: document.getElementById('mainAudioPlayBtn'),
      audioPlayIcon: document.getElementById('audioPlayIcon'),
      audioPlayText: document.getElementById('audioPlayText'),
      prevVerseBtn: document.getElementById('prevVerseBtn'),
      nextVerseBtn: document.getElementById('nextVerseBtn'),
      audioProgressSlider: document.getElementById('audioProgressSlider'),
      sliderFillBar: document.getElementById('sliderFillBar'),
      audioCurrentTime: document.getElementById('audioCurrentTime'),
      audioTotalDuration: document.getElementById('audioTotalDuration'),
      speedBtns: document.querySelectorAll('.speed-btn'),
      loopAudioBtn: document.getElementById('loopAudioBtn'),
      loopLabel: document.getElementById('loopLabel'),
      resetAudioBtn: document.getElementById('resetAudioBtn'),

      toggleVoiceBtn: document.getElementById('toggleVoiceBtn'),
      voiceBtnIcon: document.getElementById('voiceBtnIcon'),
      voiceBtnText: document.getElementById('voiceBtnText'),
      voiceWaveBars: document.getElementById('voiceWaveBars'),
      voiceHeardText: document.getElementById('voiceHeardText'),

      tapTouchSurface: document.getElementById('tapTouchSurface'),
      resetTapBtn: document.getElementById('resetTapBtn'),

      chantCountDisplay: document.getElementById('chantCountDisplay'),
      statGoalTag: document.getElementById('statGoalTag'),
      sankalpaProgressFill: document.getElementById('sankalpaProgressFill'),
      accuracyDisplay: document.getElementById('accuracyDisplay'),
      sacredTierBadge: document.getElementById('sacredTierBadge'),
      verseIndicatorDisplay: document.getElementById('verseIndicatorDisplay'),
      verseSubCount: document.getElementById('verseSubCount'),
      paceDisplay: document.getElementById('paceDisplay'),
      activeModeName: document.getElementById('activeModeName'),
      goalPills: document.querySelectorAll('.goal-pill'),

      versesContainer: document.getElementById('versesContainer'),
      hudStatusDot: document.getElementById('hudStatusDot'),
      hudStatusLabel: document.getElementById('hudStatusLabel'),
      hudEqualizer: document.getElementById('hudEqualizer'),
      hudTranscript: document.getElementById('hudTranscript'),
      hudJumpBtn: document.getElementById('hudJumpBtn'),

      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      fontDecrBtn: document.getElementById('fontDecrBtn'),
      fontIncrBtn: document.getElementById('fontIncrBtn'),
      fontSizeLabel: document.getElementById('fontSizeLabel'),
      meaningLangBtns: document.querySelectorAll('#meaningLangGroup .pill-option'),
      autoScrollToggle: document.getElementById('autoScrollToggle'),
      wakeLockToggle: document.getElementById('wakeLockToggle'),
      wakeLockDesc: document.getElementById('wakeLockDesc'),
      voiceLearningDesc: document.getElementById('voiceLearningDesc'),
      resetVoiceLearningBtn: document.getElementById('resetVoiceLearningBtn'),
      voiceDiagnostics: document.getElementById('voiceDiagnostics'),
      japCounterBtn: document.getElementById('japCounterBtn'),
      japCountText: document.getElementById('japCountText'),
      japGoalText: document.getElementById('japGoalText'),
      japCounterToggle: document.getElementById('japCounterToggle'),
      customGoalPill: document.getElementById('customGoalPill'),
      customGoalRow: document.getElementById('customGoalRow'),
      customGoalInput: document.getElementById('customGoalInput'),
      engineBtns: document.querySelectorAll('[data-engine]'),
      micSelect: document.getElementById('micSelect'),
      resetAllDataBtn: document.getElementById('resetAllDataBtn')
    };
  }

  renderVerses() {
    document.body.setAttribute('data-lang', this.scriptLang);
    this.applyBrandTitle();
    this.els.meaningBtnText.textContent = this.meaningLang === 'hi' ? 'अर्थ' : (this.meaningLang === 'bn' ? 'ভাবার্থ' : 'Meaning');

    let html = '';
    CHALISA_DATA.verses.forEach((verse, vIdx) => {
      const verseLabel = verse.label[this.scriptLang] || verse.label.en;
      const verseTitle = `${verseLabel} • ${verse.num} / ${verse.totalOfCategory}`;

      const meaningObj = CHALISA_MEANINGS && CHALISA_MEANINGS[vIdx] ? CHALISA_MEANINGS[vIdx] : null;
      const meaningText = meaningObj ? (meaningObj[this.meaningLang] || meaningObj.en || '') : '';

      html += `
        <article class="verse-card ${vIdx === this.currentVerseIndex ? 'active-verse' : ''}" id="verseCard-${vIdx}" data-verse="${vIdx}">
          <div class="verse-card-header">
            <span class="verse-badge">${verseTitle}</span>
            <span class="verse-acc-pill" id="verseAcc-${vIdx}"></span>
          </div>
          <div class="verse-content">
      `;

      verse.lines.forEach((line, lIdx) => {
        const text = line[this.scriptLang] || line.hi || line.en;
        const words = text.split(/\s+/).filter(w => w.trim().length > 0);

        html += `<div class="verse-line" id="line-${vIdx}-${lIdx}" data-verse="${vIdx}" data-line="${lIdx}">`;
        words.forEach((word, wIdx) => {
          html += `<span class="word-token" id="word-${vIdx}-${lIdx}-${wIdx}" data-word="${word}">${word}</span> `;
        });
        html += `</div>`;
      });

      if (meaningText) {
        html += `
          <div class="verse-meaning-box" id="meaning-${vIdx}" style="display: ${this.showMeaning ? 'block' : 'none'};">
            <span class="meaning-label">${this.els.meaningBtnText.textContent}:</span> ${meaningText}
          </div>
        `;
      }

      html += `</div></article>`;
    });

    this.els.versesContainer.innerHTML = html;
    this.refreshVersePills();
  }

  /** Reflect stored preferences in the controls (the HTML hard-codes defaults). */
  syncControls() {
    this.els.langBtns.forEach(b => b.classList.toggle('active', b.dataset.lang === this.scriptLang));
    this.els.meaningLangBtns.forEach(b => b.classList.toggle('active', b.dataset.mlang === this.meaningLang));
    this.els.toggleMeaningBtn.classList.toggle('active', this.showMeaning);
    this.syncGoalPills();
    if (this.els.japCounterToggle) this.els.japCounterToggle.checked = this.japCounterOn;
    this.els.engineBtns.forEach(b => b.classList.toggle('active', b.dataset.engine === this.voiceEngine));
    this.applyJapCounter();
    this.els.loopAudioBtn.classList.toggle('active', this.isLooping);
    this.els.loopLabel.textContent = this.isLooping ? 'Loop: ON' : 'Loop: 1x';
    this.els.autoScrollToggle.checked = this.autoScroll;
    this.els.wakeLockToggle.checked = this.keepAwake;
    const nativeAwake = nativeSpeechPlugin();
    if (!('wakeLock' in navigator) && !(nativeAwake && typeof nativeAwake.keepAwake === 'function')) {
      this.els.wakeLockToggle.disabled = true;
      if (this.els.wakeLockDesc) this.els.wakeLockDesc.textContent = 'This browser cannot keep the screen on.';
    }
    this.setPlaybackSpeed(this.playbackSpeed);
  }

  setupEventListeners() {
    this.els.tabAudioMode.addEventListener('click', () => this.switchMode('audio'));
    this.els.tabVoiceMode.addEventListener('click', () => this.switchMode('voice'));
    this.els.tabTapMode.addEventListener('click', () => this.switchMode('tap'));

    this.els.mainAudioPlayBtn.addEventListener('click', () => this.toggleAudioPlayback());
    this.els.prevVerseBtn.addEventListener('click', () => this.jumpToVerse(Math.max(0, this.currentVerseIndex - 1)));
    this.els.nextVerseBtn.addEventListener('click', () => this.jumpToVerse(Math.min(this.totalVerses - 1, this.currentVerseIndex + 1)));

    this.els.audioProgressSlider.addEventListener('input', (e) => {
      const seekTime = parseFloat(e.target.value);
      this.audio.currentTime = seekTime;
      this.updateSliderUI(seekTime);
    });

    this.els.resetAudioBtn.addEventListener('click', () => {
      this.audio.currentTime = 0;
      this.jumpToVerse(0);
      if (this.isAudioPlaying) this.audio.play().catch(() => {});
    });

    this.els.loopAudioBtn.addEventListener('click', () => {
      this.isLooping = !this.isLooping;
      safeStorage.set('chalisa_loop', this.isLooping.toString());
      this.els.loopAudioBtn.classList.toggle('active', this.isLooping);
      this.els.loopLabel.textContent = this.isLooping ? 'Loop: ON' : 'Loop: 1x';
    });

    this.els.speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseFloat(e.currentTarget.dataset.speed);
        this.setPlaybackSpeed(speed);
      });
    });

    this.audio.addEventListener('timeupdate', () => this.handleAudioTimeUpdate());
    this.audio.addEventListener('ended', () => this.handleAudioEnded());
    this.audio.addEventListener('play', () => this.setAudioPlayingState(true));
    this.audio.addEventListener('pause', () => this.setAudioPlayingState(false));
    this.audio.addEventListener('loadedmetadata', () => {
      const d = this.audio.duration;
      if (Number.isFinite(d) && d > 0) {
        this.audioDuration = d;
        this.els.audioProgressSlider.max = String(d);
        this.els.audioTotalDuration.textContent = this.formatSeconds(d);
      }
    });
    this.audio.addEventListener('canplay', () => { this.audioFailed = false; });

    // The <source> list already falls back from the bundled file to the CDN.
    // Errors on the last source (all failed) or on the element itself are
    // reported once; the old handler re-set src on every error and looped.
    const onAudioUnavailable = () => {
      if (this.audioFailed) return;
      this.audioFailed = true;
      this.setAudioPlayingState(false);
      this.showToast('The recitation audio could not be loaded. Check your internet connection and tap Play to retry.');
    };
    this.audio.addEventListener('error', onAudioUnavailable);
    const sources = this.audio.querySelectorAll('source');
    if (sources.length) sources[sources.length - 1].addEventListener('error', onAudioUnavailable);

    this.els.toggleVoiceBtn.addEventListener('click', () => this.toggleVoiceListening());
    this.els.tapTouchSurface.addEventListener('click', () => this.handleTapAdvance());
    this.els.resetTapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.jumpToVerse(0);
    });

    this.els.versesContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.verse-card');
      if (card && card.dataset.verse !== undefined) {
        const targetVIdx = parseInt(card.dataset.verse, 10);
        this.jumpToVerse(targetVIdx);
        if (this.currentMode === 'audio') {
          const ts = VERSE_TIMESTAMPS[targetVIdx];
          if (ts) {
            this.audio.currentTime = ts.start;
            this.audio.play().catch(() => {});
          }
        }
      }
    });

    this.els.toggleMeaningBtn.addEventListener('click', () => {
      this.showMeaning = !this.showMeaning;
      safeStorage.set('chalisa_show_meaning', this.showMeaning.toString());
      this.els.toggleMeaningBtn.classList.toggle('active', this.showMeaning);
      document.querySelectorAll('.verse-meaning-box').forEach(box => {
        box.style.display = this.showMeaning ? 'block' : 'none';
      });
    });

    this.els.langBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.dataset.lang;
        const previousRecognitionLang = this.getRecognitionLang();
        this.els.langBtns.forEach(b => b.classList.toggle('active', b === e.currentTarget));
        this.scriptLang = lang;
        safeStorage.set('chalisa_script_lang', lang);
        this.renderVerses();
        this.highlightCurrentVerseAndWord();
        if (this.isVoiceListening && this.getRecognitionLang() !== previousRecognitionLang) {
          this.restartVoiceListening();
        }
      });
    });

    this.els.themeToggleBtn.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      safeStorage.set('chalisa_theme', this.theme);
      this.applyTheme();
    });

    this.els.openSettingsBtn.addEventListener('click', () => {
      this.els.settingsModal.classList.add('open');
      this.els.settingsModal.setAttribute('aria-hidden', 'false');
      this.refreshVoiceDiagnostics();
      this.refreshMicrophones();
      clearInterval(this.diagTimer);
      this.diagTimer = setInterval(() => this.refreshVoiceDiagnostics(), 2000);
    });

    const closeSettings = () => {
      this.els.settingsModal.classList.remove('open');
      this.els.settingsModal.setAttribute('aria-hidden', 'true');
      clearInterval(this.diagTimer);
      this.diagTimer = null;
    };

    if (this.els.resetVoiceLearningBtn) {
      this.els.resetVoiceLearningBtn.addEventListener('click', () => {
        if (!confirm('Forget what AI Voice Sync learned about your chanting?')) return;
        this.tracker.importAliases(null);
        safeStorage.set('chalisa_voice_learning', 'null');
        this.refreshVoiceDiagnostics();
      });
    }
    this.els.closeSettingsBtn.addEventListener('click', closeSettings);
    this.els.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.els.settingsModal) closeSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettings();
    });

    this.els.fontDecrBtn.addEventListener('click', () => this.adjustFontSize(-1));
    this.els.fontIncrBtn.addEventListener('click', () => this.adjustFontSize(1));

    this.els.meaningLangBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mlang = e.currentTarget.dataset.mlang;
        this.els.meaningLangBtns.forEach(b => b.classList.toggle('active', b === e.currentTarget));
        this.meaningLang = mlang;
        safeStorage.set('chalisa_meaning_lang', mlang);
        this.renderVerses();
        this.highlightCurrentVerseAndWord();
      });
    });

    this.els.autoScrollToggle.addEventListener('change', (e) => {
      this.autoScroll = e.target.checked;
      safeStorage.set('chalisa_autoscroll', this.autoScroll.toString());
    });

    this.els.wakeLockToggle.addEventListener('change', (e) => {
      this.keepAwake = e.target.checked;
      safeStorage.set('chalisa_wakelock', this.keepAwake.toString());
      this.updateWakeLock();
    });
    document.addEventListener('visibilitychange', () => this.updateWakeLock());

    // Jap counter: tap = one jap, long-press = take one back
    if (this.els.japCounterBtn) {
      let pressTimer = null;
      let longPressed = false;
      const btn = this.els.japCounterBtn;
      btn.addEventListener('pointerdown', () => {
        longPressed = false;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => { longPressed = true; this.undoJap(); }, 650);
      });
      const cancel = () => clearTimeout(pressTimer);
      btn.addEventListener('pointerup', cancel);
      btn.addEventListener('pointerleave', cancel);
      btn.addEventListener('pointercancel', cancel);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (longPressed) { longPressed = false; return; }
        this.countJap();
      });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    if (this.els.japCounterToggle) {
      this.els.japCounterToggle.addEventListener('change', (e) => {
        this.japCounterOn = e.target.checked;
        safeStorage.set('chalisa_jap_counter', String(this.japCounterOn));
        this.applyJapCounter();
      });
    }
    if (this.els.customGoalPill && this.els.customGoalRow) {
      this.els.customGoalPill.addEventListener('click', () => {
        const row = this.els.customGoalRow;
        row.hidden = !row.hidden;
        this.els.customGoalPill.setAttribute('aria-expanded', String(!row.hidden));
        if (!row.hidden) {
          this.els.customGoalInput.value = String(this.sankalpaGoal);
          try { this.els.customGoalInput.focus(); this.els.customGoalInput.select(); } catch (e) {}
        }
      });
      this.els.customGoalRow.addEventListener('submit', (e) => {
        e.preventDefault();
        const n = parseInt(this.els.customGoalInput.value, 10);
        if (!Number.isFinite(n) || n < 1 || n > 1008) {
          this.showToast('Choose a goal from 1 to 1008.');
          return;
        }
        this.setGoal(n);
        this.els.customGoalRow.hidden = true;
        this.els.customGoalPill.setAttribute('aria-expanded', 'false');
        this.showToast(`Goal set: ${n} jap${n === 1 ? '' : 's'}.`);
      });
    }
    this.els.engineBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.voiceEngine = e.currentTarget.dataset.engine;
        safeStorage.set('chalisa_voice_engine', this.voiceEngine);
        this.els.engineBtns.forEach(b => b.classList.toggle('active', b === e.currentTarget));
        if (this.isVoiceListening) this.restartVoiceListening();
      });
    });
    if (this.els.micSelect) {
      this.els.micSelect.addEventListener('change', (e) => {
        this.micDeviceId = e.target.value;
        safeStorage.set('chalisa_mic', this.micDeviceId);
        if (this.isVoiceListening) this.restartVoiceListening();
      });
    }

    this.els.resetAllDataBtn.addEventListener('click', () => {
      if (confirm('Do you want to reset your chanting recitations and accuracy scores?')) {
        this.chantCount = 0;
        this.accuracy = { matched: 0, total: 0 };
        this.verseScores.clear();
        safeStorage.set('chalisa_chant_count', '0');
        this.refreshVersePills();
        this.updateStatsDisplay();
        closeSettings();
      }
    });

    this.els.goalPills.forEach(pill => {
      if (!pill.dataset.goal) return; // "Other" opens the custom goal field
      pill.addEventListener('click', (e) => {
        this.setGoal(parseInt(e.currentTarget.dataset.goal, 10));
        if (this.els.customGoalRow) this.els.customGoalRow.hidden = true;
      });
    });

    this.els.hudJumpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  switchMode(mode) {
    this.currentMode = mode;

    if (mode !== 'audio' && this.isAudioPlaying) {
      this.audio.pause();
    }
    if (mode !== 'voice' && this.isVoiceListening) {
      this.stopVoiceListening();
    }

    this.els.tabAudioMode.classList.toggle('active', mode === 'audio');
    this.els.tabVoiceMode.classList.toggle('active', mode === 'voice');
    this.els.tabTapMode.classList.toggle('active', mode === 'tap');

    this.els.audioConsolePanel.classList.toggle('active', mode === 'audio');
    this.els.voiceConsolePanel.classList.toggle('active', mode === 'voice');
    this.els.tapConsolePanel.classList.toggle('active', mode === 'tap');

    if (mode === 'audio') {
      this.els.activeModeName.textContent = 'Divine Audio';
      this.els.hudStatusLabel.textContent = this.isAudioPlaying ? 'Playing Audio' : 'Audio Mode';
      this.els.hudTranscript.textContent = 'Hariharan Ji • Soulful Devotional Recitation';
    } else if (mode === 'voice') {
      this.els.activeModeName.textContent = 'AI Voice Sync';
      this.els.hudStatusLabel.textContent = this.isVoiceListening ? 'Listening Mic' : 'Voice Mode';
      this.els.hudTranscript.textContent = 'Chant in Hindi, Bengali, or English into your microphone';
    } else {
      this.els.activeModeName.textContent = 'Tap Sync';
      this.els.hudStatusLabel.textContent = 'Tap Counter';
      this.els.hudTranscript.textContent = 'Tap screen to advance word-by-word with sacred vibration';
      this.highlightCurrentVerseAndWord();
    }
    this.updateStatsDisplay();
    this.updateWakeLock();
  }

  // ==================== Verse model helpers ====================

  /** Rendered token indices of the words of a line (punctuation tokens excluded). */
  lineTokenIndices(vIdx, lIdx) {
    const L = this.lineModel.get(`${vIdx}-${lIdx}`);
    if (!L) return [];
    return L.words.map(w => (w.tokenIndex[this.scriptLang] != null ? w.tokenIndex[this.scriptLang] : w.tokenIndex.hi));
  }

  wordEl(vIdx, lIdx, tokenIndex) {
    const idx = typeof tokenIndex === 'object'
      ? (tokenIndex[this.scriptLang] != null ? tokenIndex[this.scriptLang] : tokenIndex.hi)
      : tokenIndex;
    return document.getElementById(`word-${vIdx}-${lIdx}-${idx}`);
  }

  clearLineMarks(vIdx, lIdx) {
    document.querySelectorAll(`#line-${vIdx}-${lIdx} .word-token`).forEach(el => {
      el.classList.remove('matched', 'missed', 'passed');
    });
  }

  clearAllMarks() {
    document.querySelectorAll('.word-token.matched, .word-token.missed, .word-token.passed').forEach(el => {
      el.classList.remove('matched', 'missed', 'passed');
    });
  }

  // ==================== Audio Player Engine ====================

  toggleAudioPlayback() {
    getSharedAudioContext();
    if (this.audio.paused) {
      if (this.audioFailed) {
        this.audioFailed = false;
        this.audio.load();
      }
      this.audio.play().catch(err => {
        console.warn('Audio play request failed:', err);
      });
    } else {
      this.audio.pause();
    }
  }

  setAudioPlayingState(isPlaying) {
    this.isAudioPlaying = isPlaying;
    this.els.mainAudioPlayBtn.classList.toggle('playing', isPlaying);
    this.els.audioPlayText.textContent = isPlaying ? 'Pause Audio' : 'Play Divine Audio';
    this.els.hudStatusDot.classList.toggle('pulsing', isPlaying);
    this.els.hudEqualizer.classList.toggle('active', isPlaying);

    if (isPlaying) {
      this.els.audioPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      this.els.hudStatusLabel.textContent = 'Playing Audio';
    } else {
      this.els.audioPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      this.els.hudStatusLabel.textContent = 'Audio Paused';
    }
    this.updateWakeLock();
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    safeStorage.set('chalisa_speed', speed.toString());
    this.audio.defaultPlaybackRate = speed; // survives a reload of the media element
    this.audio.playbackRate = speed;
    this.els.paceDisplay.textContent = `${speed}x`;

    this.els.speedBtns.forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
  }

  handleAudioTimeUpdate() {
    const curTime = this.audio.currentTime;
    this.updateSliderUI(curTime);

    let matchedVerseIdx = 0;
    for (let i = 0; i < VERSE_TIMESTAMPS.length; i++) {
      const ts = VERSE_TIMESTAMPS[i];
      if (curTime >= ts.start && curTime < ts.end) {
        matchedVerseIdx = ts.verseIndex;
        break;
      }
      if (curTime >= ts.end) {
        matchedVerseIdx = Math.min(this.totalVerses - 1, ts.verseIndex + 1);
      }
    }

    if (matchedVerseIdx !== this.currentVerseIndex) {
      this.currentVerseIndex = matchedVerseIdx;
      this.onVerseChanged();
    }

    const ts = VERSE_TIMESTAMPS[this.currentVerseIndex];
    if (ts) {
      const duration = ts.end - ts.start;
      const elapsed = Math.max(0, curTime - ts.start);
      const half = duration / 2;

      const lineIdx = elapsed < half ? 0 : 1;
      const lineElapsed = elapsed < half ? elapsed : (elapsed - half);
      const lineFraction = Math.min(0.99, Math.max(0, lineElapsed / half));

      const tokens = this.lineTokenIndices(this.currentVerseIndex, lineIdx);
      if (tokens.length > 0) {
        this.highlightActiveWord(this.currentVerseIndex, lineIdx, tokens[Math.floor(lineFraction * tokens.length)]);
      }
    }
  }

  updateSliderUI(curTime) {
    this.els.audioProgressSlider.value = curTime;
    const pct = Math.min(100, (curTime / this.audioDuration) * 100);
    this.els.sliderFillBar.style.width = `${pct}%`;
    this.els.audioCurrentTime.textContent = this.formatSeconds(curTime);
  }

  formatSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Only the <audio> element's 'ended' event comes here.
  handleAudioEnded() {
    this.countRecitation();
    if (this.isLooping || this.chantCount < this.sankalpaGoal) {
      this.audio.currentTime = 0;
      this.jumpToVerse(0);
      this.audio.play().catch(() => {});
    } else {
      this.setAudioPlayingState(false);
    }
  }

  // A full recitation finished in Voice or Tap mode: count it and start the next round.
  // (Previously this reused handleAudioEnded, which started the audio track
  // under the reciter's microphone whenever the Sankalpa goal was not reached.)
  completeRecitation() {
    this.countRecitation();
    this.clearAllMarks();
    this.jumpToVerse(0);
  }

  setGoal(goal) {
    this.sankalpaGoal = goal;
    safeStorage.set('chalisa_sankalpa_goal', String(goal));
    this.syncGoalPills();
    this.updateStatsDisplay();
  }

  syncGoalPills() {
    let preset = false;
    this.els.goalPills.forEach(p => {
      const on = !!p.dataset.goal && parseInt(p.dataset.goal, 10) === this.sankalpaGoal;
      preset = preset || on;
      p.classList.toggle('active', on);
    });
    if (this.els.customGoalPill) {
      this.els.customGoalPill.classList.toggle('active', !preset);
      this.els.customGoalPill.textContent = preset ? 'Other' : `${this.sankalpaGoal}x`;
    }
  }

  applyJapCounter() {
    const btn = this.els.japCounterBtn;
    if (!btn) return;
    btn.hidden = !this.japCounterOn;
    document.body.classList.toggle('has-jap-counter', this.japCounterOn);
    this.els.japCountText.textContent = String(this.chantCount);
    this.els.japGoalText.textContent = `of ${this.sankalpaGoal}`;
    const pct = Math.min(100, Math.round((this.chantCount / Math.max(1, this.sankalpaGoal)) * 100));
    btn.style.setProperty('--jap-progress', `${pct}%`);
    btn.classList.toggle('done', this.chantCount >= this.sankalpaGoal);
    btn.setAttribute('aria-label', `Count one jap. ${this.chantCount} of ${this.sankalpaGoal} done. Long-press to take one back.`);
  }

  /** One jap counted by hand (the counter button). */
  countJap() {
    getSharedAudioContext();
    this.playDivineChime();
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
    this.countRecitation(true);
  }

  undoJap() {
    if (this.chantCount <= 0) return;
    this.chantCount--;
    safeStorage.set('chalisa_chant_count', String(this.chantCount));
    if (navigator.vibrate) { try { navigator.vibrate([20, 40, 20]); } catch (e) {} }
    this.updateStatsDisplay();
    this.showToast(`Taken back: ${this.chantCount} of ${this.sankalpaGoal}.`);
  }

  countRecitation(byHand = false) {
    this.chantCount++;
    safeStorage.set('chalisa_chant_count', this.chantCount.toString());
    this.updateStatsDisplay();

    const undo = byHand ? { label: 'Undo', run: () => this.undoJap() } : null;
    if (this.chantCount === this.sankalpaGoal) {
      this.playSacredVictoryChime();
      this.showToast(`Sankalpa complete: ${this.chantCount} recitation${this.chantCount > 1 ? 's' : ''} of Shri Hanuman Chalisa. Jai Shri Ram!`, undo);
    } else {
      const left = this.sankalpaGoal - this.chantCount;
      this.showToast(`Jap ${this.chantCount} counted${left > 0 ? `, ${left} to go` : ''}.`, undo);
    }
  }

  jumpToVerse(vIdx) {
    this.currentVerseIndex = vIdx;
    this.currentLineIndex = 0;
    this.currentWordIndex = 0;

    const ts = VERSE_TIMESTAMPS[vIdx];
    if (ts && this.currentMode === 'audio') {
      this.audio.currentTime = ts.start;
      this.updateSliderUI(ts.start);
    }

    this.tracker.setPosition(vIdx, 0);
    CHALISA_DATA.verses[vIdx].lines.forEach((_, lIdx) => this.clearLineMarks(vIdx, lIdx));
    this.onVerseChanged();
    this.highlightActiveWord(vIdx, 0, this.lineTokenIndices(vIdx, 0)[0] || 0);
  }

  onVerseChanged() {
    document.querySelectorAll('.verse-card').forEach((card, idx) => {
      card.classList.toggle('active-verse', idx === this.currentVerseIndex);
    });

    const activeCard = document.getElementById(`verseCard-${this.currentVerseIndex}`);
    if (activeCard && this.autoScroll) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    if (verseObj) {
      const typeLabel = verseObj.type.includes('doha') ? 'Doha' : 'Chaupai';
      this.els.verseIndicatorDisplay.textContent = `${typeLabel} ${verseObj.num}`;
      this.els.verseSubCount.textContent = `${this.currentVerseIndex + 1} of ${this.totalVerses} Verses`;

      const lineText = verseObj.lines[0][this.scriptLang] || verseObj.lines[0].hi;
      this.els.hudTranscript.textContent = lineText;
    }
  }

  highlightActiveWord(vIdx, lIdx, tokenIdx) {
    document.querySelectorAll('.word-token.glowing').forEach(el => el.classList.remove('glowing'));

    const wordEl = document.getElementById(`word-${vIdx}-${lIdx}-${tokenIdx}`);
    if (wordEl) {
      wordEl.classList.add('glowing');
    }

    document.querySelectorAll('.verse-line.active-line').forEach(el => el.classList.remove('active-line'));
    const lineEl = document.getElementById(`line-${vIdx}-${lIdx}`);
    if (lineEl) {
      lineEl.classList.add('active-line');
    }
  }

  highlightCurrentVerseAndWord() {
    this.onVerseChanged();
    const tokens = this.lineTokenIndices(this.currentVerseIndex, this.currentLineIndex);
    const w = Math.min(this.currentWordIndex, Math.max(0, tokens.length - 1));
    this.highlightActiveWord(this.currentVerseIndex, this.currentLineIndex, tokens[w] || 0);
  }

  // ==================== AI Voice Sync ====================
  //
  // Engines, in order of preference:
  //  1. native  - Android SpeechRecognizer via the app's ChantRecognizer plugin.
  //               Android stops recognising after every pause; the plugin restarts
  //               it natively (no beep: the system earcon is muted while listening),
  //               recovers from errors and hangs, pauses in the background, and
  //               reports each utterance as partial(segment) ... final(segment).
  //  2. web     - Web Speech API (Chrome, Edge, Safari), restarted on 'end'.
  //  3. rhythm  - no recogniser: microphone loudness onsets advance the words.
  //               Nothing is recognised, so nothing is scored.
  // Only the rhythm engine opens a getUserMedia stream: a second capture next to
  // a recogniser competes for the microphone on Android.

  getRecognitionLang() {
    // The verses are Awadhi/Hindi whichever script is on screen. The Hindi
    // recogniser knows these words (the Chalisa is everywhere in Hindi audio),
    // it is installed on far more phones than Bengali, and its Devanagari output
    // is matched against the Bengali and English text via phoneticSkeleton().
    return 'hi-IN';
  }

  /** Languages the native recogniser may fall back to if Hindi is unavailable. */
  recognitionFallbacks() {
    return this.scriptLang === 'bn' ? ['bn-IN', 'en-IN'] : ['en-IN'];
  }

  async toggleVoiceListening() {
    if (this.voice.starting) return;
    if (this.isVoiceListening) {
      this.stopVoiceListening();
    } else {
      await this.startVoiceListening();
    }
  }

  restartVoiceListening() {
    this.stopVoiceListening();
    return this.startVoiceListening();
  }

  async startVoiceListening() {
    const session = ++this.voiceSession;
    this.voice = this.freshVoiceState();
    this.voice.starting = true;
    try {
      getSharedAudioContext();
      if (this.isAudioPlaying) this.audio.pause(); // the track would be "heard" by the mic

      this.isVoiceListening = true;
      this.feed.reset();
      const at = this.tracker.position();
      if (at.verseIndex !== this.currentVerseIndex || at.lineIndex !== this.currentLineIndex || at.done) {
        this.tracker.setPosition(this.currentVerseIndex, this.currentLineIndex);
        this.currentWordIndex = 0;
      } else {
        // Resume after a pause: go on from the very word the chant stopped at.
        this.tracker.pending = [];
        this.tracker.lost = 0;
        this.tracker.tentative = null;
        this.currentWordIndex = at.wordIndex;
      }
      this.setVoiceUi(true);
      this.highlightExpectedWord();

      const lang = this.getRecognitionLang();
      const offline = this.voiceEngine === 'ondevice' ? this.offlineEngine() : null;
      if (offline && await this.startNativeRecognition(offline, lang, session, true)) return;
      if (!this.isActiveSession(session)) return;
      const plugin = nativeSpeechPlugin();
      if (plugin && await this.startNativeRecognition(plugin, lang, session)) return;
      if (!this.isActiveSession(session)) return;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        this.startWebRecognition(SR, lang, session);
        return;
      }
      await this.startRhythmMode(session, plugin
        ? 'No speech recognition service on this device.'
        : 'This browser has no speech recognition.');
    } catch (err) {
      console.error('AI Voice Sync failed to start:', err);
      if (this.isActiveSession(session)) {
        this.stopVoiceListening('Could not start the microphone. Please allow microphone access and try again.');
      }
    } finally {
      if (session === this.voiceSession) this.voice.starting = false;
    }
  }

  isActiveSession(session) {
    return session === this.voiceSession && this.isVoiceListening;
  }

  backoff(failures) {
    return Math.min(5000, 300 * Math.pow(2, Math.max(0, failures - 1)));
  }

  // ---------- 1. Native Android recogniser ----------

  /** The on-device recogniser (js/offline-engine.js), attached to this tracker. */
  offlineEngine() {
    const engine = typeof window.getOfflineChantEngine === 'function' ? window.getOfflineChantEngine() : null;
    if (!engine || typeof window.offlineLexiconForms !== 'function') return null;
    engine.attach({ tracker: this.tracker, lexicon: window.offlineLexiconForms, deviceId: this.micDeviceId });
    return engine;
  }

  async startNativeRecognition(plugin, lang, session, offline = false) {
    let available = false;
    try {
      available = !!(await plugin.available()).available;
    } catch (e) {
      available = false;
    }
    if (!available) return false;

    let perm = null;
    try { perm = await plugin.checkPermissions(); } catch (e) {}
    if (!perm || perm.microphone !== 'granted') {
      try { perm = await plugin.requestPermissions({ permissions: ['microphone'] }); } catch (e) { perm = null; }
    }
    if (!this.isActiveSession(session)) return true;
    if (!perm || perm.microphone !== 'granted') {
      this.stopVoiceListening(MSG_MIC_PERMISSION);
      return true;
    }

    const v = this.voice;
    v.engine = 'native';
    v.offline = offline;
    v.plugin = plugin;
    v.lang = lang;
    await settle(() => plugin.removeAllListeners());
    await plugin.addListener('partial', (data) => this.onNativePartial(session, data));
    await plugin.addListener('final', (data) => this.onNativeFinal(session, data));
    await plugin.addListener('error', (data) => this.onNativeError(session, data));
    await plugin.addListener('state', (data) => this.onNativeState(session, data));
    await plugin.addListener('route', (data) => this.onNativeRoute(session, data));
    await plugin.addListener('level', (data) => this.onNativeLevel(session, data));
    if (!this.isActiveSession(session)) return true;

    let started;
    try {
      started = await plugin.start({ language: lang, fallbackLanguages: this.recognitionFallbacks(), muteBeep: true });
    } catch (err) {
      if (!this.isActiveSession(session)) return true;
      if (err && err.code === 'permission') {
        this.stopVoiceListening(isNativeApp() ? MSG_MIC_PERMISSION : 'Microphone access was denied. Allow the microphone for this site and tap Start again.');
        return true;
      }
      // No usable recogniser after all: let the next engine take over.
      if (offline) console.warn('On-device recogniser unavailable, using the speech service:', err);
      await settle(() => plugin.removeAllListeners());
      v.engine = null;
      v.offline = false;
      v.plugin = null;
      return false;
    }
    if (!this.isActiveSession(session)) return true;
    v.beepMuted = !!(started && started.beepMuted);
    v.requestedLang = lang;
    if (started && started.service) v.service = started.service;
    if (!v.routeNotice) this.showVoiceStatus(this.listeningMessage(v.lang));
    this.sendRecognitionContext(true);
    return true;
  }

  listeningMessage(lang) {
    return `Listening in ${LANG_NAMES[lang] || lang}… chant aloud.`;
  }

  nativeStreamKey(session, segment) {
    return `n${session}-${segment}`;
  }

  /** Growing transcript of the utterance being spoken. */
  onNativePartial(session, data) {
    if (!this.isActiveSession(session) || !data || !data.text) return;
    this.voice.errorStreak = 0;
    this.showHeard(data.text);
    const key = this.nativeStreamKey(session, data.segment);
    this.processHeardWords(this.feed.update(key, data.text, false));
    this.armHoldRelease(key);
  }

  /** The utterance ended (sent once, also after silence or an error): release its held-back word. */
  onNativeFinal(session, data) {
    if (!this.isActiveSession(session) || !data) return;
    clearTimeout(this.voice.holdTimer);
    const key = this.nativeStreamKey(session, data.segment);
    const words = data.text ? this.feed.update(key, data.text, true) : this.feed.flush(key);
    if (data.text) this.showHeard(data.text);
    this.processHeardWords(words);
  }

  /**
   * Audio level from the native recogniser (Android RMS dB: about -2 in silence,
   * up to ~10 for a loud voice). Drives the level bars, and tells a soft-voiced
   * chanter to come closer when the recogniser hears sound but no words.
   */
  onNativeLevel(session, data) {
    if (!this.isActiveSession(session) || !data) return;
    const rms = Number(data.rms);
    if (!Number.isFinite(rms)) return;
    const level = Math.max(0, Math.min(1, (rms + 2) / 12));
    const bars = this.els.voiceWaveBars.querySelectorAll('.wave-bar');
    bars.forEach((bar, idx) => {
      const shape = 0.55 + 0.45 * Math.abs(Math.sin((idx + 1) * 1.7 + Date.now() / 160));
      bar.style.height = `${Math.max(6, level * shape * 26)}px`;
    });
    this.trackVoiceLevel(rms, Date.now());
  }

  trackVoiceLevel(rms, now) {
    const v = this.voice;
    if (!v.levelWindowStart) {
      v.levelWindowStart = now;
      v.levelPeak = rms;
      return;
    }
    v.levelPeak = Math.max(v.levelPeak, rms);
    if (now - v.levelWindowStart < this.voiceTiming.quietHintMs) return;
    const heardWords = v.lastWordAt >= v.levelWindowStart;
    // Sound well above silence but too soft for any word to be recognised.
    if (!heardWords && v.levelPeak > 0.5 && v.levelPeak < 4.5) {
      this.showVoiceStatus('Your voice is very soft for the microphone. Chant a little louder, or hold the phone closer.');
      v.softHintShown = true;
    } else if (heardWords && v.softHintShown) {
      v.softHintShown = false;
    }
    v.levelWindowStart = now;
    v.levelPeak = rms;
  }

  /**
   * Release the held-back last word once the transcript has stopped changing,
   * so a slow chanter sees each word light up without saying the next one.
   */
  armHoldRelease(key) {
    const v = this.voice;
    const session = this.voiceSession;
    clearTimeout(v.holdTimer);
    v.holdTimer = setTimeout(() => {
      v.holdTimer = null;
      if (!this.isActiveSession(session)) return;
      this.processHeardWords(key ? this.feed.flush(key) : this.feed.flushAll());
    }, v.offline ? this.voiceTiming.offlineHoldReleaseMs : this.voiceTiming.holdReleaseMs);
  }

  /**
   * A line whose last word the recogniser never delivered is closed after a
   * silence; the start of the next line also closes it. An utterance boundary
   * alone does not: slow chanters pause before the last word.
   */
  armLineClose() {
    const v = this.voice;
    const session = this.voiceSession;
    clearTimeout(v.lineCloseTimer);
    v.lineCloseTimer = setTimeout(() => {
      v.lineCloseTimer = null;
      if (!this.isActiveSession(session)) return;
      const events = this.tracker.endOfUtterance();
      if (events.length) this.applyTrackerEvents(events);
    }, this.voiceTiming.lineCloseSilenceMs);
  }

  /**
   * The plugin moved to another recogniser or language because the previous one
   * could not serve (e.g. no Bengali on Samsung's default recogniser). Words are
   * matched in every script, so a Hindi transcript still tracks the Bengali text.
   */
  onNativeRoute(session, data) {
    if (!this.isActiveSession(session) || !data || !data.language) return;
    const v = this.voice;
    const requested = v.requestedLang || v.lang;
    const languageChanged = data.language !== v.lang;
    v.lang = data.language;
    if (data.service) v.service = data.service;
    if (languageChanged) this.sendRecognitionContext(true); // verse hints in the new script
    if (data.reason === 'working' && !languageChanged) return; // good news needs no message
    if (data.language !== requested) {
      v.routeNotice = true;
      this.showVoiceStatus(`${LANG_NAMES[requested] || requested} speech recognition is not available on this phone, so AI Voice Sync is listening in ${LANG_NAMES[data.language] || data.language}. Chant as usual: your words still match the verses on screen.`);
    } else if (!v.routeNotice) {
      this.showVoiceStatus(this.listeningMessage(data.language));
    }
  }

  onNativeError(session, data) {
    if (!this.isActiveSession(session) || !data) return;
    const lang = LANG_NAMES[this.voice.lang] || this.voice.lang || 'Hindi';
    if (!data.fatal) {
      if (data.code === 'download') {
        const pack = LANG_NAMES[data.message] || data.message || lang;
        this.showToast(`Downloading the ${pack} speech pack for this phone (one time). AI Voice Sync will use it automatically.`);
        return;
      }
      if (data.code === 'network') {
        this.showVoiceStatus(`Cannot reach the speech service. Retrying… (With the offline ${lang} speech pack installed, chanting works without internet.)`);
      }
      return;
    }
    const messages = {
      permission: MSG_MIC_PERMISSION,
      language: 'No speech recogniser on this phone supports Bengali, Hindi or English. Install or update the Google app from the Play Store, then tap Start again. Tap Sync works without it.',
      network: `Speech recognition needs an internet connection, or the offline ${lang} speech pack. Tap Start to try again.`,
      audio: 'Another app is using the microphone. Close it and tap Start again.'
    };
    this.stopVoiceListening(messages[data.code] || 'Speech recognition keeps failing. Tap Start to try again, or use Tap Sync.');
  }

  onNativeState(session, data) {
    if (!this.isActiveSession(session) || !data) return;
    if (data.reason === 'loading') {
      this.showVoiceStatus('Preparing the on-device recogniser… The first time takes a few seconds.');
    } else if (data.reason === 'background') {
      this.showVoiceStatus('Paused while the app is in the background. It resumes when you come back.');
    } else if (data.reason === 'resumed') {
      this.showVoiceStatus(this.listeningMessage(this.voice.lang));
    }
  }

  // ---------- 2. Web Speech API ----------

  startWebRecognition(SR, lang, session) {
    const v = this.voice;
    v.engine = 'web';
    v.lang = lang;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = lang;
    rec.onresult = (event) => this.onWebResult(session, rec, event);
    rec.onerror = (event) => this.onWebError(session, rec, event);
    rec.onend = () => this.onWebEnd(session, rec);
    this.recognition = rec;
    v.webRun++;
    v.webKeys = [];
    rec.start();
    this.showVoiceStatus(`Listening in ${LANG_NAMES[lang] || lang}… chant aloud.`);
  }

  onWebResult(session, rec, event) {
    if (!this.isActiveSession(session) || rec !== this.recognition) return;
    const v = this.voice;
    v.errorStreak = 0;
    let latest = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res && res[0] && res[0].transcript ? res[0].transcript.trim() : '';
      if (!text) continue;
      if (!v.webKeys[i]) {
        // Chrome on Android repeats the whole utterance in every new result.
        // Continue the previous stream instead of re-reading its words.
        const prevRes = i > 0 ? event.results[i - 1] : null;
        const prev = prevRes && prevRes[0] && prevRes[0].transcript ? prevRes[0].transcript.trim() : '';
        v.webKeys[i] = prev && v.webKeys[i - 1] && text.indexOf(prev) === 0
          ? v.webKeys[i - 1]
          : `w${session}-${v.webRun}-${i}`;
      }
      this.processHeardWords(this.feed.update(v.webKeys[i], text, res.isFinal));
      if (!this.isActiveSession(session)) return;
      if (res.isFinal) clearTimeout(v.holdTimer);
      else this.armHoldRelease(v.webKeys[i]);
      latest = text;
    }
    if (latest) this.showHeard(latest);
  }

  onWebError(session, rec, event) {
    if (!this.isActiveSession(session) || rec !== this.recognition) return;
    const code = event && event.error;
    const v = this.voice;
    if (code === 'no-speech' || code === 'aborted') return; // onend restarts
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      v.fatal = true;
      if (isNativeApp()) {
        this.startRhythmMode(session, 'Speech recognition is not available in this app.').catch(() => {
          this.stopVoiceListening('Microphone access was denied.');
        });
      } else {
        this.stopVoiceListening('Microphone or speech access is blocked for this site. Allow it in the browser settings and tap Start again.');
      }
      return;
    }
    if (code === 'language-not-supported') {
      v.fatal = true;
      this.startRhythmMode(session, `${LANG_NAMES[v.lang] || v.lang} recognition is not supported here.`).catch(() => {
        this.stopVoiceListening('Microphone access was denied.');
      });
      return;
    }
    v.errorStreak++;
    if (code === 'network') {
      this.showVoiceStatus('Speech recognition in this browser needs an internet connection. Retrying…');
    }
  }

  onWebEnd(session, rec) {
    const v = this.voice;
    if (!this.isActiveSession(session) || rec !== this.recognition || v.fatal) return;
    this.processHeardWords(this.feed.flushAll());
    if (!this.isActiveSession(session)) return;
    if (v.errorStreak > 8) {
      this.stopVoiceListening('Speech recognition stopped responding. Check your connection and tap Start again.');
      return;
    }
    const delay = v.errorStreak ? this.backoff(v.errorStreak) : this.voiceTiming.webRestartDelay;
    v.restartTimer = setTimeout(() => {
      v.restartTimer = null;
      if (!this.isActiveSession(session) || rec !== this.recognition) return;
      v.webRun++;
      v.webKeys = [];
      try { rec.start(); } catch (e) { console.warn('Speech recognition restart failed:', e); }
    }, delay);
  }

  // ---------- 3. Rhythm mode (no recogniser) ----------

  async startRhythmMode(session, reason) {
    if (this.recognition) {
      const r = this.recognition;
      this.recognition = null;
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try { r.abort(); } catch (e) {}
    }
    this.voice.engine = 'rhythm';
    this.updateStatsDisplay();
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      this.stopVoiceListening(`${reason} Use Tap Sync to follow along.`);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!this.isActiveSession(session)) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    this.micStream = stream;
    this.setupMicVisualizer(stream);
    this.showVoiceStatus(`${reason} Rhythm mode: words advance as you chant, but pronunciation cannot be scored.`);
  }

  setupMicVisualizer(stream) {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    this.micSource = source;
    this.micAnalyser = analyser;

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const wave = new Uint8Array(analyser.fftSize);
    const bars = this.els.voiceWaveBars.querySelectorAll('.wave-bar');
    this.vad = { floor: 0.01, active: false, lastOnset: 0 };

    const tick = () => {
      if (!this.isVoiceListening || this.micAnalyser !== analyser) return;
      analyser.getByteFrequencyData(freq);
      bars.forEach((bar, idx) => {
        const val = freq[2 + idx * 3] || 0;
        bar.style.height = `${Math.max(6, (val / 255) * 26)}px`;
      });
      analyser.getByteTimeDomainData(wave);
      let sum = 0;
      for (let k = 0; k < wave.length; k++) {
        const x = (wave[k] - 128) / 128;
        sum += x * x;
      }
      this.detectChantOnset(Math.sqrt(sum / wave.length), Date.now());
      this.animFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  // Edge-triggered onset detector with an adaptive noise floor: a fan, traffic
  // or a TV raises the floor instead of advancing words forever (the old
  // detector advanced every 750 ms whenever the level stayed above a constant).
  detectChantOnset(rms, now) {
    const vad = this.vad;
    vad.floor = rms < vad.floor ? vad.floor * 0.95 + rms * 0.05 : vad.floor * 0.999 + rms * 0.001;
    const on = rms > Math.max(0.02, vad.floor * 3);
    const off = rms < Math.max(0.012, vad.floor * 1.8);
    if (!vad.active && on && now - vad.lastOnset > 350) {
      vad.active = true;
      vad.lastOnset = now;
      this.stepWord();
    } else if (vad.active && off) {
      vad.active = false;
    }
  }

  stopVoiceListening(message) {
    const v = this.voice;
    if (this.isVoiceListening && (v.engine === 'native' || v.engine === 'web')) {
      this.processHeardWords(this.feed.flushAll()); // last held-back word
    }
    this.isVoiceListening = false;
    this.voiceSession++; // invalidates callbacks of the session being stopped

    if (v.restartTimer) clearTimeout(v.restartTimer);
    clearTimeout(v.holdTimer);
    clearTimeout(v.lineCloseTimer);
    if (this.learningSaveTimer) this.saveLearningSoon(true);
    this.contextLineKey = null;
    if (v.engine === 'native' && v.plugin) {
      settle(() => v.plugin.stop());
      settle(() => v.plugin.removeAllListeners());
    }
    if (this.recognition) {
      const r = this.recognition;
      this.recognition = null;
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try { r.stop(); } catch (e) {}
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch (e) {}
      this.micSource = null;
    }
    this.micAnalyser = null;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.feed.reset();
    this.voice = this.freshVoiceState();
    this.setVoiceUi(false);
    this.showVoiceStatus(message || 'Chanting paused. Tap "Start AI Voice Sync" to resume.');
    this.updateStatsDisplay();
    this.updateWakeLock();
  }

  setVoiceUi(on) {
    this.els.toggleVoiceBtn.classList.toggle('recording', on);
    const resumable = !on && this.tracker && this.tracker.position().wordIndex > 0;
    this.els.voiceBtnText.textContent = on ? 'Pause' : (resumable ? 'Resume chanting' : 'Start AI Voice Sync');
    this.els.voiceWaveBars.classList.toggle('active', on);
    this.els.hudStatusDot.classList.toggle('pulsing', on);
    this.els.hudStatusLabel.textContent = on ? 'Listening Voice...' : 'Voice Paused';
    this.updateWakeLock();
  }

  showVoiceStatus(text) {
    this.els.voiceHeardText.textContent = text;
  }

  showHeard(transcript) {
    this.els.voiceHeardText.textContent = `Heard: "${transcript}"`;
    this.els.hudTranscript.textContent = `Chanting: "${transcript}"`;
  }

  /** Align newly heard words and reflect the result on the verses. */
  processHeardWords(words) {
    if (!this.isVoiceListening || !words || !words.length) return;
    this.voice.lastWordAt = Date.now();
    this.armLineClose();
    const events = this.tracker.feed(words);
    if (events.length) this.applyTrackerEvents(events);
  }

  applyTrackerEvents(events) {
    let completed = false;
    for (const ev of events) {
      if (ev.type === 'word') {
        const el = this.wordEl(ev.verseIndex, ev.lineIndex, ev.tokenIndex);
        if (el) {
          el.classList.toggle('matched', ev.status === 'matched');
          el.classList.toggle('missed', ev.status === 'missed');
        }
      } else if (ev.type === 'line') {
        this.recordLineAccuracy(ev.verseIndex, ev.lineIndex, ev.matched, ev.total);
      } else if (ev.type === 'advance') {
        this.clearLineMarks(ev.verseIndex, ev.lineIndex);
      } else if (ev.type === 'complete') {
        completed = true;
      } else if (ev.type === 'jump') {
        this.clearLineMarks(ev.verseIndex, ev.lineIndex);
      } else if (ev.type === 'learn') {
        this.saveLearningSoon();
      }
    }
    if (completed) {
      this.completeRecitation();
      this.highlightExpectedWord();
      this.sendRecognitionContext();
      return;
    }
    const pos = this.tracker.position();
    const verseChanged = pos.verseIndex !== this.currentVerseIndex;
    this.currentVerseIndex = pos.verseIndex;
    this.currentLineIndex = pos.lineIndex;
    this.currentWordIndex = pos.wordIndex;
    if (verseChanged) this.onVerseChanged();
    this.highlightExpectedWord();
    this.sendRecognitionContext();
  }

  /** Persist what the tracker learned about this reciter's voice (debounced). */
  saveLearningSoon(now = false) {
    clearTimeout(this.learningSaveTimer);
    const save = () => {
      this.learningSaveTimer = null;
      safeStorage.set('chalisa_voice_learning', JSON.stringify(this.tracker.exportAliases()));
    };
    if (now) save();
    else this.learningSaveTimer = setTimeout(save, 1500);
  }

  /**
   * Tell the native recogniser which verse text comes next. Android 13+
   * recognisers bias their results toward these phrases, so the Chalisa's
   * Awadhi words win over similar-sounding everyday words.
   */
  sendRecognitionContext(force = false) {
    const v = this.voice;
    if (!this.isVoiceListening || v.engine !== 'native' || !v.plugin || typeof v.plugin.setContext !== 'function') return;
    const idx = this.tracker.lineIdx;
    const key = `${idx}-${v.lang}`;
    if (!force && key === this.contextLineKey) return;
    this.contextLineKey = key;
    const script = v.lang === 'bn-IN' ? 'bn' : v.lang === 'en-IN' ? 'en' : 'hi';
    const phrases = [];
    for (let k = idx; k < Math.min(this.tracker.lines.length, idx + 3); k++) {
      const L = this.tracker.lines[k];
      const line = CHALISA_DATA.verses[L.verseIndex].lines[L.lineIndex];
      const text = String((line && (line[script] || line.hi)) || '').replace(/[।॥|]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) phrases.push(text);
    }
    // the distinctive words of the current and next line on their own, too
    phrases.slice(0, 2).forEach(p => p.split(' ').forEach(w => {
      if (w.length >= 3 && !phrases.includes(w)) phrases.push(w);
    }));
    settle(() => v.plugin.setContext({ phrases: phrases.slice(0, 40) }));
  }

  async refreshVoiceDiagnostics() {
    const learnedWords = this.tracker.learnedWordCount();
    if (this.els.voiceLearningDesc) {
      this.els.voiceLearningDesc.textContent = learnedWords
        ? `Learned how your chanting of ${learnedWords} word${learnedWords === 1 ? ' is' : 's are'} heard. Stored on this phone only.`
        : 'Words the recogniser hears differently in your chanting are remembered on this phone only.';
    }
    const out = this.els.voiceDiagnostics;
    if (!out) return;
    const v = this.voice;
    if (!this.isVoiceListening) {
      out.textContent = 'Voice diagnostics: start AI Voice Sync to see the recogniser in use.';
      return;
    }
    if (v.engine === 'native' && v.plugin && typeof v.plugin.getState === 'function') {
      let s = null;
      try { s = await v.plugin.getState(); } catch (e) { s = null; }
      if (!s || !this.isVoiceListening) return;
      out.textContent = v.offline
        ? `Voice diagnostics: ${serviceLabel(s.service)} · Hindi · listening for ${s.route} · ${s.attempts || 0} vocabulary updates · errors ${s.errors || 'none'} · mic: ${s.mic || 'default'}`
        : `Voice diagnostics: ${serviceLabel(s.service)} · ${s.language || v.lang} · route ${s.route || '-'} · ${s.attempts || 0} listens · errors ${s.errors || 'none'} · beep ${s.beepMuted ? 'muted' : 'not muted'} · verse hints ${s.biasing ? 'on' : 'off'} · Android API ${s.sdk || '?'}`;
    } else if (v.engine === 'web') {
      out.textContent = `Voice diagnostics: browser speech recognition · ${v.lang}`;
    } else if (v.engine === 'rhythm') {
      out.textContent = 'Voice diagnostics: no speech recogniser available, rhythm mode';
    }
  }

  highlightExpectedWord() {
    const pos = this.tracker.position();
    const t = this.tracker.expectedTokenIndex(this.scriptLang);
    if (t != null) this.highlightActiveWord(pos.verseIndex, pos.lineIndex, t);
  }

  recordLineAccuracy(vIdx, lIdx, matched, total) {
    const previous = this.verseScores.has(vIdx) && this.verseScores.get(vIdx).get(lIdx);
    if (previous) { // chanted again after going back: the new score replaces the old one
      this.accuracy.matched -= previous.matched;
      this.accuracy.total -= previous.total;
    }
    this.accuracy.matched += matched;
    this.accuracy.total += total;
    if (!this.verseScores.has(vIdx)) this.verseScores.set(vIdx, new Map());
    this.verseScores.get(vIdx).set(lIdx, { matched, total });
    this.refreshVersePills(vIdx);
    this.updateStatsDisplay();
  }

  refreshVersePills(onlyVerse) {
    const verses = onlyVerse != null ? [onlyVerse] : CHALISA_DATA.verses.map((_, i) => i);
    verses.forEach(vIdx => {
      const pill = document.getElementById(`verseAcc-${vIdx}`);
      if (!pill) return;
      const lines = this.verseScores.get(vIdx);
      if (!lines || !lines.size) {
        pill.textContent = '';
        pill.classList.remove('low');
        return;
      }
      let m = 0;
      let t = 0;
      lines.forEach(s => { m += s.matched; t += s.total; });
      const pct = Math.round((100 * m) / Math.max(1, t));
      pill.textContent = `${pct >= 70 ? '✓' : '•'} ${pct}%`;
      pill.classList.toggle('low', pct < 70);
    });
  }

  // ==================== Tap Sync Engine ====================

  handleTapAdvance() {
    getSharedAudioContext();
    this.playDivineChime();

    if (navigator.vibrate) {
      try { navigator.vibrate(25); } catch (e) {}
    }
    this.stepWord();
  }

  /** The glowing word has been chanted: mark it and move to the next one. */
  stepWord() {
    const v = this.currentVerseIndex;
    const l = this.currentLineIndex;
    const tokens = this.lineTokenIndices(v, l);
    const el = this.wordEl(v, l, tokens[this.currentWordIndex]);
    if (el) el.classList.add('passed');

    this.currentWordIndex++;
    if (this.currentWordIndex >= tokens.length) {
      this.advanceLine();
    } else {
      this.highlightActiveWord(v, l, tokens[this.currentWordIndex]);
    }
  }

  advanceLine() {
    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    if (this.currentLineIndex + 1 < verseObj.lines.length) {
      this.currentLineIndex++;
      this.currentWordIndex = 0;
      this.clearLineMarks(this.currentVerseIndex, this.currentLineIndex);
      this.highlightActiveWord(this.currentVerseIndex, this.currentLineIndex,
        this.lineTokenIndices(this.currentVerseIndex, this.currentLineIndex)[0] || 0);
    } else if (this.currentVerseIndex < this.totalVerses - 1) {
      this.jumpToVerse(this.currentVerseIndex + 1);
    } else {
      this.completeRecitation();
    }
  }

  playDivineChime() {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1056, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  playSacredVictoryChime() {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;

      [528, 660, 792, 1056].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    } catch (e) {}
  }

  // ==================== UI & Preferences ====================

  updateStatsDisplay() {
    this.els.chantCountDisplay.textContent = this.chantCount;
    this.els.statGoalTag.textContent = `/ ${this.sankalpaGoal}x`;
    this.applyJapCounter();

    const progressPct = Math.min(100, Math.round((this.chantCount / this.sankalpaGoal) * 100));
    this.els.sankalpaProgressFill.style.width = `${progressPct}%`;

    if (this.isVoiceListening && this.voice.engine === 'rhythm') {
      this.els.accuracyDisplay.textContent = '--%';
      this.els.sacredTierBadge.textContent = 'Rhythm mode';
    } else if (this.accuracy.total > 0) {
      const pct = Math.round((100 * this.accuracy.matched) / this.accuracy.total);
      this.els.accuracyDisplay.textContent = `${pct}%`;
      // Tiers as documented in README.md
      if (pct >= 95) {
        this.els.sacredTierBadge.textContent = 'Divya ★★★';
      } else if (pct >= 85) {
        this.els.sacredTierBadge.textContent = 'Uttam ★★';
      } else if (pct >= 70) {
        this.els.sacredTierBadge.textContent = 'Shreshtha ★';
      } else {
        this.els.sacredTierBadge.textContent = 'Sadhak';
      }
    } else {
      this.els.accuracyDisplay.textContent = '--%';
      this.els.sacredTierBadge.textContent = 'Chant to score';
    }

    this.els.paceDisplay.textContent = `${this.playbackSpeed}x`;
  }

  async updateWakeLock() {
    // While listening the screen must stay on whatever the setting: when it
    // turns off, Android pauses the app and the microphone stops.
    const want = document.visibilityState === 'visible' &&
      (this.isVoiceListening || (this.keepAwake && (this.isAudioPlaying || this.currentMode === 'tap')));
    const plugin = nativeSpeechPlugin();
    if (plugin && typeof plugin.keepAwake === 'function') {
      // Android WebView has no Wake Lock API; the app's plugin sets FLAG_KEEP_SCREEN_ON.
      if (this.nativeAwake !== want) {
        this.nativeAwake = want;
        settle(() => plugin.keepAwake({ on: want }));
      }
      return;
    }
    if (!('wakeLock' in navigator) || this.wakeLockBusy) return;
    this.wakeLockBusy = true;
    try {
      if (want && !this.wakeLock) {
        const lock = await navigator.wakeLock.request('screen');
        this.wakeLock = lock;
        lock.addEventListener('release', () => {
          if (this.wakeLock === lock) this.wakeLock = null;
        });
      } else if (!want && this.wakeLock) {
        const lock = this.wakeLock;
        this.wakeLock = null;
        await lock.release();
      }
    } catch (e) {
      this.wakeLock = null;
    } finally {
      this.wakeLockBusy = false;
    }
  }

  showToast(message, action = null) {
    if (!this.toastEl) {
      const el = document.createElement('div');
      el.className = 'app-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      const text = document.createElement('span');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.hidden = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const run = this.toastAction;
        this.toastAction = null;
        this.toastEl.classList.remove('show');
        if (run) run();
      });
      el.appendChild(text);
      el.appendChild(btn);
      document.body.appendChild(el);
      this.toastEl = el;
      this.toastText = text;
      this.toastBtn = btn;
    }
    this.toastText.textContent = message;
    this.toastAction = action ? action.run : null;
    this.toastBtn.hidden = !action;
    if (action) this.toastBtn.textContent = action.label;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.classList.remove('show'); this.toastAction = null; }, action ? 6000 : 4500);
  }

  /** Microphones for the Settings list (names are known once the mic was allowed). */
  async refreshMicrophones() {
    const sel = this.els.micSelect;
    if (!sel || !(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)) return;
    let devices = [];
    try { devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); } catch (e) { devices = []; }
    while (sel.options.length > 1) sel.remove(1);
    devices.forEach((d, i) => {
      if (!d.deviceId || d.deviceId === 'default' || d.deviceId === 'communications') return;
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `Microphone ${i + 1}`;
      sel.appendChild(o);
    });
    sel.value = [...sel.options].some(o => o.value === this.micDeviceId) ? this.micDeviceId : '';
  }

  applyTheme() {
    document.body.setAttribute('data-theme', this.theme);
    // Android: status-bar icons must contrast with the app's theme, not the phone's.
    const cap = window.Capacitor;
    const bars = isNativeApp() && cap.Plugins && cap.Plugins.SystemBars;
    if (bars && typeof bars.setStyle === 'function') {
      settle(() => bars.setStyle({ style: this.theme === 'dark' ? 'DARK' : 'LIGHT' }));
    }
  }

  /** The title in the script being read. */
  applyBrandTitle() {
    const titles = {
      hi: ['श्री हनुमान चालीसा', 'गोस्वामी तुलसीदास'],
      bn: ['শ্রী হনুমান চালিসা', 'গোস্বামী তুলসীদাস'],
      en: ['Shri Hanuman Chalisa', 'Goswami Tulsidas']
    };
    const [title, sub] = titles[this.scriptLang] || titles.hi;
    const t = document.getElementById('brandTitle');
    const s = document.getElementById('brandSub');
    if (t) { t.textContent = title; t.setAttribute('lang', this.scriptLang); }
    if (s) { s.textContent = sub; s.setAttribute('lang', this.scriptLang); }
  }

  applyFontSize() {
    const sizes = ['1.1rem', '1.25rem', '1.45rem'];
    const labels = ['Small', 'Medium', 'Large'];
    const size = sizes[this.fontSizeLevel] || '1.25rem';
    document.documentElement.style.setProperty('--verse-font-size', size);
    this.els.fontSizeLabel.textContent = labels[this.fontSizeLevel] || 'Medium';
  }

  adjustFontSize(delta) {
    this.fontSizeLevel = Math.max(0, Math.min(2, this.fontSizeLevel + delta));
    safeStorage.set('chalisa_font_size', this.fontSizeLevel.toString());
    this.applyFontSize();
  }
}

// Instantiate Engine on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.chalisaApp = new HanumanChalisaEngine();
});
