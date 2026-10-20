import { db } from './db';
import { uid } from '../lib/id';
import { todayKey } from '../lib/date';
import {
  DEFAULT_SETTINGS,
  EMPTY_JOURNAL_SECTIONS,
  SCHEMA_VERSION,
  type Capture,
  type CaptureSource,
  type Journal,
  type JournalSections,
  type Note,
  type Settings,
  type Snapshot,
} from './types';

/* ------------------------------------------------------------------ 设置 */

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app');
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    theme: { ...DEFAULT_SETTINGS.theme, ...(s.theme ?? {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai ?? {}) },
    categories: { ...DEFAULT_SETTINGS.categories, ...(s.categories ?? {}) },
  };
}

export async function saveSettings(next: Settings): Promise<void> {
  await db.settings.put(next);
}

/* ------------------------------------------------------------------ 速记 */

export async function addCapture(text: string, source: CaptureSource = 'manual'): Promise<Capture> {
  const now = new Date().toISOString();
  const c: Capture = {
    id: uid('c_'),
    text: text.trim(),
    createdAt: now,
    updatedAt: now,
    source,
    status: 'inbox',
  };
  await db.captures.add(c);
  return c;
}

export async function updateCapture(id: string, patch: Partial<Capture>): Promise<void> {
  await db.captures.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteCapture(id: string): Promise<void> {
  await db.captures.delete(id);
}

export async function restoreCapture(c: Capture): Promise<void> {
  await db.captures.put(c);
}

/** 把选中的速记固化成一条笔记，原速记转为"已提升"但保留原文 */
export async function promoteCaptures(
  ids: string[],
  draft: { title: string; body: string; category: string; tags: string[] },
): Promise<Note> {
  const found = (await db.captures.bulkGet(ids)).filter(Boolean) as Capture[];
  const now = new Date().toISOString();
  const note: Note = {
    id: uid('n_'),
    title: draft.title.trim() || '未命名笔记',
    body: draft.body,
    category: draft.category,
    tags: draft.tags,
    status: 'active',
    links: [],
    sources: found.map((c) => ({ type: 'capture' as const, id: c.id })),
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  if (found.length) {
    await db.transaction('rw', db.captures, async () => {
      for (const c of found) {
        await db.captures.update(c.id, {
          status: 'promoted',
          promotedTo: note.id,
          updatedAt: now,
        });
      }
    });
  }
  return note;
}

/* ------------------------------------------------------------------ 日志 */

export async function ensureJournal(date: string = todayKey()): Promise<Journal> {
  const existing = await db.journals.get(date);
  if (existing) return existing;
  const now = new Date().toISOString();
  const j: Journal = {
    date,
    sections: { ...EMPTY_JOURNAL_SECTIONS, done: [] },
    createdAt: now,
    updatedAt: now,
  };
  await db.journals.put(j);
  return j;
}

export async function saveJournal(date: string, sections: JournalSections): Promise<void> {
  const existing = await db.journals.get(date);
  const now = new Date().toISOString();
  await db.journals.put({
    date,
    sections: { ...EMPTY_JOURNAL_SECTIONS, ...sections, done: sections.done ?? [] },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

/* ------------------------------------------------------------------ 笔记 */

export async function addNote(
  draft: Partial<Note> & { title: string },
): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = {
    id: uid('n_'),
    title: draft.title.trim() || '未命名笔记',
    body: draft.body ?? '',
    category: draft.category ?? '',
    tags: draft.tags ?? [],
    status: draft.status ?? 'active',
    links: draft.links ?? [],
    sources: draft.sources ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  return note;
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

/* ------------------------------------------------- 快照（本地自动备份） */

export async function makeSnapshot(reason: 'auto' | 'manual' = 'auto'): Promise<void> {
  const payload = JSON.stringify(await exportPayload());
  const snap: Snapshot = {
    id: uid('s_'),
    createdAt: new Date().toISOString(),
    reason,
    payload,
  };
  await db.snapshots.add(snap);
  const all = await db.snapshots.orderBy('createdAt').reverse().toArray();
  const stale = all.slice(10);
  if (stale.length) await db.snapshots.bulkDelete(stale.map((s) => s.id));
}

export async function listSnapshots(): Promise<Snapshot[]> {
  return db.snapshots.orderBy('createdAt').reverse().toArray();
}

/* -------------------------------------------------------- 导出 / 导入 */

export interface Payload {
  schemaVersion: number;
  exportedAt: string;
  captures: Capture[];
  journals: Journal[];
  notes: Note[];
  settings: Settings;
}

export async function exportPayload(): Promise<Payload> {
  const [captures, journals, notes, settings] = await Promise.all([
    db.captures.toArray(),
    db.journals.toArray(),
    db.notes.toArray(),
    getSettings(),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    captures: captures.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    journals: journals.sort((a, b) => a.date.localeCompare(b.date)),
    notes: notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    settings,
  };
}

/**
 * 导入。mode='merge' 按 id 去重保留已有；mode='replace' 先清空再写入。
 * 返回实际写入的条目数。
 */
export async function importPayload(
  payload: Payload,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ captures: number; journals: number; notes: number }> {
  const counts = { captures: 0, journals: 0, notes: 0 };

  if (mode === 'replace') {
    await Promise.all([
      db.captures.clear(),
      db.journals.clear(),
      db.notes.clear(),
    ]);
  }

  const existingCapture = new Set((await db.captures.toArray()).map((c) => c.id));
  const existingJournal = new Set((await db.journals.toArray()).map((j) => j.date));
  const existingNote = new Set((await db.notes.toArray()).map((n) => n.id));

  for (const c of payload.captures ?? []) {
    if (!c?.id || existingCapture.has(c.id)) continue;
    await db.captures.put(c);
    existingCapture.add(c.id);
    counts.captures++;
  }
  for (const j of payload.journals ?? []) {
    if (!j?.date || existingJournal.has(j.date)) continue;
    await db.journals.put(j);
    existingJournal.add(j.date);
    counts.journals++;
  }
  for (const n of payload.notes ?? []) {
    if (!n?.id || existingNote.has(n.id)) continue;
    await db.notes.put(n);
    existingNote.add(n.id);
    counts.notes++;
  }
  return counts;
}
