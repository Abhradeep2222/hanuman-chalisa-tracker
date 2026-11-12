## 🕉️ Shri Hanuman Chalisa v1.5.0: a new look, and a voice sync that learns you

### 🔇 The beeps are gone on Samsung phones too
- Android 14/15 phones (Samsung included) play the recogniser's start and stop beeps on the notification and system sound channels, not on media. While AI Voice Sync listens, the app now mutes those channels as well.
- Everything is restored the moment you tap **Stop**, switch modes or leave the app, and after a crash on the next start. A channel you had muted yourself is never touched.
- While you chant, phone notification sounds are silent too. Calls and notifications still show on screen.

### 🎙️ Hears your chanting better
- **Stays in Hindi.** If the recogniser fails for a moment, the app now retries or moves to another recogniser in the same language. It never slides into English, which garbled Awadhi words ("abudhika Mel…" for "प्रभु मुद्रिका मेलि"). Only a language that is truly missing makes it change language.
- **Remembers what works.** The recogniser that recognised your chanting is tried first next time.
- **Downloads what is missing.** If the phone has the Hindi speech pack but not downloaded (Android 13+), the app asks Android to download it once, and says so.
- **Knows what comes next.** On Android 13+, the line you are on and the next two lines go to the recogniser as hints, so it favours the Chalisa's words.
- **Learns your voice.** When the recogniser keeps hearing one word of yours differently (for example "मुंदरी" for "मुद्रिका"), the app remembers that form for that exact word. From the second time on, the word counts. This is stored on your phone only; Settings → **Forget** clears it.
- Settings now shows a **Voice diagnostics** line: which recogniser and language are in use, its errors, and whether the beep is muted. A screenshot of it shows exactly what is happening on your phone.

### 🪔 New logo and design
- A new logo: the sun that child Hanuman leapt for ("जुग सहस्र जोजन पर भानू"), with his gada in front. It is the app icon, the splash screen and the header mark.
- A warmer look, as if reading by a diya: sindoor and temple brass on a lamp-lit dark, or kumkum on sandal in the day theme.
- The title shows in the script you read (श्री हनुमान चालीसा / শ্রী হনুমান চালিসা / Shri Hanuman Chalisa).
- Verses are set in Tiro, typefaces made for Indic book printing, and the interface in Mukta. The fonts now ship inside the app, so the APK looks right offline.
- The phone's status-bar icons follow the app's light/dark theme.

### ✅ Tested
- 47 native tests: beep guard on all channels, staying in the same language, language download, route memory, diagnostics.
- 51 web tests, including voice learning across recitations and verse hints.
- Whole recitations chanted slow, fast, softly and with different recogniser behaviours.
- The layout was checked at 320–1280 px in both themes and all three scripts.

### 📲 Update
- **From v1.4.x:** open the APK below. It installs over your app and keeps your count and streak.
- **From v1.3 or older:** uninstall the old app once, then install.
