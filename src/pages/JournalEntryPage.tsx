import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ensureJournal, saveJournal } from '../db/repo';
import type { JournalSections } from '../db/types';
import { dayKey, fmtDateLong, todayKey, weekdayOf } from '../lib/date';
import { useApp } from '../store/useApp';
import { Masthead } from '../components/Masthead';
import { Icon } from '../components/Icons';

export function JournalEntryPage({ date }: { date: string }) {
  const navigate = useApp((s) => s.navigate);
  const back = useApp((s) => s.back);
  const toast = useApp((s) => s.toast);

  const existing = useLiveQuery(() => db.journals.get(date), [date]);
  const yesterday = useLiveQuery(
    () => db.journals.get(dayKey(new Date(new Date(date).getTime() - 86400000))),
    [date],
  );

  const [sections, setSections] = useState<JournalSections>({
    done: [],
    learned: '',
    problems: '',
    keyFinding: '',
    tomorrow: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number | null>(null);
  const isToday = date === todayKey();

  // 首次装载：补写场景下把昨天的"明天最重要事情"承接过来
  useEffect(() => {
    if (loaded) return;
    if (existing) {
      setSections(existing.sections);
      setLoaded(true);
      return;
    }
    if (isToday && yesterday?.sections?.tomorrow?.trim()) {
      setSections((s) => ({
        ...s,
        done: [yesterday.sections.tomorrow.trim()],
      }));
    }
    setLoaded(true);
  }, [existing, loaded, isToday, yesterday]);

  const readOnly = !!existing && !isToday;

  const persist = useCallback(
    async (next: JournalSections) => {
      setState('saving');
      await saveJournal(date, next);
      setState('saved');
      window.setTimeout(() => setState('idle'), 1600);
    },
    [date],
  );

  const update = (patch: Partial<JournalSections>) => {
    if (readOnly) return;
    setSections((prev) => {
      const next = { ...prev, ...patch };
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void persist(next), 700);
      return next;
    });
  };

  const setDone = (list: string[]) => update({ done: list });

  if (!loaded) {
    return (
      <div className="px-5 pt-4">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton mt-8 h-24 w-full" />
        <div className="skeleton mt-4 h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="pb-32">
      <Masthead
        onBack={back}
        title={fmtDateLong(date)}
        subtitle={`${weekdayOf(date)}${isToday ? ' · 今天' : ''}`}
        right={
          <span className="pr-2 text-[11px] text-ink-3">
            {readOnly ? '只读' : state === 'saving' ? '保存中…' : state === 'saved' ? '已保存' : '自动保存'}
          </span>
        }
      />

      {readOnly && (
        <div className="mx-4 mb-4 rounded-card border border-dashed border-rule-2 px-4 py-3 text-small text-ink-3">
          已归档的一天，不再改动。要补充就写进今天的日志。
        </div>
      )}

      <div className="space-y-6 px-4">
        {/* 今天完成 */}
        <Field label="今天完成" hint="做了什么">
          <div className="space-y-1.5">
            {sections.done.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <input
                  value={item}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = [...sections.done];
                    next[i] = e.target.value;
                    setDone(next);
                  }}
                  placeholder="一件事一行"
                  className="w-full border-b border-dashed border-rule bg-transparent py-1.5 text-body text-ink placeholder:text-ink-3/60 focus:border-accent disabled:text-ink-2"
                />
                {!readOnly && (
                  <button
                    onClick={() => setDone(sections.done.filter((_, x) => x !== i))}
                    aria-label="删除这一条"
                    className="tap shrink-0 p-1 text-ink-3"
                  >
                    <Icon name="close" size={15} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={() => setDone([...sections.done, ''])}
                className="tap ml-3.5 flex items-center gap-1 py-1 text-small text-ink-3"
              >
                <Icon name="plus" size={14} strokeWidth={1.6} /> 添一条
              </button>
            )}
            {!sections.done.length && readOnly && (
              <p className="text-small text-ink-3">（没记）</p>
            )}
          </div>
        </Field>

        {/* 今天学到 */}
        <Field label="今天学到" hint="新的认识">
          <Box
            value={sections.learned}
            onChange={(v) => update({ learned: v })}
            readOnly={readOnly}
            placeholder="今天有什么是你以前不知道的？"
          />
        </Field>

        {/* 今天遇到的问题 */}
        <Field label="今天遇到的问题" hint="卡在哪">
          <Box
            value={sections.problems}
            onChange={(v) => update({ problems: v })}
            readOnly={readOnly}
            placeholder="写下来，明天再解决"
          />
        </Field>

        {/* 今天最重要的一个发现 */}
        <Field label="今天最重要的一个发现" hint="通往知识库的那一条" accent>
          <Box
            value={sections.keyFinding}
            onChange={(v) => update({ keyFinding: v })}
            readOnly={readOnly}
            placeholder="如果今天只留一句话，留哪句？"
            tall
          />
        </Field>

        {/* 明天最重要事情 */}
        <Field label="明天最重要事情" hint="只写一件">
          <Box
            value={sections.tomorrow}
            onChange={(v) => update({ tomorrow: v })}
            readOnly={readOnly}
            placeholder="明天最重要的一件事是"
          />
          {!readOnly && sections.tomorrow.trim() && (
            <p className="mt-2 text-[11px] text-ink-3">
              明天打开日志时，它会自动出现在"今天完成"的第一条。
            </p>
          )}
        </Field>
      </div>

      {isToday && !readOnly && (
        <div className="mt-8 px-4">
          <button
            onClick={async () => {
              await ensureJournal(date);
              toast('已保存今天的日志');
            }}
            className="tap w-full rounded-field border border-rule bg-raised py-3 text-body text-ink-2"
          >
            存好了
          </button>
        </div>
      )}

      <div className="h-8" onClick={() => navigate({ name: 'journal' })} />
    </div>
  );
}

function Field({
  label,
  hint,
  accent,
  children,
}: {
  label: string;
  hint?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span
          className={`text-[13px] font-medium tracking-wide ${
            accent ? 'text-accent' : 'text-ink'
          }`}
        >
          {label}
        </span>
        {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
      </div>
      {accent && <div className="mb-2 h-px bg-accent/25" />}
      {children}
    </section>
  );
}

function Box({
  value,
  onChange,
  readOnly,
  placeholder,
  tall,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  tall?: boolean;
}) {
  return (
    <textarea
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={tall ? 4 : 3}
      className={`w-full resize-none rounded-field border bg-field px-3.5 py-3 text-body text-ink placeholder:text-ink-3/55 ${
        readOnly ? 'border-transparent bg-transparent px-0 text-ink-2' : 'border-rule'
      }`}
    />
  );
}
