/**
 * Hanuman Chalisa Chant Tracker - Highly Robust Audio Sync Engine
 * Fixes:
 * 1. Dual Recognition Engine with aggressive interim results
 * 2. Visual live text feedback in bottom transcript
 * 3. Direct fuzzy substring matching against current verse words
 * 4. Resilient restart handling for Android/iOS mobile Chrome
 */

class HanumanChalisaApp {
  constructor() {
    this.lines = getFlatLines();
    this.totalLines = this.lines.length;

    // Persisted preferences
    this.language = localStorage.getItem('hc_lang') || 'auto';
    this.currentLineIndex = parseInt(localStorage.getItem('hc_currentLine') || '0', 10);
    if (isNaN(this.currentLineIndex) || this.currentLineIndex < 0 || this.currentLineIndex >= this.totalLines) {
      this.currentLineIndex = 0;
    }

    this.isListening = false;
    this.isAiChanting = false;
    this.speechSynth = window.speechSynthesis || null;
    this.recognition = null;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.lineAccuracies = [];
    this.matchedWordsInCurrentLine = new Set();
    this.recognitionRestartTimeout = null;

    // Stats
    this.chantCount = parseInt(localStorage.getItem('hc_chantCount') || '0', 10);
    this.streak = parseInt(localStorage.getItem('hc_streak') || '0', 10);
    this.lastChantDate = localStorage.getItem('hc_lastChantDate') || '';
    this.theme = localStorage.getItem('hc_theme') || 'dark';

    // DOM references
    this.els = {
      languageSelect: document.getElementById('languageSelect'),
      themeToggle: document.getElementById('themeToggle'),
      startBtn: document.getElementById('startBtn'),
      startBtnText: document.getElementById('startBtnText'),
      aiAutoChantBtn: document.getElementById('aiAutoChantBtn'),
      aiAutoChantText: document.getElementById('aiAutoChantText'),
      resetBtn: document.getElementById('resetBtn'),
      chantCount: document.getElementById('chantCount'),
      accuracyScore: document.getElementById('accuracyScore'),
      progressDisplay: document.getElementById('progressDisplay'),
      progressCard: document.getElementById('progressCard'),
      streakCount: document.getElementById('streakCount'),
      progressBar: document.getElementById('progressBar'),
      chalisaContainer: document.getElementById('chalisaContainer'),
      transcriptText: document.getElementById('transcriptText'),
      micDot: document.getElementById('micDot'),
      micLabel: document.getElementById('micLabel'),
      transcriptToggle: document.getElementById('transcriptToggle'),
      transcriptBody: document.getElementById('transcriptBody'),
      completionOverlay: document.getElementById('completionOverlay'),
      completionAccuracy: document.getElementById('completionAccuracy'),
      completionCount: document.getElementById('completionCount'),
      chantAgainBtn: document.getElementById('chantAgainBtn'),
      closeCompletionBtn: document.getElementById('closeCompletionBtn'),
      browserWarning: document.getElementById('browserWarning'),
      dismissWarning: document.getElementById('dismissWarning'),
      jumpModal: document.getElementById('jumpModal'),
      closeJumpModal: document.getElementById('closeJumpModal'),
      jumpGrid: document.getElementById('jumpGrid')
    };

    this.init();
  }

  // ==================== Initialize ====================

  init() {
    this.applyTheme();

    if (this.els.languageSelect) {
      this.els.languageSelect.value = this.language;
    }

    this.renderChalisaFast();
    this.buildJumpModal();
    this.updateStatsDisplay();
    this.calculateStreak();
    this.setupEventListeners();
    this.checkSpeechSupport();

    requestAnimationFrame(() => this.highlightCurrentLine(false));
  }

  checkSpeechSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition && this.els.browserWarning) {
      this.els.browserWarning.style.display = 'flex';
      this.els.startBtn.disabled = true;
      this.els.startBtn.style.opacity = '0.5';
    }
  }

  setupEventListeners() {
    this.els.startBtn.addEventListener('click', () => this.toggleListening());
    if (this.els.aiAutoChantBtn) {
      this.els.aiAutoChantBtn.addEventListener('click', () => this.toggleAiRecitation());
    }
    this.els.resetBtn.addEventListener('click', () => this.resetSession());

    this.els.languageSelect.addEventListener('change', (e) => {
      this.changeLanguage(e.target.value);
    });

    this.els.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.els.transcriptToggle.addEventListener('click', () => {
      this.els.transcriptBody.classList.toggle('collapsed');
    });

    this.els.chantAgainBtn.addEventListener('click', () => {
      this.els.completionOverlay.classList.remove('visible');
      this.resetSession();
      this.startListening();
    });

    this.els.closeCompletionBtn.addEventListener('click', () => {
      this.els.completionOverlay.classList.remove('visible');
    });

    if (this.els.dismissWarning) {
      this.els.dismissWarning.addEventListener('click', () => {
        this.els.browserWarning.style.display = 'none';
      });
    }

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
  }

  // ==================== Theme & Language ====================

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hc_theme', this.theme);
    this.applyTheme();
  }

  changeLanguage(lang) {
    this.language = lang;
    localStorage.setItem('hc_lang', lang);
    this.renderChalisaFast();
    this.highlightCurrentLine(false);

    if (this.isListening) {
      this.stopListening();
      setTimeout(() => this.startListening(), 200);
    }
  }

  // ==================== Render Chalisa ====================

  renderChalisaFast() {
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
        currentBlock.className = 'verse-block';

        const label = document.createElement('span');
        label.className = 'verse-label';
        
        let labelText = line.verseLabel.en;
        if (displayLang === 'hi') labelText = line.verseLabel.hi;
        if (displayLang === 'bn') labelText = line.verseLabel.bn;

        let countSuffix = '';
        if (line.verseType === 'chaupai') {
          countSuffix = ` ${line.verseNum} / 40`;
        } else if (line.verseType === 'doha-start') {
          countSuffix = ` ${line.verseNum} / 2`;
        }

        label.textContent = `${labelText}${countSuffix}`;
        currentBlock.appendChild(label);
        fragment.appendChild(currentBlock);
      }

      const lineEl = document.createElement('div');
      lineEl.className = 'chalisa-line ' + (i < this.currentLineIndex ? 'matched' : (i === this.currentLineIndex ? 'current' : 'upcoming'));
      lineEl.dataset.lineIndex = i;
      lineEl.id = `line-${i}`;

      lineEl.addEventListener('click', () => this.jumpToLine(i));

      const textEl = document.createElement('span');
      const fontClass = displayLang === 'hi' ? 'devanagari' : displayLang === 'bn' ? 'bengali' : '';
      textEl.className = `line-text ${fontClass}`;

      const fullText = displayLang === 'hi' ? line.hi : displayLang === 'bn' ? line.bn : line.en;
      const words = fullText.split(' ');

      textEl.innerHTML = words.map((w, wIdx) => {
        const isMatched = i < this.currentLineIndex || (i === this.currentLineIndex && this.matchedWordsInCurrentLine.has(wIdx));
        return `<span class="word-span ${isMatched ? 'matched-word' : ''}" data-word-idx="${wIdx}">${w}</span>`;
      }).join(' ');

      lineEl.appendChild(textEl);

      if (this.lineAccuracies[i] !== undefined) {
        const badge = document.createElement('span');
        badge.className = 'line-accuracy';
        badge.textContent = `${Math.round(this.lineAccuracies[i] * 100)}%`;
        lineEl.appendChild(badge);
      }

      currentBlock.appendChild(lineEl);
    }

    container.innerHTML = '';
    container.appendChild(fragment);
    this.updateProgress();
  }

  // ==================== Jump Modal ====================

  buildJumpModal() {
    if (!this.els.jumpGrid) return;
    const fragment = document.createDocumentFragment();

    CHALISA_DATA.verses.forEach((verse, vIdx) => {
      const btn = document.createElement('button');
      btn.className = 'jump-btn';

      let title = '';
      if (verse.type === 'chaupai') {
        title = `Chaupai ${verse.num}/40`;
      } else if (verse.type === 'doha-start') {
        title = `Intro Doha ${verse.num}/2`;
      } else {
        title = `Closing Doha`;
      }

      btn.innerHTML = `<span class="jump-type">${title}</span><span>#${vIdx + 1}</span>`;

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
    if (!this.els.jumpModal) return;
    this.els.jumpModal.classList.add('visible');

    const curLine = this.lines[this.currentLineIndex];
    if (curLine && this.els.jumpGrid) {
      const buttons = this.els.jumpGrid.querySelectorAll('.jump-btn');
      buttons.forEach((btn, idx) => {
        btn.classList.toggle('active', idx + 1 === curLine.verseIndex);
      });
    }
  }

  closeJumpModal() {
    if (this.els.jumpModal) {
      this.els.jumpModal.classList.remove('visible');
    }
  }

  jumpToLine(index) {
    if (index < 0 || index >= this.totalLines) return;
    this.currentLineIndex = index;
    localStorage.setItem('hc_currentLine', String(this.currentLineIndex));
    this.matchedWordsInCurrentLine.clear();

    for (let i = 0; i < this.totalLines; i++) {
      const el = document.getElementById(`line-${i}`);
      if (el) {
        el.className = 'chalisa-line ' + (i < this.currentLineIndex ? 'matched' : (i === this.currentLineIndex ? 'current' : 'upcoming'));
        if (i >= this.currentLineIndex) {
          el.querySelectorAll('.word-span').forEach(sp => sp.classList.remove('matched-word'));
        }
      }
    }

    this.highlightCurrentLine(true);
    this.updateProgress();
  }

  // ==================== AI Vocal Audio Chanting Engine ====================

  toggleAiRecitation() {
    if (this.isAiChanting) {
      this.stopAiRecitation();
    } else {
      this.startAiRecitation();
    }
  }

  startAiRecitation() {
    if (!this.speechSynth) {
      alert('Speech Synthesis is not supported in this browser.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isAiChanting = true;
    if (this.els.aiAutoChantBtn) {
      this.els.aiAutoChantBtn.classList.add('playing');
      this.els.aiAutoChantText.textContent = 'Pause AI Reciter';
    }

    this.els.micDot.classList.add('active');
    this.els.micLabel.textContent = 'AI Chanting Active';
    this.reciteCurrentLineWithAI();
  }

  stopAiRecitation() {
    this.isAiChanting = false;
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }

    if (this.els.aiAutoChantBtn) {
      this.els.aiAutoChantBtn.classList.remove('playing');
      this.els.aiAutoChantText.textContent = 'AI Audio Reciter';
    }

    this.els.micDot.classList.remove('active');
    this.els.micLabel.textContent = 'Microphone Inactive';
  }

  reciteCurrentLineWithAI() {
    if (!this.isAiChanting || this.currentLineIndex >= this.totalLines) {
      if (this.currentLineIndex >= this.totalLines) {
        this.handleCompletion();
      }
      this.stopAiRecitation();
      return;
    }

    const currentLine = this.lines[this.currentLineIndex];
    const displayLang = this.language === 'auto' ? 'en' : this.language;
    const textToRecite = displayLang === 'bn' ? currentLine.bn : currentLine.hi;
    const fullText = displayLang === 'hi' ? currentLine.hi : (displayLang === 'bn' ? currentLine.bn : currentLine.en);
    const words = fullText.split(' ');
    const lineEl = document.getElementById(`line-${this.currentLineIndex}`);

    this.speechSynth.cancel(); // clear previous speech
    const utter = new SpeechSynthesisUtterance(textToRecite);
    utter.rate = 0.85; // serene devotional pace
    utter.pitch = 1.0;
    utter.lang = displayLang === 'bn' ? 'bn-IN' : 'hi-IN';

    this.els.transcriptText.innerHTML = `AI Reciting: <span class="final">${textToRecite}</span>`;

    // Real-time word-by-word green highlighting as AI recites
    let wordIndex = 0;
    utter.onboundary = (event) => {
      if (event.name === 'word' && wordIndex < words.length) {
        this.matchedWordsInCurrentLine.add(wordIndex);
        if (lineEl) {
          const span = lineEl.querySelector(`.word-span[data-word-idx="${wordIndex}"]`);
          if (span) span.classList.add('matched-word');
        }
        wordIndex++;
      }
    };

    utter.onend = () => {
      if (!this.isAiChanting) return;
      this.markLineCompleteFast(this.currentLineIndex, 1.0);
      this.currentLineIndex++;
      localStorage.setItem('hc_currentLine', String(this.currentLineIndex));
      this.matchedWordsInCurrentLine.clear();

      this.highlightCurrentLine(true);
      this.updateProgress();
      this.updateAccuracy();

      // Proceed to next line after brief devotional pause
      setTimeout(() => {
        if (this.isAiChanting) {
          this.reciteCurrentLineWithAI();
        }
      }, 400);
    };

    utter.onerror = () => {
      this.stopAiRecitation();
    };

    this.speechSynth.speak(utter);
  }

  setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 4;

    // Use Indian acoustic model or Bengali if selected
    if (this.language === 'bn') {
      this.recognition.lang = 'bn-IN';
    } else {
      // hi-IN works with both Hindi & Indian Roman pronunciation of Chalisa
      this.recognition.lang = 'hi-IN';
    }

    this.recognition.onstart = () => {
      this.els.micDot.classList.add('active');
      this.els.micLabel.textContent = 'Listening (Speak Now)...';
    };

    this.recognition.onresult = (event) => this.handleSpeechResult(event);

    this.recognition.onerror = (event) => {
      console.log('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.stopListening();
        alert('Please allow microphone permissions in your mobile browser to enable chanting sync.');
      }
    };

    this.recognition.onend = () => {
      // Continuous listener on mobile browsers: auto restart if active
      if (this.isListening) {
        clearTimeout(this.recognitionRestartTimeout);
        this.recognitionRestartTimeout = setTimeout(() => {
          if (this.isListening) {
            try { this.recognition.start(); } catch (e) {}
          }
        }, 150);
      }
    };
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    this.setupRecognition();
    if (!this.recognition) return;

    this.isListening = true;
    this.els.startBtn.classList.add('listening');
    this.els.startBtnText.textContent = 'Pause Chanting';
    this.els.micLabel.textContent = 'Connecting Mic...';
    this.els.transcriptText.innerHTML = '<span class="interim">Say "Shri Guru Charan..." or chant in any language</span>';

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
    }

    const cur = document.getElementById(`line-${this.currentLineIndex}`);
    if (cur) cur.classList.add('listening');
  }

  stopListening() {
    this.isListening = false;
    clearTimeout(this.recognitionRestartTimeout);

    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }

    this.els.startBtn.classList.remove('listening');
    this.els.startBtnText.textContent = 'Begin Chanting';
    this.els.micDot.classList.remove('active');
    this.els.micLabel.textContent = 'Microphone Inactive';

    document.querySelectorAll('.chalisa-line.listening').forEach(el => {
      el.classList.remove('listening');
    });
  }

  handleSpeechResult(event) {
    let latestInterim = '';
    let latestFinal = '';
    const allTokens = new Set();

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const str = res[0].transcript;

      if (res.isFinal) {
        latestFinal += str + ' ';
      } else {
        latestInterim += str + ' ';
      }

      // Extract all word alternatives from SpeechRecognition
      for (let j = 0; j < res.length; j++) {
        const altStr = res[j].transcript;
        this.extractTokens(altStr).forEach(t => allTokens.add(t));
      }
    }

    const speechText = (latestFinal || latestInterim).trim();
    if (speechText) {
      // Visually display what microphone heard in bottom HUD
      this.els.transcriptText.innerHTML = `Heard: <span class="final">${speechText}</span>`;
      this.processAudioSync(Array.from(allTokens), speechText);
    }
  }

  extractTokens(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F\u0980-\u09FF]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 2);
  }

  // ==================== Immediate Word-by-Word Matching ====================

  processAudioSync(spokenTokens, rawSpoken) {
    if (this.currentLineIndex >= this.totalLines) return;

    const currentLine = this.lines[this.currentLineIndex];
    const displayLang = this.language === 'auto' ? 'en' : this.language;
    const fullText = displayLang === 'hi' ? currentLine.hi : (displayLang === 'bn' ? currentLine.bn : currentLine.en);
    const displayWords = fullText.split(' ');
    const lineEl = document.getElementById(`line-${this.currentLineIndex}`);

    let newlyMatched = 0;

    // Check every word in the current line
    displayWords.forEach((targetWord, wIdx) => {
      if (this.matchedWordsInCurrentLine.has(wIdx)) return;

      const normTarget = this.cleanWord(targetWord);
      const skelTarget = this.skeleton(targetWord);

      // Check against spoken speech tokens
      let matched = false;

      for (const token of spokenTokens) {
        const skelToken = this.skeleton(token);

        // 1. Exact or prefix match
        if (normTarget === token || (token.length >= 4 && normTarget.startsWith(token)) || (normTarget.length >= 4 && token.startsWith(normTarget))) {
          matched = true;
          break;
        }

        // 2. Phonetic Skeleton match (handles accents & transliteration differences)
        if (skelTarget.length >= 2 && skelToken.length >= 2) {
          if (skelTarget === skelToken || skelTarget.includes(skelToken) || skelToken.includes(skelTarget)) {
            matched = true;
            break;
          }
        }
      }

      // 3. Fallback: Raw speech substring match
      if (!matched && normTarget.length >= 3 && rawSpoken.toLowerCase().includes(normTarget)) {
        matched = true;
      }

      if (matched) {
        this.matchedWordsInCurrentLine.add(wIdx);
        newlyMatched++;

        // Instantly turn this word Bright Green in DOM!
        if (lineEl) {
          const span = lineEl.querySelector(`.word-span[data-word-idx="${wIdx}"]`);
          if (span) {
            span.classList.add('matched-word');
          }
        }
      }
    });

    // Check if line is ready to advance (at least 2 words or 35% of line matched)
    const totalWords = displayWords.length;
    const matchRatio = totalWords > 0 ? (this.matchedWordsInCurrentLine.size / totalWords) : 0;

    // Check if user is reciting the NEXT line already (speed chant)
    const nextLineIdx = this.currentLineIndex + 1;
    let nextLineMatch = false;

    if (nextLineIdx < this.totalLines) {
      const nextLine = this.lines[nextLineIdx];
      const nextSkeletons = nextLine.skeletons || [];
      let nextHits = 0;

      for (const tok of spokenTokens) {
        const sk = this.skeleton(tok);
        if (nextSkeletons.some(ns => ns.length >= 2 && (ns === sk || ns.includes(sk)))) {
          nextHits++;
        }
      }
      if (nextHits >= 2) nextLineMatch = true;
    }

    if (matchRatio >= 0.35 || this.matchedWordsInCurrentLine.size >= 2 || nextLineMatch) {
      // Advance to next line
      this.markLineCompleteFast(this.currentLineIndex, Math.max(0.75, matchRatio));

      this.currentLineIndex = nextLineMatch ? (this.currentLineIndex + 2) : (this.currentLineIndex + 1);
      localStorage.setItem('hc_currentLine', String(this.currentLineIndex));
      this.matchedWordsInCurrentLine.clear();

      this.highlightCurrentLine(true);
      this.updateProgress();
      this.updateAccuracy();

      if (this.currentLineIndex >= this.totalLines) {
        this.handleCompletion();
      }
    }
  }

  cleanWord(w) {
    return w.toLowerCase().replace(/[^\w\u0900-\u097F\u0980-\u09FF]/g, '').trim();
  }

  skeleton(str) {
    if (!str) return '';
    const SCRIPT_MAP = {
      'अ':'a','आ':'a','इ':'i','ई':'i','उ':'u','ऊ':'u','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
      'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n',
      'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
      'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
      'অ':'a','আ':'a','ই':'i','ঈ':'i','উ':'u','ঊ':'u','ঋ':'ri','এ':'e','ঐ':'ai','ও':'o','ঔ':'au',
      'ক':'k','খ':'kh','গ':'g','ঘ':'gh','ঙ':'ng','চ':'ch','ছ':'chh','জ':'j','ঝ':'jh','ঞ':'n',
      'ট':'t','ঠ':'th','ড':'d','ढ':'dh','ণ':'n','ত':'t','থ':'th','দ':'d','ধ':'dh','ন':'n',
      'প':'p','ফ':'ph','ব':'b','ভ':'bh','ম':'m','য':'y','র':'r','ল':'l','শ':'sh','ষ':'sh','স':'s','হ':'h',
      'ড়':'r','ঢ়':'rh','য়':'y'
    };

    let latin = '';
    for (const ch of str) {
      latin += SCRIPT_MAP[ch] !== undefined ? SCRIPT_MAP[ch] : ch;
    }

    return latin
      .toLowerCase()
      .replace(/[aeiouy]/g, '')
      .replace(/(.)\1+/g, '$1')
      .replace(/[^a-z0-9]/g, '');
  }

  // ==================== DOM State Updates ====================

  markLineCompleteFast(index, similarity) {
    const el = document.getElementById(`line-${index}`);
    if (!el) return;

    el.className = 'chalisa-line matched';
    el.querySelectorAll('.word-span').forEach(sp => sp.classList.add('matched-word'));
    this.lineAccuracies[index] = similarity;

    let badge = el.querySelector('.line-accuracy');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'line-accuracy';
      el.appendChild(badge);
    }
    badge.textContent = `${Math.min(100, Math.round(similarity * 100))}%`;
  }

  highlightCurrentLine(smoothScroll = true) {
    document.querySelectorAll('.chalisa-line.current').forEach(el => {
      el.classList.remove('current', 'listening');
      el.classList.add('upcoming');
    });

    if (this.currentLineIndex >= this.totalLines) return;

    const lineEl = document.getElementById(`line-${this.currentLineIndex}`);
    if (!lineEl) return;

    lineEl.classList.remove('upcoming');
    lineEl.classList.add('current');
    if (this.isListening) lineEl.classList.add('listening');

    lineEl.scrollIntoView({
      behavior: smoothScroll ? 'smooth' : 'auto',
      block: 'center'
    });
  }

  updateProgress() {
    const completed = this.currentLineIndex;
    const total = this.totalLines;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    this.els.progressBar.style.width = `${pct}%`;

    const curLine = this.lines[Math.min(this.currentLineIndex, this.totalLines - 1)];
    if (curLine) {
      if (curLine.verseType === 'chaupai') {
        this.els.progressDisplay.textContent = `Chaupai ${curLine.verseNum} / 40`;
      } else if (curLine.verseType === 'doha-start') {
        this.els.progressDisplay.textContent = `Doha ${curLine.verseNum} / 2`;
      } else {
        this.els.progressDisplay.textContent = `Closing Doha`;
      }
    }
  }

  updateAccuracy() {
    const scored = this.lineAccuracies.filter(a => a !== undefined);
    if (scored.length === 0) {
      this.els.accuracyScore.textContent = '—';
      return;
    }
    const avg = scored.reduce((sum, a) => sum + a, 0) / scored.length;
    this.els.accuracyScore.textContent = `${Math.round(avg * 100)}%`;
  }

  updateStatsDisplay() {
    this.els.chantCount.textContent = this.chantCount;
    this.els.streakCount.innerHTML = `${this.streak} <span class="metric-unit">days</span>`;
    this.updateProgress();
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
    this.els.streakCount.innerHTML = `${this.streak} <span class="metric-unit">days</span>`;
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
    this.els.streakCount.innerHTML = `${this.streak} <span class="metric-unit">days</span>`;
  }

  resetSession() {
    this.stopListening();
    this.currentLineIndex = 0;
    localStorage.setItem('hc_currentLine', '0');
    this.lineAccuracies = [];
    this.matchedWordsInCurrentLine.clear();

    this.renderChalisaFast();
    this.highlightCurrentLine(false);
    this.els.accuracyScore.textContent = '—';
    this.els.transcriptText.innerHTML = 'Click "Begin Chanting" and start reciting anytime...';
  }

  handleCompletion() {
    this.stopListening();

    this.chantCount++;
    localStorage.setItem('hc_chantCount', String(this.chantCount));
    this.els.chantCount.textContent = this.chantCount;

    this.incrementStreak();

    const scored = this.lineAccuracies.filter(a => a !== undefined);
    const avg = scored.length > 0 ? Math.round((scored.reduce((s, a) => s + a, 0) / scored.length) * 100) : 95;

    this.els.completionAccuracy.textContent = `${avg}%`;
    this.els.completionCount.textContent = this.chantCount;
    this.els.completionOverlay.classList.add('visible');

    this.currentLineIndex = 0;
    localStorage.setItem('hc_currentLine', '0');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new HanumanChalisaApp();
});
