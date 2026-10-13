import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.join(__dirname, '../extension');

console.log('--- DropTrends Extension Build Verification ---');

// 1. Verify manifest.json
const manifestPath = path.join(extDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Error: manifest.json is missing!');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`✓ Manifest V${manifest.manifest_version} verified: ${manifest.name} (v${manifest.version})`);

// 2. Verify declared icons exist
for (const [size, iconRelPath] of Object.entries(manifest.icons || {})) {
  const iconAbs = path.join(extDir, iconRelPath);
  if (!fs.existsSync(iconAbs)) {
    console.error(`Error: Declared icon ${iconRelPath} does not exist!`);
    process.exit(1);
  }
  const stat = fs.statSync(iconAbs);
  console.log(`✓ Icon verified: ${iconRelPath} (${stat.size} bytes)`);
}

// 3. Verify content scripts exist
for (const cs of manifest.content_scripts || []) {
  for (const jsFile of cs.js || []) {
    const jsAbs = path.join(extDir, jsFile);
    if (!fs.existsSync(jsAbs)) {
      console.error(`Error: Content script ${jsFile} missing!`);
      process.exit(1);
    }
  }
}
console.log(`✓ All content scripts verified.`);

// 4. Verify popup and service worker
const swAbs = path.join(extDir, manifest.background.service_worker);
if (!fs.existsSync(swAbs)) {
  console.error('Error: Background service worker missing!');
  process.exit(1);
}
console.log(`✓ Service worker verified.`);

const popupHtml = path.join(extDir, manifest.action.default_popup);
if (!fs.existsSync(popupHtml)) {
  console.error('Error: Default popup HTML missing!');
  process.exit(1);
}
console.log(`✓ Popup HTML verified.`);

console.log('🎉 Extension build verification complete. Ready for unpacked loading or packaging.');
