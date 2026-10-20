/** 触感反馈：安卓 Chrome 支持 navigator.vibrate */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* 静默失败 */
  }
}

export const haptics = {
  tap: () => haptic(8),
  success: () => haptic(14),
  warn: () => haptic([10, 40, 10]),
  heavy: () => haptic([18, 30, 18]),
};
