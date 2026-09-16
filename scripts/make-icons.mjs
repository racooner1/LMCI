// Erzeugt die App-Icons (PNG) ohne externe Abhängigkeiten.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const BLUE = [30, 86, 200];
const WHITE = [255, 255, 255];
const INK = [18, 24, 31];

function icon(size, { maskable = false } = {}) {
  const pad = maskable ? 0 : size * 0.06;
  const radius = maskable ? 0 : size * 0.22;
  const inset = maskable ? size * 0.16 : size * 0.12;
  const cx = size / 2, cy = size / 2;
  const barH = size * 0.075, barW = size - inset * 2 - size * 0.16;
  const plateW = size * 0.085, plateH = size * 0.36, plateGap = size * 0.02;
  const innerPlateH = size * 0.26;
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    // Hintergrund: abgerundetes Quadrat
    const ix = Math.max(pad, Math.min(size - pad, px)), iy = Math.max(pad, Math.min(size - pad, py));
    const dx = Math.max(Math.abs(px - cx) - (cx - pad - radius), 0), dy = Math.max(Math.abs(py - cy) - (cy - pad - radius), 0);
    const inside = Math.hypot(dx, dy) <= radius && ix === px && iy === py;
    if (!inside) return [0, 0, 0, 0];
    // Hantel
    const inBar = Math.abs(py - cy) <= barH / 2 && Math.abs(px - cx) <= barW / 2;
    const plateCenters = [cx - barW / 2 + plateW * 1.4, cx + barW / 2 - plateW * 1.4];
    for (const pcx of plateCenters) {
      if (Math.abs(px - pcx) <= plateW / 2 && Math.abs(py - cy) <= plateH / 2) return [...WHITE, 255];
      const inner = pcx < cx ? pcx + plateW + plateGap : pcx - plateW - plateGap;
      if (Math.abs(px - inner) <= plateW / 2 && Math.abs(py - cy) <= innerPlateH / 2) return [...WHITE, 255];
    }
    if (inBar) return [...WHITE, 255];
    return [...BLUE, 255];
  };
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', png(192, icon(192)));
writeFileSync('icons/icon-512.png', png(512, icon(512)));
writeFileSync('icons/icon-maskable-512.png', png(512, icon(512, { maskable: true })));
writeFileSync('icons/apple-touch-icon.png', png(180, icon(180, { maskable: true })));
console.log('Icons erzeugt.');
