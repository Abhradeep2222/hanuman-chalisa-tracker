package com.abhradeep.hanumanchalisa.speech;

import static org.junit.Assert.assertEquals;

import android.media.AudioManager;
import android.speech.SpeechRecognizer;
import org.junit.Test;

/** ChantSession mirrors the SDK's error codes so it can be tested without Android. */
public class ErrorCodesMatchSdkTest {

    @Test
    public void errorCodesMatchTheSdk() {
        assertEquals(SpeechRecognizer.ERROR_NETWORK_TIMEOUT, ChantSession.ERROR_NETWORK_TIMEOUT);
        assertEquals(SpeechRecognizer.ERROR_NETWORK, ChantSession.ERROR_NETWORK);
        assertEquals(SpeechRecognizer.ERROR_AUDIO, ChantSession.ERROR_AUDIO);
        assertEquals(SpeechRecognizer.ERROR_SERVER, ChantSession.ERROR_SERVER);
        assertEquals(SpeechRecognizer.ERROR_CLIENT, ChantSession.ERROR_CLIENT);
        assertEquals(SpeechRecognizer.ERROR_SPEECH_TIMEOUT, ChantSession.ERROR_SPEECH_TIMEOUT);
        assertEquals(SpeechRecognizer.ERROR_NO_MATCH, ChantSession.ERROR_NO_MATCH);
        assertEquals(SpeechRecognizer.ERROR_RECOGNIZER_BUSY, ChantSession.ERROR_RECOGNIZER_BUSY);
        assertEquals(SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS, ChantSession.ERROR_INSUFFICIENT_PERMISSIONS);
        assertEquals(SpeechRecognizer.ERROR_TOO_MANY_REQUESTS, ChantSession.ERROR_TOO_MANY_REQUESTS);
        assertEquals(SpeechRecognizer.ERROR_SERVER_DISCONNECTED, ChantSession.ERROR_SERVER_DISCONNECTED);
        assertEquals(SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, ChantSession.ERROR_LANGUAGE_NOT_SUPPORTED);
        assertEquals(SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE, ChantSession.ERROR_LANGUAGE_UNAVAILABLE);
    }

    @Test
    public void testsUseTheRealMusicStream() {
        assertEquals(AudioManager.STREAM_MUSIC, Fakes.MUSIC);
    }
}
