/**
 * Hanuman Chalisa Chant Tracker - Highly Robust Audio Sync Engine
 * Real-time word-by-word visual green glow on matching speech.
 * Ignores irrelevant words & advances smoothly as user recites.
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
    this.recognition = null;
    this.lineAccuracies = [];
    this.accumulatedTranscript = '';
    this.lastProcessedText = '';
    this.matchedWordsInCurrentLine = new Set();

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

  // ==================== High Performance Render ====================

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
        // Clear word highlights for future lines
        if (i >= this.currentLineIndex) {
          el.querySelectorAll('.word-span').forEach(sp => sp.classList.remove('matched-word'));
        }
      }
    }

    this.highlightCurrentLine(true);
    this.updateProgress();
  }

  // ==================== Speech Engine ====================

  setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    // Use Indian English / Hindi acoustic model - best tuned for Sanskrit stotras & mantras
    if (this.language === 'bn') {
      this.recognition.lang = 'bn-IN';
    } else if (this.language === 'en') {
      this.recognition.lang = 'en-IN';
    } else {
      this.recognition.lang = 'hi-IN';
    }

    this.recognition.onresult = (event) => this.handleSpeechResult(event);

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (this.isListening) {
          setTimeout(() => {
            try { this.recognition.start(); } catch (e) {}
          }, 100);
        }
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try { this.recognition.start(); } catch (e) {}
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
    this.accumulatedTranscript = '';
    this.lastProcessedText = '';

    try {
      this.recognition.start();
    } catch (e) {}

    this.els.startBtn.classList.add('listening');
    this.els.startBtnText.textContent = 'Pause Chanting';
    this.els.micDot.classList.add('active');
    this.els.micLabel.textContent = 'Listening (Adaptive Voice Sync)...';
    this.els.transcriptText.innerHTML = '<span class="interim">Listening to your chanting...</span>';

    const cur = document.getElementById(`line-${this.currentLineIndex}`);
    if (cur) cur.classList.add('listening');
  }

  stopListening() {
    this.isListening = false;

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
    let interimTranscript = '';
    let finalTranscript = '';
    const allAlternatives = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript.trim();

      if (result.isFinal) {
        finalTranscript += text + ' ';
      } else {
        interimTranscript += text + ' ';
      }

      for (let j = 0; j < result.length; j++) {
        allAlternatives.push(result[j].transcript.trim());
      }
    }

    finalTranscript = finalTranscript.trim();
    interimTranscript = interimTranscript.trim();

    this.updateTranscriptDisplay(finalTranscript, interimTranscript);

    const spoken = finalTranscript || interimTranscript;
    if (spoken.length >= 2) {
      this.matchSpokenText(spoken, allAlternatives, !!finalTranscript);
    }
  }

  // ==================== Real-Time Word & Line Audio Matching ====================

  matchSpokenText(spokenText, allTranscripts, isFinal) {
    if (this.currentLineIndex >= this.totalLines) return;
    if (!isFinal && spokenText === this.lastProcessedText) return;
    this.lastProcessedText = spokenText;

    // Collect all spoken tokens and phonetic skeletons
    const spokenTokens = [];
    const spokenSkeletons = [];

    const candidatesToInspect = [spokenText, ...allTranscripts];
    candidatesToInspect.forEach(t => {
      const norm = this.normalize(t);
      norm.split(/\s+/).forEach(w => {
        if (w.length >= 2) {
          spokenTokens.push(w);
          spokenSkeletons.push(this.skeleton(w));
        }
      });
    });

    const currentLine = this.lines[this.currentLineIndex];

    // 1. Check current line word-by-word and immediately turn matching words GREEN!
    this.highlightMatchedWords(this.currentLineIndex, currentLine, spokenTokens, spokenSkeletons);

    // 2. Evaluate if current line or next line is satisfied
    const lookAhead = 3;
    let bestMatch = { index: -1, score: 0 };

    for (let offset = 0; offset < lookAhead; offset++) {
      const idx = this.currentLineIndex + offset;
      if (idx >= this.totalLines) break;

      const line = this.lines[idx];
      const lineScore = this.evaluateLineMatch(spokenTokens, spokenSkeletons, line);

      if (lineScore > bestMatch.score) {
        bestMatch = { index: idx, score: lineScore };
      }
    }

    // Advance if matching threshold reached:
    // (If 30%+ of line's keywords are heard, or current line words are largely matched)
    const displayWordsCount = (this.language === 'hi' ? currentLine.hi : (this.language === 'bn' ? currentLine.bn : currentLine.en)).split(' ').length;
    const currentLineWordRatio = displayWordsCount > 0 ? (this.matchedWordsInCurrentLine.size / displayWordsCount) : 0;

    const threshold = isFinal ? 0.28 : 0.38;

    if ((bestMatch.score >= threshold && bestMatch.index >= 0) || currentLineWordRatio >= 0.45) {
      const targetIndex = bestMatch.index >= this.currentLineIndex ? bestMatch.index : this.currentLineIndex;

      for (let i = this.currentLineIndex; i <= targetIndex; i++) {
        const s = (i === targetIndex) ? Math.max(0.75, bestMatch.score, currentLineWordRatio) : 0.85;
        this.markLineCompleteFast(i, s);
      }

      this.currentLineIndex = targetIndex + 1;
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

  highlightMatchedWords(lineIdx, line, spokenTokens, spokenSkeletons) {
    const lineEl = document.getElementById(`line-${lineIdx}`);
    if (!lineEl) return;

    const displayLang = this.language === 'auto' ? 'en' : this.language;
    const fullText = displayLang === 'hi' ? line.hi : (displayLang === 'bn' ? line.bn : line.en);
    const words = fullText.split(' ');

    words.forEach((word, wIdx) => {
      const cleanW = this.normalize(word);
      const wSkel = this.skeleton(word);
      if (cleanW.length < 2 && wSkel.length < 2) return;

      let isMatch = false;

      // Exact or prefix token match
      for (const tok of spokenTokens) {
        if (tok === cleanW || (tok.length >= 4 && cleanW.startsWith(tok)) || (cleanW.length >= 4 && tok.startsWith(cleanW))) {
          isMatch = true;
          break;
        }
      }

      // Phonetic skeleton match (works across Bengali, Hindi, English transliteration)
      if (!isMatch && wSkel.length >= 2) {
        for (const spSk of spokenSkeletons) {
          if (spSk.length >= 2 && (wSkel === spSk || wSkel.includes(spSk) || spSk.includes(wSkel))) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        this.matchedWordsInCurrentLine.add(wIdx);
        const span = lineEl.querySelector(`.word-span[data-word-idx="${wIdx}"]`);
        if (span) {
          span.classList.add('matched-word');
        }
      }
    });
  }

  evaluateLineMatch(spokenTokens, spokenSkeletons, line) {
    let matchedKeywords = 0;
    const lineSkeletons = line.skeletons || [];

    for (const sk of lineSkeletons) {
      if (sk.length < 2) continue;
      for (const spSk of spokenSkeletons) {
        if (spSk.length >= 2 && (sk === spSk || sk.includes(spSk) || spSk.includes(sk))) {
          matchedKeywords++;
          break;
        }
      }
    }

    const refWords = line.cleanEn.split(/\s+/);
    let matchedRefWords = 0;
    for (const rw of refWords) {
      if (rw.length <= 2) continue;
      for (const st of spokenTokens) {
        if (st === rw || (st.length >= 4 && rw.startsWith(st)) || (rw.length >= 4 && st.startsWith(rw))) {
          matchedRefWords++;
          break;
        }
      }
    }

    const skeletonRatio = lineSkeletons.length > 0 ? (matchedKeywords / lineSkeletons.length) : 0;
    const wordRatio = refWords.length > 0 ? (matchedRefWords / refWords.length) : 0;

    return Math.max(skeletonRatio, wordRatio);
  }

  normalize(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[^\w\s\u0900-\u097F\u0980-\u09FF]/g, '').replace(/\s+/g, ' ').trim();
  }

  skeleton(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[aeiouy]/g, '')
      .replace(/(.)\1+/g, '$1')
      .replace(/[^a-z0-9]/g, '');
  }

  // ==================== DOM Updates ====================

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

  updateTranscriptDisplay(finalText, interimText) {
    if (finalText) this.accumulatedTranscript += finalText + ' ';
    const recent = this.accumulatedTranscript.trim().split(' ').slice(-14).join(' ');
    let html = '';
    if (recent) html += `<span class="final">${recent}</span> `;
    if (interimText) html += `<span class="interim">${interimText}</span>`;
    if (!html) html = '<span class="interim">Listening for recitation...</span>';
    this.els.transcriptText.innerHTML = html;
  }

  resetSession() {
    this.stopListening();
    this.currentLineIndex = 0;
    localStorage.setItem('hc_currentLine', '0');
    this.lineAccuracies = [];
    this.accumulatedTranscript = '';
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
