import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, toCrc, crcBuf]);
}

function generatePNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const width = size;
  const height = size;
  const rawRows = [];

  // Center symbol area
  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded rect or book shape
      const inBook = (Math.abs(dx) < size * 0.28 && Math.abs(dy) < size * 0.32);
      const isSpine = inBook && Math.abs(dx) < size * 0.04;
      const isPageMark = inBook && !isSpine && Math.abs(dy) > size * 0.15 && Math.abs(dy) < size * 0.18;

      if (inBook && !isSpine && !isPageMark) {
        row[idx] = fgR;
        row[idx + 1] = fgG;
        row[idx + 2] = fgB;
        row[idx + 3] = 255;
      } else {
        row[idx] = bgR;
        row[idx + 1] = bgG;
        row[idx + 2] = bgB;
        row[idx + 3] = 255;
      }
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Emerald theme: #047857 (4, 120, 87)
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, 4, 120, 87, 255, 255, 255));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, 4, 120, 87, 255, 255, 255));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, 4, 120, 87, 255, 255, 255));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePNG(32, 4, 120, 87, 255, 255, 255));

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#047857"/>
  <rect x="110" y="96" width="292" height="320" rx="24" fill="#ffffff"/>
  <rect x="150" y="140" width="90" height="20" rx="6" fill="#047857"/>
  <rect x="150" y="180" width="212" height="14" rx="4" fill="#cbd5e1"/>
  <rect x="150" y="210" width="180" height="14" rx="4" fill="#cbd5e1"/>
  <rect x="150" y="240" width="140" height="14" rx="4" fill="#cbd5e1"/>
  <circle cx="330" cy="330" r="50" fill="#10b981"/>
  <path d="M315 330l10 10 20 -20" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Icons generated successfully in public/');
