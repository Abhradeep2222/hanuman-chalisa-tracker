package com.abhradeep.hanumanchalisa.speech;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Silences the system "listening" beeps while AI Voice Sync is listening.
 *
 * Android's SpeechRecognizer plays an earcon every time listening starts, and
 * on many phones again when speech ends or nothing was recognised. Recognition
 * has to be restarted after every pause in the chant, so without this the
 * phone beeps between lines. There is no API to turn the earcon off; the
 * established workaround is to mute the stream it plays on (STREAM_MUSIC on
 * current Android). The end/no-match earcons are played by the recognition
 * service at the same moment it reports the event, so muting "just in time"
 * races them; the guard is therefore held for the whole listening session
 * (voice mode pauses the app's own audio anyway).
 *
 * Guarantees:
 *  - a stream the user had already muted is never touched (so never unmuted);
 *  - if the user unmutes a stream during the session (volume keys), the guard
 *    respects that and does not mute it again until the next session;
 *  - release() unmutes exactly the streams this guard muted;
 *  - the muted streams are written to a ledger BEFORE muting, so if the app is
 *    killed while listening the next launch restores them (recoverFromCrash()).
 *
 * Pure Java (no Android imports) so it is unit-tested on the JVM.
 */
public final class BeepGuard {

    /** Stream mute control (AudioManager in the app, a fake in tests). */
    public interface Volume {
        boolean isMuted(int stream);

        void setMuted(int stream, boolean muted);
    }

    /** Persists which streams are currently muted by the guard. */
    public interface Ledger {
        int[] load();

        void save(int[] streams);
    }

    private final Volume volume;
    private final Ledger ledger;
    private final int[] streams;
    private final Set<Integer> mutedByUs = new LinkedHashSet<>();
    private final Set<Integer> userOverrode = new LinkedHashSet<>();
    private boolean enabled = true;

    public BeepGuard(Volume volume, Ledger ledger, int... streams) {
        this.volume = volume;
        this.ledger = ledger;
        this.streams = streams.clone();
    }

    /** Undo a mute left behind by a previous process that was killed mid-window. */
    public void recoverFromCrash() {
        int[] left = ledger.load();
        if (left == null || left.length == 0) return;
        for (int stream : left) {
            try {
                if (volume.isMuted(stream)) volume.setMuted(stream, false);
            } catch (RuntimeException ignored) {
                // a stream that cannot be changed is left as it is
            }
        }
        ledger.save(new int[0]);
    }

    public void setEnabled(boolean enabled) {
        if (!enabled) release();
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Mute the beep streams (idempotent). Returns true if any stream is held muted. */
    public boolean engage() {
        if (!enabled) return false;
        for (int stream : streams) {
            if (userOverrode.contains(stream)) continue;
            if (mutedByUs.contains(stream)) {
                boolean stillMuted;
                try {
                    stillMuted = volume.isMuted(stream);
                } catch (RuntimeException e) {
                    stillMuted = true;
                }
                if (!stillMuted) {
                    // Unmuted from outside (volume keys): the user wants sound.
                    mutedByUs.remove(stream);
                    userOverrode.add(stream);
                    ledger.save(toArray(mutedByUs));
                }
                continue;
            }
            boolean alreadyMuted;
            try {
                alreadyMuted = volume.isMuted(stream);
            } catch (RuntimeException e) {
                continue;
            }
            if (alreadyMuted) continue; // the user's own mute: not ours to undo
            mutedByUs.add(stream);
            ledger.save(toArray(mutedByUs)); // record first: a crash must not leave it muted
            try {
                volume.setMuted(stream, true);
            } catch (RuntimeException e) {
                mutedByUs.remove(stream); // e.g. SecurityException under Do Not Disturb
                ledger.save(toArray(mutedByUs));
            }
        }
        return !mutedByUs.isEmpty();
    }

    /** Unmute exactly what engage() muted (idempotent). Ends the session. */
    public void release() {
        userOverrode.clear();
        if (mutedByUs.isEmpty()) return;
        for (int stream : mutedByUs) {
            try {
                volume.setMuted(stream, false);
            } catch (RuntimeException ignored) {
                // nothing more we can do; the ledger is still cleared below
            }
        }
        mutedByUs.clear();
        ledger.save(new int[0]);
    }

    public boolean isEngaged() {
        return !mutedByUs.isEmpty();
    }

    private static int[] toArray(Set<Integer> set) {
        int[] out = new int[set.size()];
        int i = 0;
        for (int v : set) out[i++] = v;
        return out;
    }
}
