package com.abhradeep.hanumanchalisa.speech;

/**
 * Continuous chanting recognition on top of Android's one-utterance-at-a-time
 * SpeechRecognizer.
 *
 * The recogniser stops after every pause. This state machine restarts it
 * natively the moment an utterance ends (instead of waiting for a JavaScript
 * round trip), keeps the system beeps muted for the session (BeepGuard), and
 * turns the recogniser's callbacks into a clean stream for the web layer:
 *
 *   partial(segment, text)  growing transcript of the current utterance
 *   final(segment, text)    exactly once per utterance, also when it ended in
 *                           an error, so the web layer can release held words
 *   error(code, msg, fatal) fatal errors end the session
 *   state(listening, why)   started / stopped / background / resumed / error
 *
 * Every callback carries the attempt number it belongs to; callbacks of an
 * attempt that already ended (duplicate onError after onResults, late events
 * after a cancel) are ignored.
 *
 * Single-threaded: every method must be called on the same thread (the main
 * thread in the app). Pure Java so the logic is unit-tested on the JVM.
 */
public final class ChantSession {

    // android.speech.SpeechRecognizer error codes (checked against the SDK in ErrorCodesMatchSdkTest)
    public static final int ERROR_NETWORK_TIMEOUT = 1;
    public static final int ERROR_NETWORK = 2;
    public static final int ERROR_AUDIO = 3;
    public static final int ERROR_SERVER = 4;
    public static final int ERROR_CLIENT = 5;
    public static final int ERROR_SPEECH_TIMEOUT = 6;
    public static final int ERROR_NO_MATCH = 7;
    public static final int ERROR_RECOGNIZER_BUSY = 8;
    public static final int ERROR_INSUFFICIENT_PERMISSIONS = 9;
    public static final int ERROR_TOO_MANY_REQUESTS = 10;
    public static final int ERROR_SERVER_DISCONNECTED = 11;
    public static final int ERROR_LANGUAGE_NOT_SUPPORTED = 12;
    public static final int ERROR_LANGUAGE_UNAVAILABLE = 13;

    /** Wraps android.speech.SpeechRecognizer. */
    public interface Recognizer {
        /** Begin listening. Callbacks for this attempt must report {@code attempt}. */
        void start(int attempt);

        /** Abort the current attempt. */
        void cancel();

        /** Drop the recogniser instance; the next start() creates a fresh one. */
        void destroy();
    }

    public interface Events {
        void onPartial(int segment, String text);

        void onFinal(int segment, String text);

        void onError(String code, String message, boolean fatal);

        void onState(boolean listening, String reason);
    }

    public interface Scheduler {
        Object schedule(Runnable task, long delayMs);

        void cancel(Object token);

        long now();
    }

    public static final class Timing {
        /** Pause between an utterance ending and listening again. */
        public long restartDelayMs = 120;
        /** No callback at all (not even audio level) for this long means the recogniser hung. */
        public long stallMs = 10000;
        /** A "nothing heard" result this soon after starting, before the mic was ready, is a failure. */
        public long quickFailMs = 1000;
        public long backoffBaseMs = 300;
        public long backoffMaxMs = 5000;
        /** Consecutive failures before the session gives up. */
        public int maxErrorStreak = 8;
        /** Consecutive network failures before the web layer is told (non-fatal). */
        public int networkNoticeAfter = 2;
    }

    private enum Kind { SILENCE, RETRY, RECREATE, PERMISSION, LANGUAGE }

    private final Recognizer recognizer;
    private final Events events;
    private final Scheduler scheduler;
    private final BeepGuard guard;
    private final Timing timing;

    private boolean running;
    private boolean paused;
    private int attempt;
    private int segment;
    private boolean attemptOpen;
    private boolean micReady;
    private String lastPartial = "";
    private long attemptStartedAt;
    private long lastActivityAt;
    private int errorStreak;
    private int attemptsStarted;
    private Object restartTimer;
    private Object stallTimer;

    public ChantSession(Recognizer recognizer, Events events, Scheduler scheduler, BeepGuard guard, Timing timing) {
        this.recognizer = recognizer;
        this.events = events;
        this.scheduler = scheduler;
        this.guard = guard;
        this.timing = timing != null ? timing : new Timing();
    }

    // ------------------------------------------------------------------ control

    public void start() {
        if (running) return;
        running = true;
        paused = false;
        errorStreak = 0;
        events.onState(true, "started");
        beginAttempt();
    }

    public void stop() {
        if (!running) return;
        running = false;
        paused = false;
        endAttemptQuietly();
        quietly(recognizer::destroy);
        guard.release();
        events.onState(false, "stopped");
    }

    /** The app went to the background, where Android gives no microphone access. */
    public void pause() {
        if (!running || paused) return;
        paused = true;
        closeAttempt(lastPartial);
        endAttemptQuietly();
        guard.release();
        events.onState(false, "background");
    }

    public void resume() {
        if (!running || !paused) return;
        paused = false;
        errorStreak = 0;
        events.onState(true, "resumed");
        beginAttempt();
    }

    public boolean isRunning() {
        return running;
    }

    public boolean isPaused() {
        return paused;
    }

    public boolean isListening() {
        return running && !paused;
    }

    public int attemptsStarted() {
        return attemptsStarted;
    }

    public boolean beepMuted() {
        return guard.isEngaged();
    }

    // ------------------------------------------------------- recogniser callbacks

    public void onReadyForSpeech(int a) {
        if (!current(a)) return;
        micReady = true;
        lastActivityAt = scheduler.now();
    }

    public void onBeginningOfSpeech(int a) {
        if (!current(a)) return;
        lastActivityAt = scheduler.now();
    }

    /** Audio level updates arrive many times a second while the mic is live: a heartbeat. */
    public void onRmsChanged(int a) {
        if (!current(a)) return;
        lastActivityAt = scheduler.now();
    }

    public void onPartialResults(int a, String text) {
        if (!current(a)) return;
        lastActivityAt = scheduler.now();
        String t = clean(text);
        if (t.isEmpty() || t.equals(lastPartial)) return;
        lastPartial = t;
        errorStreak = 0;
        events.onPartial(segment, t);
    }

    public void onEndOfSpeech(int a) {
        if (!current(a)) return;
        lastActivityAt = scheduler.now();
        guard.engage(); // re-assert in case the stream was changed meanwhile
    }

    public void onResults(int a, String text) {
        if (!current(a)) return;
        String t = clean(text);
        if (!t.isEmpty() || micReady) errorStreak = 0;
        closeAttempt(t.isEmpty() ? lastPartial : t);
        scheduleRestart(timing.restartDelayMs);
    }

    public void onError(int a, int code) {
        if (!current(a)) return;
        closeAttempt(lastPartial);
        switch (classify(code)) {
            case SILENCE:
                if (!micReady && scheduler.now() - attemptStartedAt < timing.quickFailMs) {
                    failSoft(code); // "nothing heard" before the mic even opened: broken, back off
                } else {
                    if (micReady) errorStreak = 0; // a normal silence timeout: the recogniser works
                    scheduleRestart(timing.restartDelayMs);
                }
                return;
            case PERMISSION:
                fail("permission", "Microphone permission was revoked.");
                return;
            case LANGUAGE:
                fail("language", "Speech recognition for this language is not available on this phone.");
                return;
            case RECREATE:
                quietly(recognizer::destroy);
                failSoft(code);
                return;
            default:
                failSoft(code);
        }
    }

    // ---------------------------------------------------------------- internals

    private boolean current(int a) {
        return running && !paused && attemptOpen && a == attempt;
    }

    private void beginAttempt() {
        cancelTimer(restartTimer);
        restartTimer = null;
        attempt++;
        segment++;
        attemptOpen = true;
        micReady = false;
        lastPartial = "";
        attemptStartedAt = scheduler.now();
        lastActivityAt = attemptStartedAt;
        attemptsStarted++;
        guard.engage(); // before startListening: the start beep plays right away
        armStallCheck(timing.stallMs);
        int a = attempt;
        try {
            recognizer.start(a);
        } catch (RuntimeException e) {
            onError(a, ERROR_CLIENT);
        }
    }

    /** Emit the utterance's final text once and stop watching the attempt. */
    private void closeAttempt(String text) {
        cancelTimer(stallTimer);
        stallTimer = null;
        if (!attemptOpen) return;
        attemptOpen = false;
        events.onFinal(segment, text == null ? "" : text);
    }

    /** Stop the recogniser and every timer without reporting anything. */
    private void endAttemptQuietly() {
        attemptOpen = false;
        attempt++; // late callbacks of the old attempt no longer match
        cancelTimer(restartTimer);
        restartTimer = null;
        cancelTimer(stallTimer);
        stallTimer = null;
        quietly(recognizer::cancel);
    }

    private void scheduleRestart(long delayMs) {
        if (!running || paused) return;
        cancelTimer(restartTimer);
        restartTimer = scheduler.schedule(() -> {
            restartTimer = null;
            if (running && !paused) beginAttempt();
        }, delayMs);
    }

    private void armStallCheck(long delayMs) {
        cancelTimer(stallTimer);
        stallTimer = scheduler.schedule(this::checkStall, delayMs);
    }

    private void checkStall() {
        stallTimer = null;
        if (!running || paused || !attemptOpen) return;
        long idle = scheduler.now() - lastActivityAt;
        if (idle < timing.stallMs) {
            armStallCheck(timing.stallMs - idle);
            return;
        }
        // The recogniser went quiet without ending the attempt: start over on a fresh instance.
        closeAttempt(lastPartial);
        attempt++;
        quietly(recognizer::cancel);
        quietly(recognizer::destroy);
        failSoft(ERROR_CLIENT);
    }

    private void failSoft(int code) {
        errorStreak++;
        if (errorStreak > timing.maxErrorStreak) {
            fail(codeName(code), "Speech recognition keeps failing (" + describe(code) + ").");
            return;
        }
        if (isNetwork(code) && errorStreak == timing.networkNoticeAfter) {
            events.onError("network", "Speech recognition cannot reach the network. Retrying.", false);
        }
        scheduleRestart(backoff(errorStreak));
    }

    private void fail(String code, String message) {
        running = false;
        paused = false;
        endAttemptQuietly();
        quietly(recognizer::destroy);
        guard.release();
        events.onError(code, message, true);
        events.onState(false, "error");
    }

    long backoff(int streak) {
        long d = timing.backoffBaseMs << Math.min(10, Math.max(0, streak - 1));
        return Math.min(timing.backoffMaxMs, d);
    }

    private static Kind classify(int code) {
        switch (code) {
            case ERROR_NO_MATCH:
            case ERROR_SPEECH_TIMEOUT:
                return Kind.SILENCE;
            case ERROR_INSUFFICIENT_PERMISSIONS:
                return Kind.PERMISSION;
            case ERROR_LANGUAGE_NOT_SUPPORTED:
            case ERROR_LANGUAGE_UNAVAILABLE:
                return Kind.LANGUAGE;
            case ERROR_RECOGNIZER_BUSY:
            case ERROR_CLIENT:
            case ERROR_SERVER_DISCONNECTED:
                return Kind.RECREATE;
            default:
                return Kind.RETRY;
        }
    }

    private static boolean isNetwork(int code) {
        return code == ERROR_NETWORK || code == ERROR_NETWORK_TIMEOUT || code == ERROR_SERVER || code == ERROR_SERVER_DISCONNECTED;
    }

    static String codeName(int code) {
        if (isNetwork(code)) return "network";
        if (code == ERROR_AUDIO) return "audio";
        if (code == ERROR_TOO_MANY_REQUESTS) return "busy";
        return "failed";
    }

    private static String describe(int code) {
        switch (code) {
            case ERROR_NETWORK_TIMEOUT: return "network timeout";
            case ERROR_NETWORK: return "network error";
            case ERROR_AUDIO: return "microphone error";
            case ERROR_SERVER: return "server error";
            case ERROR_CLIENT: return "recogniser error";
            case ERROR_RECOGNIZER_BUSY: return "recogniser busy";
            case ERROR_TOO_MANY_REQUESTS: return "too many requests";
            case ERROR_SERVER_DISCONNECTED: return "recogniser disconnected";
            default: return "error " + code;
        }
    }

    private static String clean(String text) {
        return text == null ? "" : text.trim().replaceAll("\\s+", " ");
    }

    private void cancelTimer(Object token) {
        if (token != null) scheduler.cancel(token);
    }

    private static void quietly(Runnable r) {
        try {
            r.run();
        } catch (RuntimeException ignored) {
            // a recogniser that is already gone cannot be cancelled again
        }
    }
}
