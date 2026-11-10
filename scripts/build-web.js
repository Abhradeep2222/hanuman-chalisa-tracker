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

console.log('Web assets successfully packaged into dist/');
