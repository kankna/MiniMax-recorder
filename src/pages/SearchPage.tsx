import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { fmtDateShort } from '../lib/date';
import { useApp } from '../store/useApp';
import { Icon } from '../components/Icons';
import { EmptyState } from '../components/EmptyState';

export function SearchPage() {
  const back = useApp((s) => s.back);
  const navigate = useApp((s) => s.navigate);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const captures = useLiveQuery(() => db.captures.toArray(), []);
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const journals = useLiveQuery(() => db.journals.toArray(), []);

  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return { captures: [], notes: [], journals: [] };
    const hit = (s: string) => s.toLowerCase().includes(query);
    return {
      captures: (captures ?? [])
        .filter((c) => hit(c.text))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 60),
      notes: (notes ?? [])
        .filter((n) => hit(n.title) || hit(n.body) || n.tags.some(hit))
        .slice(0, 60),
      journals: (journals ?? [])
        .filter((j) =>
          Object.values(j.sections).some((v) =>
            Array.isArray(v) ? v.some(hit) : hit(v ?? ''),
          ),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30),
    };
  }, [query, captures, notes, journals]);

  const total = results.captures.length + results.notes.length + results.journals.length;

  return (
    <div className="pb-32">
      <div className="sticky top-0 z-20 bg-paper/92 px-4 pt-3 pb-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-field border border-rule bg-field px-3">
          <span className="shrink-0 text-ink-3">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜速记、日志、笔记"
            enterKeyHint="search"
            className="h-11 flex-1 bg-transparent text-body text-ink placeholder:text-ink-3/65"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="清空"
              className="tap shrink-0 p-1 text-ink-3"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="caps">
            {query ? `${total} 条结果` : '输入关键词'}
          </span>
          <button onClick={back} className="tap text-[11px] text-ink-3">
            取消
          </button>
        </div>
      </div>

      {!query && (
        <EmptyState
          quote="想不起来写在哪了？搜关键词。"
          hint="标题、正文、标签、原始速记，都能搜。"
        />
      )}

      {query && total === 0 && (
        <EmptyState quote="没有找到。" hint="换个词试试，或者少打几个字。" />
      )}

      {results.captures.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between px-5 pb-1.5 pt-4">
            <span className="caps">速记</span>
            <span className="text-[11px] text-ink-3">{results.captures.length}</span>
          </div>
          {results.captures.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ name: 'inbox' }, true)}
              className="tap block w-full border-b border-rule px-5 py-3 text-left"
            >
              <span className="editorial mr-2 text-[11px] text-ink-3">
                {fmtDateShort(c.createdAt.slice(0, 10))}
              </span>
              <span className="text-body text-ink">
                <Highlight text={c.text} q={query} />
              </span>
            </button>
          ))}
        </section>
      )}

      {results.notes.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between px-5 pb-1.5 pt-4">
            <span className="caps">笔记</span>
            <span className="text-[11px] text-ink-3">{results.notes.length}</span>
          </div>
          {results.notes.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate({ name: 'noteEditor', id: n.id })}
              className="tap block w-full border-b border-rule px-5 py-3 text-left"
            >
              <h3 className="editorial text-[16px] leading-snug text-ink">
                <Highlight text={n.title} q={query} />
              </h3>
              {n.body && (
                <p className="mt-1 line-clamp-2 text-small text-ink-2">
                  <Highlight text={n.body.slice(0, 140)} q={query} />
                </p>
              )}
              <span className="mt-1 block text-[11px] text-ink-3">{n.category}</span>
            </button>
          ))}
        </section>
      )}

      {results.journals.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between px-5 pb-1.5 pt-4">
            <span className="caps">日志</span>
            <span className="text-[11px] text-ink-3">{results.journals.length}</span>
          </div>
          {results.journals.map((j) => {
            const s = j.sections;
            const text = [s.keyFinding, s.learned, s.problems, s.tomorrow]
              .filter(Boolean)
              .join(' · ');
            return (
              <button
                key={j.date}
                onClick={() => navigate({ name: 'journalEntry', date: j.date })}
                className="tap block w-full border-b border-rule px-5 py-3 text-left"
              >
                <span className="editorial mr-2 text-[11px] text-ink-3">
                  {fmtDateShort(j.date)}
                </span>
                <span className="text-body text-ink-2">
                  <Highlight text={text.slice(0, 160)} q={query} />
                </span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded-[3px] bg-accent/18 px-0.5 text-ink"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return <>{parts}</>;
}
