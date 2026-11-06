import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer with filter byte at the beginning of each row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 implementation
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf, offset, length) {
    let c = 0xffffffff;
    for (let i = 0; i < length; i++) {
      c = crcTable[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf, 4, len + 4);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression method: 0
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace method: 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawWaiterWalkIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient: dark navy #0f172a to vibrant royal blue #1e3a8a
  const t = (y / h + x / w) / 2;
  let bgR = Math.round(15 * (1 - t) + 30 * t);
  let bgG = Math.round(23 * (1 - t) + 58 * t);
  let bgB = Math.round(42 * (1 - t) + 138 * t);

  // Corner rounding if not maskable
  if (!isMaskable) {
    const cornerRadius = 0.22;
    const cornerX = Math.abs(dx) - (1 - cornerRadius);
    const cornerY = Math.abs(dy) - (1 - cornerRadius);
    if (cornerX > 0 && cornerY > 0) {
      if (Math.sqrt(cornerX * cornerX + cornerY * cornerY) > cornerRadius) {
        return [0, 0, 0, 0];
      }
    }
  }

  // Dumbbell icon rendering
  const scale = isMaskable ? 0.65 : 0.78;
  const nx = (x - cx) / (w * scale * 0.5);
  const ny = (y - cy) / (h * scale * 0.5);

  // Dumbbell bar: -0.6 to +0.6, height [-0.07 to +0.07]
  const inBar = nx >= -0.6 && nx <= 0.6 && ny >= -0.07 && ny <= 0.07;
  // Center grip: -0.2 to +0.2, height [-0.1 to +0.1]
  const inGrip = nx >= -0.22 && nx <= 0.22 && ny >= -0.1 && ny <= 0.1;

  // Outer Plates
  const inOuterPlateL = nx >= -0.75 && nx <= -0.63 && ny >= -0.45 && ny <= 0.45;
  const inInnerPlateL = nx >= -0.61 && nx <= -0.52 && ny >= -0.35 && ny <= 0.35;

  const inInnerPlateR = nx >= 0.52 && nx <= 0.61 && ny >= -0.35 && ny <= 0.35;
  const inOuterPlateR = nx >= 0.63 && nx <= 0.75 && ny >= -0.45 && ny <= 0.45;

  // Crown / monogram emblem accent
  const inAccentTop = Math.abs(nx) < 0.35 && ny >= -0.65 && ny <= -0.45 && Math.sin(nx * 15) > 0.2;

  if (inBar) {
    return [248, 250, 252, 255]; // Pure white/silver steel
  }
  if (inGrip) {
    return [2, 132, 199, 255]; // Electric cyan grip
  }
  if (inOuterPlateL || inOuterPlateR) {
    return [56, 189, 248, 255]; // Bright cyan-blue outer plates
  }
  if (inInnerPlateL || inInnerPlateR) {
    return [96, 165, 250, 255]; // Sky blue inner plates
  }
  if (inAccentTop) {
    return [251, 191, 36, 255]; // Gold athletic accent
  }

  // Subtle border glow
  if (dist > 0.88 && dist <= 0.94) {
    return [56, 189, 248, 120];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA PNG icons...');

// 1. Apple Touch Icon (180x180)
const appleTouchPng = createPNG(180, 180, (x, y, w, h) => drawWaiterWalkIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchPng);
console.log('✓ Created public/apple-touch-icon.png (180x180)');

// 2. PWA 192x192
const pwa192Png = createPNG(192, 192, (x, y, w, h) => drawWaiterWalkIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192Png);
console.log('✓ Created public/pwa-192x192.png (192x192)');

// 3. PWA 512x512
const pwa512Png = createPNG(512, 512, (x, y, w, h) => drawWaiterWalkIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512Png);
console.log('✓ Created public/pwa-512x512.png (512x512)');

// 4. PWA Maskable 512x512
const pwaMaskablePng = createPNG(512, 512, (x, y, w, h) => drawWaiterWalkIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskablePng);
console.log('✓ Created public/pwa-maskable-512x512.png (512x512 maskable)');

console.log('All PWA icons successfully generated!');
