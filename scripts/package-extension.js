import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const extDir = path.join(rootDir, 'extension');
const zipPath = path.join(rootDir, 'droptrends-extension.zip');

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  // Use zip to package the extension folder without unnecessary meta files
  execSync(`cd "${extDir}" && zip -r -FS "${zipPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });
  const stat = fs.statSync(zipPath);
  console.log(`✓ Packaged extension to ${zipPath} (${Math.round(stat.size / 1024)} KB)`);
} catch (err) {
  console.error('Failed to package extension:', err);
  process.exit(1);
}
