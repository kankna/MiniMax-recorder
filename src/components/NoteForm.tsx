import { useMemo, useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';
import { Icon } from './Icons';
import { Markdown } from './Markdown';

export interface NoteDraft {
  title: string;
  body: string;
  category: string;
  tags: string[];
}

interface NoteFormProps {
  initial: NoteDraft;
  categories: Record<string, string[]>;
  submitLabel: string;
  onSubmit: (draft: NoteDraft) => void | Promise<void>;
  onCancel: () => void;
  extra?: ReactNode;
  /** 标题未填时的提示 */
  titleHint?: string;
}

export function NoteForm({
  initial,
  categories,
  submitLabel,
  onSubmit,
  onCancel,
  extra,
  titleHint = '把想法写成一句能独立成立的话',
}: NoteFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [category, setCategory] = useState(initial.category);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'write' | 'read'>('write');

  const tops = useMemo(() => Object.keys(categories), [categories]);
  const [top, setTop] = useState(() => {
    const t = initial.category.split('/')[0];
    return tops.includes(t) ? t : tops[0] ?? '';
  });
  const subs = categories[top] ?? [];

  const pickCategory = (value: string) => {
    setCategory(value);
  };

  const addTag = () => {
    const v = tagDraft.trim().replace(/^#/, '');
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagDraft('');
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), body, category, tags });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-2">
      {/* 标题 */}
      <label className="block">
        <span className="caps mb-1.5 block">标题</span>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={2}
          placeholder={titleHint}
          className="editorial w-full resize-none rounded-field border border-rule bg-field px-3.5 py-2.5 text-[19px] leading-[1.4] text-ink placeholder:text-ink-3/55"
        />
      </label>

      {/* 正文 */}
      <label className="mt-5 block">
        <span className="caps mb-1.5 flex items-center justify-between">
          <span>正文</span>
          <span className="flex gap-1">
            {(
              [
                ['write', '写'],
                ['read', '看'],
              ] as ['write' | 'read', string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`tap rounded-full px-2.5 py-0.5 text-[11px] transition-colors ${
                  mode === k ? 'bg-accent text-accent-ink' : 'text-ink-3'
                }`}
              >
                {label}
              </button>
            ))}
          </span>
        </span>
        {mode === 'write' ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder="展开写。空着也行 —— 标题本身就是想法。"
            className="w-full resize-none rounded-field border border-rule bg-field px-3.5 py-3 text-body text-ink placeholder:text-ink-3/55"
          />
        ) : (
          <div className="min-h-[220px] rounded-field border border-rule bg-field px-3.5 py-3">
            {body.trim() ? (
              <Markdown text={body} />
            ) : (
              <p className="text-small text-ink-3">还没有正文。</p>
            )}
          </div>
        )}
      </label>

      {/* 分类 */}
      <div className="mt-5">
        <span className="caps mb-2 block">分类</span>
        {tops.length === 0 ? (
          <p className="text-small text-ink-3">还没有分类，去设置里加一个。</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tops.map((t) => (
                <button
                  key={t}
                  onClick={() => setTop(t)}
                  className={`tap rounded-full border px-3.5 py-1.5 text-small transition-colors ${
                    top === t
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-rule bg-raised text-ink-2'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(subs.length ? subs : ['']).map((s) => {
                const value = s ? `${top}/${s}` : top;
                const on = category === value;
                return (
                  <button
                    key={value}
                    onClick={() => pickCategory(value)}
                    className={`tap rounded-full border px-3 py-1 text-[13px] transition-colors ${
                      on
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-rule bg-field text-ink-2'
                    }`}
                  >
                    {s || '（不分二级）'}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 标签 */}
      <div className="mt-5">
        <span className="caps mb-2 block">标签</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[13px] text-accent"
            >
              {t}
              <button
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`移除标签 ${t}`}
                className="tap text-accent/70"
              >
                <Icon name="close" size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder={tags.length ? '再加一个' : '加个标签，回车确认'}
            className="min-w-[110px] flex-1 rounded-field border border-rule bg-field px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-3/60"
          />
        </div>
      </div>

      {extra}

      <div className="mt-7 flex gap-2.5 pb-1">
        <button
          onClick={onCancel}
          className="tap flex-1 rounded-field border border-rule bg-raised py-3 text-body text-ink-2"
        >
          取消
        </button>
        <button
          onClick={() => void submit()}
          disabled={!title.trim() || busy}
          className="tap flex-[1.4] rounded-field bg-accent py-3 text-body font-medium text-accent-ink disabled:opacity-35"
        >
          {busy ? '保存中…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

export function PromoteSheet({
  open,
  onClose,
  initial,
  categories,
  sourceLine,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: NoteDraft;
  categories: Record<string, string[]>;
  sourceLine?: string;
  onSubmit: (draft: NoteDraft) => void | Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="固化成笔记"
      subtitle={sourceLine}
    >
      <NoteForm
        initial={initial}
        categories={categories}
        submitLabel="存进知识库"
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Sheet>
  );
}
