import { useState } from 'react';
import { exportPayload, addNote, updateCapture } from '../db/repo';
import { suggestConsolidation, type ConsolidationResult, type ProposedNote } from '../lib/ai';
import { useApp } from '../store/useApp';
import { Masthead } from '../components/Masthead';
import { Icon } from '../components/Icons';
import { haptics } from '../lib/haptics';

export function AiReviewPage() {
  const back = useApp((s) => s.back);
  const navigate = useApp((s) => s.navigate);
  const toast = useApp((s) => s.toast);
  const settings = useApp((s) => s.settings);

  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [result, setResult] = useState<ConsolidationResult | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Record<number, ProposedNote>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ai = settings?.ai;
  const ready = !!ai?.apiKey?.trim() && !!ai?.baseUrl?.trim();

  const run = async () => {
    if (!ai || busy) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const payload = await exportPayload();
      const r = await suggestConsolidation(ai, payload, scope);
      setResult(r);
      setEdits(Object.fromEntries(r.notes.map((n, i) => [i, { ...n }])));
      setPicked(new Set(r.notes.map((_, i) => i)));
      haptics.success();
    } catch (e) {
      setErr((e as Error).message);
      haptics.warn();
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!result) return;
    const accepted = [...picked].map((i) => edits[i]).filter(Boolean);
    if (!accepted.length) {
      toast('还没勾选任何一条');
      return;
    }
    setBusy(true);
    try {
      for (const n of accepted) {
        const sources = [
          ...n.source_capture_ids.map((id) => ({ type: 'capture' as const, id })),
          ...n.source_journal_dates.map((d) => ({ type: 'journal' as const, date: d })),
        ];
        const created = await addNote({
          title: n.title,
          body: n.body,
          category: n.category,
          tags: n.tags,
          sources,
        });
        for (const id of n.source_capture_ids) {
          await updateCapture(id, { status: 'promoted', promotedTo: created.id });
        }
      }
      // 被判定为不值得保留的速记归档（不删除）
      const used = new Set(accepted.flatMap((n) => n.source_capture_ids));
      for (const id of result.unused_capture_ids) {
        if (!used.has(id)) await updateCapture(id, { status: 'archived' });
      }
      setResult(null);
      toast(`已写入 ${accepted.length} 条笔记`);
      navigate({ name: 'library' }, true);
    } finally {
      setBusy(false);
    }
  };

  if (!settings || !ai) return null;

  return (
    <div className="pb-32">
      <Masthead
        onBack={back}
        kicker="AI Review"
        title="AI 整理"
        subtitle="它只提议，你来定"
      />

      {!ready && (
        <div className="mx-4 rounded-card border border-dashed border-rule-2 p-5 text-center">
          <p className="text-body text-ink-2">还没配置 AI。</p>
          <p className="mt-1.5 text-small text-ink-3">
            在设置里填上接口地址和密钥，就能开始整理了。
          </p>
          <button
            onClick={() => navigate({ name: 'settings' })}
            className="tap mt-4 rounded-full bg-accent px-5 py-2.5 text-small font-medium text-accent-ink"
          >
            去设置
          </button>
        </div>
      )}

      {ready && !result && (
        <div className="px-4">
          <div className="rounded-card border border-rule bg-raised p-4">
            <span className="caps">整理范围</span>
            <div className="mt-2 flex gap-1.5">
              {(
                [
                  ['week', '最近两周'],
                  ['all', '全部数据'],
                ] as ['week' | 'all', string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setScope(k)}
                  className={`tap flex-1 rounded-field border py-2.5 text-small transition-colors ${
                    scope === k
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-rule bg-field text-ink-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void run()}
              disabled={busy}
              className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-field bg-accent py-3 text-body font-medium text-accent-ink disabled:opacity-40"
            >
              <Icon name="spark" size={17} />
              {busy ? '正在读你的记录…' : '开始整理'}
            </button>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              它会读你的速记和日志，找出值得长期保留的想法，给出标题、正文和归属。
              你逐条过目，勾中的才会写进知识库。
            </p>
          </div>

          {err && (
            <div className="mt-3 rounded-field bg-margin/8 px-3.5 py-3 text-small leading-relaxed text-margin">
              {err}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="px-4">
          {result.summary && (
            <div className="mb-4 rounded-card border border-accent/25 bg-accent-soft px-4 py-3.5">
              <span className="caps">这周读出了</span>
              <p className="editorial mt-1.5 text-[16px] leading-relaxed text-ink">
                {result.summary}
              </p>
            </div>
          )}

          {result.notes.length === 0 && (
            <p className="py-8 text-center text-small text-ink-3">
              这段时间没有值得固化的想法。空着也很好。
            </p>
          )}

          {result.notes.map((n, i) => {
            const on = picked.has(i);
            const e = edits[i] ?? n;
            return (
              <div
                key={i}
                className={`mb-3 rounded-card border bg-raised p-4 transition-colors ${
                  on ? 'border-accent/40' : 'border-rule opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      const next = new Set(picked);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      setPicked(next);
                      haptics.tap();
                    }}
                    aria-label={on ? '不采纳这条' : '采纳这条'}
                    className={`tap mt-1 grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full border transition-colors ${
                      on ? 'border-accent bg-accent text-accent-ink' : 'border-rule-2'
                    }`}
                  >
                    {on && <Icon name="check" size={13} strokeWidth={2.4} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <textarea
                      value={e.title}
                      onChange={(ev) =>
                        setEdits((s) => ({ ...s, [i]: { ...e, title: ev.target.value } }))
                      }
                      rows={2}
                      className="editorial w-full resize-none bg-transparent text-[17px] leading-snug text-ink"
                    />
                    <textarea
                      value={e.body}
                      onChange={(ev) =>
                        setEdits((s) => ({ ...s, [i]: { ...e, body: ev.target.value } }))
                      }
                      rows={4}
                      className="mt-1.5 w-full resize-none bg-transparent text-small leading-relaxed text-ink-2"
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <input
                        value={e.category}
                        onChange={(ev) =>
                          setEdits((s) => ({ ...s, [i]: { ...e, category: ev.target.value } }))
                        }
                        placeholder="分类"
                        className="rounded-full border border-rule bg-field px-2.5 py-1 text-[12px] text-ink-2"
                      />
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-field px-2.5 py-1 text-[12px] text-ink-3"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 text-[11px] text-ink-3">
                      来源：{e.source_capture_ids.length} 条速记
                      {e.source_journal_dates.length > 0 &&
                        ` · ${e.source_journal_dates.join('、')} 的日志`}
                      {e.related_titles.length > 0 &&
                        ` · 关联《${e.related_titles.join('》《')}》`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {result.unused_capture_ids.length > 0 && (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-3">
              另有 {result.unused_capture_ids.length} 条速记被判为不值得保留，
              采纳后会归档（不删除）。
            </p>
          )}

          <div className="mt-6 flex gap-2.5">
            <button
              onClick={() => {
                setResult(null);
                setEdits({});
                setPicked(new Set());
              }}
              className="tap flex-1 rounded-field border border-rule bg-raised py-3 text-body text-ink-2"
            >
              重来
            </button>
            <button
              onClick={() => void accept()}
              disabled={busy || picked.size === 0}
              className="tap flex-[1.4] rounded-field bg-accent py-3 text-body font-medium text-accent-ink disabled:opacity-35"
            >
              采纳 {picked.size} 条
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
