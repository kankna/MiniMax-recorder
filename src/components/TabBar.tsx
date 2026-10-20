import { useLayoutEffect, useRef, useState } from 'react';
import { useApp, type Route } from '../store/useApp';
import { haptics } from '../lib/haptics';

interface Tab {
  key: string;
  numeral: string;
  label: string;
  route: Route;
}

const TABS: Tab[] = [
  { key: 'inbox', numeral: 'Ⅰ', label: '速记', route: { name: 'inbox' } },
  { key: 'journal', numeral: 'Ⅱ', label: '日志', route: { name: 'journal' } },
  { key: 'library', numeral: 'Ⅲ', label: '库', route: { name: 'library' } },
];

function activeKey(route: Route): string {
  switch (route.name) {
    case 'inbox':
      return 'inbox';
    case 'journal':
    case 'journalEntry':
      return 'journal';
    case 'library':
    case 'noteEditor':
      return 'library';
    default:
      return '';
  }
}

export function TabBar() {
  const route = useApp((s) => s.route);
  const navigate = useApp((s) => s.navigate);
  const active = activeKey(route);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const idx = TABS.findIndex((t) => t.key === active);
    if (idx < 0) {
      setInd((s) => ({ ...s, ready: false }));
      return;
    }
    const el = refs.current[idx];
    if (el) {
      setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
  }, [active]);

  if (route.name === 'noteEditor') return null;

  return (
    <nav
      className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 backdrop-blur-sm"
      style={{ ['--sp' as string]: '0px' }}
    >
      <div className="shell relative flex">
        {ind.ready && (
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] rounded-full bg-accent transition-[transform,width] duration-[320ms] ease-[cubic-bezier(.22,.9,.24,1)]"
            style={{
              transform: `translateX(${ind.left}px)`,
              width: ind.width,
            }}
          />
        )}
        {TABS.map((t, i) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              onClick={() => {
                if (on) return;
                haptics.tap();
                navigate(t.route, true);
              }}
              aria-current={on ? 'page' : undefined}
              className="tap flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2"
            >
              <span
                className={`editorial text-[15px] leading-none transition-colors duration-200 ${
                  on ? 'text-accent' : 'text-ink-3'
                }`}
              >
                {t.numeral}
              </span>
              <span
                className={`text-[11px] leading-none tracking-[0.08em] transition-colors duration-200 ${
                  on ? 'text-ink' : 'text-ink-3'
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
