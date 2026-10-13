import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../extension/icons');
fs.mkdirSync(outputDir, { recursive: true });

function getSvg(size) {
  // Size-optimized strokes & geometry for maximum legibility at tiny sizes
  const isSmall = size <= 32;
  const strokeWidth = size <= 16 ? 13 : (size <= 32 ? 9 : 7);
  const barRx = isSmall ? 2 : 4;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
  <defs>
    <!-- Official Drupal Blue to Deep Ocean Gradient -->
    <linearGradient id="drop-grad-${size}" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#009cde" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    ${size >= 48 ? `
    <filter id="drop-shadow-${size}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0369a1" flood-opacity="0.35" />
    </filter>` : ''}
  </defs>

  <!-- Drupal Water Droplet Contour -->
  <path d="M 64 6 C 64 6, 12 60, 12 88 C 12 118, 34 128, 64 128 C 94 128, 116 118, 116 88 C 116 60, 64 6, 64 6 Z"
        fill="url(#drop-grad-${size})" ${size >= 48 ? `filter="url(#drop-shadow-${size})"` : ''} />

  ${size >= 48 ? `
  <!-- Specular Curve Sheen -->
  <path d="M 64 16 C 64 16, 22 64, 22 86 C 22 96, 28 108, 38 114"
        fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3.5" stroke-linecap="round" />` : ''}

  <!-- Ascending Health Metric Bars -->
  <!-- Bar 1 (Base): Translucent White -->
  <rect x="32" y="80" width="15" height="28" rx="${barRx}" fill="rgba(255,255,255,0.45)" />

  <!-- Bar 2 (Velocity): Crisp White -->
  <rect x="53" y="64" width="15" height="44" rx="${barRx}" fill="rgba(255,255,255,0.88)" />

  <!-- Bar 3 (Top / Passing CI): Vibrant Emerald Green -->
  <rect x="74" y="48" width="15" height="60" rx="${barRx}" fill="#10b981" />

  <!-- Trend Arrow Shaft -->
  <path d="M 30 78 L 92 38" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" />

  <!-- Trend Arrow Head -->
  <path d="M 72 38 L 92 38 L 92 58" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

// Save master 128px SVG
const masterSvgPath = path.join(outputDir, 'icon.svg');
fs.writeFileSync(masterSvgPath, getSvg(128));
console.log(`Saved master SVG to ${masterSvgPath}`);

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sizes = [512, 128, 48, 32, 16];

for (const s of sizes) {
  const svgContent = getSvg(s);
  const tempHtml = path.join(outputDir, `temp-${s}.html`);
  const targetPng = path.join(outputDir, s === 512 ? 'icon-512.png' : `icon-${s}.png`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>* { margin: 0; padding: 0; } html, body { width: ${s}px; height: ${s}px; background: transparent; overflow: hidden; } svg { width: ${s}px; height: ${s}px; display: block; }</style></head><body>${svgContent}</body></html>`;
  fs.writeFileSync(tempHtml, html);

  execSync(`"${chromePath}" --headless=new --default-background-color=00000000 --screenshot="${targetPng}" --window-size=${s},${s} "${tempHtml}" 2>/dev/null`);
  console.log(`✓ Rendered native ${targetPng} (${s}x${s} PNG)`);

  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
}

// Copy 128px icon as store icon
fs.copyFileSync(path.join(outputDir, 'icon-128.png'), path.join(outputDir, 'store-icon-128.png'));
console.log('✓ Created store-icon-128.png');

console.log('Size-optimized Option B icons generation complete!');
