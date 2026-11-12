# 🕉️ Shri Hanuman Chalisa | AI Devotional Kara-Sync & Mobile App

[![Live App](https://img.shields.io/badge/Live%20App-Click%20To%20Open-FF7A00?style=for-the-badge&logo=googlechrome&logoColor=white)](https://abhradeep2222.github.io/hanuman-chalisa-tracker/)
[![Download Android APK](https://img.shields.io/badge/Download-Android%20APK%20(latest)-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/Abhradeep2222/hanuman-chalisa-tracker/releases/latest/download/HanumanChalisa.apk)
[![Hosted on GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-10B981?style=for-the-badge&logo=github)](https://abhradeep2222.github.io/hanuman-chalisa-tracker/)
[![Accuracy Tracker](https://img.shields.io/badge/Real--time-Voice%20AI%20Sync-F59E0B?style=for-the-badge)](https://abhradeep2222.github.io/hanuman-chalisa-tracker/)

---

### 🌐 **Live Website Link (সরাসরি ব্যবহারের জন্য লিঙ্ক):**
👉 **[https://abhradeep2222.github.io/hanuman-chalisa-tracker/](https://abhradeep2222.github.io/hanuman-chalisa-tracker/)**

---

### 📲 **Android APK Download (সরাসরি মোবাইল অ্যাপ ডাউনলোড):**
👉 **[Click Here to Download the latest HanumanChalisa.apk](https://github.com/Abhradeep2222/hanuman-chalisa-tracker/releases/latest/download/HanumanChalisa.apk)**

> **Updating from v1.3 or older?** Uninstall the old app first: earlier builds were signed with a temporary key, so Android cannot update them in place. From v1.4 on, every update installs directly over the previous version.

👉 **[GitHub All Releases Page](https://github.com/Abhradeep2222/hanuman-chalisa-tracker/releases)**

*(ল্যাপটপ অন না রেখেও সরাসরি আপনার মোবাইল ফোনে APK ডাউনলোড ও ইনস্টল করে সম্পূর্ণ অফলাইনে আসল ভক্তিমূলক অডিও সহ চালিসা পাঠ ও ট্র্যাকিং করুন!)*

---

## ✨ Features & Capabilities (v1.6.0)

### 🎵 1. Soulful Devotional Audio & Radiant Word-by-Word Karaoke Sync
- **Authentic Devotional Recitation:** Integrated iconic, melodious rendition of Shri Hanuman Chalisa by Hariharan Ji with sacred bells, shankh, and flute.
- **Calibrated 43-Verse Karaoke Glow:** Every single word illuminates in a brilliant radiant gold halo (`#FFB800`) synchronously as the audio recites.
- **Interactive Scrubber & Chaupai Jump:** Seek to any part of the 9m 41s Chalisa or tap any Chaupai card to jump instantly.
- **Speed Controls:** `0.75x` (Dhyan/Slow for learners), `1.0x` (Nitya/Normal temple tempo), `1.25x` (Tez/Energetic recitation).
- **Loop / Repeat Option:** Repeat continuous chanting for Sankalpa Mala goals.

### 🎙️ 2. Real-Time AI Voice Speech Recognition & Accuracy Scoring
- **Microphone Voice Detection:** Chant aloud into your smartphone or laptop microphone.
- **Cross-Script Phonetic Matching (`js/speech-matcher.js`):** every word is compared with its **Hindi (`हिन्दी`)**, **Bengali (`বাংলা`)** and **English transliteration** spellings at once, so the recogniser may answer in any script. Recognition runs in `hi-IN` for every script (the verses are Awadhi in any script, and Hindi recognition is on almost every phone); if a phone has no Hindi recogniser, the app falls back to Bengali or English and to the phone's other recognition services automatically.
- **In-order word alignment:** words turn green as they are recognised; words the recogniser could not hear are underlined and the tracker keeps going. A line is finished when its last word is reached, and the tracker never runs ahead of the reciter.
- **Any pace, any voice:** slow chanters can pause inside a line (a line closes only after ~5 s of silence), each word lights up within a second even before the next one is said, fast chanting with run-together words ("ज्ञानगुन", "तीनोंलोककाँपै") is split back into words, and a soft voice that loses a third of its words still completes the Chalisa in order. A level meter shows the microphone is hearing you, with a hint when the voice is too soft.
- **Honest accuracy:** *words recognised ÷ words in the lines you chanted*. It measures how much of your chanting the speech engine understood. Background noise, speed and accent all affect it.
- **Devotional Tier Badges:**
  - 🌟 **Divya ★★★ (95% - 100%)**: Divine, flawless recitation.
  - ✨ **Uttam ★★ (85% - 94%)**: Auspicious, pure chanting.
  - 🙏 **Shreshtha ★ (70% - 84%)**: Devoted seeker.
  - 📿 **Sadhak (< 70%)**: Chanting practice.
- **Learns your voice:** when the recogniser keeps hearing one of your words differently, that form is remembered for that exact word (on the phone only; Settings → Forget clears it). On Android 13+ the current and next lines are sent to the recogniser as hints.
- **On-device recogniser (default):** Vosk / Kaldi compiled to WebAssembly (`vendor/vosk.js`) with a small Hindi model trimmed for grammar-only use (`models/hindi-chant-v1.tar.gz`, 30 MB). It listens continuously, works offline, never beeps, and only for the Chalisa words around the reciter (`GrammarSession` in `js/speech-matcher.js`, model spellings in `js/offline-lexicon.js`). That is what lets it follow slow, fast, soft and paused chanting, going back and starting mid-way.
- **Fallback engines:** Android app → native Android speech recogniser through the app's own `ChantRecognizer` plugin. It restarts the recogniser instantly after every pause and keeps the system beeps muted while AI Voice Sync is on: media, notification and system sounds, restored on Stop, on leaving the app and after a crash. It stays in the chosen language when a recogniser fails, remembers the recogniser that worked, and asks Android to download a missing speech pack. Settings shows a voice diagnostics line. Browsers → Web Speech API (Chrome, Edge, Safari). With no recogniser available, **Rhythm mode** advances words on your chanting rhythm but does not score.

### 📿 3. Jap Counter & Tap Sync
- **Jap counter button** in the bottom bar: tap once per jap, long-press or Undo to take one back; switch it off in Settings. Goals 1 / 7 / 11 / 21 / 108 or any number up to 1008.
- **Silent & Meditative Chanting:** Tap anywhere on the mobile screen to advance word-by-word.
- **Sacred Bell Chimes & Haptic Feedback:** Vibrates subtly (`navigator.vibrate`) with a resonant 528Hz bronze temple tone.

### 📱 4. Redesigned Mobile-First Sacred Temple Architecture
- **"Reading by the sanctum diya" design:** sindoor and temple brass on a lamp-lit dark, or kumkum on sandal in the day theme. The logo is the sun child Hanuman leapt for, with his gada. The title follows the script you read. Verses are set in Tiro Devanagari Hindi / Tiro Bangla and the interface in Mukta, all bundled for offline use.
- **100% Fluid Mobile Responsiveness:** Fully optimized for all phone screen widths (320px, 360px, 390px, 412px, 480px) and desktops with zero horizontal overflow.
- **Touch-Friendly Controls:** Larger touch targets on touch screens (36–44px; script buttons 30px).
- **Settings Bottom Sheet (Drawer):** Easily adjust font size (`A-` / `A+`), meaning languages, and screen wake lock.

### 📖 5. Multilingual Meanings (Bhavarth) & Offline Storage
- Authentic Hindi, Bengali, and English verse-by-verse meanings.
- LocalStorage safe persistence for streaks, recitation counts, preferences, and custom goals.
- 100% offline capability via Service Worker (PWA) and local APK asset bundling.

---

## 🚀 How to Run Locally

```bash
# Clone the repository
git clone https://github.com/Abhradeep2222/hanuman-chalisa-tracker.git
cd hanuman-chalisa-tracker

# Install dependencies
npm install

# Build web assets and sync to Android
node scripts/build-web.js
npx cap sync android

# Run local preview server
npx serve .

# Run the test suites
npm test                                   # cross-script normaliser, speech alignment, app wiring
cd android && ./gradlew testDebugUnitTest  # native recogniser session + beep guard
```

## 📦 Releasing an update

1. Bump `"version"` in `package.json` (it sets the APK's versionName and versionCode) and update `RELEASE_NOTES.md`.
2. Push to `master`, then tag: `git tag v1.4.1 && git push origin v1.4.1`.
3. CI runs both test suites, builds an APK signed with the release key from the repository secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) and publishes the release. Keep a safe backup of the keystore: without the same key, phones cannot install the next update over the installed app.

---

## 📜 Devotion & License
Developed with supreme bhakti to **Lord Shri Hanuman**. May this app bring peace, strength, and spiritual upliftment to every devotee.

**Jai Shri Ram! Jai Bajrangbali!**
