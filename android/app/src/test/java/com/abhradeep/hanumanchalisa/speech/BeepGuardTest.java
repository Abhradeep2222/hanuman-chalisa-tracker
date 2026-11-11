package com.abhradeep.hanumanchalisa.speech;

import static com.abhradeep.hanumanchalisa.speech.Fakes.MUSIC;
import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import org.junit.Before;
import org.junit.Test;

public class BeepGuardTest {

    private Fakes.Volume volume;
    private Fakes.Ledger ledger;
    private BeepGuard guard;

    @Before
    public void setUp() {
        volume = new Fakes.Volume();
        ledger = new Fakes.Ledger();
        volume.ledger = ledger;
        guard = new BeepGuard(volume, ledger, MUSIC);
    }

    @Test
    public void engageMutesAndReleaseRestores() {
        assertTrue(guard.engage());
        assertTrue(volume.isMuted(MUSIC));
        guard.release();
        assertFalse(volume.isMuted(MUSIC));
        assertEquals(Arrays.asList("mute:3", "unmute:3"), volume.calls);
    }

    @Test
    public void engageAndReleaseAreIdempotent() {
        guard.engage();
        guard.engage();
        guard.engage();
        guard.release();
        guard.release();
        assertEquals(Arrays.asList("mute:3", "unmute:3"), volume.calls);
    }

    @Test
    public void streamTheUserMutedIsNeverTouched() {
        volume.userChanges(MUSIC, true);
        assertFalse(guard.engage());
        guard.release();
        assertTrue("still muted by the user", volume.isMuted(MUSIC));
        assertTrue(volume.calls.isEmpty());
    }

    @Test
    public void userUnmutingDuringSessionIsRespectedUntilNextSession() {
        guard.engage();
        volume.userChanges(MUSIC, false); // volume key pressed while listening
        assertFalse(guard.engage());
        assertFalse(volume.isMuted(MUSIC));
        assertFalse(guard.isEngaged());
        assertArrayEquals(new int[0], ledger.stored);
        guard.release(); // session ends; nothing of ours to undo
        assertEquals(Arrays.asList("mute:3"), volume.calls);
        assertTrue("a new session mutes again", guard.engage());
    }

    @Test
    public void ledgerIsWrittenBeforeMuting() {
        guard.engage();
        assertTrue(volume.ledgerHadStreamWhenMuted);
        assertArrayEquals(new int[] { MUSIC }, ledger.stored);
        guard.release();
        assertArrayEquals(new int[0], ledger.stored);
    }

    @Test
    public void crashRecoveryUnmutesWhatAKilledProcessLeftMuted() {
        ledger.stored = new int[] { MUSIC };
        volume.userChanges(MUSIC, true);
        guard.recoverFromCrash();
        assertFalse(volume.isMuted(MUSIC));
        assertArrayEquals(new int[0], ledger.stored);
    }

    @Test
    public void crashRecoveryLeavesAnAlreadyRestoredStreamAlone() {
        ledger.stored = new int[] { MUSIC };
        guard.recoverFromCrash(); // user already raised the volume
        assertTrue(volume.calls.isEmpty());
        assertArrayEquals(new int[0], ledger.stored);
    }

    @Test
    public void refusedMuteIsNotRecorded() {
        volume.throwOnMute = true; // e.g. Do Not Disturb policy
        assertFalse(guard.engage());
        assertArrayEquals(new int[0], ledger.stored);
        guard.release();
        assertTrue(volume.calls.isEmpty());
    }

    @Test
    public void disabledGuardDoesNothingAndDisablingReleases() {
        guard.engage();
        guard.setEnabled(false);
        assertFalse(volume.isMuted(MUSIC));
        assertFalse(guard.engage());
        assertFalse(volume.isMuted(MUSIC));
    }
}
