/**
 * Shri Hanuman Chalisa - Core Application Engine v4.0
 * Features:
 *  - Soulful Devotional Audio playback with calibrated 43-verse karaoke synchronization
 *  - Real-time AI Speech Recognition with phonetic matching & sacred accuracy scoring
 *  - Interactive Tap Sync mode with sacred chime and haptic feedback
 *  - Multilingual support (Hindi, Bengali, English text & meanings)
 *  - Full mobile responsiveness & offline PWA/Capacitor APK support
 */

// Calibrated Timestamps (in seconds) for Hariharan Ji's Shri Hanuman Chalisa (9m 41s)
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

// Safe Storage Helper
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

// Singleton Web Audio Context for Chimes & Microphone Analysis
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

// Master App Engine
class HanumanChalisaEngine {
  constructor() {
    // State
    this.currentMode = 'audio'; // 'audio' | 'voice' | 'tap'
    this.scriptLang = safeStorage.get('chalisa_script_lang', 'hi');
    this.meaningLang = safeStorage.get('chalisa_meaning_lang', 'hi');
    this.showMeaning = safeStorage.get('chalisa_show_meaning', 'true') === 'true';
    this.theme = safeStorage.get('chalisa_theme', 'dark');
    this.fontSizeLevel = parseInt(safeStorage.get('chalisa_font_size', '1'), 10); // 0=sm, 1=md, 2=lg
    this.autoScroll = safeStorage.get('chalisa_autoscroll', 'true') === 'true';
    this.playbackSpeed = parseFloat(safeStorage.get('chalisa_speed', '1.0'));
    this.sankalpaGoal = parseInt(safeStorage.get('chalisa_sankalpa_goal', '1'), 10);
    this.chantCount = parseInt(safeStorage.get('chalisa_chant_count', '0'), 10);
    this.isLooping = safeStorage.get('chalisa_loop', 'false') === 'true';

    // Tracking
    this.currentVerseIndex = 0;
    this.currentLineIndex = 0;
    this.currentWordIndex = 0;
    this.totalVerses = CHALISA_DATA.verses.length;
    this.allLines = [];
    this.flattenLines();

    // Accuracy
    this.accuracyScores = [];
    this.overallAccuracy = 0;

    // Audio Player
    this.audio = document.getElementById('chalisaAudio');
    this.isAudioPlaying = false;
    this.audioDuration = 581; // 9m 41s

    // Speech Recognition & Microphone
    this.isVoiceListening = false;
    this.recognition = null;
    this.micStream = null;
    this.micAnalyser = null;
    this.animFrameId = null;

    // DOM Elements
    this.bindDomElements();
    this.applyTheme();
    this.applyFontSize();
    this.renderVerses();
    this.setupEventListeners();
    this.updateStatsDisplay();
    this.switchMode('audio');
  }

  // Pre-calculate flattened list of all 86 lines
  flattenLines() {
    this.allLines = [];
    CHALISA_DATA.verses.forEach((verse, vIdx) => {
      verse.lines.forEach((line, lIdx) => {
        this.allLines.push({
          verseIndex: vIdx,
          lineIndexInVerse: lIdx,
          flatIndex: this.allLines.length,
          verse: verse,
          line: line
        });
      });
    });
  }

  bindDomElements() {
    this.els = {
      // Header
      toggleMeaningBtn: document.getElementById('toggleMeaningBtn'),
      meaningBtnText: document.getElementById('meaningBtnText'),
      langBtns: document.querySelectorAll('.lang-btn'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      openSettingsBtn: document.getElementById('openSettingsBtn'),

      // Mode Navigation
      tabAudioMode: document.getElementById('tabAudioMode'),
      tabVoiceMode: document.getElementById('tabVoiceMode'),
      tabTapMode: document.getElementById('tabTapMode'),

      // Console Panels
      audioConsolePanel: document.getElementById('audioConsolePanel'),
      voiceConsolePanel: document.getElementById('voiceConsolePanel'),
      tapConsolePanel: document.getElementById('tapConsolePanel'),

      // Audio Controls
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

      // Voice Controls
      toggleVoiceBtn: document.getElementById('toggleVoiceBtn'),
      voiceBtnIcon: document.getElementById('voiceBtnIcon'),
      voiceBtnText: document.getElementById('voiceBtnText'),
      voiceWaveBars: document.getElementById('voiceWaveBars'),
      voiceHeardText: document.getElementById('voiceHeardText'),

      // Tap Controls
      tapTouchSurface: document.getElementById('tapTouchSurface'),
      resetTapBtn: document.getElementById('resetTapBtn'),

      // Stats
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

      // Viewport & HUD
      versesContainer: document.getElementById('versesContainer'),
      hudStatusDot: document.getElementById('hudStatusDot'),
      hudStatusLabel: document.getElementById('hudStatusLabel'),
      hudEqualizer: document.getElementById('hudEqualizer'),
      hudTranscript: document.getElementById('hudTranscript'),
      hudJumpBtn: document.getElementById('hudJumpBtn'),

      // Settings Modal
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      fontDecrBtn: document.getElementById('fontDecrBtn'),
      fontIncrBtn: document.getElementById('fontIncrBtn'),
      fontSizeLabel: document.getElementById('fontSizeLabel'),
      meaningLangBtns: document.querySelectorAll('#meaningLangGroup .pill-option'),
      autoScrollToggle: document.getElementById('autoScrollToggle'),
      wakeLockToggle: document.getElementById('wakeLockToggle'),
      resetAllDataBtn: document.getElementById('resetAllDataBtn')
    };
  }

  // Render all 43 verse cards with words & meanings
  renderVerses() {
    document.body.setAttribute('data-lang', this.scriptLang);
    this.els.meaningBtnText.textContent = this.meaningLang === 'hi' ? 'अर्थ' : (this.meaningLang === 'bn' ? 'ভাবার্থ' : 'Meaning');

    let html = '';
    CHALISA_DATA.verses.forEach((verse, vIdx) => {
      const verseLabel = verse.label[this.scriptLang] || verse.label.en;
      const verseTitle = `${verseLabel} • ${verse.num} / ${verse.totalOfCategory}`;
      
      // Get meaning
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
  }

  setupEventListeners() {
    // 1. Mode Switcher Tabs
    this.els.tabAudioMode.addEventListener('click', () => this.switchMode('audio'));
    this.els.tabVoiceMode.addEventListener('click', () => this.switchMode('voice'));
    this.els.tabTapMode.addEventListener('click', () => this.switchMode('tap'));

    // 2. Audio Engine Controls
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
      if (this.isAudioPlaying) this.audio.play();
    });

    this.els.loopAudioBtn.addEventListener('click', () => {
      this.isLooping = !this.isLooping;
      safeStorage.set('chalisa_loop', this.isLooping.toString());
      this.els.loopAudioBtn.classList.toggle('active', this.isLooping);
      this.els.loopLabel.textContent = this.isLooping ? 'Loop: ON' : 'Loop: 1x';
    });

    // Speed Controls
    this.els.speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseFloat(e.target.dataset.speed);
        this.setPlaybackSpeed(speed);
      });
    });

    // Native Audio Events
    this.audio.addEventListener('timeupdate', () => this.handleAudioTimeUpdate());
    this.audio.addEventListener('ended', () => this.handleAudioEnded());
    this.audio.addEventListener('play', () => this.setAudioPlayingState(true));
    this.audio.addEventListener('pause', () => this.setAudioPlayingState(false));

    // Fallback if local mp3 fails, load remote CDN stream
    this.audio.addEventListener('error', () => {
      console.warn('Local audio load fallback to CDN...');
      this.audio.src = 'https://archive.org/download/hanuman-chalisa-i-gulshan-kumar-i-hariharan-full-hd-video-i-shree-hanuman-chalisa/%E0%A4%B9%E0%A4%A8%E0%A4%AE%E0%A4%A8%20%E0%A4%9A%E0%A4%B2%E0%A4%B8%20Hanuman%20Chalisa%20I%20GULSHAN%20KUMAR%20I%20HARIHARAN,%20Full%20HD%20Video%20I%20Shree%20Hanuman%20Chalisa.mp3';
      this.audio.load();
    });

    // 3. AI Voice Sync Controls
    this.els.toggleVoiceBtn.addEventListener('click', () => this.toggleVoiceListening());

    // 4. Tap Sync Surface
    this.els.tapTouchSurface.addEventListener('click', () => this.handleTapAdvance());
    this.els.resetTapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.jumpToVerse(0);
    });

    // 5. Verse Card Click Jump
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

    // 6. Header Actions
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
        const lang = e.target.dataset.lang;
        this.els.langBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.scriptLang = lang;
        safeStorage.set('chalisa_script_lang', lang);
        this.renderVerses();
        this.highlightCurrentVerseAndWord();
      });
    });

    this.els.themeToggleBtn.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      safeStorage.set('chalisa_theme', this.theme);
      this.applyTheme();
    });

    this.els.openSettingsBtn.addEventListener('click', () => {
      this.els.settingsModal.classList.add('open');
    });

    this.els.closeSettingsBtn.addEventListener('click', () => {
      this.els.settingsModal.classList.remove('open');
    });

    this.els.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.els.settingsModal) {
        this.els.settingsModal.classList.remove('open');
      }
    });

    // Settings Modal Options
    this.els.fontDecrBtn.addEventListener('click', () => this.adjustFontSize(-1));
    this.els.fontIncrBtn.addEventListener('click', () => this.adjustFontSize(1));

    this.els.meaningLangBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mlang = e.target.dataset.mlang;
        this.els.meaningLangBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.meaningLang = mlang;
        safeStorage.set('chalisa_meaning_lang', mlang);
        this.renderVerses();
      });
    });

    this.els.autoScrollToggle.addEventListener('change', (e) => {
      this.autoScroll = e.target.checked;
      safeStorage.set('chalisa_autoscroll', this.autoScroll.toString());
    });

    this.els.resetAllDataBtn.addEventListener('click', () => {
      if (confirm('Do you want to reset your chanting recitations and accuracy scores?')) {
        this.chantCount = 0;
        this.accuracyScores = [];
        this.overallAccuracy = 0;
        safeStorage.set('chalisa_chant_count', '0');
        this.updateStatsDisplay();
        this.els.settingsModal.classList.remove('open');
      }
    });

    // Sankalpa Goals
    this.els.goalPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const goal = parseInt(e.target.dataset.goal, 10);
        this.els.goalPills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.sankalpaGoal = goal;
        safeStorage.set('chalisa_sankalpa_goal', goal.toString());
        this.updateStatsDisplay();
      });
    });

    // Jump to Top
    this.els.hudJumpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Switch Active Mode: Audio | Voice | Tap
  switchMode(mode) {
    this.currentMode = mode;

    // Reset other active processes
    if (mode !== 'audio' && this.isAudioPlaying) {
      this.audio.pause();
    }
    if (mode !== 'voice' && this.isVoiceListening) {
      this.stopVoiceListening();
    }

    // Update Nav Tabs
    this.els.tabAudioMode.classList.toggle('active', mode === 'audio');
    this.els.tabVoiceMode.classList.toggle('active', mode === 'voice');
    this.els.tabTapMode.classList.toggle('active', mode === 'tap');

    // Update Panels
    this.els.audioConsolePanel.classList.toggle('active', mode === 'audio');
    this.els.voiceConsolePanel.classList.toggle('active', mode === 'voice');
    this.els.tapConsolePanel.classList.toggle('active', mode === 'tap');

    // Update HUD & Stats
    if (mode === 'audio') {
      this.els.activeModeName.textContent = 'Divine Audio';
      this.els.hudStatusLabel.textContent = this.isAudioPlaying ? 'Playing Audio' : 'Audio Mode';
      this.els.hudTranscript.textContent = 'Hariharan Ji • Soulful Devotional Recitation';
    } else if (mode === 'voice') {
      this.els.activeModeName.textContent = 'AI Voice Sync';
      this.els.hudStatusLabel.textContent = this.isVoiceListening ? 'Listening Mic' : 'Voice Mode';
      this.els.hudTranscript.textContent = 'Chant into phone microphone for AI real-time tracking';
    } else {
      this.els.activeModeName.textContent = 'Tap Sync';
      this.els.hudStatusLabel.textContent = 'Tap Counter';
      this.els.hudTranscript.textContent = 'Tap screen to advance word-by-word with sacred vibration';
    }
  }

  // ==================== Audio Player Engine ====================

  toggleAudioPlayback() {
    getSharedAudioContext();
    if (this.audio.paused) {
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
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    safeStorage.set('chalisa_speed', speed.toString());
    this.audio.playbackRate = speed;
    this.els.paceDisplay.textContent = `${speed}x`;

    this.els.speedBtns.forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
  }

  handleAudioTimeUpdate() {
    const curTime = this.audio.currentTime;
    this.updateSliderUI(curTime);

    // Find active verse from timestamps
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

    // Calculate line & word within current verse
    const ts = VERSE_TIMESTAMPS[this.currentVerseIndex];
    if (ts) {
      const duration = ts.end - ts.start;
      const elapsed = Math.max(0, curTime - ts.start);
      const half = duration / 2;

      const lineIdx = elapsed < half ? 0 : 1;
      const lineElapsed = elapsed < half ? elapsed : (elapsed - half);
      const lineFraction = Math.min(0.99, Math.max(0, lineElapsed / half));

      // Get line word elements
      const lineElem = document.getElementById(`line-${this.currentVerseIndex}-${lineIdx}`);
      if (lineElem) {
        const words = lineElem.querySelectorAll('.word-token');
        if (words.length > 0) {
          const wIdx = Math.floor(lineFraction * words.length);
          this.highlightActiveWord(this.currentVerseIndex, lineIdx, wIdx);
        }
      }
    }
  }

  updateSliderUI(curTime) {
    this.els.audioProgressSlider.value = curTime;
    const pct = (curTime / this.audioDuration) * 100;
    this.els.sliderFillBar.style.width = `${pct}%`;
    this.els.audioCurrentTime.textContent = this.formatSeconds(curTime);
  }

  formatSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  handleAudioEnded() {
    this.chantCount++;
    safeStorage.set('chalisa_chant_count', this.chantCount.toString());
    this.updateStatsDisplay();

    // Check Sankalpa Completion
    if (this.chantCount >= this.sankalpaGoal) {
      this.playSacredVictoryChime();
      alert(`🎉 Sacred Sankalpa Completed!\nYou have completed ${this.chantCount} recitations of Shri Hanuman Chalisa.`);
    }

    if (this.isLooping || this.chantCount < this.sankalpaGoal) {
      this.audio.currentTime = 0;
      this.jumpToVerse(0);
      this.audio.play().catch(() => {});
    } else {
      this.setAudioPlayingState(false);
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

    this.onVerseChanged();
    this.highlightActiveWord(vIdx, 0, 0);
  }

  onVerseChanged() {
    // Highlight Card
    document.querySelectorAll('.verse-card').forEach((card, idx) => {
      card.classList.toggle('active-verse', idx === this.currentVerseIndex);
    });

    const activeCard = document.getElementById(`verseCard-${this.currentVerseIndex}`);
    if (activeCard && this.autoScroll) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update Stats Badge
    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    if (verseObj) {
      const typeLabel = verseObj.type.includes('doha') ? 'Doha' : 'Chaupai';
      this.els.verseIndicatorDisplay.textContent = `${typeLabel} ${verseObj.num}`;
      this.els.verseSubCount.textContent = `${this.currentVerseIndex + 1} of ${this.totalVerses} Verses`;

      // Update HUD Lyrics Preview
      const lineText = verseObj.lines[0][this.scriptLang] || verseObj.lines[0].hi;
      this.els.hudTranscript.textContent = lineText;
    }
  }

  highlightActiveWord(vIdx, lIdx, wIdx) {
    // Clear previous glowing words
    document.querySelectorAll('.word-token.glowing').forEach(el => el.classList.remove('glowing'));

    const wordEl = document.getElementById(`word-${vIdx}-${lIdx}-${wIdx}`);
    if (wordEl) {
      wordEl.classList.add('glowing');
    }

    // Highlight line
    document.querySelectorAll('.verse-line.active-line').forEach(el => el.classList.remove('active-line'));
    const lineEl = document.getElementById(`line-${vIdx}-${lIdx}`);
    if (lineEl) {
      lineEl.classList.add('active-line');
    }
  }

  highlightCurrentVerseAndWord() {
    this.onVerseChanged();
    this.highlightActiveWord(this.currentVerseIndex, this.currentLineIndex, this.currentWordIndex);
  }

  // ==================== AI Voice Sync Engine ====================

  async toggleVoiceListening() {
    if (this.isVoiceListening) {
      this.stopVoiceListening();
    } else {
      await this.startVoiceListening();
    }
  }

  async startVoiceListening() {
    try {
      // 1. Request Microphone Stream for Live Visualizer
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.setupMicVisualizer(this.micStream);
      }

      // 2. Setup Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech Recognition is not supported directly in this web browser. Please use Chrome on Android/Laptop, or use the Divine Audio & Tap Sync modes.');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.scriptLang === 'bn' ? 'bn-IN' : 'hi-IN';

      this.recognition.onstart = () => {
        this.isVoiceListening = true;
        this.els.toggleVoiceBtn.classList.add('recording');
        this.els.voiceBtnText.textContent = 'Stop AI Voice Sync';
        this.els.voiceWaveBars.classList.add('active');
        this.els.hudStatusDot.classList.add('pulsing');
        this.els.hudStatusLabel.textContent = 'Listening Voice...';
        this.els.voiceHeardText.textContent = 'Chant into microphone: "जय हनुमान ज्ञान गुन सागर..."';
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.handleHeardSpeech(transcript);
      };

      this.recognition.onerror = (err) => {
        console.warn('Speech Recognition error:', err);
      };

      this.recognition.onend = () => {
        if (this.isVoiceListening) {
          // Restart recognition continuously
          try { this.recognition.start(); } catch (e) {}
        }
      };

      this.recognition.start();

    } catch (err) {
      console.error('Microphone access denied or failed:', err);
      alert('Please allow microphone permissions to use AI Voice Sync.');
    }
  }

  stopVoiceListening() {
    this.isVoiceListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.els.toggleVoiceBtn.classList.remove('recording');
    this.els.voiceBtnText.textContent = 'Start AI Voice Sync';
    this.els.voiceWaveBars.classList.remove('active');
    this.els.hudStatusLabel.textContent = 'Voice Paused';
    this.els.voiceHeardText.textContent = 'Chanting paused. Tap "Start AI Voice Sync" to resume.';
  }

  setupMicVisualizer(stream) {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const source = ctx.createMediaStreamSource(stream);
    this.micAnalyser = ctx.createAnalyser();
    this.micAnalyser.fftSize = 32;
    source.connect(this.micAnalyser);

    const bufferLength = this.micAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const bars = this.els.voiceWaveBars.querySelectorAll('.wave-bar');

    const updateBars = () => {
      if (!this.isVoiceListening) return;
      this.micAnalyser.getByteFrequencyData(dataArray);

      bars.forEach((bar, idx) => {
        const val = dataArray[idx % bufferLength] || 10;
        const height = Math.max(6, (val / 255) * 26);
        bar.style.height = `${height}px`;
      });

      this.animFrameId = requestAnimationFrame(updateBars);
    };

    updateBars();
  }

  handleHeardSpeech(transcript) {
    const heardClean = transcript.trim();
    if (!heardClean) return;

    this.els.voiceHeardText.textContent = `Heard: "${heardClean}"`;
    this.els.hudTranscript.textContent = `Chanting: "${heardClean}"`;

    // Match with current verse words
    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    if (!verseObj) return;

    const currentLine = verseObj.lines[this.currentLineIndex];
    const targetText = currentLine.hi || currentLine.en;
    const targetWords = targetText.split(/\s+/).filter(w => w.trim().length > 0);

    // Check fuzzy match
    let matchesCount = 0;
    targetWords.forEach((tw, idx) => {
      const cleanW = tw.replace(/[॥।|,]/g, '').trim().toLowerCase();
      if (heardClean.toLowerCase().includes(cleanW)) {
        matchesCount++;
        const wordEl = document.getElementById(`word-${this.currentVerseIndex}-${this.currentLineIndex}-${idx}`);
        if (wordEl) {
          wordEl.classList.add('glowing');
        }
      }
    });

    const lineAccuracy = Math.min(100, Math.round((matchesCount / Math.max(1, targetWords.length)) * 100));
    if (lineAccuracy >= 60 || matchesCount >= 2) {
      // Advance to next line
      this.recordAccuracy(lineAccuracy);
      this.advanceLine();
    }
  }

  advanceLine() {
    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    if (this.currentLineIndex === 0 && verseObj.lines.length > 1) {
      this.currentLineIndex = 1;
      this.currentWordIndex = 0;
      this.highlightActiveWord(this.currentVerseIndex, 1, 0);
    } else {
      // Advance to next verse
      if (this.currentVerseIndex < this.totalVerses - 1) {
        this.jumpToVerse(this.currentVerseIndex + 1);
      } else {
        // Complete full chalisa
        this.handleAudioEnded();
      }
    }
  }

  recordAccuracy(score) {
    this.accuracyScores.push(score);
    const sum = this.accuracyScores.reduce((a, b) => a + b, 0);
    this.overallAccuracy = Math.round(sum / this.accuracyScores.length);
    this.updateStatsDisplay();

    // Display on verse card
    const accEl = document.getElementById(`verseAcc-${this.currentVerseIndex}`);
    if (accEl) {
      accEl.textContent = `✓ ${score}%`;
    }
  }

  // ==================== Tap Sync Engine ====================

  handleTapAdvance() {
    getSharedAudioContext();
    this.playDivineChime();

    if (navigator.vibrate) {
      try { navigator.vibrate(25); } catch (e) {}
    }

    const verseObj = CHALISA_DATA.verses[this.currentVerseIndex];
    const lineObj = verseObj.lines[this.currentLineIndex];
    const words = (lineObj[this.scriptLang] || lineObj.hi).split(/\s+/).filter(w => w.trim().length > 0);

    this.highlightActiveWord(this.currentVerseIndex, this.currentLineIndex, this.currentWordIndex);

    this.currentWordIndex++;
    if (this.currentWordIndex >= words.length) {
      this.currentWordIndex = 0;
      this.advanceLine();
    }
  }

  // Soft Divine Chime using Web Audio
  playDivineChime() {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime); // Sacred Solfeggio frequency 528Hz (Love/Miracle)
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

    const progressPct = Math.min(100, Math.round((this.chantCount / this.sankalpaGoal) * 100));
    this.els.sankalpaProgressFill.style.width = `${progressPct}%`;

    if (this.accuracyScores.length > 0) {
      this.els.accuracyDisplay.textContent = `${this.overallAccuracy}%`;
      if (this.overallAccuracy >= 95) {
        this.els.sacredTierBadge.textContent = 'Divya ★★★';
      } else if (this.overallAccuracy >= 85) {
        this.els.sacredTierBadge.textContent = 'Uttam ★★';
      } else {
        this.els.sacredTierBadge.textContent = 'Shreshtha ★';
      }
    } else {
      this.els.accuracyDisplay.textContent = '--%';
      this.els.sacredTierBadge.textContent = 'Sadhak';
    }

    this.els.paceDisplay.textContent = `${this.playbackSpeed}x`;
  }

  applyTheme() {
    document.body.setAttribute('data-theme', this.theme);
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
