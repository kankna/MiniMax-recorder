import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addNote, deleteNote, updateNote } from '../db/repo';
import type { Note, NoteStatus } from '../db/types';
import { fmtDateLong } from '../lib/date';
import { useApp } from '../store/useApp';
import { Masthead } from '../components/Masthead';
import { NoteForm, type NoteDraft } from '../components/NoteForm';
import { Icon } from '../components/Icons';

export function NoteEditorPage({ id }: { id?: string }) {
  const navigate = useApp((s) => s.navigate);
  const back = useApp((s) => s.back);
  const toast = useApp((s) => s.toast);
  const settings = useApp((s) => s.settings);

  const note = useLiveQuery<Note | undefined>(
    async () => (id ? await db.notes.get(id) : undefined),
    [id],
  );
  const captures = useLiveQuery(() => db.captures.toArray(), []);
  const journals = useLiveQuery(() => db.journals.toArray(), []);

  const [status, setStatus] = useState<NoteStatus>('active');
  const [statusTouched, setStatusTouched] = useState(false);

  const currentStatus = statusTouched ? status : (note?.status ?? 'active');

  const sourceDetails = useMemo(() => {
    if (!note) return [];
    return note.sources.map((s) => {
      if (s.type === 'capture') {
        const c = (captures ?? []).find((x) => x.id === s.id);
        return { key: s.id ?? '', kind: '速记', text: c?.text ?? '（速记已删除）', date: c?.createdAt?.slice(0, 10) };
      }
      const j = (journals ?? []).find((x) => x.date === s.date);
      return {
        key: s.date ?? '',
        kind: '日志',
        text: j?.sections.keyFinding || j?.sections.learned || '（无内容）',
        date: s.date,
      };
    });
  }, [note, captures, journals]);

  if (id && !note) {
    return (
      <div className="px-5 pt-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton mt-8 h-32 w-full" />
      </div>
    );
  }

  const initial: NoteDraft = {
    title: note?.title ?? '',
    body: note?.body ?? '',
    category: note?.category ?? '',
    tags: note?.tags ?? [],
  };

  const submit = async (draft: NoteDraft) => {
    if (note) {
      await updateNote(note.id, { ...draft, status: currentStatus });
      toast('已保存');
      back();
    } else {
      const created = await addNote({ ...draft, status: currentStatus });
      toast('已存进知识库');
      navigate({ name: 'noteEditor', id: created.id }, true);
    }
  };

  return (
    <div className="pb-32">
      <Masthead
        onBack={() => (note ? back() : navigate({ name: 'library' }, true))}
        title={note ? '笔记' : '新笔记'}
        subtitle={note ? `创建于 ${fmtDateLong(note.createdAt.slice(0, 10))}` : '写下一个想法'}
      />

      <div className="px-4">
        <NoteForm
          initial={initial}
          categories={settings?.categories ?? {}}
          submitLabel={note ? '保存' : '存进知识库'}
          onSubmit={submit}
          onCancel={() => (note ? back() : navigate({ name: 'library' }, true))}
          extra={
            <div className="mt-6">
              <span className="caps mb-2 block">状态</span>
              <div className="flex gap-1.5">
                {(
                  [
                    ['active', '在册'],
                    ['superseded', '已被取代'],
                    ['archived', '已归档'],
                  ] as [NoteStatus, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setStatus(k);
                      setStatusTouched(true);
                    }}
                    className={`tap rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                      currentStatus === k
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-rule bg-field text-ink-2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {sourceDetails.length > 0 && (
        <div className="mx-4 mt-2 rounded-card border border-rule bg-raised p-4">
          <span className="caps">溯源</span>
          <div className="mt-2.5 space-y-2.5">
            {sourceDetails.map((s) => (
              <div key={s.key} className="flex gap-3">
                <span className="editorial mt-0.5 w-11 shrink-0 text-[11px] text-ink-3">
                  {s.kind}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-small leading-relaxed text-ink-2">
                    {s.text}
                  </span>
                  {s.date && (
                    <span className="text-[11px] text-ink-3">{s.date}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {note && (
        <div className="mx-4 mt-6">
          <button
            onClick={async () => {
              await deleteNote(note.id);
              toast('笔记已删除');
              navigate({ name: 'library' }, true);
            }}
            className="tap flex w-full items-center justify-center gap-2 rounded-field border border-rule py-3 text-small text-margin"
          >
            <Icon name="trash" size={16} /> 删除这条笔记
          </button>
        </div>
      )}
    </div>
  );
}
