import Dexie, { type Table } from 'dexie';
import type { Capture, Journal, Note, Settings, Snapshot } from './types';

export class RecorderDB extends Dexie {
  captures!: Table<Capture, string>;
  journals!: Table<Journal, string>;
  notes!: Table<Note, string>;
  settings!: Table<Settings, string>;
  snapshots!: Table<Snapshot, string>;

  constructor() {
    super('recorder');
    this.version(1).stores({
      captures: 'id, createdAt, status, promotedTo',
      journals: 'date, updatedAt',
      notes: 'id, title, category, status, updatedAt, *tags, *links',
      settings: 'key',
      snapshots: 'id, createdAt',
    });
  }
}

export const db = new RecorderDB();

/** 浏览器不支持 IndexedDB（隐私模式等）时给出明确提示，而不是白屏 */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
