/**
 * 把 Google Fonts 的 latin / latin-ext 子集抓到本地，做成离线可用的自托管字体。
 * 用法：node scripts/fetch-fonts.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(__dirname, '../src/assets/fonts');
const CSS_OUT = resolve(__dirname, '../src/styles/fonts.css');
mkdirSync(FONT_DIR, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILIES = [
  {
    label: 'newsreader',
    css: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&display=swap',
  },
  {
    label: 'instrument-sans',
    css: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap',
  },
];

const KEEP = new Set(['latin']);

async function main() {
  const out = [
    '/* 自托管字体：离线可用，不依赖任何外部 CDN。',
    '   由 scripts/fetch-fonts.mjs 生成，勿手改。 */',
    '',
  ];
  let count = 0;

  for (const fam of FAMILIES) {
    const res = await fetch(fam.css, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${fam.label}: HTTP ${res.status}`);
    const css = await res.text();

    // 按 /* subset */ 注释切块
    const blocks = css.split(/\/\*\s*([a-z0-9-]+)\s*\*\//i).slice(1);
    for (let i = 0; i < blocks.length; i += 2) {
      const subset = blocks[i];
      const body = blocks[i + 1] ?? '';
      if (!KEEP.has(subset)) continue;

      const style = body.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
      if (style !== 'normal') continue; // 只留正体：中文斜体是假的，斜体会被浏览器合成

      const url = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
      if (!url) continue;

      const weight = body.match(/font-weight:\s*([\d\s]+);/)?.[1].trim().replace(/\s+/g, '-') ?? '400';
      const family = body.match(/font-family:\s*'([^']+)'/)?.[1] ?? 'Font';
      const range = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim() ?? '';

      const file = `${fam.label}-${subset}-${style}-${weight}.woff2`;
      const bin = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      writeFileSync(resolve(FONT_DIR, file), bin);
      count++;
      console.log('✓', file, `${(bin.length / 1024).toFixed(1)}KB`);

      out.push(
        '@font-face {',
        `  font-family: '${family}';`,
        `  font-style: ${style};`,
        `  font-weight: ${weight};`,
        '  font-display: swap;',
        `  src: url('../assets/fonts/${file}') format('woff2');`,
        range ? `  unicode-range: ${range};` : '',
        '}',
        '',
      );
    }
  }

  writeFileSync(CSS_OUT, out.filter(Boolean).join('\n'));
  console.log(`\n共 ${count} 个字体文件 → public/fonts/`);
}

main().catch((e) => {
  console.error('失败：', e.message);
  process.exit(1);
});
