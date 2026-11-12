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
  const RESYNC_MAX_GAP = 2;      // expected words that may be missing between two re-anchor words
  const ALIAS_MIN_SEEN = 2;      // a learned form counts once the reciter produced it this often
  const ALIAS_MAX_PER_WORD = 3;  // learned forms kept per word position

  const aliasKey = (L, q) => `${L.verseIndex}-${L.lineIndex}-${q}`;

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

  function sameWord(a, b) {
    if (a === b) return true;
    const x = phoneticSkeleton(a);
    const y = phoneticSkeleton(b);
    return !!x && !!y && similarity(x, y) >= MATCH_THRESHOLD;
  }

  /** Does `words` start like `ref` (a transcript that repeats it and goes on)? */
  function startsLike(words, ref) {
    if (!ref.length || !words.length) return false;
    const head = Math.min(3, words.length, ref.length);
    let hits = 0;
    for (let i = 0; i < head; i++) if (sameWord(words[i], ref[i])) hits++;
    if (hits < Math.ceil((head * 2) / 3)) return false;
    // a cumulative transcript does not shrink to a fraction of what it already said
    return words.join('').length >= ref.join('').length * 0.5;
  }

  function findWord(list, from, word, span) {
    for (let x = from; x < Math.min(list.length, from + span + 1); x++) {
      if (sameWord(list[x], word)) return x;
    }
    return -1;
  }

  /**
   * Align a new transcript `words` with the words already emitted from it
   * (`done`, in emission order). Returns how many leading words of `words`
   * they cover, plus `carry`: the unread rest of a token that merged emitted
   * words with a new one ("ज्ञान" emitted, now "ज्ञानगुन" -> carry "गुन").
   * Tolerates revised spellings, merged and split tokens, and words that
   * appear in a final result but were never shown in a partial one.
   */
  function alignCovered(words, done) {
    const n = done.length;
    if (!n) return { covered: 0, carry: null };
    let same = 0;
    while (same < n && same < words.length && words[same] === done[same]) same++;
    if (same === n) return { covered: n, carry: null };

    let j = same;
    let k = same;
    let lastJ = same - 1;
    let carry = null;
    let aligned = same;
    while (k < n && j < words.length) {
      const w = words[j];
      const d = done[k];
      if (w === d || sameWord(w, d)) {
        lastJ = j++; k++; aligned++; carry = null;
        continue;
      }
      if (w.length > d.length && w.startsWith(d)) {
        // merged token: it contains this emitted word, maybe more of them
        let rest = w.slice(d.length);
        k++; aligned++;
        while (k < n && rest.startsWith(done[k])) { rest = rest.slice(done[k].length); k++; aligned++; }
        lastJ = j++; carry = rest || null;
        continue;
      }
      if (d.length > w.length && d.startsWith(w)) {
        // an emitted token that is now split ("ज्ञानगुन" -> "ज्ञान गुन")
        let rest = d.slice(w.length);
        j++;
        while (j < words.length && rest && rest.startsWith(words[j])) { rest = rest.slice(words[j].length); j++; }
        lastJ = j - 1; k++; aligned++; carry = null;
        continue;
      }
      const jAhead = findWord(words, j + 1, d, 3); // words never shown in a partial
      const kAhead = findWord(done, k + 1, w, 3);  // an emitted word the transcript dropped
      if (jAhead >= 0 && (kAhead < 0 || jAhead - j <= kAhead - k)) { j = jAhead; continue; }
      if (kAhead >= 0) { k = kAhead; continue; }
      lastJ = j++; k++; carry = null; // the recogniser revised this word
    }
    if (aligned * 2 < n) {
      // Barely related: fall back to the word boundary closest to what was read.
      const target = done.join('').length;
      let best = 0;
      let bestDiff = target;
      let acc = 0;
      for (let x = 1; x <= words.length; x++) {
        acc += words[x - 1].length;
        if (Math.abs(acc - target) < bestDiff) { best = x; bestDiff = Math.abs(acc - target); }
      }
      return { covered: best, carry: null };
    }
    return { covered: lastJ + 1, carry };
  }

  /**
   * Emits each heard word once per recognition stream (an utterance or a Web
   * Speech result). The last word of an interim transcript is held back
   * because the recogniser is usually still revising it; it is released when
   * the transcript grows, turns final, or the stream is flushed.
   *
   * Recognisers differ: most resend the whole utterance with every update,
   * some restart their partial text after a pause, and finals may repeat the
   * whole utterance or only its last phrase. Each new transcript is therefore
   * located inside what the stream already emitted (from its start, from the
   * start of the current phrase, or as a new phrase) and only the words beyond
   * that are emitted.
   */
  class TranscriptFeed {
    constructor() {
      this.streams = new Map();
    }

    update(streamId, text, isFinal = false) {
      const words = tokenize(text);
      let st = this.streams.get(streamId);
      if (!st) {
        st = { history: [], base: 0, words: [], start: 0 };
        this.streams.set(streamId, st);
      }
      let fresh = [];
      let start;
      if (!st.words.length || startsLike(words, st.words)) {
        start = st.start; // the same transcript, grown or revised (the usual case)
      } else if (startsLike(words, st.history)) {
        start = 0;
      } else if (st.base > 0 && startsLike(words, st.history.slice(st.base))) {
        start = st.base;
      } else {
        // A new phrase: release what the previous transcript still held back.
        fresh = this.flush(streamId);
        start = st.history.length;
      }
      st.base = start;
      st.start = start;
      st.words = words;
      const stable = isFinal ? words.length : Math.max(0, words.length - 1);
      fresh = fresh.concat(this.take(st, stable));
      return fresh;
    }

    /** Emit the words of the current transcript up to `upTo` that were not emitted yet. */
    take(st, upTo) {
      const { covered, carry } = alignCovered(st.words, st.history.slice(st.start));
      if (covered > upTo) return []; // the aligned token is still held back
      const fresh = (carry ? [carry] : []).concat(st.words.slice(covered, upTo));
      st.history.push(...fresh); // `history` is exactly what was emitted, in order
      return fresh;
    }

    /** Release the held-back word(s) of a stream. */
    flush(streamId) {
      const st = this.streams.get(streamId);
      if (!st) return [];
      return this.take(st, st.words.length);
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
      this.aliases = new Map(); // "verse-line-word" -> Map(skeleton -> times seen)
      if (options.aliases) this.importAliases(options.aliases);
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
     * The reciter has gone silent (the app calls this after several seconds
     * without a heard word, not at every pause: slow chanters pause inside a
     * line). If only the last word of the line is still outstanding, the
     * recogniser lost it: close the line. Nothing follows the final line of the
     * Chalisa to close it, so there half of the line is enough.
     */
    endOfUtterance() {
      const events = [];
      if (!this.done && this.pending.length >= 2) this.settlePending(events);
      const n = this.line.words.length;
      const isFinalLine = this.lineIdx === this.lines.length - 1;
      // The app calls this after a few seconds of silence, not at every pause.
      const enough = isFinalLine ? Math.max(1, Math.ceil(n * 0.5)) : n - 1;
      if (!this.done && n >= 2 && this.cursor > 0 && this.cursor >= enough) this.finishLine(events);
      return events;
    }

    /**
     * The reciter is silent but some heard words were never placed (a soft
     * voice: the recogniser caught only scattered words, too far apart for
     * resync). Nothing more is coming to confirm them, so accept them if at
     * least two distinctive ones, and at least half of them, line up in order
     * over the rest of this line and the next.
     */
    settlePending(events) {
      const stream = [];
      for (let off = 0; off <= 1; off++) {
        const L = this.lines[this.lineIdx + off];
        if (!L) break;
        for (let q = off === 0 ? this.cursor : 0; q < L.words.length; q++) {
          stream.push({ lineIdx: this.lineIdx + off, q, word: L.words[q] });
        }
      }
      const hits = [];
      let pos = 0;
      for (const heard of this.pending) {
        for (let p = pos; p < stream.length; p++) {
          const w = stream[p].word;
          if (!w.weak && bestSimilarity(heard, this.keysAt(this.lines[stream[p].lineIdx], stream[p].q)) >= STRONG_THRESHOLD) {
            hits.push(stream[p]);
            pos = p + 1;
            break;
          }
        }
      }
      if (hits.length < 2 || hits.length * 2 < this.pending.length) return;
      const byLine = new Map();
      for (const h of hits) {
        if (!byLine.has(h.lineIdx)) byLine.set(h.lineIdx, []);
        byLine.get(h.lineIdx).push(h.q);
      }
      for (const [lineIdx, positions] of byLine) {
        if (this.done) break;
        this.apply({ lineOffset: lineIdx - this.lineIdx, positions, usable: 0 }, events);
      }
    }

    /** Feed heard words in spoken order. Returns the events they produced. */
    feed(heardWords) {
      const events = [];
      // A recogniser may glue words across a verse mark ("सरना।रक्षक"): split there.
      const skels = (heardWords || [])
        .flatMap(w => String(w).split(/[।॥|,.;:!?]+/))
        .map(w => phoneticSkeleton(w))
        .filter(Boolean);
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
      let wideGap = false;
      for (let k = 0; k < heard.length; k++) {
        let found = -1;
        for (let d = 0; d <= (k === 0 ? 0 : RESYNC_MAX_GAP); d++) {
          const item = stream[pos + d];
          if (!item) break;
          const s = bestSimilarity(heard[k], this.keysAt(this.lines[item.lineIdx], item.q));
          if (s >= MATCH_THRESHOLD) {
            found = pos + d;
            if (d > 1) wideGap = true;
            if (!item.word.weak && s >= STRONG_THRESHOLD) strong++;
            break;
          }
        }
        if (found < 0) return null;
        hits.push(stream[found]);
        pos = found + 1;
      }
      // A soft voice loses more words, so two may be missing between matches,
      // but then every matched word must be distinctive.
      const needed = wideGap ? heard.length : 2;
      return strong >= needed ? hits : null;
    }

    bestMatch(L, from, skels, i, maxSkip, strongOnly) {
      let best = null;
      const last = Math.min(L.words.length - 1, from + maxSkip);
      for (let p = from; p <= last; p++) {
        const skip = p - from;
        const word = L.words[p];
        const nextWord = L.words[p + 1];
        const wordKeys = this.keysAt(L, p); // spellings + this reciter's learned forms
        const candidates = [{ heardLen: 1, wordLen: 1, heard: skels[i], keys: wordKeys, weak: word.weak }];
        // Compounds split or merged differently by the recogniser. Only when no
        // single word explains the pair, otherwise "जय कपीस" would be glued
        // into one fuzzy match for "कपीस" and swallow the "जय".
        if (skels[i + 1] &&
            bestSimilarity(skels[i], wordKeys) < MATCH_THRESHOLD &&
            bestSimilarity(skels[i + 1], wordKeys) < MATCH_THRESHOLD) {
          // "पवन कुमार" heard for the single token "पवन-कुमार"
          candidates.push({ heardLen: 2, wordLen: 1, heard: skels[i] + skels[i + 1], keys: word.keys, weak: false });
        }
        if (nextWord &&
            bestSimilarity(skels[i], wordKeys) < MATCH_THRESHOLD &&
            bestSimilarity(skels[i], this.keysAt(L, p + 1)) < MATCH_THRESHOLD) {
          // "रामदूत" heard for the two tokens "राम दूत"
          const joined = SCRIPTS.filter(sc => word.skelBy[sc] && nextWord.skelBy[sc])
            .map(sc => word.skelBy[sc] + nextWord.skelBy[sc]);
          candidates.push({ heardLen: 1, wordLen: 2, heard: skels[i], keys: [...new Set(joined)], weak: false });
          // "तीनोंलोककाँपै" - fast chanting can run three words together
          const thirdWord = L.words[p + 2];
          if (thirdWord) {
            const joined3 = SCRIPTS.filter(sc => word.skelBy[sc] && nextWord.skelBy[sc] && thirdWord.skelBy[sc])
              .map(sc => word.skelBy[sc] + nextWord.skelBy[sc] + thirdWord.skelBy[sc]);
            candidates.push({ heardLen: 1, wordLen: 3, heard: skels[i], keys: [...new Set(joined3)], weak: false });
          }
        }
        for (const c of candidates) {
          const s = bestSimilarity(c.heard, c.keys);
          if (s < MATCH_THRESHOLD) continue;
          // Skipping ahead needs a distinctive word: a one-letter skeleton such
          // as जय/जो ("j") is only accepted exactly where it is expected.
          if ((skip > 0 || strongOnly) && (c.weak || s < STRONG_THRESHOLD)) continue;
          const score = s - SKIP_PENALTY * skip;
          if (!best || score > best.score) {
            best = { score, heardLen: c.heardLen, positions: Array.from({ length: c.wordLen }, (_, x) => p + x) };
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
      const used = new Set();
      const passOver = (to) => {
        const missed = [];
        for (let q = this.cursor; q < to; q++) {
          let hit = -1;
          for (let x = j; x < pending.length; x++) {
            if (bestSimilarity(pending[x], this.keysAt(this.line, q)) >= MATCH_THRESHOLD) { hit = x; break; }
          }
          if (hit >= 0) { j = hit + 1; used.add(hit); this.mark(q, 'matched', events); } else { missed.push(q); this.mark(q, 'missed', events); }
        }
        this.cursor = Math.max(this.cursor, to);
        return missed;
      };
      for (let k = 0; k < match.lineOffset && !this.done; k++) {
        passOver(this.line.words.length);
        this.finishLine(events);
      }
      if (this.done) return;
      match.positions.forEach((p, n) => {
        const missed = passOver(p);
        // Within one line, the words heard between two confirmed matches belong
        // to the words that were missed between them: learn how this reciter's
        // chanting of those words is transcribed.
        if (n === 0 && match.lineOffset === 0 && missed.length) {
          const unexplained = pending.filter((_, x) => !used.has(x));
          if (unexplained.length === missed.length && missed.length <= 3) {
            missed.forEach((q, x) => this.learn(this.line, q, unexplained[x], events));
          }
        }
        this.mark(p, 'matched', events);
        this.cursor = p + 1;
      });
      this.pending = [];
      this.lost = 0;
      if (this.cursor >= this.line.words.length) this.finishLine(events);
    }

    /** Match keys of word q of line L: its spellings plus this reciter's learned forms. */
    keysAt(L, q) {
      const word = L.words[q];
      const learned = this.aliases.get(aliasKey(L, q));
      if (!learned) return word.keys;
      const active = [];
      for (const [skel, count] of learned) if (count >= ALIAS_MIN_SEEN) active.push(skel);
      return active.length ? word.keys.concat(active) : word.keys;
    }

    /**
     * Remember that, for this reciter, word q of line L came out of the
     * recogniser as `skel`. Used at that position only, and only once seen
     * ALIAS_MIN_SEEN times; never when it resembles a neighbouring word.
     */
    learn(L, q, skel, events) {
      if (!skel || skel.length < 2) return;
      const lineIdx = this.lines.indexOf(L);
      for (let off = 0; off <= 1; off++) {
        const other = this.lines[lineIdx + off];
        if (!other) continue;
        for (let k = 0; k < other.words.length; k++) {
          if (off === 0 && k === q) continue;
          if (bestSimilarity(skel, other.words[k].keys) >= MATCH_THRESHOLD) return; // ambiguous
        }
      }
      const key = aliasKey(L, q);
      let learned = this.aliases.get(key);
      if (!learned) this.aliases.set(key, (learned = new Map()));
      learned.set(skel, (learned.get(skel) || 0) + 1);
      if (learned.size > ALIAS_MAX_PER_WORD) {
        // keep the most frequent forms
        const keep = [...learned.entries()].sort((a, b) => b[1] - a[1]).slice(0, ALIAS_MAX_PER_WORD);
        this.aliases.set(key, (learned = new Map(keep)));
      }
      events.push({ type: 'learn', key, skel, count: learned.get(skel) || 0 });
    }

    /** Learned forms as plain data (for storage). */
    exportAliases() {
      const out = {};
      for (const [key, learned] of this.aliases) out[key] = Object.fromEntries(learned);
      return out;
    }

    importAliases(data) {
      this.aliases = new Map();
      if (!data || typeof data !== 'object') return;
      for (const [key, forms] of Object.entries(data)) {
        if (!/^\d+-\d+-\d+$/.test(key) || !forms || typeof forms !== 'object') continue;
        const learned = new Map();
        for (const [skel, count] of Object.entries(forms)) {
          if (typeof skel === 'string' && skel.length >= 2 && Number.isFinite(count) && count > 0) learned.set(skel, Math.min(99, count));
        }
        if (learned.size) this.aliases.set(key, learned);
      }
    }

    /** Words with at least one active learned form. */
    learnedWordCount() {
      let n = 0;
      for (const learned of this.aliases.values()) {
        for (const count of learned.values()) if (count >= ALIAS_MIN_SEEN) { n++; break; }
      }
      return n;
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
