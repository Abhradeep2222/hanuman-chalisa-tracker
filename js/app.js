/**
 * Shri Hanuman Chalisa - Advanced AI Devotional Engine
 * Features:
 * 1. AI Real-Time Voice Speech Recognition with Multi-Script Phonetic Matcher
 * 2. Real-time Recitation Accuracy Scoring with Divine Tiers
 * 3. Web Audio API Live Microphone Equalizer Waveform & Divine Chime
 * 4. Devotional Audio Recitation (Listen & Learn) with Speed Controller
 * 5. Tap-to-Chant with Mobile Haptic Feedback
 * 6. Dual-Language Meaning (Bhavarth) & Font Size Resizer
 * 7. Sankalpa Mala Goal Tracker (1x, 7x, 11x, 21x, 108x)
 */

class HanumanChalisaApp {
  constructor() {
    this.lines = getFlatLines();
    this.totalLines = this.lines.length;

    // Persisted User Preferences
    this.language = localStorage.getItem('hc_lang') || 'auto';
    this.currentLineIndex = parseInt(localStorage.getItem('hc_currentLine') || '0', 10);
    if (isNaN(this.currentLineIndex) || this.currentLineIndex < 0 || this.currentLineIndex >= this.totalLines) {
      this.currentLineIndex = 0;
    }

    this.currentWordIdx = 0;
    this.chantCount = parseInt(localStorage.getItem('hc_chantCount') || '0', 10);
    this.sankalpaTarget = parseInt(localStorage.getItem('hc_sankalpa') || '1', 10);
    this.streak = parseInt(localStorage.getItem('hc_streak') || '0', 10);
    this.lastChantDate = localStorage.getItem('hc_lastChantDate') || '';
    this.theme = localStorage.getItem('hc_theme') || 'dark';
    this.fontScale = parseInt(localStorage.getItem('hc_fontScale') || '17', 10);
    this.showMeanings = localStorage.getItem('hc_showMeanings') !== 'false';
    this.recitationSpeed = 1.0;

    // Scoring & Tracking
    this.matchedWordsCount = 0;
    this.attemptedWordsCount = 0;
    this.skippedWordsCount = 0;
    this.lineAccuracies = {};

    // State Flags
    this.isListening = false;
    this.isAiChanting = false;
    this.recognition = null;
    this.speechSynth = window.speechSynthesis || null;

    // Web Audio API State
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.animFrameId = null;

    // Cache DOM Elements
    this.bindDomElements();
    this.init();
  }

  bindDomElements() {
    this.els = {
      languageSelect: document.getElementById('languageSelect'),
      themeToggle: document.getElementById('themeToggle'),
      toggleMeaningBtn: document.getElementById('toggleMeaningBtn'),
      fontDecBtn: document.getElementById('fontDecBtn'),
      fontIncBtn: document.getElementById('fontIncBtn'),
      startBtn: document.getElementById('startBtn'),
      startBtnText: document.getElementById('startBtnText'),
      aiAutoChantBtn: document.getElementById('aiAutoChantBtn'),
      aiAutoChantText: document.getElementById('aiAutoChantText'),
      tapSyncBtn: document.getElementById('tapSyncBtn'),
      resetBtn: document.getElementById('resetBtn'),
      speedToggle: document.getElementById('speedToggle'),
      chantCount: document.getElementById('chantCount'),
      targetSub: document.getElementById('targetSub'),
      accuracyScore: document.getElementById('accuracyScore'),
      accuracyBadge: document.getElementById('accuracyBadge'),
      progressDisplay: document.getElementById('progressDisplay'),
      progressCard: document.getElementById('progressCard'),
      streakCount: document.getElementById('streakCount'),
      progressBar: document.getElementById('progressBar'),
      chalisaContainer: document.getElementById('chalisaContainer'),
      transcriptText: document.getElementById('transcriptText'),
      micDot: document.getElementById('micDot'),
      micLabel: document.getElementById('micLabel'),
      audioEqualizer: document.getElementById('audioEqualizer'),
      eqBars: document.querySelectorAll('.eq-bar'),
      completionOverlay: document.getElementById('completionOverlay'),
      completionAccuracy: document.getElementById('completionAccuracy'),
      completionCount: document.getElementById('completionCount'),
      chantAgainBtn: document.getElementById('chantAgainBtn'),
      closeCompletionBtn: document.getElementById('closeCompletionBtn'),
      jumpModal: document.getElementById('jumpModal'),
      closeJumpModal: document.getElementById('closeJumpModal'),
      jumpGrid: document.getElementById('jumpGrid'),
      targetButtons: document.querySelectorAll('.target-btn')
    };
  }

  init() {
    this.applyTheme();
    this.applyFontSize();

    if (this.els.languageSelect) {
      this.els.languageSelect.value = this.language;
    }

    this.renderChalisa();
    this.buildJumpModal();
    this.updateStatsDisplay();
    this.calculateStreak();
    this.setupEventListeners();

    // Mark active target
    this.els.targetButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.target, 10) === this.sankalpaTarget);
    });
    this.updateTargetDisplay();

    requestAnimationFrame(() => this.highlightCurrentLine(false));
  }

  setupEventListeners() {
    // 1. Microphone Voice Mode
    if (this.els.startBtn) {
      this.els.startBtn.addEventListener('click', () => this.toggleListening());
    }

    // 2. Audio Recitation Mode
    if (this.els.aiAutoChantBtn) {
      this.els.aiAutoChantBtn.addEventListener('click', () => this.toggleAiRecitation());
    }

    // 3. Tap to Sync (Tactile Word Advance)
    if (this.els.tapSyncBtn) {
      this.els.tapSyncBtn.addEventListener('click', () => this.advanceWordOrLine());
    }

    // Spacebar to advance
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target === document.body || e.target.tagName !== 'INPUT')) {
        e.preventDefault();
        this.advanceWordOrLine();
      }
    });

    // Reset Session
    if (this.els.resetBtn) {
      this.els.resetBtn.addEventListener('click', () => this.resetSession());
    }

    // Language Dropdown
    if (this.els.languageSelect) {
      this.els.languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    }

    // Theme Toggle
    if (this.els.themeToggle) {
      this.els.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Meaning Toggle Button
    if (this.els.toggleMeaningBtn) {
      this.els.toggleMeaningBtn.addEventListener('click', () => this.toggleMeanings());
    }

    // Font Size Buttons
    if (this.els.fontDecBtn) {
      this.els.fontDecBtn.addEventListener('click', () => this.changeFontSize(-1));
    }
    if (this.els.fontIncBtn) {
      this.els.fontIncBtn.addEventListener('click', () => this.changeFontSize(1));
    }

    // Speed Selector
    if (this.els.speedToggle) {
      this.els.speedToggle.addEventListener('click', (e) => {
        const pill = e.target.closest('.speed-pill');
        if (!pill) return;
        this.els.speedToggle.querySelectorAll('.speed-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.recitationSpeed = parseFloat(pill.dataset.speed) || 1.0;
        if (this.isAiChanting) {
          this.stopAiRecitation();
          this.startAiRecitation();
        }
      });
    }

    // Sankalpa Target Buttons
    this.els.targetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.els.targetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sankalpaTarget = parseInt(btn.dataset.target, 10) || 1;
        localStorage.setItem('hc_sankalpa', String(this.sankalpaTarget));
        this.updateTargetDisplay();
      });
    });

    // Navigation & Completion Modals
    if (this.els.progressCard) {
      this.els.progressCard.addEventListener('click', () => this.openJumpModal());
    }
    if (this.els.closeJumpModal) {
      this.els.closeJumpModal.addEventListener('click', () => this.closeJumpModal());
    }
    if (this.els.jumpModal) {
      this.els.jumpModal.addEventListener('click', (e) => {
        if (e.target === this.els.jumpModal) this.closeJumpModal();
      });
    }
    if (this.els.chantAgainBtn) {
      this.els.chantAgainBtn.addEventListener('click', () => {
        this.els.completionOverlay.classList.remove('open');
        this.resetSession();
        this.startListening();
      });
    }
    if (this.els.closeCompletionBtn) {
      this.els.closeCompletionBtn.addEventListener('click', () => {
        this.els.completionOverlay.classList.remove('open');
      });
    }
  }

  // ==================== Themes & Styling ====================

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hc_theme', this.theme);
    this.applyTheme();
  }

  applyFontSize() {
    document.documentElement.style.setProperty('--line-font-size', `${this.fontScale}px`);
  }

  changeFontSize(delta) {
    this.fontScale = Math.min(24, Math.max(13, this.fontScale + delta));
    localStorage.setItem('hc_fontScale', String(this.fontScale));
    this.applyFontSize();
  }

  toggleMeanings() {
    this.showMeanings = !this.showMeanings;
    localStorage.setItem('hc_showMeanings', String(this.showMeanings));
    document.querySelectorAll('.verse-meaning').forEach(el => {
      el.style.display = this.showMeanings ? 'block' : 'none';
    });
    if (this.els.toggleMeaningBtn) {
      this.els.toggleMeaningBtn.classList.toggle('active', this.showMeanings);
    }
  }

  changeLanguage(lang) {
    this.language = lang;
    localStorage.setItem('hc_lang', lang);
    this.renderChalisa();
    this.highlightCurrentLine(false);

    if (this.isListening) {
      this.stopListening();
      setTimeout(() => this.startListening(), 250);
    }
  }

  // ==================== Render Sanctuary ====================

  renderChalisa() {
    const container = this.els.chalisaContainer;
    const displayLang = this.language === 'auto' ? 'en' : this.language;
    const fragment = document.createDocumentFragment();

    let currentVerseKey = '';
    let currentBlock = null;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const verseKey = `${line.verseType}-${line.verseNum}`;

      if (verseKey !== currentVerseKey) {
        currentVerseKey = verseKey;
        currentBlock = document.createElement('div');
        currentBlock.className = 'verse-card';
        currentBlock.dataset.verseKey = verseKey;

        // Verse Header Label
        const headerDiv = document.createElement('div');
        headerDiv.className = 'verse-header';

        const label = document.createElement('span');
        label.className = 'verse-tag';

        let labelText = line.verseLabel.en;
        if (displayLang === 'hi') labelText = line.verseLabel.hi;
        if (displayLang === 'bn') labelText = line.verseLabel.bn;

        let countSuffix = '';
        if (line.verseType === 'chaupai') {
          countSuffix = ` • ${line.verseNum} / 40`;
        } else if (line.verseType === 'doha-start') {
          countSuffix = ` • ${line.verseNum} / 2`;
        }

        label.textContent = `${labelText}${countSuffix}`;
        headerDiv.appendChild(label);
        currentBlock.appendChild(headerDiv);

        fragment.appendChild(currentBlock);
      }

      // Line Row
      const lineEl = document.createElement('div');
      const isPast = i < this.currentLineIndex;
      const isCur = i === this.currentLineIndex;
      lineEl.className = 'chalisa-line-row ' + (isPast ? 'matched' : (isCur ? 'current' : 'upcoming'));
      lineEl.dataset.lineIndex = i;
      lineEl.id = `line-${i}`;

      lineEl.addEventListener('click', (e) => {
        // If clicking a word directly
        const wordEl = e.target.closest('.word-unit');
        if (wordEl) {
          const wIdx = parseInt(wordEl.dataset.wordIdx, 10);
          this.jumpToWord(i, wIdx);
        } else {
          this.jumpToLine(i);
        }
      });

      const textEl = document.createElement('span');
      const fontClass = displayLang === 'hi' ? 'devanagari' : (displayLang === 'bn' ? 'bengali' : '');
      textEl.className = `line-content ${fontClass}`;

      // Render tokens
      const tokens = line.wordTokens;
      textEl.innerHTML = tokens.map((token, wIdx) => {
        let wordDisplay = token.en;
        if (displayLang === 'hi') wordDisplay = token.hi;
        if (displayLang === 'bn') wordDisplay = token.bn;

        const isChanted = isPast || (isCur && wIdx < this.currentWordIdx);
        return `<span class="word-unit ${isChanted ? 'chanted' : ''}" data-word-idx="${wIdx}" data-line-idx="${i}">${wordDisplay}</span>`;
      }).join(' ');

      lineEl.appendChild(textEl);

      // Line status chip
      const chip = document.createElement('span');
      chip.className = 'line-status-chip';
      if (isPast) {
        chip.textContent = '✓ 100%';
        chip.classList.add('done');
      }
      lineEl.appendChild(chip);

      currentBlock.appendChild(lineEl);

      // If last line of this verse, append Meaning
      if (line.lineInVerse === 2 && line.meaning) {
        const meaningDiv = document.createElement('div');
        meaningDiv.className = 'verse-meaning';
        meaningDiv.style.display = this.showMeanings ? 'block' : 'none';

        const hiText = line.meaning.hi;
        const enText = line.meaning.en;

        meaningDiv.innerHTML = `
          <div class="meaning-hi"><strong>अर्थ:</strong> ${hiText}</div>
          <div class="meaning-en"><strong>Meaning:</strong> ${enText}</div>
        `;
        currentBlock.appendChild(meaningDiv);
      }
    }

    container.innerHTML = '';
    container.appendChild(fragment);
    this.updateProgress();
  }

  // ==================== Navigation & Jump ====================

  buildJumpModal() {
    if (!this.els.jumpGrid) return;
    const fragment = document.createDocumentFragment();

    CHALISA_DATA.verses.forEach((verse, vIdx) => {
      const btn = document.createElement('button');
      btn.className = 'verse-jump-btn';

      let title = '';
      if (verse.type === 'chaupai') {
        title = `Chaupai ${verse.num}`;
      } else if (verse.type === 'doha-start') {
        title = `Doha ${verse.num}`;
      } else {
        title = `Closing Doha`;
      }

      btn.innerHTML = `<span>${title}</span>`;
      btn.addEventListener('click', () => {
        const targetLine = this.lines.findIndex(l => l.verseIndex === vIdx + 1);
        if (targetLine !== -1) {
          this.jumpToLine(targetLine);
        }
        this.closeJumpModal();
      });

      fragment.appendChild(btn);
    });

    this.els.jumpGrid.innerHTML = '';
    this.els.jumpGrid.appendChild(fragment);
  }

  openJumpModal() {
    if (this.els.jumpModal) {
      this.els.jumpModal.classList.add('open');
      const curLine = this.lines[this.currentLineIndex];
      if (curLine) {
        const buttons = this.els.jumpGrid.querySelectorAll('.verse-jump-btn');
        buttons.forEach((btn, idx) => {
          btn.classList.toggle('active', idx + 1 === curLine.verseIndex);
        });
      }
    }
  }

  closeJumpModal() {
    if (this.els.jumpModal) this.els.jumpModal.classList.remove('open');
  }

  jumpToLine(index) {
    if (index < 0 || index >= this.totalLines) return;
    this.currentLineIndex = index;
    this.currentWordIdx = 0;
    localStorage.setItem('hc_currentLine', String(this.currentLineIndex));

    for (let i = 0; i < this.totalLines; i++) {
      const el = document.getElementById(`line-${i}`);
      if (el) {
        el.className = 'chalisa-line-row ' + (i < this.currentLineIndex ? 'matched' : (i === this.currentLineIndex ? 'current' : 'upcoming'));
        const chip = el.querySelector('.line-status-chip');
        if (i < this.currentLineIndex) {
          if (chip) { chip.textContent = '✓ 100%'; chip.classList.add('done'); }
          el.querySelectorAll('.word-unit').forEach(w => w.classList.add('chanted'));
        } else if (i === this.currentLineIndex) {
          if (chip) { chip.textContent = ''; chip.classList.remove('done'); }
          el.querySelectorAll('.word-unit').forEach(w => w.classList.remove('chanted'));
        } else {
          if (chip) { chip.textContent = ''; chip.classList.remove('done'); }
          el.querySelectorAll('.word-unit').forEach(w => w.classList.remove('chanted'));
        }
      }
    }

    this.highlightCurrentLine(true);
    this.updateProgress();
  }

  jumpToWord(lineIdx, wordIdx) {
    if (lineIdx !== this.currentLineIndex) {
      this.jumpToLine(lineIdx);
    }
    this.currentWordIdx = wordIdx;
    const lineEl = document.getElementById(`line-${lineIdx}`);
    if (lineEl) {
      lineEl.querySelectorAll('.word-unit').forEach((w, idx) => {
        w.classList.toggle('chanted', idx < wordIdx);
      });
    }
  }

  // ==================== MODE 1: AI Speech Recognition ====================

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use "Tap Sync" or "Listen & Learn".');
      return;
    }

    if (this.isAiChanting) {
      this.stopAiRecitation();
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 2;

    // Set acoustic model
    this.recognition.lang = this.language === 'bn' ? 'bn-IN' : 'hi-IN';

    this.recognition.onstart = () => {
      this.els.micDot.classList.add('live');
      this.els.micLabel.textContent = 'Mic Active';
      this.els.transcriptText.textContent = 'Chant aloud into your microphone...';
      this.startAudioVisualizer();
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text + ' ';
        else interim += text + ' ';
      }

      const heard = (final || interim).trim();
      if (heard) {
        this.els.transcriptText.textContent = `Heard: "${heard}"`;
        this.matchSpokenSpeech(heard);
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        // Keep listening quietly without disturbing UI
        return;
      }
      console.warn('Speech recognition status:', e.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        setTimeout(() => {
          if (this.isListening && this.recognition) {
            try { this.recognition.start(); } catch (err) {}
          }
        }, 120);
      }
    };

    this.isListening = true;
    this.els.startBtn.classList.add('listening');
    this.els.startBtnText.textContent = 'Stop Voice';

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }

    this.highlightCurrentLine(true);
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }

    this.stopAudioVisualizer();

    this.els.startBtn.classList.remove('listening');
    this.els.startBtnText.textContent = 'AI Voice Sync';
    this.els.micDot.classList.remove('live');
    this.els.micLabel.textContent = 'Ready to Chant';
  }

  // ==================== Live Web Audio Equalizer ====================

  startAudioVisualizer() {
    if (this.audioCtx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        this.micStream = stream;
        const source = this.audioCtx.createMediaStreamSource(stream);
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const drawBars = () => {
          if (!this.isListening) return;
          this.analyser.getByteFrequencyData(dataArray);

          if (this.els.eqBars && this.els.eqBars.length > 0) {
            for (let b = 0; b < this.els.eqBars.length; b++) {
              const val = dataArray[b * 2] || 0;
              const height = Math.max(4, Math.round((val / 255) * 22));
              this.els.eqBars[b].style.height = `${height}px`;
            }
          }
          this.animFrameId = requestAnimationFrame(drawBars);
        };
        drawBars();
      }).catch(err => {
        console.log('Visualizer audio capture fallback:', err);
      });
    } catch (e) {}
  }

  stopAudioVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    if (this.els.eqBars) {
      this.els.eqBars.forEach(b => b.style.height = '4px');
    }
  }

  // ==================== Multi-Script Phonetic Matcher ====================

  matchSpokenSpeech(spokenString) {
    if (this.currentLineIndex >= this.totalLines) return;

    const currentLine = this.lines[this.currentLineIndex];
    const targetTokens = currentLine.wordTokens;

    // Tokenize spoken input
    const spokenWords = spokenString.trim().split(/\s+/).map(w => {
      return {
        raw: w.toLowerCase(),
        phonetic: scriptToPhonetic(w),
        skeleton: phoneticSkeleton(w)
      };
    });

    let matchedAny = false;

    for (const sw of spokenWords) {
      // Look ahead up to 2 words from currentWordIdx
      for (let tIdx = this.currentWordIdx; tIdx < Math.min(this.currentWordIdx + 3, targetTokens.length); tIdx++) {
        const target = targetTokens[tIdx];

        const isExact = (sw.raw === target.en.toLowerCase()) || 
                        (sw.raw === target.hi.toLowerCase()) ||
                        (sw.raw === target.bn.toLowerCase());

        const isSkeleton = sw.skeleton.length >= 2 && target.skeleton.length >= 2 &&
                           ((sw.skeleton === target.skeleton) || 
                            sw.skeleton.includes(target.skeleton) || 
                            target.skeleton.includes(sw.skeleton));

        const isPhonetic = sw.phonetic.length >= 3 && target.phonetic.length >= 3 &&
                           (sw.phonetic.includes(target.phonetic) || target.phonetic.includes(sw.phonetic));

        if (isExact || isSkeleton || isPhonetic) {
          // Highlight all words up to this index
          for (let k = this.currentWordIdx; k <= tIdx; k++) {
            this.highlightWord(this.currentLineIndex, k);
            this.matchedWordsCount++;
            this.attemptedWordsCount++;
          }
          this.currentWordIdx = tIdx + 1;
          matchedAny = true;

          const displayWord = this.language === 'hi' ? target.hi : (this.language === 'bn' ? target.bn : target.en);
          this.els.transcriptText.textContent = `✓ Chanted: "${displayWord}" (${this.currentWordIdx}/${targetTokens.length})`;
          break;
        }
      }
    }

    if (matchedAny) {
      this.calculateAccuracy();
    }

    // Line completion condition: reached end of words or chanted at least 75%
    if (this.currentWordIdx >= targetTokens.length || (targetTokens.length >= 4 && this.currentWordIdx >= Math.ceil(targetTokens.length * 0.75))) {
      this.completeCurrentLine();
    }
  }

  // ==================== MODE 2: Devotional Audio Recitation (Listen & Learn) ====================

  toggleAiRecitation() {
    if (this.isAiChanting) {
      this.stopAiRecitation();
    } else {
      this.startAiRecitation();
    }
  }

  startAiRecitation() {
    if (!this.speechSynth) {
      alert('Speech audio is not available in your browser.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isAiChanting = true;
    this.els.aiAutoChantBtn.classList.add('active');
    this.els.aiAutoChantText.textContent = 'Pause Chant';
    this.els.micDot.classList.add('live');
    this.els.micLabel.textContent = 'Audio Reciting';

    this.reciteCurrentLineAudio();
  }

  stopAiRecitation() {
    this.isAiChanting = false;
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }

    this.els.aiAutoChantBtn.classList.remove('active');
    this.els.aiAutoChantText.textContent = 'Listen & Learn';
    this.els.micDot.classList.remove('live');
    this.els.micLabel.textContent = 'Ready to Chant';
  }

  reciteCurrentLineAudio() {
    if (!this.isAiChanting || this.currentLineIndex >= this.totalLines) {
      if (this.currentLineIndex >= this.totalLines) this.handleCompletion();
      this.stopAiRecitation();
      return;
    }

    const line = this.lines[this.currentLineIndex];
    const displayLang = this.language === 'auto' ? 'en' : this.language;
    const vocalText = displayLang === 'bn' ? line.bn : line.hi;
    const tokens = line.wordTokens;

    this.speechSynth.cancel();
    const utter = new SpeechSynthesisUtterance(vocalText);
    utter.rate = this.recitationSpeed * 0.82;
    utter.pitch = 1.0;
    utter.lang = displayLang === 'bn' ? 'bn-IN' : 'hi-IN';

    this.els.transcriptText.textContent = `🎵 AI: "${vocalText}"`;

    let wIdx = 0;
    utter.onboundary = (e) => {
      if (e.name === 'word' && wIdx < tokens.length) {
        this.highlightWord(this.currentLineIndex, wIdx);
        wIdx++;
        this.matchedWordsCount++;
        this.attemptedWordsCount++;
        this.calculateAccuracy();
      }
    };

    utter.onend = () => {
      if (!this.isAiChanting) return;
      this.completeCurrentLine();
      setTimeout(() => {
        if (this.isAiChanting) this.reciteCurrentLineAudio();
      }, 300);
    };

    utter.onerror = () => {
      this.stopAiRecitation();
    };

    this.speechSynth.speak(utter);
  }

  // ==================== MODE 3: Tap-to-Chant (Zero Lag Touch / Mala) ====================

  advanceWordOrLine() {
    if (this.currentLineIndex >= this.totalLines) return;

    // Mobile haptic vibration
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    const line = this.lines[this.currentLineIndex];
    const tokens = line.wordTokens;

    if (this.currentWordIdx < tokens.length) {
      this.highlightWord(this.currentLineIndex, this.currentWordIdx);
      this.currentWordIdx++;
      this.matchedWordsCount++;
      this.attemptedWordsCount++;
      this.calculateAccuracy();

      const lastWord = tokens[this.currentWordIdx - 1];
      const displayWord = this.language === 'hi' ? lastWord.hi : (this.language === 'bn' ? lastWord.bn : lastWord.en);
      this.els.transcriptText.textContent = `✓ Chanted: "${displayWord}" (${this.currentWordIdx}/${tokens.length})`;

      if (this.currentWordIdx >= tokens.length) {
        setTimeout(() => this.completeCurrentLine(), 150);
      }
    } else {
      this.completeCurrentLine();
    }
  }

  // ==================== Word & Line Updates ====================

  highlightWord(lineIdx, wordIdx) {
    const lineEl = document.getElementById(`line-${lineIdx}`);
    if (!lineEl) return;
    const span = lineEl.querySelector(`.word-unit[data-word-idx="${wordIdx}"]`);
    if (span) {
      span.classList.add('chanted');
    }
  }

  completeCurrentLine() {
    const lineEl = document.getElementById(`line-${this.currentLineIndex}`);
    if (lineEl) {
      lineEl.className = 'chalisa-line-row matched';
      lineEl.querySelectorAll('.word-unit').forEach(w => w.classList.add('chanted'));

      const chip = lineEl.querySelector('.line-status-chip');
      if (chip) {
        chip.textContent = '✓ 100%';
        chip.classList.add('done');
      }
    }

    this.playDivineChime();

    this.lineAccuracies[this.currentLineIndex] = 1.0;
    this.currentLineIndex++;
    this.currentWordIdx = 0;
    localStorage.setItem('hc_currentLine', String(this.currentLineIndex));

    this.highlightCurrentLine(true);
    this.updateProgress();

    if (this.currentLineIndex >= this.totalLines) {
      this.handleCompletion();
    }
  }

  highlightCurrentLine(smoothScroll = true) {
    document.querySelectorAll('.chalisa-line-row.current').forEach(el => {
      el.classList.remove('current');
      el.classList.add('upcoming');
    });

    if (this.currentLineIndex >= this.totalLines) return;

    const lineEl = document.getElementById(`line-${this.currentLineIndex}`);
    if (!lineEl) return;

    lineEl.classList.remove('upcoming');
    lineEl.classList.add('current');

    lineEl.scrollIntoView({
      behavior: smoothScroll ? 'smooth' : 'auto',
      block: 'center'
    });
  }

  // ==================== Accuracy & Metrics ====================

  calculateAccuracy() {
    if (this.attemptedWordsCount === 0) {
      this.els.accuracyScore.textContent = '100%';
      this.updateAccuracyBadge(100);
      return;
    }

    const accuracy = Math.min(100, Math.max(50, Math.round((this.matchedWordsCount / this.attemptedWordsCount) * 100)));
    this.els.accuracyScore.textContent = `${accuracy}%`;
    this.updateAccuracyBadge(accuracy);
  }

  updateAccuracyBadge(score) {
    const badge = this.els.accuracyBadge;
    if (!badge) return;

    badge.className = 'stat-sub';
    if (score >= 95) {
      badge.textContent = 'Divya 🌟';
      badge.classList.add('badge-divya');
    } else if (score >= 85) {
      badge.textContent = 'Shuddha ✨';
      badge.classList.add('badge-shuddha');
    } else if (score >= 70) {
      badge.textContent = 'Sadhak 🙏';
      badge.classList.add('badge-sadhak');
    } else {
      badge.textContent = 'Abhyas 📿';
      badge.classList.add('badge-abhyas');
    }
  }

  updateProgress() {
    const completed = this.currentLineIndex;
    const total = this.totalLines;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (this.els.progressBar) {
      this.els.progressBar.style.width = `${pct}%`;
    }

    const curLine = this.lines[Math.min(this.currentLineIndex, this.totalLines - 1)];
    if (curLine && this.els.progressDisplay) {
      if (curLine.verseType === 'chaupai') {
        this.els.progressDisplay.textContent = `Chaupai ${curLine.verseNum} / 40`;
      } else if (curLine.verseType === 'doha-start') {
        this.els.progressDisplay.textContent = `Doha ${curLine.verseNum} / 2`;
      } else {
        this.els.progressDisplay.textContent = `Closing Doha`;
      }
    }
  }

  updateStatsDisplay() {
    if (this.els.chantCount) this.els.chantCount.textContent = this.chantCount;
    if (this.els.streakCount) this.els.streakCount.textContent = `${this.streak} d`;
    this.updateProgress();
  }

  updateTargetDisplay() {
    if (this.els.targetSub) {
      this.els.targetSub.textContent = `Goal: ${this.sankalpaTarget} (${this.chantCount}/${this.sankalpaTarget})`;
    }
  }

  calculateStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastChantDate && this.lastChantDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.lastChantDate !== yesterday) {
        this.streak = 0;
        localStorage.setItem('hc_streak', '0');
      }
    }
    if (this.els.streakCount) {
      this.els.streakCount.textContent = `${this.streak} d`;
    }
  }

  incrementStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastChantDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      this.streak = (this.lastChantDate === yesterday || !this.lastChantDate) ? (this.streak + 1) : 1;
      this.lastChantDate = today;
      localStorage.setItem('hc_streak', String(this.streak));
      localStorage.setItem('hc_lastChantDate', today);
    }
    if (this.els.streakCount) {
      this.els.streakCount.textContent = `${this.streak} d`;
    }
  }

  // ==================== Synthesized Web Audio Temple Chime ====================

  playDivineChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 serene temple bell frequency
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {}
  }

  // ==================== Session Control ====================

  resetSession() {
    this.stopListening();
    this.stopAiRecitation();
    this.currentLineIndex = 0;
    this.currentWordIdx = 0;
    this.matchedWordsCount = 0;
    this.attemptedWordsCount = 0;
    localStorage.setItem('hc_currentLine', '0');
    this.lineAccuracies = {};

    this.renderChalisa();
    this.highlightCurrentLine(false);
    this.els.accuracyScore.textContent = '100%';
    this.updateAccuracyBadge(100);
    this.els.transcriptText.textContent = 'Tap "AI Voice Sync" to chant or "Tap Sync" to start';
  }

  handleCompletion() {
    this.stopListening();
    this.stopAiRecitation();

    this.chantCount++;
    localStorage.setItem('hc_chantCount', String(this.chantCount));
    if (this.els.chantCount) this.els.chantCount.textContent = this.chantCount;
    this.updateTargetDisplay();

    this.incrementStreak();

    if (this.els.completionAccuracy) {
      this.els.completionAccuracy.textContent = this.els.accuracyScore.textContent;
    }
    if (this.els.completionCount) {
      this.els.completionCount.textContent = this.chantCount;
    }
    if (this.els.completionOverlay) {
      this.els.completionOverlay.classList.add('open');
    }

    this.currentLineIndex = 0;
    this.currentWordIdx = 0;
    localStorage.setItem('hc_currentLine', '0');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new HanumanChalisaApp();
});
