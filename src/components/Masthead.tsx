import type { ReactNode } from 'react';
import { Icon } from './Icons';
import { haptics } from '../lib/haptics';

interface MastheadProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  /** 标题不换行（手机上的日期必须一行放下） */
  nowrap?: boolean;
}

export function Masthead({
  kicker,
  title,
  subtitle,
  right,
  onBack,
  nowrap = false,
}: MastheadProps) {
  return (
    <header className="px-5 pt-4 pb-3">
      {/* 刊头行：标识在左，工具在右。标题另起一行，独占整幅宽度 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="返回"
              className="tap -ml-2 grid h-8 w-8 place-items-center rounded-full text-ink-2"
            >
              <Icon name="left" size={20} />
            </button>
          ) : (
            kicker && (
              <span className="caps flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-[3px] w-3 shrink-0 rounded-full bg-accent"
                />
                {kicker}
              </span>
            )
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>

      <h1
        className={`editorial mt-2.5 text-masthead text-ink ${
          nowrap ? 'whitespace-nowrap' : ''
        }`}
      >
        {title}
      </h1>

      {subtitle && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-small text-ink-2">
          <span>{subtitle}</span>
        </div>
      )}
    </header>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={() => {
        haptics.tap();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`tap grid h-10 w-10 place-items-center rounded-full transition-colors ${
        active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-accent-soft/60'
      }`}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
