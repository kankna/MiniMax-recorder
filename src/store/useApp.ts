import { create } from 'zustand';
import { getSettings, saveSettings } from '../db/repo';
import type { Settings, ThemeSettings } from '../db/types';
import { readStoredTheme, writeStoredTheme } from '../lib/theme';
export type Route =
  | { name: 'inbox' }
  | { name: 'journal' }
  | { name: 'journalEntry'; date: string }
  | { name: 'library' }
  | { name: 'noteEditor'; id?: string; draft?: Partial<import('../db/types').Note> }
  | { name: 'search' }
  | { name: 'settings' }
  | { name: 'aiReview' };

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface AppState {
  route: Route;
  history: Route[];
  settings: Settings | null;
  toasts: Toast[];
  /** 多选模式（速记 → 转笔记） */
  selection: Set<string>;
  ready: boolean;

  navigate: (route: Route, replace?: boolean) => void;
  back: () => void;
  loadSettings: () => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => Promise<void>;
  setTheme: (theme: Partial<ThemeSettings>) => Promise<void>;
  toast: (text: string, action?: Toast['action']) => void;
  dismissToast: (id: number) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setSelection: (ids: string[]) => void;
}

let toastSeq = 0;

export const useApp = create<AppState>((set, get) => ({
  route: { name: 'inbox' },
  history: [],
  settings: null,
  toasts: [],
  selection: new Set<string>(),
  ready: false,

  navigate: (route, replace = false) =>
    set((s) => ({
      route,
      history: replace ? s.history : [...s.history, s.route].slice(-20),
    })),

  back: () =>
    set((s) => {
      const history = [...s.history];
      const prev = history.pop();
      return { history, route: prev ?? { name: 'inbox' } };
    }),

  loadSettings: async () => {
    const settings = await getSettings();
    // 主题以 localStorage 为准：它是同步的，不会被异步写入竞态覆盖
    const stored = readStoredTheme();
    const theme = stored ?? settings.theme;
    if (!stored) writeStoredTheme(theme);
    const merged: Settings = { ...settings, theme };
    applyTheme(theme);
    set({ settings: merged, ready: true });
  },

  patchSettings: async (patch) => {
    const current = get().settings;
    if (!current) return;
    const next = { ...current, ...patch };
    await saveSettings(next);
    set({ settings: next });
  },

  setTheme: async (theme) => {
    const current = get().settings;
    if (!current) return;
    const next = { ...current, theme: { ...current.theme, ...theme } };
    // 先同步落盘 + 上屏，再异步写库 —— 任何中间态都不会丢掉用户的选择
    writeStoredTheme(next.theme);
    applyTheme(next.theme);
    set({ settings: next });
    try {
      await saveSettings(next);
    } catch {
      /* 数据库只是备份，失败不影响使用 */
    }
  },

  toast: (text, action) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, text, action }] }));
    setTimeout(() => get().dismissToast(id), action ? 5200 : 2600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selection: next };
    }),

  clearSelection: () => set({ selection: new Set<string>() }),

  setSelection: (ids) => set({ selection: new Set(ids) }),
}));

/* ------------------------------------------------------------ 主题落地 */

export function resolveMode(mode: ThemeSettings['mode']): 'light' | 'dark' {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-colorway', theme.colorway);
  root.setAttribute('data-mode', resolveMode(theme.mode));
}

/* 跟随系统切换（auto 模式下有效） */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const s = useApp.getState().settings;
    if (s?.theme.mode === 'auto') applyTheme(s.theme);
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
