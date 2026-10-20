import { useApp } from '../store/useApp';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-rise pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-rule bg-raised py-2.5 pr-2.5 pl-4 shadow-[0_8px_28px_rgb(var(--c-shadow)/0.16)]"
        >          <span className="text-small text-ink">{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="tap shrink-0 rounded-full bg-accent px-3 py-1 text-small font-medium text-accent-ink"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
