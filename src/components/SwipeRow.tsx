import { useRef, useState, type ReactNode } from 'react';
import { haptics } from '../lib/haptics';

interface SwipeRowProps {
  children: ReactNode;
  onDelete?: () => void;
  onLongPress?: () => void;
  deleteLabel?: string;
  disabled?: boolean;
}

const TRIGGER = 78;

/** 可左滑删除、长按呼出操作的单据行 */
export function SwipeRow({
  children,
  onDelete,
  onLongPress,
  deleteLabel = '删除',
  disabled,
}: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const [firing, setFiring] = useState(false);
  const dxRef = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const axis = useRef<'none' | 'x' | 'y'>('none');
  const timer = useRef<number | null>(null);
  const moved = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    axis.current = 'none';
    moved.current = false;
    clearTimer();
    if (onLongPress) {
      timer.current = window.setTimeout(() => {
        if (!moved.current && Math.abs(dxRef.current) < 8) {
          haptics.heavy();
          onLongPress();
        }
      }, 460);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    const ddx = t.clientX - start.current.x;
    const ddy = t.clientY - start.current.y;

    if (axis.current === 'none') {
      if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) {
        axis.current = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
        moved.current = true;
        clearTimer();
      } else {
        return;
      }
    }
    if (axis.current !== 'x') return;

    let next = ddx;
    if (next > 0) next = 0; // 只允许向左滑
    if (next < -TRIGGER - 40) next = -TRIGGER - 40;
    dxRef.current = next;
    setDx(next);
  };

  const onTouchEnd = () => {
    clearTimer();
    if (axis.current !== 'x') return;
    if (dxRef.current <= -TRIGGER) {
      setFiring(true);
      setDx(-200);
      dxRef.current = -200;
      haptics.warn();
      window.setTimeout(() => {
        setFiring(false);
        setDx(0);
        dxRef.current = 0;
        onDelete?.();
      }, 190);
    } else {
      dxRef.current = 0;
      setDx(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {onDelete && (
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-margin/12"
        >
          <span className="flex flex-col items-center gap-1 text-margin">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
            </svg>
            <span className="text-[11px] tracking-[0.08em]">{deleteLabel}</span>
          </span>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${dx}px)`,
          transition: firing ? 'transform 190ms cubic-bezier(.4,0,1,1)' : 'transform 220ms cubic-bezier(.22,.9,.24,1)',
        }}
        className="relative bg-paper"
      >
        {children}
      </div>
    </div>
  );
}
