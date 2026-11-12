const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

// Copy root files
const files = ['index.html', 'style.css', 'manifest.json', 'sw.js', 'README.md'];
for (const file of files) {
  const src = path.join(root, file);
  const dest = path.join(dist, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy js folder
const jsSrcDir = path.join(root, 'js');
const jsDestDir = path.join(dist, 'js');
if (!fs.existsSync(jsDestDir)) {
  fs.mkdirSync(jsDestDir, { recursive: true });
}

if (fs.existsSync(jsSrcDir)) {
  const jsFiles = fs.readdirSync(jsSrcDir);
  for (const jsFile of jsFiles) {
    fs.copyFileSync(path.join(jsSrcDir, jsFile), path.join(jsDestDir, jsFile));
  }
}

// Copy audio folder
const audioSrcDir = path.join(root, 'audio');
const audioDestDir = path.join(dist, 'audio');
if (fs.existsSync(audioSrcDir)) {
  if (!fs.existsSync(audioDestDir)) {
    fs.mkdirSync(audioDestDir, { recursive: true });
  }
  const audioFiles = fs.readdirSync(audioSrcDir);
  for (const aFile of audioFiles) {
    fs.copyFileSync(path.join(audioSrcDir, aFile), path.join(audioDestDir, aFile));
  }
}

// Copy bundled fonts and icons (the APK has no network for them)
for (const dir of ['fonts', 'icons', 'vendor', 'models']) {
  const src = path.join(root, dir);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(dist, dir);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dest, f));
}

console.log('Web assets successfully packaged into dist/');
