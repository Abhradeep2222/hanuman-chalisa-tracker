## 🕉️ Shri Hanuman Chalisa v1.6.0: a chanting recogniser that runs on your phone

### 🎙️ AI Voice Sync listens on the phone itself
- A new recogniser (Vosk, open source) now runs inside the app and is the default. It works **offline**, the same way with or without internet, and **never beeps**, because it never restarts. Phone sounds are no longer muted while you chant.
- It listens only for the verse words around where you are, so it follows you however you chant: slowly, very fast, softly, or with pauses.
- **Pause any time.** Tap Pause, or simply stop chanting. **Resume** goes on from the very word you stopped at.
- **Go back or start anywhere.** Repeat an earlier line, or begin in the middle of the Chalisa, and the highlight finds you. A line you chant again gets a fresh score; it is not counted twice.
- **Headphones:** pick your headset microphone in Settings → Microphone. Automatic gain keeps soft and loud voices at a steady level.
- **Learns your voice:** the recogniser adapts to your voice as you chant, and words it keeps hearing differently from you are remembered (on this phone only).
- The phone's own speech service (Google) is still available: Settings → AI Voice Sync recogniser → Speech service.

### 📿 Jap counter
- A large counter button in the bottom bar: tap it once for each jap. A long-press or **Undo** takes one back. You can switch it off in Settings.
- Set any goal from 1 to 1008 with **Other**, besides 1 / 7 / 11 / 21 / 108.

### ✅ Tested
- The recogniser was run on full recitations in natural Hindi voices (male and female): normal, very slow with long gaps, very fast without gaps, 6–15 s pauses, going back twice, starting mid-way, a noisy room and a soft voice. Every line was followed, 88–98% of words were recognised, and no line that was not chanted was ever scored.
- The real app was tested in Chrome with those recitations as the microphone. Each line turns green as it ends (within 1.6 s), with no page errors.
- 68 web tests and the native tests run on every build.

### 📲 Update
- **From v1.4 / v1.5:** open the APK below. It installs over your app and keeps your count and streak.
- **From v1.3 or older:** uninstall the old app once, then install.
- The first time you start AI Voice Sync, the app unpacks its speech model (a few seconds, once).
