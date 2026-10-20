/**
 * 用真实导出代码跑一遍，验证 zip 结构。
 * 用法：node scripts/verify-export.mjs
 */
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'recorder-verify-'));

const entry = join(tmp, 'entry.ts');
writeFileSync(
  entry,
  `
import { buildZip, buildZipFiles } from '${root.replace(/\\/g, '/')}/src/lib/export.ts';
export { buildZip, buildZipFiles };
`,
);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(tmp, 'out.mjs'),
  logLevel: 'silent',
});

const { buildZip, buildZipFiles } = await import(pathToFileURL(join(tmp, 'out.mjs')).href);

/* --------- 造一份贴近真实的 payload --------- */
const payload = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  captures: [
    {
      id: 'c_abc123',
      text: 'AI学习视频可以做成长系列，先做三期试试水',
      createdAt: '2026-10-20T14:22:10.000Z',
      updatedAt: '2026-10-20T14:22:10.000Z',
      source: 'manual',
      status: 'promoted',
      promotedTo: 'n_1',
    },
    {
      id: 'c_def456',
      text: '第二条普通速记',
      createdAt: '2026-10-20T15:00:00.000Z',
      updatedAt: '2026-10-20T15:00:00.000Z',
      source: 'manual',
      status: 'inbox',
    },
  ],
  journals: [
    {
      date: '2026-10-20',
      sections: {
        done: ['搭好了导出管线', '写了导入解析'],
        learned: 'Markdown 目录树可以直接被 Obsidian 打开',
        problems: 'zip 里的中文文件名要注意编码',
        keyFinding: '数据自由的前提是导出格式是公开标准',
        tomorrow: '把导出跑通到手机上',
      },
      createdAt: '2026-10-20T02:00:00.000Z',
      updatedAt: '2026-10-20T13:00:00.000Z',
    },
  ],
  notes: [
    {
      id: 'n_1',
      title: '把AI学习视频做成成长系列需要三个条件',
      body: '1. 主题本身可持续\n2. 有明确的受众\n3. 能沉淀成系列',
      category: 'AI/概念',
      tags: ['AI', '内容'],
      status: 'active',
      links: [],
      sources: [
        { type: 'capture', id: 'c_abc123' },
        { type: 'journal', date: '2026-10-20' },
      ],
      createdAt: '2026-10-20T16:00:00.000Z',
      updatedAt: '2026-10-20T16:00:00.000Z',
    },
  ],
  settings: {
    key: 'app',
    theme: { mode: 'auto', colorway: 'ink' },
    categories: { AI: ['概念', '论文', '问题'] },
    ai: { enabled: false, baseUrl: '', apiKey: '', model: '' },
    archiveRetentionDays: 0,
  },
};

/* ------------------------------ 验证 ------------------------------ */
let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}`);
  if (!cond) failures++;
};

console.log('\n【1】Markdown 目录树');
const files = buildZipFiles(payload);
const paths = [...files.keys()].sort();
paths.forEach((p) => console.log(`     ${p}`));

check('inbox/ 按天分文件', paths.includes('inbox/2026-10-20.md'));
check('journal/ 按天分文件', paths.includes('journal/2026-10-20.md'));
check('knowledge/ 按分类分目录', paths.some((p) => p.startsWith('knowledge/AI/概念/')));
check('data.json 存在', paths.includes('data.json'));
check('README.md 存在', paths.includes('README.md'));

console.log('\n【2】inbox 内容');
const inbox = files.get('inbox/2026-10-20.md');
console.log(inbox);
check('保留条目标 id', inbox.includes('[c_abc123]'));
check('保留时间戳', /\d{2}:\d{2}/.test(inbox));
check('已提升标记 ✓', inbox.includes('✓'));
check('未归档标记 ○', inbox.includes('○'));

console.log('\n【3】journal 内容');
const journal = files.get('journal/2026-10-20.md');
console.log(journal);
for (const h of [
  '## 今天完成',
  '## 今天学到',
  '## 今天遇到的问题',
  '## 今天最重要的一个发现',
  '## 明天最重要事情',
]) {
  check(`含栏目 ${h}`, journal.includes(h));
}

console.log('\n【4】knowledge 内容');
const notePath = paths.find((p) => p.startsWith('knowledge/'));
const note = files.get(notePath);
console.log(`--- ${notePath} ---`);
console.log(note);
check('有 YAML frontmatter', note.startsWith('---'));
check('标题是完整句', note.includes('把AI学习视频做成成长系列需要三个条件'));
check('保留分类', note.includes('AI/概念'));
check('保留标签', note.includes('AI'));
check('保留溯源', note.includes('capture:c_abc123') && note.includes('journal:2026-10-20'));

console.log('\n【5】真正打成 zip');
const blob = await buildZip(payload);
const buf = Buffer.from(await blob.arrayBuffer());
const zip = await JSZip.loadAsync(buf);
const zpaths = Object.keys(zip.files).filter((f) => !zip.files[f].dir).sort();
zpaths.forEach((p) => console.log(`     ${p}`));
check('zip 内文件数 = 5', zpaths.length === 5);
const dataJson = await zip.file('data.json').async('string');
const parsed = JSON.parse(dataJson);
check('data.json 速记完整', parsed.captures.length === 2);
check('data.json 日志完整', parsed.journals.length === 1);
check('data.json 笔记完整', parsed.notes.length === 1);
check('data.json 笔记溯源完整', parsed.notes[0].sources.length === 2);

rmSync(tmp, { recursive: true, force: true });

console.log(
  failures === 0
    ? '\n全部通过 ✅\n'
    : `\n${failures} 项未通过 ❌\n`,
);
process.exit(failures === 0 ? 0 : 1);
