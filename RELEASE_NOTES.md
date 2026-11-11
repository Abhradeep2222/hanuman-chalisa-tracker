## 🕉️ Shri Hanuman Chalisa v1.4.0: AI Voice Sync rebuilt

### 🔇 No more beeping while you chant (Android)
- Android's speech recogniser stops after every pause and plays a system beep each time it starts again, so the phone used to beep between lines. The app now has its own native recogniser: it restarts instantly after every pause and keeps that system beep muted while AI Voice Sync is listening.
- Media volume is restored the moment you tap **Stop**, switch modes, or leave the app. If you had already muted your phone, the app leaves it alone. Pressing a volume key while chanting turns sound back on and the app respects that.
- Words at the end of a line are no longer lost when the recogniser restarts.
- Listening pauses when the app goes to the background and resumes when you return.

### 🎙️ Honest, in-order chanting tracker
- Words are matched in order. The tracker never runs ahead of you, and greetings or chatter no longer complete a line.
- Hindi, Bengali and English spellings now agree for 97% of words (was 88%), so all three scripts track the same verses.
- **Accuracy** = words recognised ÷ words chanted. There is no hidden 88% floor or fake 96% score any more.
- Clear messages for a missing microphone permission, no internet, or a missing offline speech pack.

### 📱 Phone layout fixes
- The active verse line is readable in the light theme (it was white on cream).
- The full title shows on small phones, the 21× / 108× goal buttons are visible, and the settings sheet fits in landscape.

### ✅ Tested
- 36 native unit tests for the recogniser and the beep guard: restarts, silence, network loss, a busy or hung recogniser, permission loss, background and resume, and a 100-utterance session.
- 33 web tests for the matching engine and the app's voice wiring.
- Both suites run on every build before the APK is made.

### 📲 Install / update
1. Download **HanumanChalisa.apk** below on your Android phone and open it.
2. **Coming from v1.3 or older:** uninstall the old app first. Older builds were signed with a temporary key, so Android cannot update them in place. Your saved count and streak will be reset. From v1.4 on, every update installs directly over the previous version.
3. On first use of AI Voice Sync, allow the microphone. To chant without internet, download the offline Hindi (or Bengali) speech pack in the Google app → Settings → Voice → Offline speech recognition.
