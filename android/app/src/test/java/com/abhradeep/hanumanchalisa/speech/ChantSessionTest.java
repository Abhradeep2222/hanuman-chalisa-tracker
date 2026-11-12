package com.abhradeep.hanumanchalisa.speech;

import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_AUDIO;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_CLIENT;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_INSUFFICIENT_PERMISSIONS;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_LANGUAGE_UNAVAILABLE;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_NETWORK;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_NO_MATCH;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_RECOGNIZER_BUSY;
import static com.abhradeep.hanumanchalisa.speech.ChantSession.ERROR_SPEECH_TIMEOUT;
import static com.abhradeep.hanumanchalisa.speech.Fakes.MUSIC;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Before;
import org.junit.Test;

/**
 * Drives ChantSession through the callback sequences Android's recogniser
 * produces on real phones, on a virtual clock.
 */
public class ChantSessionTest {

    private Fakes.Clock clock;
    private Fakes.Volume volume;
    private Fakes.Ledger ledger;
    private Fakes.Recognizer rec;
    private Fakes.Events events;
    private ChantSession session;

    @Before
    public void setUp() {
        clock = new Fakes.Clock();
        volume = new Fakes.Volume();
        ledger = new Fakes.Ledger();
        rec = new Fakes.Recognizer();
        rec.volume = volume;
        events = new Fakes.Events();
        BeepGuard guard = new BeepGuard(volume, ledger, MUSIC);
        session = new ChantSession(rec, events, clock, guard, new ChantSession.Timing());
    }

    private int a() {
        return rec.lastAttempt;
    }

    /** ready -> speech -> growing partials -> end -> results, as Google's recogniser reports a phrase. */
    private void utterance(String... partials) {
        int a = a();
        clock.advance(150);
        session.onReadyForSpeech(a);
        session.onBeginningOfSpeech(a);
        for (String p : partials) {
            clock.advance(300);
            session.onRmsChanged(a);
            session.onPartialResults(a, p);
        }
        clock.advance(600);
        session.onEndOfSpeech(a);
        clock.advance(200);
        session.onResults(a, partials[partials.length - 1]);
    }

    // ------------------------------------------------------------ the beep

    @Test
    public void beepStreamIsMutedBeforeTheRecogniserStarts() {
        session.start();
        assertEquals(Collections.singletonList(true), rec.mutedAtStart);
        assertTrue(session.beepMuted());
    }

    @Test
    public void everyRestartHappensWhileMutedAndNothingIsUnmutedMidSession() {
        session.start();
        for (int i = 0; i < 25; i++) {
            utterance("जय", "जय हनुमान");
            clock.advance(200);
        }
        assertEquals(26, rec.starts);
        assertFalse("no start may happen with sound on", rec.mutedAtStart.contains(false));
        assertEquals("muted once, never toggled while listening", Collections.singletonList("mute:3"), volume.calls);
        session.stop();
        assertEquals(Arrays.asList("mute:3", "unmute:3"), volume.calls);
        assertFalse(volume.isMuted(MUSIC));
    }

    @Test
    public void silenceTimeoutsRestartQuietlyWithoutBecomingErrors() {
        session.start();
        for (int i = 0; i < 40; i++) {
            int a = a();
            clock.advance(200);
            session.onReadyForSpeech(a);
            clock.advance(5000);
            session.onError(a, i % 2 == 0 ? ERROR_SPEECH_TIMEOUT : ERROR_NO_MATCH);
            clock.advance(200);
        }
        assertEquals(41, rec.starts);
        assertEquals(0, events.count("fatal"));
        assertEquals(0, events.count("notice"));
        assertTrue(session.isListening());
        assertFalse(rec.mutedAtStart.contains(false));
    }

    @Test
    public void userAlreadyMutedMediaIsNeverTouched() {
        volume.userChanges(MUSIC, true);
        session.start();
        utterance("जय हनुमान");
        clock.advance(200);
        session.stop();
        assertTrue(volume.calls.isEmpty());
        assertTrue(volume.isMuted(MUSIC));
    }

    @Test
    public void volumeKeyDuringSessionWinsOverTheGuard() {
        session.start();
        volume.userChanges(MUSIC, false);
        utterance("जय हनुमान");
        clock.advance(200);
        assertFalse("not muted again after the user turned sound on", volume.isMuted(MUSIC));
        session.stop();
        assertEquals(Collections.singletonList("mute:3"), volume.calls);
    }

    // ------------------------------------------------------ transcript stream

    @Test
    public void utteranceProducesPartialsThenOneFinalThenRestarts() {
        session.start();
        utterance("जय", "जय हनुमान", "जय हनुमान ज्ञान गुन सागर");
        assertEquals(Arrays.asList(
            "state:on:started",
            "route:default/hi-IN:working",
            "partial:1:जय",
            "partial:1:जय हनुमान",
            "partial:1:जय हनुमान ज्ञान गुन सागर",
            "final:1:जय हनुमान ज्ञान गुन सागर"), events.log);
        assertEquals(1, rec.starts);
        clock.advance(119);
        assertEquals(1, rec.starts);
        clock.advance(1);
        assertEquals("restarted natively 120 ms after the utterance", 2, rec.starts);
        utterance("जय कपीस");
        assertEquals("final:2:जय कपीस", events.last());
    }

    @Test
    public void repeatedIdenticalPartialsAreSentOnce() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        session.onPartialResults(a, "जय हनुमान");
        session.onPartialResults(a, " जय  हनुमान ");
        session.onPartialResults(a, "");
        session.onPartialResults(a, null);
        assertEquals(1, events.count("partial"));
    }

    @Test
    public void emptyFinalResultFallsBackToTheLastPartial() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        session.onPartialResults(a, "राम दूत अतुलित बल धामा");
        session.onEndOfSpeech(a);
        session.onResults(a, "");
        assertEquals("final:1:राम दूत अतुलित बल धामा", events.last());
    }

    @Test
    public void errorAfterResultsIsIgnored() {
        session.start();
        utterance("जय हनुमान");
        session.onError(1, ERROR_NO_MATCH); // some phones send both
        session.onResults(1, "जय हनुमान");
        assertEquals(1, events.count("final"));
        clock.advance(5000);
        assertEquals("exactly one restart", 2, rec.starts);
    }

    @Test
    public void lateCallbacksOfAnOldAttemptAreIgnored() {
        session.start();
        utterance("जय हनुमान");
        clock.advance(120);
        session.onPartialResults(1, "late text from attempt one");
        session.onError(1, ERROR_NETWORK);
        assertEquals(0, events.log.stream().filter(s -> s.contains("late text")).count());
        assertEquals(0, events.count("notice"));
        assertTrue(session.isListening());
    }

    @Test
    public void errorWithPartialsStillDeliversThemAsFinal() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        session.onPartialResults(a, "संकट कटै मिटै सब पीरा");
        session.onError(a, ERROR_NETWORK);
        assertEquals("final:1:संकट कटै मिटै सब पीरा", events.last());
    }

    // ------------------------------------------------------------- failures

    @Test
    public void immediateNoMatchBacksOffThenGivesUp() {
        session.start();
        long[] expectedDelays = { 300, 600, 1200, 2400, 4800, 5000, 5000, 5000 };
        for (long delay : expectedDelays) {
            session.onError(a(), ERROR_NO_MATCH); // before the mic was ever ready
            int before = rec.starts;
            clock.advance(delay - 1);
            assertEquals(before, rec.starts);
            clock.advance(1);
            assertEquals(before + 1, rec.starts);
        }
        session.onError(a(), ERROR_NO_MATCH);
        assertEquals("fatal:failed", events.log.get(events.log.size() - 2));
        assertEquals("state:off:error", events.last());
        assertFalse(session.isRunning());
        assertFalse("sound restored when giving up", volume.isMuted(MUSIC));
        clock.advance(60000);
        assertEquals(9, rec.starts);
    }

    @Test
    public void networkFailureNotifiesOnceThenEndsWithNetworkCode() {
        session.start();
        for (int i = 0; i < 9; i++) {
            int a = a();
            session.onReadyForSpeech(a);
            session.onError(a, ERROR_NETWORK);
            clock.advance(5000);
        }
        assertEquals(1, events.count("notice:network"));
        assertEquals(1, events.count("fatal:network"));
        assertFalse(volume.isMuted(MUSIC));
    }

    @Test
    public void recognisedSpeechResetsTheFailureCount() {
        session.start();
        for (int i = 0; i < 6; i++) {
            session.onError(a(), ERROR_NETWORK);
            clock.advance(5000);
        }
        utterance("जय हनुमान");
        clock.advance(200);
        for (int i = 0; i < 8; i++) {
            session.onError(a(), ERROR_NETWORK);
            clock.advance(5000);
        }
        assertEquals("8 fresh failures are still tolerated", 0, events.count("fatal"));
        assertTrue(session.isListening());
    }

    @Test
    public void busyRecogniserIsRecreated() {
        session.start();
        session.onError(a(), ERROR_RECOGNIZER_BUSY);
        assertEquals(1, rec.count("destroy"));
        clock.advance(300);
        assertEquals(2, rec.starts);
    }

    @Test
    public void startThrowingIsTreatedAsARecoverableClientError() {
        rec.throwOnStarts = 1;
        session.start();
        assertEquals("final:1:", events.last());
        assertEquals(1, rec.count("destroy"));
        clock.advance(300);
        assertEquals(1, rec.starts);
        assertTrue(session.isListening());
    }

    @Test
    public void revokedPermissionEndsTheSessionAtOnce() {
        session.start();
        session.onError(a(), ERROR_INSUFFICIENT_PERMISSIONS);
        assertEquals(1, events.count("fatal:permission"));
        assertFalse(session.isRunning());
        assertFalse(volume.isMuted(MUSIC));
    }

    @Test
    public void missingLanguagePackEndsTheSessionAtOnce() {
        session.start();
        session.onError(a(), ERROR_LANGUAGE_UNAVAILABLE);
        assertEquals(1, events.count("fatal:language"));
        assertFalse(session.isRunning());
    }

    // ------------------------------------------------- routes (Samsung S23 case)

    @Test
    public void bengaliMissingOnTheDefaultRecogniserFallsBackInsteadOfStopping() {
        // Samsung's default recogniser has no Bengali; Google's has it online.
        rec.routes = new java.util.ArrayList<>(Arrays.asList(
            "samsung/bn-IN", "google/bn-IN", "samsung/hi-IN", "google/hi-IN"));
        session.start();
        session.onError(a(), ChantSession.ERROR_LANGUAGE_NOT_SUPPORTED);
        assertEquals("route:google/bn-IN:language", events.last());
        assertEquals(0, events.count("fatal"));
        clock.advance(120);
        assertEquals("start:google/bn-IN", rec.calls.get(rec.calls.size() - 1));
        utterance("জয় হনুমান জ্ঞান গুন সাগর");
        assertEquals("final:2:জয় হনুমান জ্ঞান গুন সাগর", events.last());
        assertTrue(session.isListening());
    }

    @Test
    public void bengaliMissingEverywhereFallsBackToHindi() {
        rec.routes = new java.util.ArrayList<>(Arrays.asList(
            "google/bn-IN", "default/bn-IN", "google/hi-IN", "default/hi-IN"));
        session.start();
        session.onError(a(), ChantSession.ERROR_LANGUAGE_UNAVAILABLE); // no Bengali pack
        clock.advance(120);
        session.onError(a(), ChantSession.ERROR_LANGUAGE_NOT_SUPPORTED);
        assertEquals("route:google/hi-IN:language", events.last());
        clock.advance(120);
        utterance("जय हनुमान");
        assertEquals(0, events.count("fatal"));
        assertTrue(session.isListening());
        assertTrue("still muted while listening", volume.isMuted(MUSIC));
    }

    @Test
    public void noRouteLeftForTheLanguageIsFatal() {
        rec.routes = new java.util.ArrayList<>(Arrays.asList("default/bn-IN", "default/hi-IN"));
        session.start();
        session.onError(a(), ChantSession.ERROR_LANGUAGE_NOT_SUPPORTED);
        clock.advance(120);
        session.onError(a(), ChantSession.ERROR_LANGUAGE_NOT_SUPPORTED);
        assertEquals(1, events.count("fatal:language"));
        assertFalse(session.isRunning());
        assertFalse(volume.isMuted(MUSIC));
    }

    @Test
    public void aRouteThatNeverWorksIsAbandonedAfterFourFailures() {
        rec.routes = new java.util.ArrayList<>(Arrays.asList("bixby/hi-IN", "google/hi-IN"));
        session.start();
        session.onError(a(), ChantSession.ERROR_SERVER);
        clock.advance(300);
        session.onError(a(), ChantSession.ERROR_CLIENT);
        clock.advance(600);
        session.onError(a(), ChantSession.ERROR_SERVER);
        clock.advance(1200);
        assertEquals("three failures are still retried on the same recogniser", 0, rec.route);
        session.onError(a(), ChantSession.ERROR_SERVER);
        assertEquals("route:google/hi-IN:failing", events.last());
        clock.advance(120);
        utterance("जय हनुमान");
        assertTrue(session.isListening());
        assertEquals(1, rec.proven);
    }

    @Test
    public void aFailingRecogniserNeverPushesTheChantIntoAnotherLanguage() {
        // the screenshot case: Hindi failing for a while must not end up in English
        rec.routes = new java.util.ArrayList<>(Arrays.asList("google/hi-IN", "google/bn-IN", "google/en-IN"));
        session.start();
        for (int i = 0; i < 30 && session.isRunning(); i++) {
            session.onError(a(), i % 2 == 0 ? ERROR_RECOGNIZER_BUSY : ChantSession.ERROR_CLIENT);
            clock.advance(5000);
        }
        assertEquals("still Hindi", 0, rec.route);
        assertEquals(0, events.count("route:"));
        assertEquals(1, events.count("fatal:failed"));
    }

    @Test
    public void missingLanguagePackIsDownloadedForNextTime() {
        rec.downloadSupported = true;
        rec.routes = new java.util.ArrayList<>(Arrays.asList("google/hi-IN", "default/hi-IN"));
        session.start();
        session.onError(a(), ChantSession.ERROR_LANGUAGE_UNAVAILABLE);
        assertEquals(Collections.singletonList("hi-IN"), rec.downloads);
        assertEquals(1, events.count("notice:download"));
        assertEquals("route:default/hi-IN:language", events.last());
        assertEquals(0, events.count("fatal"));
    }

    @Test
    public void aWorkingRouteIsRememberedOnce() {
        session.start();
        utterance("जय हनुमान");
        clock.advance(200);
        utterance("जय कपीस");
        assertEquals(1, rec.proven);
        assertEquals(1, events.count("route:default/hi-IN:working"));
    }

    @Test
    public void errorCodesAreCountedForDiagnostics() {
        session.start();
        session.onError(a(), ERROR_NETWORK);
        clock.advance(300);
        session.onError(a(), ERROR_NETWORK);
        clock.advance(600);
        session.onError(a(), ERROR_RECOGNIZER_BUSY);
        assertEquals("2x2 8x1", session.errorSummary());
    }

    @Test
    public void aRouteThatHasWorkedIsNotAbandonedForNetworkTrouble() {
        rec.routes = new java.util.ArrayList<>(Arrays.asList("google/bn-IN", "default/bn-IN"));
        session.start();
        utterance("জয় হনুমান");
        clock.advance(120);
        for (int i = 0; i < 5; i++) {
            session.onError(a(), ERROR_NETWORK);
            clock.advance(5000);
        }
        assertEquals(0, events.count("route:google/bn-IN:failing") + events.count("route:default/bn-IN"));
        assertEquals(0, rec.route);
    }

    @Test
    public void exhaustedRoutesEndWithTheLastErrorCode() {
        rec.routes = new java.util.ArrayList<>(Arrays.asList("google/bn-IN", "default/bn-IN"));
        session.start();
        for (int i = 0; i < 20 && session.isRunning(); i++) {
            session.onError(a(), ERROR_NETWORK);
            clock.advance(5000);
        }
        assertEquals(1, events.count("route:default/bn-IN:failing"));
        assertEquals(1, events.count("fatal:network"));
        assertFalse(volume.isMuted(MUSIC));
    }

    @Test
    public void micBusyIsRetried() {
        session.start();
        session.onError(a(), ERROR_AUDIO);
        clock.advance(300);
        assertEquals(2, rec.starts);
        assertEquals(0, events.count("fatal"));
    }

    @Test
    public void hungRecogniserIsDetectedAndReplaced() {
        session.start();
        clock.advance(9999);
        assertEquals(1, rec.starts);
        clock.advance(1);
        assertEquals("final:1:", events.last());
        assertEquals(1, rec.count("destroy"));
        clock.advance(300);
        assertEquals(2, rec.starts);
    }

    @Test
    public void audioLevelUpdatesKeepALongUtteranceAlive() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        for (int i = 0; i < 300; i++) { // 30 s of chanting, RMS every 100 ms
            clock.advance(100);
            session.onRmsChanged(a);
        }
        assertEquals(0, rec.count("destroy"));
        assertEquals(1, rec.starts);
    }

    // ------------------------------------------------------- stop / background

    @Test
    public void stopRestoresSoundAndSilencesEverythingAfter() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        session.onPartialResults(a, "जय हनुमान");
        session.stop();
        assertFalse(volume.isMuted(MUSIC));
        assertEquals("state:off:stopped", events.last());
        int logged = events.log.size();
        session.onResults(a, "जय हनुमान ज्ञान");
        session.onError(a, ERROR_CLIENT);
        clock.advance(60000);
        assertEquals(logged, events.log.size());
        assertEquals(1, rec.starts);
        assertEquals(0, clock.pending());
    }

    @Test
    public void stopDuringBackoffCancelsTheRestart() {
        session.start();
        session.onError(a(), ERROR_NETWORK);
        session.stop();
        clock.advance(60000);
        assertEquals(1, rec.starts);
    }

    @Test
    public void backgroundFlushesTheUtteranceRestoresSoundAndResumes() {
        session.start();
        int a = a();
        session.onReadyForSpeech(a);
        session.onPartialResults(a, "जय हनुमान ज्ञान");
        session.pause();
        assertEquals(Arrays.asList("final:1:जय हनुमान ज्ञान", "state:off:background"),
            events.log.subList(events.log.size() - 2, events.log.size()));
        assertFalse("other apps get their sound back", volume.isMuted(MUSIC));
        assertEquals(1, rec.count("cancel"));
        session.onResults(a, "late");
        clock.advance(60000);
        assertEquals("nothing restarts in the background", 1, rec.starts);

        session.resume();
        assertEquals(2, rec.starts);
        assertTrue(volume.isMuted(MUSIC));
        assertEquals("state:on:resumed", events.log.get(events.log.size() - 1));
        utterance("गुन सागर");
        assertEquals("final:2:गुन सागर", events.last());
    }

    @Test
    public void startTwiceAndStopTwiceAreHarmless() {
        session.start();
        session.start();
        assertEquals(1, rec.starts);
        session.stop();
        session.stop();
        assertEquals(1, events.count("state:off"));
    }

    @Test
    public void wholeRecitationKeepsSegmentsInOrderWithOneFinalEach() {
        session.start();
        for (int i = 1; i <= 100; i++) {
            if (i % 7 == 0) { // a pause long enough for a timeout
                int a = a();
                session.onReadyForSpeech(a);
                clock.advance(5000);
                session.onError(a, ERROR_SPEECH_TIMEOUT);
            } else if (i % 13 == 0) {
                session.onError(a(), ERROR_RECOGNIZER_BUSY);
                clock.advance(300);
                continue;
            } else {
                utterance("शब्द " + i, "शब्द " + i + " पूरा");
            }
            clock.advance(120);
        }
        session.stop();
        int expected = 1;
        for (String e : events.log) {
            if (!e.startsWith("final:")) continue;
            assertEquals(expected++, Integer.parseInt(e.split(":")[1]));
        }
        // one final per attempt; the attempt still open at stop() is cancelled (JS flushes its own words)
        assertEquals(rec.starts - 1, expected - 1);
        assertEquals(100, expected - 1);
        assertFalse(volume.isMuted(MUSIC));
        assertEquals(0, events.count("fatal"));
    }

    @Test
    public void backoffIsCapped() {
        assertEquals(300, session.backoff(1));
        assertEquals(600, session.backoff(2));
        assertEquals(5000, session.backoff(6));
        assertEquals(5000, session.backoff(60));
    }
}
