/** 三层记录系统的数据契约。所有字段保持明文、可导出、不可锁定。 */

export type CaptureSource = 'manual' | 'share' | 'voice' | 'import';
export type CaptureStatus = 'inbox' | 'promoted' | 'archived';

export interface Capture {
  id: string;
  /** 一行一念 */
  text: string;
  createdAt: string;
  updatedAt: string;
  source: CaptureSource;
  status: CaptureStatus;
  /** 已提升为哪条笔记 */
  promotedTo?: string;
}

export interface JournalSections {
  /** 今天完成：多条 */
  done: string[];
  /** 今天学到 */
  learned: string;
  /** 今天遇到的问题 */
  problems: string;
  /** 今天最重要的一个发现 —— 通往知识库的主矿脉 */
  keyFinding: string;
  /** 明天最重要事情 */
  tomorrow: string;
}

export interface Journal {
  /** YYYY-MM-DD，主键 */
  date: string;
  sections: JournalSections;
  createdAt: string;
  updatedAt: string;
}

export type NoteStatus = 'active' | 'superseded' | 'archived';

export interface NoteSource {
  type: 'capture' | 'journal';
  id?: string;
  date?: string;
}

export interface Note {
  id: string;
  /** 标题写成一句完整的话 */
  title: string;
  body: string;
  /** 'AI/概念' */
  category: string;
  tags: string[];
  status: NoteStatus;
  /** 关联的其它笔记 id */
  links: string[];
  /** 溯源：来自哪些速记 / 哪天的日志 */
  sources: NoteSource[];
  createdAt: string;
  updatedAt: string;
}

export type Colorway = 'ink' | 'slate' | 'clay';
export type Mode = 'light' | 'dark' | 'auto';

export interface ThemeSettings {
  mode: Mode;
  colorway: Colorway;
}

export interface AISettings {
  enabled: boolean;
  /** OpenAI 兼容端点，例如 https://api.minimax.chat/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface Settings {
  key: 'app';
  theme: ThemeSettings;
  /** 一级分类 → 二级分类 */
  categories: Record<string, string[]>;
  ai: AISettings;
  lastExportAt?: string;
  /** 归档速记的保留天数（0 = 不清理） */
  archiveRetentionDays: number;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  reason: 'auto' | 'manual';
  payload: string;
}

export const EMPTY_JOURNAL_SECTIONS: JournalSections = {
  done: [],
  learned: '',
  problems: '',
  keyFinding: '',
  tomorrow: '',
};

export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  AI: ['概念', '论文', '问题'],
  项目: ['安卓', 'Bug', '架构'],
  人生: ['经验', '反思'],
};

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  theme: { mode: 'auto', colorway: 'ink' },
  categories: DEFAULT_CATEGORIES,
  ai: {
    enabled: false,
    baseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    model: 'MiniMax-M2',
  },
  archiveRetentionDays: 0,
};

export const SCHEMA_VERSION = 1;
