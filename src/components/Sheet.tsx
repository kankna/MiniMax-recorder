import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col"
      >
        <div className="shrink-0 px-5 pt-3 pb-1">
          <div className="mx-auto h-1 w-9 rounded-full bg-rule-2" />
        </div>

        {(title || subtitle) && (
          <div className="shrink-0 px-5 pt-3 pb-3">
            {title && (
              <h2 className="editorial text-[22px] leading-tight text-ink">{title}</h2>
            )}
            {subtitle && <p className="mt-1 text-small text-ink-2">{subtitle}</p>}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
          {children}
        </div>

        {footer && (
          <div className="safe-b shrink-0 border-t border-rule px-5 pt-3">
            {footer}
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="关闭"
          className="tap absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:text-ink"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </>,
    document.body,
  );
}
