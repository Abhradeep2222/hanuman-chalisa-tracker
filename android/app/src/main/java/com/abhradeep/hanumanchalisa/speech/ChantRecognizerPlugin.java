package com.abhradeep.hanumanchalisa.speech;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ResolveInfo;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognitionService;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Continuous, beep-free speech recognition for AI Voice Sync.
 *
 * JavaScript: window.Capacitor.Plugins.ChantRecognizer
 *   available()                         -> { available }
 *   checkPermissions() / requestPermissions({ permissions: ['microphone'] })
 *   start({ language, muteBeep })       -> { beepMuted, language, service }
 *   stop()
 *   getState()                          -> { listening, paused, attempts, beepMuted, language, service }
 *   events: partial { segment, text }, final { segment, text },
 *           error { code, message, fatal }, state { listening, reason, beepMuted },
 *           route { language, service, reason }
 *
 * Phones differ in which recognition service is the default (Samsung often
 * uses its own, which has no Bengali; others use Google's on-device one, which
 * only knows downloaded languages). The plugin therefore tries routes in
 * order: Google's recogniser (the one Gboard voice typing uses), the phone's
 * default, then any other installed service; first in the requested language,
 * then Hindi, then English. The web layer matches every script, so a Hindi
 * transcript still tracks the Bengali display.
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

    /** Google app's recognition service: online + downloaded offline languages. */
    static final ComponentName GOOGLE_RECOGNIZER = new ComponentName(
        "com.google.android.googlequicksearchbox",
        "com.google.android.voicesearch.serviceapi.GoogleRecognitionService"
    );

    /** A recognition service (null = the phone's default) and a language. */
    static final class Route {

        final ComponentName service;
        final String language;

        Route(ComponentName service, String language) {
            this.service = service;
            this.language = language;
        }

        String serviceName() {
            return service == null ? "default" : service.getPackageName();
        }
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private BeepGuard guard;
    private ChantSession session;
    private final List<Route> routes = new ArrayList<>();
    private int routeIndex;
    private boolean jsWantsAwake;
    private long lastLevelAt;
    private static final long LEVEL_INTERVAL_MS = 100;

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
        final List<String> fallbacks = new ArrayList<>();
        JSArray requested = call.getArray("fallbackLanguages");
        if (requested != null) {
            for (int i = 0; i < requested.length(); i++) {
                String l = requested.optString(i, "");
                if (!l.isEmpty()) fallbacks.add(l);
            }
        } else {
            fallbacks.add("hi-IN");
            fallbacks.add("en-IN");
        }
        final boolean muteBeep = !Boolean.FALSE.equals(call.getBoolean("muteBeep", true));
        main.post(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("No speech recognition service on this device.", "unavailable");
                return;
            }
            if (session.isRunning()) session.stop();
            planRoutes(lang, fallbacks);
            guard.setEnabled(muteBeep);
            session.start();
            Route r = route();
            call.resolve(
                new JSObject().put("beepMuted", session.beepMuted()).put("language", r.language).put("service", r.serviceName())
            );
        });
    }

    private Route route() {
        return routes.get(Math.min(routeIndex, routes.size() - 1));
    }

    private void planRoutes(String requested, List<String> fallbacks) {
        routes.clear();
        routeIndex = 0;
        List<ComponentName> services = recognitionServices();
        Set<String> languages = new LinkedHashSet<>();
        languages.add(requested);
        languages.addAll(fallbacks);
        for (String lang : languages) {
            for (ComponentName service : services) routes.add(new Route(service, lang));
        }
        Logger.debug("ChantRecognizer", "routes: " + routes.size() + " (" + services.size() + " services)");
    }

    /** Google's recogniser first, then the phone's default, then every other installed service. */
    private List<ComponentName> recognitionServices() {
        List<ComponentName> installed = new ArrayList<>();
        try {
            List<ResolveInfo> found = getContext().getPackageManager().queryIntentServices(new Intent(RecognitionService.SERVICE_INTERFACE), 0);
            for (ResolveInfo info : found) {
                if (info.serviceInfo != null) installed.add(new ComponentName(info.serviceInfo.packageName, info.serviceInfo.name));
            }
        } catch (RuntimeException e) {
            Logger.debug("ChantRecognizer", "cannot list recognition services: " + e);
        }
        ComponentName phoneDefault = null;
        try {
            String flat = Settings.Secure.getString(getContext().getContentResolver(), "voice_recognition_service");
            if (flat != null && !flat.isEmpty()) phoneDefault = ComponentName.unflattenFromString(flat);
        } catch (RuntimeException ignored) {
            // not readable on this phone: the default may then be tried twice, which is harmless
        }

        List<ComponentName> ordered = new ArrayList<>();
        if (installed.contains(GOOGLE_RECOGNIZER)) ordered.add(GOOGLE_RECOGNIZER);
        if (!GOOGLE_RECOGNIZER.equals(phoneDefault)) ordered.add(null); // null = createSpeechRecognizer(context)
        for (ComponentName c : installed) {
            if (!ordered.contains(c) && !c.equals(phoneDefault)) ordered.add(c);
        }
        return ordered;
    }

    /**
     * Keep the screen on (Android WebView has no Wake Lock API). While a session
     * runs the screen is kept on regardless: when it turns off, Android pauses
     * the app and the microphone stops.
     */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        main.post(() -> {
            jsWantsAwake = on;
            applyKeepScreenOn();
            call.resolve();
        });
    }

    private void applyKeepScreenOn() {
        Activity activity = getActivity();
        if (activity == null) return;
        Window window = activity.getWindow();
        if (window == null) return;
        if (jsWantsAwake || (session != null && session.isRunning())) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
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
        main.post(() -> {
            JSObject state = new JSObject()
                .put("listening", session.isListening())
                .put("paused", session.isPaused())
                .put("attempts", session.attemptsStarted())
                .put("beepMuted", session.beepMuted());
            if (!routes.isEmpty()) state.put("language", route().language).put("service", route().serviceName());
            call.resolve(state);
        });
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
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, route().language);
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
            if (recognizer == null) {
                ComponentName service = route().service;
                recognizer = service == null
                    ? SpeechRecognizer.createSpeechRecognizer(getContext())
                    : SpeechRecognizer.createSpeechRecognizer(getContext(), service);
            }
            recognizer.setRecognitionListener(new Listener(attempt));
            recognizer.startListening(buildIntent());
        }

        @Override
        public boolean fallBack() {
            if (routeIndex + 1 >= routes.size()) return false;
            destroy();
            routeIndex++;
            Logger.debug("ChantRecognizer", "falling back to " + route().serviceName() + " / " + route().language);
            return true;
        }

        @Override
        public String language() {
            return route().language;
        }

        @Override
        public String service() {
            return route().serviceName();
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
            if (!session.isListening()) return;
            long now = SystemClock.elapsedRealtime();
            if (now - lastLevelAt < LEVEL_INTERVAL_MS) return;
            lastLevelAt = now;
            notifyListeners("level", new JSObject().put("rms", (double) rmsdB));
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
            applyKeepScreenOn();
            notifyListeners(
                "state",
                new JSObject().put("listening", listening).put("reason", reason).put("beepMuted", guard.isEngaged())
            );
        }

        @Override
        public void onRoute(String language, String service, String reason) {
            notifyListeners("route", new JSObject().put("language", language).put("service", service).put("reason", reason));
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
