import type { ReactNode } from 'react';

interface EmptyStateProps {
  quote: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({ quote, hint, action, children }: EmptyStateProps) {
  return (
    <div className="animate-settle flex min-h-[48vh] flex-col items-center justify-center px-8 pb-8 text-center">
      <div className="mb-6 h-px w-10 bg-rule-2" />
      <p className="editorial max-w-[19rem] text-balance text-[21px] leading-[1.6] text-ink-2">
        {quote}
      </p>
      {hint && (
        <p className="mt-3 max-w-[20rem] text-balance text-small leading-relaxed text-ink-3">
          {hint}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="tap mt-7 rounded-full border border-rule-2 bg-raised px-6 py-2.5 text-small font-medium text-ink"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-5">
      <span className="caps">{children}</span>
      {right}
    </div>
  );
}
