## 🕉️ Shri Hanuman Chalisa v1.4.1: press Start and just chant

### ✅ AI Voice Sync now starts on every phone
- **Fixed:** on Samsung phones (e.g. Galaxy S23) with the বাংলা script, AI Voice Sync stopped with "speech recognition is not available". The app now tries every recogniser on the phone: Google's first (the one Gboard voice typing uses), then the phone's default and any others. If a language is missing it moves to the next one (Hindi, then Bengali, then English) without showing an error.
- Recognition now runs in **Hindi for every script**. The verses are the same Awadhi words in Hindi, Bengali or English letters, and Hindi recognition is on almost every phone. Your words are still matched against the script on screen.
- **The screen stays on while you chant.** Before, the screen could turn off after about 30 seconds, which paused the microphone.

### 🎙️ Follows your voice at any pace
- **Slow chanting:** a pause inside a line no longer closes the line early, and each word lights up within a second of saying it, without waiting for the next word.
- **Fast chanting:** words the recogniser runs together ("ज्ञानगुन", "तीनोंलोककाँपै") are split back into words, so they count. Revised or merged words are never counted twice.
- **Soft voice:** even when a third of the words are lost, the Chalisa completes in order. A live level meter shows the microphone hears you, and a hint appears if your voice is too soft.
- Accuracy is never shown higher than what was really recognised.

### 📱 Display
- The header no longer sits under the phone's status bar (clock, camera and battery icons). It also clears the camera cutout in landscape.

### 🧪 Tested
- 42 native tests: beep-free restarts, the recogniser and language fallbacks, failures, background/resume.
- 48 web tests, including whole recitations chanted slow, fast, softly and with different recogniser behaviours.
- A sweep of 30 simulated recitations per chanting style.

### 📲 Install / update
- **From v1.4.0:** open the APK below. It installs straight over your current app and keeps your count and streak.
- **From v1.3 or older:** uninstall the old app once, then install.
