import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const extDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');

// Ensure clean dist directory
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

function packageBrowser(browserName, manifestSource, zipName) {
  const stageDir = path.join(distDir, `stage-${browserName}`);
  fs.mkdirSync(stageDir, { recursive: true });

  // Copy extension directory into staging
  fs.cpSync(extDir, stageDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== '.DS_Store' && base !== 'manifest.firefox.json';
    }
  });

  // Apply browser-specific manifest if specified
  if (manifestSource) {
    fs.copyFileSync(path.join(extDir, manifestSource), path.join(stageDir, 'manifest.json'));
  }

  const rootZip = path.join(rootDir, zipName);
  const distZip = path.join(distDir, zipName);

  if (fs.existsSync(rootZip)) fs.unlinkSync(rootZip);
  if (fs.existsSync(distZip)) fs.unlinkSync(distZip);

  execSync(`zip -r -FS "${distZip}" . -x "*.DS_Store"`, {
    cwd: stageDir,
    stdio: 'ignore'
  });

  // Copy to project root for easy user access
  fs.copyFileSync(distZip, rootZip);

  // Clean up staging directory
  fs.rmSync(stageDir, { recursive: true, force: true });

  const stat = fs.statSync(rootZip);
  console.log(`✓ Packaged ${browserName.toUpperCase()}: ${zipName} (${Math.round(stat.size / 1024)} KB)`);
}

try {
  // 1. Chrome / Chromium (Chrome Web Store, Edge)
  packageBrowser('chrome', null, 'droptrends-chrome.zip');

  // Alias default droptrends-extension.zip to Chrome package
  fs.copyFileSync(path.join(rootDir, 'droptrends-chrome.zip'), path.join(rootDir, 'droptrends-extension.zip'));

  // 2. Firefox (Mozilla Add-ons / AMO)
  packageBrowser('firefox', 'manifest.firefox.json', 'droptrends-firefox.zip');

  console.log('\nAll browser packages created successfully:');
  console.log('  • Chrome / Chromium: droptrends-chrome.zip (and droptrends-extension.zip)');
  console.log('  • Firefox (AMO):     droptrends-firefox.zip');
} catch (err) {
  console.error('Failed to package extensions:', err);
  process.exit(1);
}
