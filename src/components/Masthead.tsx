import type { ReactNode } from 'react';
import { Icon } from './Icons';

interface MastheadProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function Masthead({ kicker, title, subtitle, right, onBack }: MastheadProps) {
  return (
    <header className="px-5 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="返回"
              className="tap -ml-2 mb-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-2"
            >
              <Icon name="left" size={20} />
            </button>
          ) : (
            kicker && <div className="caps mb-2">{kicker}</div>
          )}
          <h1 className="editorial text-display text-ink">{title}</h1>
          {subtitle && (
            <div className="mt-1 flex items-center gap-2 text-small text-ink-2">
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1 pt-1">{right}</div>}
      </div>
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
      onClick={onClick}
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
