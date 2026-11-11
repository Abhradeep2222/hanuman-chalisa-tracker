package com.abhradeep.hanumanchalisa;

import android.os.Bundle;
import com.abhradeep.hanumanchalisa.speech.ChantRecognizerPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugin: continuous, beep-free recognition for AI Voice Sync.
        registerPlugin(ChantRecognizerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
