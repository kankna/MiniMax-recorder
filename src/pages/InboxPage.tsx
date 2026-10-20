import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  deleteCapture,
  restoreCapture,
  updateCapture,
  promoteCaptures,
} from '../db/repo';
import type { Capture } from '../db/types';
import { dayKeyOf, fmtDateShort, relativeDay, todayKey, weekdayOf } from '../lib/date';
import { useApp } from '../store/useApp';
import { haptics } from '../lib/haptics';
import { Masthead, IconButton } from '../components/Masthead';
import { CaptureBar } from '../components/CaptureBar';
import { CaptureItem } from '../components/CaptureItem';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import { PromoteSheet } from '../components/NoteForm';
import { Icon } from '../components/Icons';

export function InboxPage() {
  const navigate = useApp((s) => s.navigate);
  const toast = useApp((s) => s.toast);
  const settings = useApp((s) => s.settings);
  const selection = useApp((s) => s.selection);
  const lastCaptureId = useApp((s) => s.lastCaptureId);
  const clearCaptured = useApp((s) => s.clearCaptured);
  const toggleSelect = useApp((s) => s.toggleSelect);
  const clearSelection = useApp((s) => s.clearSelection);

  const all = useLiveQuery(
    () => db.captures.orderBy('createdAt').reverse().toArray(),
    [],
  );
  const journalToday = useLiveQuery(() => db.journals.get(todayKey()), []);

  const [selectMode, setSelectMode] = useState(false);
  const [target, setTarget] = useState<Capture | null>(null);
  const [editing, setEditing] = useState<Capture | null>(null);
  const [editText, setEditText] = useState('');
  const [promoting, setPromoting] = useState<Capture[]>([]);

  const captures = useMemo(() => (all ?? []).filter((c) => c.status !== 'archived'), [all]);

  // 落笔动效只演一次，演完就摘掉，免得来回切页时重播
  useEffect(() => {
    if (!lastCaptureId) return;
    const t = window.setTimeout(() => clearCaptured(), 1500);
    return () => window.clearTimeout(t);
  }, [lastCaptureId, clearCaptured]);

  const groups = useMemo(() => {
    const map = new Map<string, Capture[]>();
    for (const c of captures) {
      const k = dayKeyOf(c.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return [...map.entries()];
  }, [captures]);

  const selectedList = useMemo(
    () => captures.filter((c) => selection.has(c.id)),
    [captures, selection],
  );

  const today = todayKey();
  const needJournal =
    !journalToday ||
    (!journalToday.sections.keyFinding &&
      !journalToday.sections.learned &&
      !(journalToday.sections.done ?? []).filter(Boolean).length);

  const removeWithUndo = async (c: Capture) => {
    await deleteCapture(c.id);
    clearSelection();
    toast('已删除', {
      label: '撤销',
      run: () => {
        void restoreCapture(c);
        haptics.success();
      },
    });
  };

  const archive = async (c: Capture) => {
    await updateCapture(c.id, { status: 'archived' });
    toast('已归档');
  };

  const openPromote = (list: Capture[]) => {
    setPromoting(list);
    setTarget(null);
  };

  const submitPromote = async (draft: {
    title: string;
    body: string;
    category: string;
    tags: string[];
  }) => {
    const ids = promoting.map((c) => c.id);
    const note = await promoteCaptures(ids, draft);
    setPromoting([]);
    clearSelection();
    setSelectMode(false);
    toast('已存进知识库');
    navigate({ name: 'noteEditor', id: note.id });
  };

  const promoteInitial = {
    title: '',
    body: promoting.map((c) => `- ${c.text}`).join('\n'),
    category: '',
    tags: [] as string[],
  };

  return (
    <div className="pb-32">
      <Masthead
        kicker="Recorder"
        title={`${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日`}
        subtitle={`${weekdayOf(today)} · 今天记了 ${
          captures.filter((c) => dayKeyOf(c.createdAt) === today).length
        } 条`}
        nowrap
        right={
          <>
            <IconButton
              icon={selectMode ? 'close' : 'more'}
              label={selectMode ? '退出多选' : '多选'}
              onClick={() => {
                setSelectMode((v) => !v);
                clearSelection();
              }}
              active={selectMode}
            />
            <IconButton icon="search" label="搜索" onClick={() => navigate({ name: 'search' })} />
            <IconButton
              icon="sliders"
              label="设置"
              onClick={() => navigate({ name: 'settings' })}
            />
          </>
        }
      />

      <CaptureBar />

      {needJournal && (
        <button
          onClick={() => navigate({ name: 'journalEntry', date: today })}
          className="tap mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-card border border-rule bg-raised px-4 py-3 text-left"
        >
          <span className="text-small text-ink-2">
            今天还没写日志
            <span className="text-ink-3"> · 3 分钟</span>
          </span>
          <span className="flex items-center gap-1 text-small text-accent">
            去写 <Icon name="right" size={14} strokeWidth={1.8} />
          </span>
        </button>
      )}

      {captures.length === 0 ? (
        <EmptyState
          quote="纸是空的。想到什么，先记下来。"
          hint="不必整理，不必分类 —— 整理是周末的事。"
        />
      ) : (
        <div className="mt-5">
          {groups.map(([day, list]) => (
            <section key={day}>
              <div className="sticky top-0 z-10 flex items-baseline justify-between bg-paper/92 px-5 py-2 backdrop-blur-sm">
                <span className="editorial text-[13px] tracking-wide text-ink-2">
                  {relativeDay(day)}
                  {relativeDay(day) === fmtDateShort(day) ? '' : ` · ${fmtDateShort(day)}`}
                </span>
                <span className="caps">{list.length} 条</span>
              </div>
              <div className="stagger">
                {list.map((c) => (
                  <CaptureItem
                    key={c.id}
                    capture={c}
                    land={c.id === lastCaptureId}
                    selectable={selectMode}
                    selected={selection.has(c.id)}
                    onToggle={() => toggleSelect(c.id)}
                    onOpen={() => {
                      setTarget(c);
                    }}
                    onDelete={() => void removeWithUndo(c)}
                    onLongPress={() => {
                      setTarget(c);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 多选操作条 */}
      {selectMode && (
        <div className="safe-b fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] z-40 border-t border-rule bg-paper/95 px-4 pt-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="editorial w-[52px] shrink-0 text-[13px] text-ink-2">
              {selection.size} 条
            </span>
            <button
              disabled={!selection.size}
              onClick={() => openPromote(selectedList)}
              className="tap flex-1 rounded-field bg-accent py-2.5 text-small font-medium text-accent-ink disabled:opacity-30"
            >
              固化成笔记
            </button>
            <button
              disabled={!selection.size}
              onClick={async () => {
                for (const c of selectedList) await updateCapture(c.id, { status: 'archived' });
                clearSelection();
                toast('已归档');
              }}
              className="tap rounded-field border border-rule px-3.5 py-2.5 text-small text-ink-2 disabled:opacity-30"
            >
              归档
            </button>
            <button
              disabled={!selection.size}
              onClick={async () => {
                for (const c of selectedList) await deleteCapture(c.id);
                clearSelection();
                toast('已删除', {
                  label: '撤销',
                  run: () => {
                    for (const c of selectedList) void restoreCapture(c);
                  },
                });
              }}
              className="tap rounded-field border border-rule px-3.5 py-2.5 text-small text-margin disabled:opacity-30"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 单条操作 */}
      <Sheet
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.text}
        subtitle={
          target?.status === 'promoted' ? '已固化为笔记' : undefined
        }
      >
        {target && (
          <div className="pb-2">
            <div className="divide-y divide-rule">
              {target.status !== 'promoted' && (
                <SheetAction
                  icon="layers"
                  label="固化成笔记"
                  onClick={() => openPromote([target])}
                />
              )}
              <SheetAction
                icon="pen"
                label="编辑文字"
                onClick={() => {
                  setEditText(target.text);
                  setTarget(null);
                  setEditing(target);
                }}
              />
              <SheetAction
                icon="folder"
                label="归档"
                onClick={() => {
                  void archive(target);
                  setTarget(null);
                }}
              />
              <SheetAction
                icon="trash"
                label="删除"
                danger
                onClick={() => {
                  void removeWithUndo(target);
                  setTarget(null);
                }}
              />
            </div>
          </div>
        )}
      </Sheet>

      {/* 编辑文字 */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑速记"
        subtitle="速记只是原话，改一改没关系"
      >
        {editing && (
          <div className="pb-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-field border border-rule bg-field px-3.5 py-3 text-body text-ink"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setEditing(null)}
                className="tap flex-1 rounded-field border border-rule bg-raised py-3 text-body text-ink-2"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  await updateCapture(editing.id, { text: editText.trim() });
                  setEditing(null);
                  toast('已更新');
                }}
                className="tap flex-[1.4] rounded-field bg-accent py-3 text-body font-medium text-accent-ink"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* 提升为笔记 */}
      <PromoteSheet
        open={promoting.length > 0}
        onClose={() => setPromoting([])}
        initial={promoteInitial}
        categories={settings?.categories ?? {}}
        sourceLine={`来自 ${promoting.length} 条速记`}
        onSubmit={submitPromote}
      />
    </div>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="tap flex w-full items-center gap-3.5 py-3.5 text-left"
    >
      <span className={danger ? 'text-margin' : 'text-ink-2'}>
        <Icon name={icon} size={19} />
      </span>
      <span className={`text-body ${danger ? 'text-margin' : 'text-ink'}`}>{label}</span>
    </button>
  );
}
