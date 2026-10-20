import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Journal } from '../db/types';
import { dayKey, fmtDateLong, fmtDateShort, relativeDay, todayKey, weekdayOf } from '../lib/date';
import { useApp } from '../store/useApp';
import { haptics } from '../lib/haptics';
import { Masthead, IconButton } from '../components/Masthead';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icons';

/** 这一天到底写了没有 */
function hasContent(j: Journal): boolean {
  const s = j.sections;
  return !!(
    s.keyFinding?.trim() ||
    s.learned?.trim() ||
    s.problems?.trim() ||
    s.tomorrow?.trim() ||
    (s.done ?? []).some((d) => d.trim())
  );
}

function summaryOf(j: Journal): string {
  const s = j.sections;
  return (
    s.keyFinding?.trim() ||
    s.learned?.trim() ||
    s.problems?.trim() ||
    (s.done ?? []).filter(Boolean).join('；') ||
    s.tomorrow?.trim() ||
    ''
  );
}

export function JournalPage() {
  const navigate = useApp((s) => s.navigate);
  const journals = useLiveQuery(() => db.journals.toArray(), []);
  const today = todayKey();
  const [pickOpen, setPickOpen] = useState(false);

  /** 只留写过的 */
  const written = useMemo(
    () =>
      (journals ?? [])
        .filter(hasContent)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [journals],
  );

  const months = useMemo(() => {
    const map = new Map<string, Journal[]>();
    for (const j of written) {
      const key = j.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    }
    return [...map.entries()];
  }, [written]);

  const streak = useMemo(() => {
    let n = 0;
    let d = today;
    if (!written.some((j) => j.date === d)) {
      d = dayKey(new Date(Date.now() - 86400000));
    }
    while (written.some((j) => j.date === d) && n < 400) {
      n++;
      d = dayKey(new Date(Date.now() - n * 86400000));
    }
    return n;
  }, [written, today]);

  /** 最近两周里空着的日子 —— 只在"补一个"里出现，不铺在主列表上 */
  const missed = useMemo(() => {
    const have = new Set((journals ?? []).map((j) => j.date));
    const out: string[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = dayKey(new Date(Date.now() - i * 86400000));
      if (!have.has(d)) out.push(d);
    }
    return out;
  }, [journals]);

  const todayJournal = (journals ?? []).find((j) => j.date === today);
  const todayFilled = todayJournal ? hasContent(todayJournal) : false;

  return (
    <div className="pb-32">
      <Masthead
        kicker="Journal"
        title="日志"
        subtitle={streak > 0 ? `连续写了 ${streak} 天` : '一天五分钟，写几笔就好'}
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

      {/* 今天 */}
      <div className="px-4">
        <button
          onClick={() => {
            haptics.tap();
            navigate({ name: 'journalEntry', date: today });
          }}
          className="margin-rule card row-tap w-full overflow-hidden px-4 py-4 pl-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="caps">今天</div>
              <div className="editorial mt-1 text-title text-ink">
                {fmtDateLong(today)}
              </div>
              <div className="mt-0.5 text-small text-ink-3">{weekdayOf(today)}</div>
            </div>
            {todayFilled ? (
              <span className="mt-1 shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] text-accent">
                已写
              </span>
            ) : null}
          </div>
          {todayFilled ? (
            <p className="mt-3 line-clamp-2 text-small text-ink-2">
              {summaryOf(todayJournal!)}
            </p>
          ) : (
            <p className="mt-3 text-small text-ink-3">五格纸，写几笔就好</p>
          )}
        </button>
      </div>

      {/* 写过的日子 */}
      {written.length > 0 ? (
        <>
          <div className="mt-7 px-5">
            <span className="caps">写过 {written.length} 天</span>
          </div>
          {months.map(([key, items]) => (
            <section key={key}>
              <div className="px-5 pt-4 pb-1 text-[13px] text-ink-2">
                {Number(key.slice(5))}月
              </div>
              {items.map((j) => (
                <button
                  key={j.date}
                  onClick={() => {
                    haptics.tap();
                    navigate({ name: 'journalEntry', date: j.date });
                  }}
                  className="row-tap block w-full border-b border-rule px-5 py-3.5 text-left"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="editorial text-[15px] text-ink">
                      {fmtDateShort(j.date)}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      {weekdayOf(j.date)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-small text-ink-2">
                    {summaryOf(j)}
                  </p>
                </button>
              ))}
            </section>
          ))}
        </>
      ) : (
        <EmptyState
          quote="还没有日志"
          hint="一天五分钟，记下今天真正发生了什么"
          action={{
            label: '写今天的',
            onClick: () => navigate({ name: 'journalEntry', date: today }),
          }}
        />
      )}

      {/* 补写入口：温和地放在最下面，不制造压力 */}
      {missed.length > 0 && (
        <div className="mt-8 px-5">
          <button
            onClick={() => {
              haptics.tap();
              setPickOpen(true);
            }}
            className="tap flex items-center gap-1.5 text-small text-ink-3"
          >
            漏了几天？
            <span className="text-accent">补一个</span>
            <Icon name="right" size={13} className="text-ink-3" />
          </button>
        </div>
      )}

      <Sheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="补哪一天"
        subtitle="挑一个就行，不用全补"
      >
        <div className="pb-2">
          {missed.map((d) => (
            <button
              key={d}
              onClick={() => {
                haptics.tap();
                setPickOpen(false);
                navigate({ name: 'journalEntry', date: d });
              }}
              className="row-tap flex w-full items-center gap-3 border-b border-rule py-3.5 text-left"
            >
              <span className="editorial w-[52px] shrink-0 text-[15px] text-ink">
                {relativeDay(d)}
              </span>
              <span className="flex-1 text-small text-ink-2">
                {fmtDateShort(d)} {weekdayOf(d)}
              </span>
              <Icon name="right" size={15} className="shrink-0 text-ink-3" />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
