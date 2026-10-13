import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../extension/icons');
fs.mkdirSync(outputDir, { recursive: true });

// Authentic modern Drupal drop silhouette path from official Drupal.org SVG (drupal-drop-062025.svg)
const drupalSilhouettePath = "M 96.8 54.3 C 96.5 53.8 96.2 53.3 95.8 52.8 C 94.1 50.6 91.8 48.6 89.8 46.8 C 86.8 44.1 83.7 41.5 81.2 38.4 C 77.3 33.6 74.4 28.1 72.1 22.3 C 70.3 17.7 69 13 67.9 8.2 C 67.4 5.9 66.8 3.5 66.2 1.3 C 65.9 0.4 65.4 -0.1 64.4 0 C 63.6 0.1 63 0.6 62.7 1.4 C 61.8 4.2 60.9 7 60.2 9.9 C 58.5 16.7 56.4 23.4 53 29.6 C 50.1 35 46.2 39.7 42.1 44.2 C 38.6 48 34.6 51.5 31.6 55.9 C 27.2 62.3 25.1 69.8 25 77.6 C 24.9 84.8 27.2 91.5 31.1 97.5 C 36.3 105.7 43.6 111.4 52.6 114.7 C 60.1 117.5 67.9 117.5 75.4 114.7 C 84.4 111.4 91.7 105.7 96.9 97.5 C 100.8 91.5 103.1 84.8 103 77.6 C 102.9 69.3 100.7 61.3 96.8 54.3 Z";

function getSvg(size) {
  // Size-optimized strokes & geometry for maximum legibility at tiny toolbar sizes
  const isSmall = size <= 32;
  const arrowWidth = size <= 16 ? 9 : (size <= 32 ? 8 : 6.5);
  const haloWidth = size <= 16 ? 16 : (size <= 32 ? 14 : 11);
  const barRx = isSmall ? 2 : 4;

  // Authentic 100% natural Drupal ratio scaled to fill canvas height tightly (y=2..126)
  const scale = 1.06;

  // Bar layout
  const barW = 14;
  const gap = 5;
  const b1X = 64 - (barW * 1.5 + gap); // ~37
  const b2X = b1X + barW + gap;        // ~56
  const b3X = b2X + barW + gap;        // ~75

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
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0369a1" flood-opacity="0.32" />
    </filter>` : ''}
  </defs>

  <!-- Authentic Modern Drupal Droplet Silhouette (Zero-Padding Height Fill) -->
  <g transform="translate(64, 64) scale(${scale}, ${scale}) translate(-64, -58.7)">
    <path d="${drupalSilhouettePath}" fill="url(#drop-grad-${size})" ${size >= 48 ? `filter="url(#drop-shadow-${size})"` : ''} />
    <path d="M 64 12 C 55 24 38 48 35 68 C 33 76 35 84 39 90" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" stroke-linecap="round" />
  </g>

  <!-- Ascending Health Metric Bars (DropScore Color Spectrum) -->
  <!-- Bar 1 (Needs Attention / Base): Coral Red -->
  <rect x="${b1X}" y="80" width="${barW}" height="32" rx="${barRx}" fill="#ef4444" />

  <!-- Bar 2 (Moderate / Velocity): Warm Amber -->
  <rect x="${b2X}" y="62" width="${barW}" height="50" rx="${barRx}" fill="#f59e0b" />

  <!-- Bar 3 (Exceptional / Healthy): Drupal CTA Green -->
  <rect x="${b3X}" y="44" width="${barW}" height="68" rx="${barRx}" fill="#7cbc48" />

  <!-- Upward Trend Arrow Halo (White Contour for Sharp Pop) -->
  <path d="M ${b1X - 4} 78 L ${b3X + barW + 4} 34" stroke="#ffffff" stroke-width="${haloWidth}" stroke-linecap="round" />
  <path d="M ${b3X - 4} 34 L ${b3X + barW + 4} 34 L ${b3X + barW + 4} 54" fill="none" stroke="#ffffff" stroke-width="${haloWidth}" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Upward Trend Arrow (Drupal CTA Green #7cbc48) -->
  <path d="M ${b1X - 4} 78 L ${b3X + barW + 4} 34" stroke="#7cbc48" stroke-width="${arrowWidth}" stroke-linecap="round" />
  <path d="M ${b3X - 4} 34 L ${b3X + barW + 4} 34 L ${b3X + barW + 4} 54" fill="none" stroke="#7cbc48" stroke-width="${arrowWidth}" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

// Save master 128px SVG
const masterSvgPath = path.join(outputDir, 'icon.svg');
fs.writeFileSync(masterSvgPath, getSvg(128));
console.log(`Saved master SVG to ${masterSvgPath}`);

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = '/tmp/chrome-icon-profile';
const sizes = [512, 128, 48, 32, 16];

for (const s of sizes) {
  const svgContent = getSvg(s);
  const tempHtml = path.join(outputDir, `temp-${s}.html`);
  const targetPng = path.join(outputDir, s === 512 ? 'icon-512.png' : `icon-${s}.png`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>* { margin: 0; padding: 0; } html, body { width: ${s}px; height: ${s}px; background: transparent; overflow: hidden; } svg { width: ${s}px; height: ${s}px; display: block; }</style></head><body>${svgContent}</body></html>`;
  fs.writeFileSync(tempHtml, html);

  execSync(`"${chromePath}" --headless --user-data-dir="${userDataDir}" --disable-gpu --default-background-color=00000000 --screenshot="${targetPng}" --window-size=${s},${s} "${tempHtml}" 2>/dev/null`);
  console.log(`✓ Rendered native ${targetPng} (${s}x${s} PNG)`);

  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
}

// Copy 128px icon as store icon
fs.copyFileSync(path.join(outputDir, 'icon-128.png'), path.join(outputDir, 'store-icon-128.png'));
console.log('✓ Created store-icon-128.png');

// Copy 512px icon to root logo.png (used by Drupal.org GitLab repo)
const rootLogoPath = path.join(__dirname, '../logo.png');
fs.copyFileSync(path.join(outputDir, 'icon-512.png'), rootLogoPath);
console.log(`✓ Updated root ${rootLogoPath} (512x512 logo.png)`);

console.log('Production icons generation complete!');
