import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Note } from '../db/types';
import { fmtDateShort } from '../lib/date';
import { haptics } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { Masthead, IconButton } from '../components/Masthead';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icons';

type Filter = 'all' | 'active' | 'archived';

export function LibraryPage() {
  const navigate = useApp((s) => s.navigate);
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const [filter, setFilter] = useState<Filter>('active');

  const list = useMemo(() => {
    const all = notes ?? [];
    if (filter === 'all') return all;
    if (filter === 'active') return all.filter((n) => n.status === 'active');
    return all.filter((n) => n.status !== 'active');
  }, [notes, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of list) {
      const key = n.category || '未分类';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const tagCloud = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes ?? []) {
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [notes]);

  return (
    <div className="pb-32">
      <Masthead
        kicker="Library"
        title="库"
        subtitle={`${(notes ?? []).filter((n) => n.status === 'active').length} 条笔记在册`}
        right={
          <>
            <IconButton
              icon="search"
              label="搜索"
              onClick={() => navigate({ name: 'search' })}
            />
            <IconButton
              icon="sliders"
              label="设置"
              onClick={() => navigate({ name: 'settings' })}
            />
          </>
        }
      />

      <div className="flex items-center gap-1.5 px-5 pb-1">
        {(
          [
            ['active', '在册'],
            ['all', '全部'],
            ['archived', '已归档'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              haptics.tap();
              setFilter(k);
            }}
            className={`tap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              filter === k
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-rule bg-raised text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}

        <button
          onClick={() => {
            haptics.tap();
            navigate({ name: 'noteEditor' });
          }}
          className="tap ml-auto flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-medium text-accent-ink"
        >
          <Icon name="plus" size={14} strokeWidth={2} /> 新笔记
        </button>
      </div>

      {tagCloud.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {tagCloud.map(([t, c]) => (
            <span
              key={t}
              className="shrink-0 rounded-full border border-rule bg-field px-2.5 py-1 text-[12px] text-ink-2"
            >
              #{t}
              <span className="ml-1 text-ink-3">{c}</span>
            </span>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          quote="库还是空的"
          hint="从速记里挑几条，固化成笔记。周末整理时，别忘了把最重要的那个发现也提出来"
          action={{ label: '去速记里挑', onClick: () => navigate({ name: 'inbox' }) }}
        />
      ) : (
        <div className="mt-4">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <div className="flex items-baseline justify-between px-5 pt-4 pb-1.5">
                <span className="caps">{cat}</span>
                <span className="text-[11px] text-ink-3">{items.length}</span>
              </div>
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    haptics.tap();
                    navigate({ name: 'noteEditor', id: n.id });
                  }}
                  className="row-tap block w-full border-b border-rule px-5 py-3.5 text-left"
                >
                  <div className="flex items-baseline gap-3">
                    <h3 className="editorial flex-1 text-[16px] leading-snug text-ink">
                      {n.title}
                    </h3>
                    <span className="editorial shrink-0 text-[11px] tabular-nums text-ink-3">
                      {fmtDateShort(n.updatedAt.slice(0, 10))}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-1 line-clamp-2 text-small text-ink-2">
                      {n.body.replace(/[#*\->`\[\]]/g, '').slice(0, 120)}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {n.status !== 'active' && (
                      <span className="rounded-full bg-rule/50 px-2 py-0.5 text-[11px] text-ink-3">
                        {n.status === 'superseded' ? '已被取代' : '已归档'}
                      </span>
                    )}
                    {n.tags.map((t) => (
                      <span key={t} className="text-[11px] text-ink-3">
                        #{t}
                      </span>
                    ))}
                    {n.sources.length > 0 && (
                      <span className="ml-auto text-[11px] text-ink-3">
                        溯源 {n.sources.length}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
