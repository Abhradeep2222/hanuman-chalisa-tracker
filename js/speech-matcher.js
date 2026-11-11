/**
 * Shri Hanuman Chalisa - Speech-to-Verse Alignment Engine
 *
 * Pure logic (no DOM, no browser APIs) so it runs both in the page and in
 * Node unit tests (`npm test`).
 *
 * Pipeline:
 *   recogniser transcript (cumulative, interim or final)
 *     -> TranscriptFeed     emits every heard word exactly once. Recognisers
 *                           resend the whole utterance on every update, and the
 *                           old engine re-scored that whole text against each
 *                           new line, so a line could finish on words that
 *                           belonged to the previous one.
 *     -> RecitationTracker  walks the expected words of the current line in
 *                           order. A heard word may match the next expected word
 *                           or, if it is a strong match, a word up to LOOKAHEAD
 *                           positions ahead (the skipped words are marked
 *                           missed). A line is scored matched / total words
 *                           when its last word is reached, or when the next
 *                           line clearly begins.
 *
 * Every word is compared through phoneticSkeleton() against its Hindi,
 * English and Bengali spellings at once, so the recogniser may return any
 * script regardless of which script is on screen.
 */
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const skeleton = isNode ? require('./chalisa-data.js').phoneticSkeleton : root.phoneticSkeleton;
  const api = factory(skeleton);
  if (isNode) module.exports = api;
  else root.SpeechMatcher = api;
})(typeof window !== 'undefined' ? window : globalThis, function (phoneticSkeleton) {
  'use strict';

  const SCRIPTS = ['hi', 'en', 'bn'];
  const MATCH_THRESHOLD = 0.6;   // minimum similarity for a word to count as recited
  const STRONG_THRESHOLD = 0.75; // similarity needed to skip ahead past expected words
  const LOOKAHEAD = 3;           // expected words a heard word may skip past
  const SKIP_PENALTY = 0.12;     // prefer the nearest candidate when several match
  const RESYNC_WINDOW = 3;       // heard words that must line up to re-anchor after losing place
  const RESYNC_LINES = 2;        // lines ahead a re-anchor may jump into ...
  const RESYNC_MAX_LINES = 12;   // ... growing by one line per 2 unplaceable words, up to this
  const PENDING_LIMIT = 8;       // unmatched heard words kept for backfilling skipped words

  function tokenize(text) {
    return String(text || '').split(/\s+/).filter(Boolean);
  }

  function editDistance(a, b) {
    if (a === b) return 0;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /**
   * Similarity of two skeletons in [0, 1]. Skeletons of one or two letters must
   * match exactly; longer ones tolerate one edit (two from six letters up).
   */
  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen <= 2) return 0;
    const allowed = maxLen >= 6 ? 2 : 1;
    if (Math.abs(a.length - b.length) > allowed) return 0;
    const d = editDistance(a, b);
    return d <= allowed ? 1 - d / maxLen : 0;
  }

  function bestSimilarity(heard, keys) {
    let best = 0;
    for (const k of keys) {
      const s = similarity(heard, k);
      if (s > best) best = s;
    }
    return best;
  }

  /**
   * Flatten the verses into recitable lines. Each word keeps its skeleton in
   * every script and its token position in every script's rendered line
   * (punctuation-only tokens such as "|" are not words and are skipped).
   */
  function buildLineModel(verses) {
    const lines = [];
    verses.forEach((verse, verseIndex) => {
      verse.lines.forEach((line, lineIndex) => {
        const perScript = {};
        SCRIPTS.forEach(sc => {
          perScript[sc] = tokenize(line[sc])
            .map((token, tokenIndex) => ({ tokenIndex, skel: phoneticSkeleton(token) }))
            .filter(t => t.skel);
        });
        const count = Math.max(...SCRIPTS.map(sc => perScript[sc].length));
        const words = [];
        for (let k = 0; k < count; k++) {
          const skelBy = {};
          const tokenIndex = {};
          SCRIPTS.forEach(sc => {
            const t = perScript[sc][k];
            if (t) { skelBy[sc] = t.skel; tokenIndex[sc] = t.tokenIndex; }
          });
          const keys = [...new Set(Object.values(skelBy))];
          words.push({ keys, skelBy, tokenIndex, weak: keys.every(key => key.length <= 1) });
        }
        lines.push({ verseIndex, lineIndex, words });
      });
    });
    return lines;
  }

  /**
   * Emits each heard word once per recognition stream (an utterance or a Web
   * Speech result). The last word of an interim transcript is held back
   * because the recogniser is usually still revising it; it is released when
   * the transcript grows, turns final, or the stream is flushed.
   */
  class TranscriptFeed {
    constructor() {
      this.streams = new Map();
    }

    update(streamId, text, isFinal = false) {
      const words = tokenize(text);
      const st = this.streams.get(streamId) || { emitted: 0, words: [] };
      st.words = words;
      const stable = isFinal ? words.length : Math.max(0, words.length - 1);
      const fresh = stable > st.emitted ? words.slice(st.emitted, stable) : [];
      st.emitted = Math.max(st.emitted, stable);
      this.streams.set(streamId, st);
      return fresh;
    }

    flush(streamId) {
      const st = this.streams.get(streamId);
      if (!st) return [];
      const fresh = st.words.slice(st.emitted);
      st.emitted = Math.max(st.emitted, st.words.length);
      return fresh;
    }

    flushAll() {
      const out = [];
      for (const id of this.streams.keys()) out.push(...this.flush(id));
      return out;
    }

    reset() {
      this.streams.clear();
    }
  }

  class RecitationTracker {
    constructor(verses, options = {}) {
      this.lines = buildLineModel(verses);
      this.lookahead = options.lookahead != null ? options.lookahead : LOOKAHEAD;
      this.setPosition(0, 0);
    }

    get line() {
      return this.lines[this.lineIdx];
    }

    position() {
      const L = this.line;
      return { verseIndex: L.verseIndex, lineIndex: L.lineIndex, wordIndex: this.cursor, done: this.done };
    }

    /** Display-token index of the next expected word, for the given script. */
    expectedTokenIndex(script) {
      const w = this.line.words[this.cursor];
      if (!w) return null;
      return w.tokenIndex[script] != null ? w.tokenIndex[script] : w.tokenIndex.hi;
    }

    setPosition(verseIndex, lineIndex = 0) {
      const idx = this.lines.findIndex(l => l.verseIndex === verseIndex && l.lineIndex === lineIndex);
      this.lineIdx = idx >= 0 ? idx : 0;
      this.cursor = 0;
      this.status = new Array(this.line.words.length).fill(null);
      this.pending = [];
      this.lost = 0; // heard words in a row that could not be placed
      this.done = false;
    }

    /**
     * The recogniser finished an utterance (the reciter paused). If only the
     * last word of the line is still outstanding, the reciter has reached the
     * end of the line and the recogniser lost that word: close the line.
     * Nothing follows the final line of the Chalisa to close it, so there a
     * pause after three quarters of the line is enough.
     */
    endOfUtterance() {
      const events = [];
      const n = this.line.words.length;
      const isFinalLine = this.lineIdx === this.lines.length - 1;
      const enough = isFinalLine ? Math.max(1, Math.ceil(n * 0.75)) : n - 1;
      if (!this.done && n >= 2 && this.cursor > 0 && this.cursor >= enough) this.finishLine(events);
      return events;
    }

    /** Feed heard words in spoken order. Returns the events they produced. */
    feed(heardWords) {
      const events = [];
      const skels = (heardWords || []).map(w => phoneticSkeleton(w)).filter(Boolean);
      let i = 0;
      while (i < skels.length && !this.done) {
        i += this.consume(skels, i, events);
      }
      return events;
    }

    consume(skels, i, events) {
      const L = this.line;
      const here = this.bestMatch(L, this.cursor, skels, i, this.lookahead, false);
      if (here) {
        this.apply({ lineOffset: 0, positions: here.positions, usable: this.pending.length }, events);
        return here.heardLen;
      }
      // The recogniser can miss the tail of a line. Once at least half the line
      // is behind us, a strong match on the start of the next line finishes it.
      const next = this.lines[this.lineIdx + 1];
      if (next && this.cursor >= Math.ceil(L.words.length / 2)) {
        const ahead = this.bestMatch(next, 0, skels, i, this.lookahead, true);
        if (ahead) {
          this.apply({ lineOffset: 1, positions: ahead.positions, usable: this.pending.length }, events);
          return ahead.heardLen;
        }
      }
      // Lost our place (several words in a row unrecognised)? Re-anchor on the
      // last few heard words if they line up with text further ahead.
      if (this.resync(skels[i], events)) return 1;
      // Not (yet) placeable: filler, noise or a misrecognition. Keep it briefly
      // in case a later strong match shows it was a skipped expected word.
      this.pending.push(skels[i]);
      if (this.pending.length > PENDING_LIMIT) this.pending.shift();
      this.lost++;
      return 1;
    }

    /**
     * Re-anchor after losing place. The newest heard word plus two of the
     * three before it (one filler may be ignored) must match, in order, a run
     * of upcoming words - across line boundaries, one missed word allowed
     * between matches - with at least two strong matches. The search horizon
     * grows while we stay lost, because the reciter keeps moving on. The
     * nearest such run wins; the tracker never jumps backwards.
     */
    resync(current, events) {
      const tail = this.pending.slice(-RESYNC_WINDOW);
      if (tail.length < RESYNC_WINDOW - 1) return false;
      const windows = [];
      if (tail.length >= RESYNC_WINDOW) {
        windows.push({ heard: [tail[1], tail[2], current], usable: this.pending.length - 2 });
        windows.push({ heard: [tail[0], tail[2], current], usable: this.pending.length - 3 });
        windows.push({ heard: [tail[0], tail[1], current], usable: this.pending.length - 3 });
      } else {
        windows.push({ heard: [tail[0], tail[1], current], usable: this.pending.length - 2 });
      }

      // A line yields roughly 3-5 heard words, so growing one line per two
      // unplaceable words keeps the horizon ahead of the reciter.
      const horizon = Math.min(RESYNC_MAX_LINES, RESYNC_LINES + Math.ceil(this.lost / 2));
      const stream = [];
      for (let off = 0; off <= horizon; off++) {
        const L = this.lines[this.lineIdx + off];
        if (!L) break;
        for (let q = off === 0 ? this.cursor : 0; q < L.words.length; q++) {
          stream.push({ lineIdx: this.lineIdx + off, q, word: L.words[q] });
        }
      }

      let best = null;
      for (const w of windows) {
        for (let s = 0; s < stream.length && (!best || s < best.start); s++) {
          const hits = this.alignStream(stream, s, w.heard);
          if (hits) { best = { start: s, hits, usable: w.usable }; break; }
        }
      }
      if (!best) return false;

      // Apply line by line (the run may straddle a line boundary).
      let usable = best.usable;
      const byLine = new Map();
      for (const h of best.hits) {
        if (!byLine.has(h.lineIdx)) byLine.set(h.lineIdx, []);
        byLine.get(h.lineIdx).push(h.q);
      }
      for (const [lineIdx, positions] of byLine) {
        if (this.done) break;
        this.apply({ lineOffset: lineIdx - this.lineIdx, positions, usable }, events);
        usable = 0;
      }
      return true;
    }

    alignStream(stream, start, heard) {
      const hits = [];
      let pos = start;
      let strong = 0;
      for (let k = 0; k < heard.length; k++) {
        let found = -1;
        for (let d = 0; d <= (k === 0 ? 0 : 1); d++) {
          const item = stream[pos + d];
          if (!item) break;
          const s = bestSimilarity(heard[k], item.word.keys);
          if (s >= MATCH_THRESHOLD) {
            found = pos + d;
            if (!item.word.weak && s >= STRONG_THRESHOLD) strong++;
            break;
          }
        }
        if (found < 0) return null;
        hits.push(stream[found]);
        pos = found + 1;
      }
      return strong >= 2 ? hits : null;
    }

    bestMatch(L, from, skels, i, maxSkip, strongOnly) {
      let best = null;
      const last = Math.min(L.words.length - 1, from + maxSkip);
      for (let p = from; p <= last; p++) {
        const skip = p - from;
        const word = L.words[p];
        const nextWord = L.words[p + 1];
        const candidates = [{ heardLen: 1, wordLen: 1, heard: skels[i], keys: word.keys, weak: word.weak }];
        // Compounds split or merged differently by the recogniser. Only when no
        // single word explains the pair, otherwise "जय कपीस" would be glued
        // into one fuzzy match for "कपीस" and swallow the "जय".
        if (skels[i + 1] &&
            bestSimilarity(skels[i], word.keys) < MATCH_THRESHOLD &&
            bestSimilarity(skels[i + 1], word.keys) < MATCH_THRESHOLD) {
          // "पवन कुमार" heard for the single token "पवन-कुमार"
          candidates.push({ heardLen: 2, wordLen: 1, heard: skels[i] + skels[i + 1], keys: word.keys, weak: false });
        }
        if (nextWord &&
            bestSimilarity(skels[i], word.keys) < MATCH_THRESHOLD &&
            bestSimilarity(skels[i], nextWord.keys) < MATCH_THRESHOLD) {
          // "रामदूत" heard for the two tokens "राम दूत"
          const joined = SCRIPTS.filter(sc => word.skelBy[sc] && nextWord.skelBy[sc])
            .map(sc => word.skelBy[sc] + nextWord.skelBy[sc]);
          candidates.push({ heardLen: 1, wordLen: 2, heard: skels[i], keys: [...new Set(joined)], weak: false });
        }
        for (const c of candidates) {
          const s = bestSimilarity(c.heard, c.keys);
          if (s < MATCH_THRESHOLD) continue;
          // Skipping ahead needs a distinctive word: a one-letter skeleton such
          // as जय/जो ("j") is only accepted exactly where it is expected.
          if ((skip > 0 || strongOnly) && (c.weak || s < STRONG_THRESHOLD)) continue;
          const score = s - SKIP_PENALTY * skip;
          if (!best || score > best.score) {
            best = { score, heardLen: c.heardLen, positions: c.wordLen === 2 ? [p, p + 1] : [p] };
          }
        }
      }
      return best;
    }

    /**
     * Move to a confirmed match: `positions` (ascending word indices) in the
     * line `lineOffset` lines ahead. Expected words passed on the way are
     * backfilled from the first `usable` pending heard words, in order (a weak
     * word such as अति/को that was heard before the anchor still counts),
     * otherwise marked missed.
     */
    apply(match, events) {
      const pending = this.pending.slice(0, Math.max(0, match.usable));
      let j = 0;
      const passOver = (to) => {
        for (let q = this.cursor; q < to; q++) {
          let hit = -1;
          for (let x = j; x < pending.length; x++) {
            if (bestSimilarity(pending[x], this.line.words[q].keys) >= MATCH_THRESHOLD) { hit = x; break; }
          }
          if (hit >= 0) { j = hit + 1; this.mark(q, 'matched', events); } else this.mark(q, 'missed', events);
        }
        this.cursor = Math.max(this.cursor, to);
      };
      for (let k = 0; k < match.lineOffset && !this.done; k++) {
        passOver(this.line.words.length);
        this.finishLine(events);
      }
      if (this.done) return;
      for (const p of match.positions) {
        passOver(p);
        this.mark(p, 'matched', events);
        this.cursor = p + 1;
      }
      this.pending = [];
      this.lost = 0;
      if (this.cursor >= this.line.words.length) this.finishLine(events);
    }

    mark(q, status, events) {
      const L = this.line;
      this.status[q] = status;
      events.push({
        type: 'word', status, verseIndex: L.verseIndex, lineIndex: L.lineIndex,
        wordIndex: q, tokenIndex: L.words[q].tokenIndex
      });
    }

    finishLine(events) {
      const L = this.line;
      for (let q = this.cursor; q < L.words.length; q++) this.mark(q, 'missed', events);
      const matched = this.status.filter(s => s === 'matched').length;
      const total = L.words.length;
      events.push({
        type: 'line', verseIndex: L.verseIndex, lineIndex: L.lineIndex,
        matched, total, accuracy: Math.round((100 * matched) / Math.max(1, total))
      });
      if (this.lineIdx + 1 < this.lines.length) {
        this.lineIdx++;
        this.cursor = 0;
        this.status = new Array(this.line.words.length).fill(null);
        events.push({ type: 'advance', verseIndex: this.line.verseIndex, lineIndex: this.line.lineIndex });
      } else {
        this.cursor = L.words.length;
        this.done = true;
        events.push({ type: 'complete' });
      }
    }
  }

  return {
    TranscriptFeed,
    RecitationTracker,
    buildLineModel,
    tokenize,
    editDistance,
    similarity,
    SPEECH_MATCH_CONFIG: { MATCH_THRESHOLD, STRONG_THRESHOLD, LOOKAHEAD, SKIP_PENALTY }
  };
});
