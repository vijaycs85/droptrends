import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../extension/icons');

fs.mkdirSync(outputDir, { recursive: true });

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generateDropTrendsPNG(size) {
  const width = size;
  const height = size;

  // Raw image buffer with filter byte 0 per line
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Water drop / shield shape
      // Top point (cx, cy - radius*0.85) to rounded base
      const nx = dx / (width * 0.44);
      const ny = (y - (cy - radius * 0.1)) / (height * 0.48);

      // Distance inside a drop-like contour
      const inDrop = (ny >= -0.8 && ny <= 0.8 && Math.abs(nx) <= (1 - ny * 0.4) * Math.sqrt(Math.max(0, 1 - ny * ny)));
      const inCircle = dist <= radius;

      if (inCircle) {
        // Vibrant gradient background (Drupal Blue to Cyan/Emerald)
        const t = (x + y) / (width + height);
        // Interpolate #0284c7 (2, 132, 199) to #059669 (5, 150, 105)
        const r = Math.round(2 + t * 3);
        const g = Math.round(132 + t * 18);
        const b = Math.round(199 - t * 94);

        // Anti-aliased border
        const alpha = Math.min(255, Math.max(0, Math.round((radius - dist + 1) * 255)));

        // Trend upward line inside icon
        const lineY = cy + (width * 0.25) - ((x - (cx - width * 0.25)) * 0.7);
        const isTrendLine = (x >= cx - width * 0.28 && x <= cx + width * 0.28 && Math.abs(y - lineY) <= Math.max(1, size * 0.08));

        if (isTrendLine) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = alpha;
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = alpha;
        }
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace none
  const ihdr = createChunk('IHDR', ihdrData);

  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);

  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const buf = generateDropTrendsPNG(size);
  const filePath = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${size}x${size})`);
}
