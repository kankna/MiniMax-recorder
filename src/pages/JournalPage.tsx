import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Journal } from '../db/types';
import { dayKey, fmtDateLong, relativeDay, todayKey, weekdayOf } from '../lib/date';
import { useApp } from '../store/useApp';
import { Masthead, IconButton } from '../components/Masthead';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icons';

export function JournalPage() {
  const navigate = useApp((s) => s.navigate);
  const journals = useLiveQuery(() => db.journals.toArray(), []);
  const today = todayKey();

  const byDate = useMemo(() => {
    const m = new Map<string, Journal>();
    for (const j of journals ?? []) m.set(j.date, j);
    return m;
  }, [journals]);

  const streak = useMemo(() => {
    let n = 0;
    let d = today;
    // 今天没写不算断，从昨天开始数
    if (!byDate.has(d)) d = dayKey(new Date(Date.now() - 86400000));
    while (byDate.has(d) && n < 400) {
      n++;
      d = dayKey(new Date(new Date(d).getTime() - 86400000));
    }
    return n;
  }, [byDate, today]);

  const recent = useMemo(() => {
    const out: {
      date: string;
      summary: string;
      written: boolean;
      recent: boolean;
    }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = dayKey(new Date(Date.now() - i * 86400000));
      const j = byDate.get(d);
      const s = j?.sections;
      const bits = [
        s?.keyFinding?.trim(),
        s?.learned?.trim(),
        (s?.done ?? []).filter(Boolean).join('；'),
      ].filter(Boolean);
      out.push({
        date: d,
        summary: bits.length ? bits.join(' · ').slice(0, 80) : '',
        written: !!j && bits.length > 0,
        recent: i < 7,
      });
    }
    return out;
  }, [byDate]);

  const older = useMemo(() => {
    const known = new Set((journals ?? []).map((j) => j.date));
    return (journals ?? [])
      .filter((j) => !recent.some((r) => r.date === j.date) && known.has(j.date))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [journals, recent]);

  const todayJournal = byDate.get(today);
  const todayFilled = !!(
    todayJournal &&
    (todayJournal.sections.keyFinding ||
      todayJournal.sections.learned ||
      (todayJournal.sections.done ?? []).filter(Boolean).length)
  );

  return (
    <div className="pb-32">
      <Masthead
        kicker="Journal"
        title="日志"
        subtitle={streak > 0 ? `连续写了 ${streak} 天` : '每天 5 分钟'}
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

      {/* 今日卡片 */}
      <div className="px-4">
        <button
          onClick={() => navigate({ name: 'journalEntry', date: today })}
          className="tap margin-rule card w-full overflow-hidden px-4 py-4 pl-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="caps">今天</div>
              <div className="editorial mt-1 text-title text-ink">
                {fmtDateLong(today)}
              </div>
              <div className="mt-0.5 text-small text-ink-3">{weekdayOf(today)}</div>
            </div>
            <span
              className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                todayFilled
                  ? 'bg-accent-soft text-accent'
                  : 'bg-rule/50 text-ink-3'
              }`}
            >
              {todayFilled ? '已写' : '待写'}
            </span>
          </div>
          {todayFilled ? (
            <p className="mt-3 line-clamp-2 text-small text-ink-2">
              {todayJournal?.sections.keyFinding || todayJournal?.sections.learned}
            </p>
          ) : (
            <p className="mt-3 text-small text-ink-3">
              五个格子，五分钟。写完就走。
            </p>
          )}
        </button>
      </div>

      {/* 近 30 天 */}
      <div className="mt-6 px-5">
        <span className="caps">最近三十天</span>
      </div>
      <div className="mt-2">
        {recent.map((r) => (
          <button
            key={r.date}
            onClick={() => navigate({ name: 'journalEntry', date: r.date })}
            className="tap flex w-full items-center gap-3.5 border-b border-rule px-5 py-3.5 text-left"
          >
            <span className="editorial w-[74px] shrink-0 text-[14px] font-normal tabular-nums text-ink-2">
              {relativeDay(r.date)}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-small ${
                  r.written ? 'text-ink' : 'text-ink-3/70'
                }`}
              >
                {r.summary || (r.written ? '（空）' : '—')}
              </span>
            </span>
            {!r.written && r.recent && (
              <span className="shrink-0 rounded-full border border-dashed border-rule-2 px-2 py-0.5 text-[11px] text-ink-3">
                补写
              </span>
            )}
            <Icon name="right" size={15} className="shrink-0 text-ink-3" />
          </button>
        ))}
      </div>

      {older.length > 0 && (
        <>
          <div className="mt-6 px-5">
            <span className="caps">更早</span>
          </div>
          <div>
            {older.map((j) => (
              <button
                key={j.date}
                onClick={() => navigate({ name: 'journalEntry', date: j.date })}
                className="tap flex w-full items-center gap-3.5 border-b border-rule px-5 py-3.5 text-left"
              >
                <span className="editorial w-[74px] shrink-0 text-[14px] tabular-nums text-ink-2">
                  {j.date.slice(5)}
                </span>
                <span className="min-w-0 flex-1 truncate text-small text-ink-2">
                  {j.sections.keyFinding ||
                    j.sections.learned ||
                    (j.sections.done ?? []).filter(Boolean).join('；') ||
                    '（空）'}
                </span>
                <Icon name="right" size={15} className="shrink-0 text-ink-3" />
              </button>
            ))}
          </div>
        </>
      )}

      {!journals?.length && (
        <EmptyState
          quote="一天一页，记下今天真正发生了什么。"
          hint="不用写得漂亮，写得真实就行。"
        />
      )}
    </div>
  );
}
