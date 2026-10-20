/**
 * 零依赖图标生成器：程序化画出「三层档案」标志，输出各尺寸 PNG。
 * 用法：node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/icons');
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------ PNG 编码 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------ 绘制 */

const SS = 3; // 超采样

function makeIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const px = size / 100;

  const INK = [30, 22, 14];
  const ACCENT = maskable ? [31, 74, 60] : [44, 110, 90];
  const PAPER = [246, 243, 236];
  const FOLD = [222, 216, 203];

  const roundedRect = (x, y, w, h, r) => (px_, py_) =>
    px_ >= x &&
    px_ <= x + w &&
    py_ >= y &&
    py_ <= y + h &&
    (() => {
      const cx = Math.min(Math.max(px_, x + r), x + w - r);
      const cy = Math.min(Math.max(py_, y + r), y + h - r);
      const dx = px_ - cx;
      const dy = py_ - cy;
      return dx * dx + dy * dy <= r * r + 1e-9;
    })();

  const inPoly = (poly) => (px_, py_) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py_ !== yj > py_ && px_ < ((xj - xi) * (py_ - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  // 纸页：右上角折角
  const sheetPoly = [
    [26, 19],
    [60, 19],
    [74, 33],
    [74, 81],
    [26, 81],
  ];
  const foldPoly = [
    [60, 19],
    [74, 33],
    [60, 33],
  ];

  // 三条层线：Ⅰ Ⅱ Ⅲ
  const rules = [
    [32, 39, 44, 3.2],
    [32, 50, 34, 3.2],
    [32, 61, 24, 3.2],
  ];

  const bgRect = maskable
    ? () => true
    : roundedRect(0, 0, 100, 100, 22);
  const sheet = inPoly(sheetPoly);
  const fold = inPoly(foldPoly);
  const ruleHit = (px_, py_) =>
    rules.some(([x, y, w, h]) => px_ >= x && px_ <= x + w && py_ >= y && py_ <= y + h);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / px;
          const ny = (y + (sy + 0.5) / SS) / px;

          let col = null;
          if (bgRect(nx, ny)) {
            col = ACCENT;
            if (sheet(nx, ny)) {
              col = PAPER;
              if (ruleHit(nx, ny)) col = ACCENT;
              if (fold(nx, ny)) col = FOLD;
            }
          }
          if (col) {
            r += col[0];
            g += col[1];
            b += col[2];
            a += 255;
          }
        }
      }

      const n = SS * SS;
      const i = (y * size + x) * 4;
      const alpha = a / n;
      if (alpha > 0) {
        const cov = a / (n * 255);
        buf[i] = Math.round(r / (n * cov) * cov);
        buf[i + 1] = Math.round(g / (n * cov) * cov);
        buf[i + 2] = Math.round(b / (n * cov) * cov);
        buf[i + 3] = Math.round(alpha);
      }
    }
  }

  return encodePng(size, size, buf);
}

const jobs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-192.png', 192, { maskable: true }],
  ['maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
  ['favicon-32.png', 32, {}],
];

for (const [name, size, opts] of jobs) {
  writeFileSync(resolve(OUT, name), makeIcon(size, opts));
  console.log('✓', name, `${size}×${size}`);
}
