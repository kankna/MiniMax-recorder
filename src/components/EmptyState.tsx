import type { ReactNode } from 'react';

interface EmptyStateProps {
  quote: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({ quote, hint, action, children }: EmptyStateProps) {
  return (
    <div className="animate-settle flex flex-col items-center px-8 pt-20 pb-10 text-center">
      <div className="mb-5 h-px w-10 bg-rule-2" />
      <p className="editorial max-w-[20rem] text-balance text-[19px] leading-[1.6] text-ink-2">
        {quote}
      </p>
      {hint && <p className="mt-3 max-w-[20rem] text-balance text-small text-ink-3">{hint}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="tap mt-6 rounded-full border border-rule-2 bg-raised px-5 py-2.5 text-small font-medium text-ink"
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
