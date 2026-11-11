package com.abhradeep.hanumanchalisa.speech;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Test doubles for ChantSession / BeepGuard: virtual clock, recogniser, volume, ledger. */
final class Fakes {

    static final int MUSIC = 3; // AudioManager.STREAM_MUSIC

    private Fakes() {}

    /** Deterministic scheduler: time only moves when the test advances it. */
    static final class Clock implements ChantSession.Scheduler {

        static final class Task {
            final long at;
            final Runnable run;
            boolean cancelled;

            Task(long at, Runnable run) {
                this.at = at;
                this.run = run;
            }
        }

        long now;
        final List<Task> tasks = new ArrayList<>();

        @Override
        public Object schedule(Runnable task, long delayMs) {
            Task t = new Task(now + delayMs, task);
            tasks.add(t);
            return t;
        }

        @Override
        public void cancel(Object token) {
            ((Task) token).cancelled = true;
        }

        @Override
        public long now() {
            return now;
        }

        /** Run every task due within the next {@code ms}, in time order. */
        void advance(long ms) {
            long target = now + ms;
            while (true) {
                Task next = null;
                for (Task t : tasks) {
                    if (!t.cancelled && t.at <= target && (next == null || t.at < next.at)) next = t;
                }
                if (next == null) break;
                tasks.remove(next);
                now = next.at;
                next.run.run();
            }
            now = target;
            tasks.removeIf(t -> t.cancelled);
        }

        int pending() {
            int n = 0;
            for (Task t : tasks) if (!t.cancelled) n++;
            return n;
        }
    }

    static final class Volume implements BeepGuard.Volume {

        final Map<Integer, Boolean> muted = new HashMap<>();
        final List<String> calls = new ArrayList<>();
        boolean throwOnMute;
        Ledger ledger; // to check write ordering
        boolean ledgerHadStreamWhenMuted = true;

        @Override
        public boolean isMuted(int stream) {
            return Boolean.TRUE.equals(muted.get(stream));
        }

        @Override
        public void setMuted(int stream, boolean m) {
            if (m && throwOnMute) throw new SecurityException("Not allowed to change Do Not Disturb state");
            if (m && ledger != null) {
                boolean found = false;
                for (int s : ledger.load()) found |= s == stream;
                ledgerHadStreamWhenMuted &= found;
            }
            calls.add((m ? "mute:" : "unmute:") + stream);
            muted.put(stream, m);
        }

        /** The user pressing a volume key. */
        void userChanges(int stream, boolean m) {
            muted.put(stream, m);
        }
    }

    static final class Ledger implements BeepGuard.Ledger {

        int[] stored = new int[0];

        @Override
        public int[] load() {
            return stored.clone();
        }

        @Override
        public void save(int[] streams) {
            stored = streams.clone();
        }
    }

    static final class Recognizer implements ChantSession.Recognizer {

        final List<String> calls = new ArrayList<>();
        int lastAttempt;
        int starts;
        int throwOnStarts; // number of upcoming start() calls that throw
        Volume volume;
        final List<Boolean> mutedAtStart = new ArrayList<>();

        @Override
        public void start(int attempt) {
            if (volume != null) mutedAtStart.add(volume.isMuted(MUSIC));
            calls.add("start");
            if (throwOnStarts > 0) {
                throwOnStarts--;
                throw new IllegalStateException("recogniser not bound");
            }
            lastAttempt = attempt;
            starts++;
        }

        @Override
        public void cancel() {
            calls.add("cancel");
        }

        @Override
        public void destroy() {
            calls.add("destroy");
        }

        int count(String call) {
            int n = 0;
            for (String c : calls) if (c.equals(call)) n++;
            return n;
        }
    }

    static final class Events implements ChantSession.Events {

        final List<String> log = new ArrayList<>();

        @Override
        public void onPartial(int segment, String text) {
            log.add("partial:" + segment + ":" + text);
        }

        @Override
        public void onFinal(int segment, String text) {
            log.add("final:" + segment + ":" + text);
        }

        @Override
        public void onError(String code, String message, boolean fatal) {
            log.add((fatal ? "fatal:" : "notice:") + code);
        }

        @Override
        public void onState(boolean listening, String reason) {
            log.add("state:" + (listening ? "on" : "off") + ":" + reason);
        }

        long count(String prefix) {
            return log.stream().filter(s -> s.startsWith(prefix)).count();
        }

        String last() {
            return log.isEmpty() ? null : log.get(log.size() - 1);
        }
    }
}
