const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 本地时区的 YYYY-MM-DD */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayKeyOf(iso: string): string {
  return dayKey(new Date(iso));
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** 2026年10月20日 */
export function fmtDateLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/** 10月20日 */
export function fmtDateShort(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}月${d}日`;
}

export function weekdayOf(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** 今天 / 昨天 / 前天 / 10月18日 */
export function relativeDay(key: string): string {
  const diff = dayDiff(key, todayKey());
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  if (diff === -1) return '明天';
  return fmtDateShort(key);
}

/** key 距今天的天数（过去为正） */
export function dayDiff(key: string, from: string): number {
  const a = parseKey(key);
  const b = parseKey(from);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 14:22 */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 本周一 ~ 本周日 的日期键 */
export function weekRange(from: string = todayKey()): string[] {
  const base = parseKey(from);
  const dow = (base.getDay() + 6) % 7; // 周一为 0
  const start = new Date(base);
  start.setDate(base.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKey(d);
  });
}

/** 本月所有日期键 */
export function monthRange(key: string = todayKey()): string[] {
  const [y, m] = key.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}
