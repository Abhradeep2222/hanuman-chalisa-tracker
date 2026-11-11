package com.abhradeep.hanumanchalisa.speech;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;

/**
 * Continuous, beep-free speech recognition for AI Voice Sync.
 *
 * JavaScript: window.Capacitor.Plugins.ChantRecognizer
 *   available()                         -> { available }
 *   checkPermissions() / requestPermissions({ permissions: ['microphone'] })
 *   start({ language, muteBeep })       -> { beepMuted }
 *   stop()
 *   getState()                          -> { listening, paused, attempts, beepMuted }
 *   events: partial { segment, text }, final { segment, text },
 *           error { code, message, fatal }, state { listening, reason, beepMuted }
 *
 * The logic lives in ChantSession / BeepGuard (unit-tested); this class only
 * adapts them to SpeechRecognizer, AudioManager and the Capacitor bridge. All
 * session work runs on the main thread, where SpeechRecognizer must live.
 */
@CapacitorPlugin(
    name = "ChantRecognizer",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = ChantRecognizerPlugin.MICROPHONE) }
)
public class ChantRecognizerPlugin extends Plugin {

    static final String MICROPHONE = "microphone";
    private static final String PREFS = "chant_recognizer";
    private static final String KEY_MUTED = "muted_streams";

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private BeepGuard guard;
    private ChantSession session;
    private String language = "hi-IN";

    @Override
    public void load() {
        Context ctx = getContext();
        AudioManager audio = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        guard = new BeepGuard(new AndroidVolume(audio), new PrefsLedger(prefs), AudioManager.STREAM_MUSIC);
        session = new ChantSession(new AndroidRecognizer(), new JsEvents(), new MainScheduler(), guard, new ChantSession.Timing());
        // A previous run that was killed while listening may have left media muted.
        main.post(() -> guard.recoverFromCrash());
    }

    @PluginMethod
    public void available(PluginCall call) {
        main.post(() -> call.resolve(new JSObject().put("available", SpeechRecognizer.isRecognitionAvailable(getContext()))));
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState(MICROPHONE) != PermissionState.GRANTED) {
            call.reject("Microphone permission is required.", "permission");
            return;
        }
        final String lang = call.getString("language", "hi-IN");
        final boolean muteBeep = !Boolean.FALSE.equals(call.getBoolean("muteBeep", true));
        main.post(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("No speech recognition service on this device.", "unavailable");
                return;
            }
            if (session.isRunning()) session.stop();
            language = lang;
            guard.setEnabled(muteBeep);
            session.start();
            call.resolve(new JSObject().put("beepMuted", session.beepMuted()));
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            session.stop();
            call.resolve();
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        main.post(() -> call.resolve(
            new JSObject()
                .put("listening", session.isListening())
                .put("paused", session.isPaused())
                .put("attempts", session.attemptsStarted())
                .put("beepMuted", session.beepMuted())
        ));
    }

    // Android gives a backgrounded app no microphone: pause there, resume on return.
    @Override
    protected void handleOnPause() {
        if (session != null) session.pause();
    }

    @Override
    protected void handleOnResume() {
        if (session != null) session.resume();
    }

    @Override
    protected void handleOnDestroy() {
        if (session != null) session.stop();
        if (guard != null) guard.release();
    }

    private Intent buildIntent() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        // Lets Google's recogniser run through short pauses inside a line.
        intent.putExtra("android.speech.extra.DICTATION_MODE", true);
        return intent;
    }

    private static String firstResult(Bundle bundle) {
        if (bundle == null) return "";
        ArrayList<String> list = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return list == null || list.isEmpty() || list.get(0) == null ? "" : list.get(0);
    }

    private final class AndroidRecognizer implements ChantSession.Recognizer {

        @Override
        public void start(int attempt) {
            if (recognizer == null) recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new Listener(attempt));
            recognizer.startListening(buildIntent());
        }

        @Override
        public void cancel() {
            if (recognizer != null) recognizer.cancel();
        }

        @Override
        public void destroy() {
            if (recognizer == null) return;
            try {
                recognizer.destroy();
            } finally {
                recognizer = null;
            }
        }
    }

    /** One listener per attempt, so callbacks of an ended attempt can be told apart. */
    private final class Listener implements RecognitionListener {

        private final int attempt;

        Listener(int attempt) {
            this.attempt = attempt;
        }

        @Override
        public void onReadyForSpeech(Bundle params) {
            session.onReadyForSpeech(attempt);
        }

        @Override
        public void onBeginningOfSpeech() {
            session.onBeginningOfSpeech(attempt);
        }

        @Override
        public void onRmsChanged(float rmsdB) {
            session.onRmsChanged(attempt);
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {
            session.onEndOfSpeech(attempt);
        }

        @Override
        public void onError(int error) {
            Logger.debug("ChantRecognizer", "attempt " + attempt + " error " + error);
            session.onError(attempt, error);
        }

        @Override
        public void onResults(Bundle results) {
            session.onResults(attempt, firstResult(results));
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            session.onPartialResults(attempt, firstResult(partialResults));
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }

    private final class JsEvents implements ChantSession.Events {

        @Override
        public void onPartial(int segment, String text) {
            notifyListeners("partial", new JSObject().put("segment", segment).put("text", text));
        }

        @Override
        public void onFinal(int segment, String text) {
            notifyListeners("final", new JSObject().put("segment", segment).put("text", text));
        }

        @Override
        public void onError(String code, String message, boolean fatal) {
            notifyListeners("error", new JSObject().put("code", code).put("message", message).put("fatal", fatal));
        }

        @Override
        public void onState(boolean listening, String reason) {
            notifyListeners(
                "state",
                new JSObject().put("listening", listening).put("reason", reason).put("beepMuted", guard.isEngaged())
            );
        }
    }

    private final class MainScheduler implements ChantSession.Scheduler {

        @Override
        public Object schedule(Runnable task, long delayMs) {
            main.postDelayed(task, delayMs);
            return task;
        }

        @Override
        public void cancel(Object token) {
            main.removeCallbacks((Runnable) token);
        }

        @Override
        public long now() {
            return SystemClock.elapsedRealtime();
        }
    }

    private static final class AndroidVolume implements BeepGuard.Volume {

        private final AudioManager audio;

        AndroidVolume(AudioManager audio) {
            this.audio = audio;
        }

        @Override
        public boolean isMuted(int stream) {
            return audio == null || audio.isStreamMute(stream);
        }

        @Override
        public void setMuted(int stream, boolean muted) {
            if (audio == null) return;
            // flags 0: no volume panel pops up
            audio.adjustStreamVolume(stream, muted ? AudioManager.ADJUST_MUTE : AudioManager.ADJUST_UNMUTE, 0);
        }
    }

    private static final class PrefsLedger implements BeepGuard.Ledger {

        private final SharedPreferences prefs;

        PrefsLedger(SharedPreferences prefs) {
            this.prefs = prefs;
        }

        @Override
        public int[] load() {
            String raw = prefs.getString(KEY_MUTED, "");
            if (raw == null || raw.isEmpty()) return new int[0];
            String[] parts = raw.split(",");
            int[] out = new int[parts.length];
            int n = 0;
            for (String p : parts) {
                try {
                    out[n++] = Integer.parseInt(p.trim());
                } catch (NumberFormatException ignored) {
                    // skip a corrupt entry
                }
            }
            int[] trimmed = new int[n];
            System.arraycopy(out, 0, trimmed, 0, n);
            return trimmed;
        }

        @Override
        public void save(int[] streams) {
            StringBuilder sb = new StringBuilder();
            for (int s : streams) {
                if (sb.length() > 0) sb.append(',');
                sb.append(s);
            }
            // commit(), not apply(): the record must be on disk before the stream is muted
            prefs.edit().putString(KEY_MUTED, sb.toString()).commit();
        }
    }
}
