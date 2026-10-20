import type { Payload } from '../db/repo';
import type { Capture, Journal, Note } from '../db/types';
import { dayKeyOf, fmtDateLong, fmtTime } from './date';
import { slugify } from './id';

/** JSZip 约 95KB，只在导出/导入时才需要 */
const loadZip = () => import('jszip').then((m) => m.default);

type JSZipType = Awaited<ReturnType<typeof loadZip>>;

/* ============================================================
   导出：Markdown 目录树 + data.json
   目标：导出的东西人看得懂，Obsidian 打开就是一座知识库，
        而 data.json 保证任何细节都不丢。
   ============================================================ */

function fm(obj: Record<string, unknown>): string {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map((x) => String(x)).join(', ')}]`;
      return `${k}: ${String(v)}`;
    });
  return `---\n${lines.join('\n')}\n---\n`;
}

function captureLine(c: Capture): string {
  const mark = c.status === 'promoted' ? '✓' : c.status === 'archived' ? '·' : '○';
  return `- [${c.id}] ${fmtTime(c.createdAt)} ${mark} ${c.text.replace(/\n+/g, ' ')}`;
}

export function buildInboxMarkdown(captures: Capture[]): Map<string, string> {
  const byDay = new Map<string, Capture[]>();
  for (const c of captures) {
    const k = dayKeyOf(c.createdAt);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(c);
  }
  const files = new Map<string, string>();
  for (const [day, list] of byDay) {
    const body = list
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(captureLine)
      .join('\n');
    files.set(
      `inbox/${day}.md`,
      `${fm({ date: day, kind: 'inbox' })}\n# ${fmtDateLong(day)} · 速记\n\n${body}\n`,
    );
  }
  return files;
}

export function buildJournalMarkdown(journals: Journal[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const j of journals) {
    const s = j.sections;
    const done = (s.done ?? []).filter(Boolean).map((d) => `- ${d}`).join('\n');
    const body = [
      `## 今天完成`,
      done || '- ',
      ``,
      `## 今天学到`,
      s.learned || '',
      ``,
      `## 今天遇到的问题`,
      s.problems || '',
      ``,
      `## 今天最重要的一个发现`,
      s.keyFinding || '',
      ``,
      `## 明天最重要事情`,
      s.tomorrow || '',
      '',
    ].join('\n');
    files.set(
      `journal/${j.date}.md`,
      `${fm({ date: j.date, kind: 'journal', updated: j.updatedAt })}\n# ${fmtDateLong(j.date)} · 日志\n\n${body}`,
    );
  }
  return files;
}

export function buildNoteMarkdown(notes: Note[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const n of notes) {
    const cat = n.category || '未分类';
    const [top, sub] = cat.split('/');
    const dir = sub ? `${top}/${sub}` : top;
    const path = `knowledge/${dir}/${slugify(n.title)}.md`;
    const sources = n.sources
      .map((s) =>
        s.type === 'capture' ? `  - capture:${s.id}` : `  - journal:${s.date}`,
      )
      .join('\n');
    const links = n.links.length ? n.links.map((l) => `- [[${l}]]`).join('\n') : '';
    files.set(
      path,
      `${fm({
        id: n.id,
        title: n.title,
        category: cat,
        tags: n.tags,
        status: n.status,
        created: n.createdAt,
        updated: n.updatedAt,
        sources: n.sources.length ? undefined : undefined,
      })}${sources ? `sources:\n${sources}\n` : ''}${links ? `\n相关：\n${links}\n\n` : '\n'}${n.body}\n`,
    );
  }
  return files;
}

const README = `# 私人档案 · 导出

导出于 ${'{time}'}。

## 目录结构

- \`inbox/\` —— 速记层。每天一个文件，按时间倒序排列。
  - 行首 \`[id]\` 是条目的唯一标识，导入时用于去重。
  - \`○\` 未归档　\`✓\` 已固化为笔记　\`·\` 已归档
- \`journal/\` —— 日志层。每天一个文件，五个固定栏目。
- \`knowledge/\` —— 知识库层。一条笔记一个文件，路径即分类。
- \`data.json\` —— 完整备份，含全部字段与元数据。**重新导入请用它**。

## 怎么迁移

1. **继续用本工具**：把 \`data.json\` 拿回来导入即可，100% 还原。
2. **换到 Obsidian**：直接用 Obsidian 打开这个文件夹，
   \`knowledge/\` 里的双链、标签立刻生效。
3. **进 Git 仓库**：把整个目录 commit 进去，思考历史就变成了版本历史。
4. **手写 Markdown**：本工具也能读懂上述结构的 Markdown 文件。

> 数据不在任何一家服务器上。你拿到的就是全部。
`;

export function buildZipFiles(payload: Payload): Map<string, string> {
  const files = new Map<string, string>();
  for (const [p, c] of buildInboxMarkdown(payload.captures)) files.set(p, c);
  for (const [p, c] of buildJournalMarkdown(payload.journals)) files.set(p, c);
  for (const [p, c] of buildNoteMarkdown(payload.notes)) files.set(p, c);
  files.set('data.json', JSON.stringify(payload, null, 2));
  files.set(
    'README.md',
    README.replace('{time}', new Date(payload.exportedAt).toLocaleString('zh-CN')),
  );
  return files;
}

export async function buildZip(payload: Payload): Promise<Blob> {
  const JSZip = await loadZip();
  const zip = new JSZip();
  for (const [path, content] of buildZipFiles(payload)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function stamp(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/* ============================================================
   导出到设备：安卓优先走系统分享（存网盘 / 发微信），否则直接下载
   ============================================================ */

export async function deliverBlob(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type });
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] }) &&
    typeof navigator.share === 'function';

  if (canShare) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

/* ============================================================
   导入：认两种东西 —— data.json（保真）与 Markdown 目录树（人写的）
   ============================================================ */

export async function readPayloadFromFile(file: File): Promise<{
  payload: Payload;
  kind: 'json' | 'markdown';
}> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    const text = await file.text();
    return { payload: JSON.parse(text) as Payload, kind: 'json' };
  }

  if (name.endsWith('.zip')) {
    const JSZip = await loadZip();
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const jsonFile = zip.file('data.json');
    if (jsonFile) {
      const text = await jsonFile.async('string');
      return { payload: JSON.parse(text) as Payload, kind: 'json' };
    }
    // 没有 data.json，就从 Markdown 目录树重建
    const payload = await payloadFromZipMarkdown(zip);
    return { payload, kind: 'markdown' };
  }

  throw new Error('只支持 .zip 或 .json 文件');
}

async function payloadFromZipMarkdown(zip: JSZipType): Promise<Payload> {
  const captures: Capture[] = [];
  const journals: Journal[] = [];
  const notes: Note[] = [];
  const files = Object.values(zip.files).filter((f) => !f.dir);
  const now = new Date().toISOString();

  for (const f of files) {
    const path = f.name;
    const text = await f.async('string');

    if (path.startsWith('inbox/') && path.endsWith('.md')) {
      const day = path.slice('inbox/'.length, -3);
      for (const line of text.split('\n')) {
        const m = line.match(/^-\s*\[([^\]]+)\]\s+(\d{2}:\d{2})\s+([○✓·])\s+(.*)$/);
        if (!m) continue;
        captures.push({
          id: m[1],
          text: m[4].trim(),
          createdAt: new Date(`${day}T${m[2]}:00`).toISOString(),
          updatedAt: now,
          source: 'import',
          status: m[3] === '✓' ? 'promoted' : m[3] === '·' ? 'archived' : 'inbox',
        });
      }
    }

    if (path.startsWith('journal/') && path.endsWith('.md')) {
      const date = path.slice('journal/'.length, -3);
      const sections = parseJournalSections(text);
      if (sections) journals.push({ date, sections, createdAt: now, updatedAt: now });
    }

    if (path.startsWith('knowledge/') && path.endsWith('.md')) {
      const meta = parseFrontmatter(text);
      const body = text.replace(/^---[\s\S]*?---\s*/, '').trim();
      const title = meta.title || path.split('/').pop()!.replace(/\.md$/, '');
      const cat = meta.category || path.slice('knowledge/'.length, -3).replace(/\//g, '/');
      notes.push({
        id: meta.id || `n_import_${Math.random().toString(36).slice(2, 10)}`,
        title,
        body,
        category: cat,
        tags: parseList(meta.tags),
        status: (meta.status as Note['status']) || 'active',
        links: [],
        sources: [],
        createdAt: meta.created || now,
        updatedAt: meta.updated || now,
      });
    }
  }

  return {
    schemaVersion: 1,
    exportedAt: now,
    captures,
    journals,
    notes,
    settings: {
      key: 'app',
      theme: { mode: 'auto', colorway: 'ink' },
      categories: {},
      ai: { enabled: false, baseUrl: '', apiKey: '', model: '' },
      archiveRetentionDays: 0,
    },
  };
}

function parseJournalSections(text: string) {
  const grab = (label: string): string => {
    const re = new RegExp(`##\\s*${label}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
    const m = text.match(re);
    return (m?.[1] ?? '').trim();
  };
  const doneRaw = grab('今天完成');
  const done = doneRaw
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter((l) => l && l !== '-');
  return {
    done,
    learned: grab('今天学到'),
    problems: grab('今天遇到的问题'),
    keyFinding: grab('今天最重要的一个发现'),
    tomorrow: grab('明天最重要事情'),
  };
}

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function parseList(v?: string): string[] {
  if (!v) return [];
  return v
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
