import type { ThemeSettings } from '../db/types';

/**
 * 主题是极小的偏好项，必须同步、立即、不可丢。
 * 所以它以 localStorage 为准（首帧脚本直接读它，避免闪烁），
 * IndexedDB 里只留一份副本用于导出备份。
 */
const KEY = 'recorder:theme';

export const FALLBACK_THEME: ThemeSettings = { mode: 'auto', colorway: 'ink' };

export function readStoredTheme(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<ThemeSettings>;
    if (!t.mode && !t.colorway) return null;
    return {
      mode: t.mode ?? FALLBACK_THEME.mode,
      colorway: t.colorway ?? FALLBACK_THEME.colorway,
    };
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: ThemeSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(theme));
  } catch {
    /* 隐私模式下写入会失败，忽略即可 */
  }
}
