import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  exportPayload,
  importPayload,
  listSnapshots,
  makeSnapshot,
  saveSettings,
} from '../db/repo';
import type { Colorway, Mode } from '../db/types';
import { buildZip, deliverBlob, readPayloadFromFile, stamp } from '../lib/export';
import { AI_PRESETS, testConnection } from '../lib/ai';
import { dayDiff, todayKey } from '../lib/date';
import { useApp } from '../store/useApp';
import { Masthead } from '../components/Masthead';
import { Icon } from '../components/Icons';
import { haptics } from '../lib/haptics';

const COLORWAYS: { key: Colorway; name: string; swatch: [string, string, string] }[] = [
  { key: 'ink', name: '墨', swatch: ['#f6f3ec', '#2c6e5a', '#1a1714'] },
  { key: 'slate', name: '霁', swatch: ['#f1f3f6', '#2d4e7e', '#12171d'] },
  { key: 'clay', name: '陶', swatch: ['#f5eee2', '#a24e2b', '#241b13'] },
];

const MODES: { key: Mode; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { key: 'auto', label: '跟随系统', icon: 'auto' },
  { key: 'light', label: '浅色', icon: 'sun' },
  { key: 'dark', label: '深色', icon: 'moon' },
];

export function SettingsPage() {
  const back = useApp((s) => s.back);
  const navigate = useApp((s) => s.navigate);
  const toast = useApp((s) => s.toast);
  const settings = useApp((s) => s.settings);
  const setTheme = useApp((s) => s.setTheme);
  const patchSettings = useApp((s) => s.patchSettings);

  const snapshots = useLiveQuery(() => listSnapshots(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');

  const lastExport = settings?.lastExportAt;
  const exportAge = lastExport ? dayDiff(lastExport.slice(0, 10), todayKey()) : null;

  const ai = settings?.ai;
  const aiReady = !!ai?.apiKey?.trim() && !!ai?.baseUrl?.trim();

  const doExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const payload = await exportPayload();
      const blob = await buildZip(payload);
      const name = `recorder-export-${stamp()}.zip`;
      const how = await deliverBlob(blob, name, '私人档案导出');
      await patchSettings({ lastExportAt: new Date().toISOString() });
      await makeSnapshot('manual');
      toast(how === 'shared' ? '已导出，去分享吧' : '已导出到下载目录');
    } catch (e) {
      toast(`导出失败：${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file: File, mode: 'merge' | 'replace') => {
    setBusy('import');
    try {
      const { payload, kind } = await readPayloadFromFile(file);
      const counts = await importPayload(payload, mode);
      toast(
        `导入完成：速记 ${counts.captures} · 日志 ${counts.journals} · 笔记 ${counts.notes}${
          kind === 'markdown' ? '（从 Markdown 还原）' : ''
        }`,
      );
    } catch (e) {
      toast(`导入失败：${(e as Error).message}`);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doTestAi = async () => {
    if (!ai) return;
    setBusy('ai');
    setAiMsg(null);
    try {
      const reply = await testConnection(ai);
      setAiMsg({ ok: true, text: `连上了。模型回了「${reply.slice(0, 20)}」` });
      haptics.success();
    } catch (e) {
      setAiMsg({ ok: false, text: (e as Error).message });
      haptics.warn();
    } finally {
      setBusy(null);
    }
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name || !settings) return;
    const cats = { ...settings.categories, [name]: settings.categories[name] ?? [] };
    await saveSettings({ ...settings, categories: cats });
    setNewCat('');
    toast(`已添加分类「${name}」`);
  };

  const addSub = async (top: string) => {
    const name = newSub.trim();
    if (!name || !settings) return;
    const subs = settings.categories[top] ?? [];
    if (subs.includes(name)) return;
    const cats = { ...settings.categories, [top]: [...subs, name] };
    await saveSettings({ ...settings, categories: cats });
    setNewSub('');
  };

  const removeCategory = async (top: string) => {
    if (!settings) return;
    const cats = { ...settings.categories };
    delete cats[top];
    await saveSettings({ ...settings, categories: cats });
    toast(`已删除分类「${top}」`);
  };

  const counts = useLiveQuery(async () => {
    const [c, j, n] = await Promise.all([
      db.captures.count(),
      db.journals.count(),
      db.notes.count(),
    ]);
    return { c, j, n };
  }, []);

  if (!settings || !ai) return null;

  return (
    <div className="pb-32">
      <Masthead onBack={back} title="设置" subtitle="无账号 · 数据只在本机" />

      {/* —— 外观 —— */}
      <Section title="外观" hint="换套纸的颜色">
        <div className="flex gap-2.5">
          {COLORWAYS.map((c) => {
            const on = settings.theme.colorway === c.key;
            return (
              <button
                key={c.key}
                onClick={() => void setTheme({ colorway: c.key })}
                className={`tap flex flex-1 flex-col items-center gap-2 rounded-card border p-3 transition-colors ${
                  on ? 'border-accent bg-accent-soft' : 'border-rule bg-raised'
                }`}
              >
                <span className="flex gap-1">
                  {c.swatch.map((s, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-black/8"
                      style={{ background: s }}
                    />
                  ))}
                </span>
                <span
                  className={`editorial text-[15px] ${on ? 'text-accent' : 'text-ink-2'}`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-1.5">
          {MODES.map((m) => {
            const on = settings.theme.mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => void setTheme({ mode: m.key })}
                className={`tap flex flex-1 items-center justify-center gap-1.5 rounded-field border py-2.5 text-small transition-colors ${
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-rule bg-raised text-ink-2'
                }`}
              >
                <Icon name={m.icon} size={15} />
                {m.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* —— AI 整理 —— */}
      <Section
        title="AI 整理"
        hint="密钥只存在这台设备"
        right={
          <button
            onClick={() => void patchSettings({ ai: { ...ai, enabled: !ai.enabled } })}
            className={`tap relative h-6 w-11 rounded-full transition-colors ${
              ai.enabled ? 'bg-accent' : 'bg-rule-2'
            }`}
            aria-label={ai.enabled ? '关闭 AI 整理' : '开启 AI 整理'}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                ai.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {AI_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() =>
                  void patchSettings({
                    ai: { ...ai, baseUrl: p.baseUrl, model: p.model },
                  })
                }
                className={`tap rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                  ai.baseUrl === p.baseUrl
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-rule bg-field text-ink-2'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Field label="接口地址">
            <input
              value={ai.baseUrl}
              onChange={(e) => void patchSettings({ ai: { ...ai, baseUrl: e.target.value } })}
              placeholder="https://api.xxx.com/v1"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-field border border-rule bg-field px-3 py-2.5 text-small text-ink placeholder:text-ink-3/60"
            />
          </Field>

          <Field label="API Key">
            <div className="flex gap-2">
              <input
                value={ai.apiKey}
                onChange={(e) => void patchSettings({ ai: { ...ai, apiKey: e.target.value } })}
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full rounded-field border border-rule bg-field px-3 py-2.5 text-small text-ink placeholder:text-ink-3/60"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="tap shrink-0 rounded-field border border-rule px-3 text-[12px] text-ink-2"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </Field>

          <Field label="模型">
            <input
              value={ai.model}
              onChange={(e) => void patchSettings({ ai: { ...ai, model: e.target.value } })}
              placeholder="模型名称"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-field border border-rule bg-field px-3 py-2.5 text-small text-ink placeholder:text-ink-3/60"
            />
          </Field>

          <div className="flex gap-2">
            <button
              onClick={() => void doTestAi()}
              disabled={busy === 'ai' || !aiReady}
              className="tap flex-1 rounded-field border border-rule bg-raised py-2.5 text-small text-ink-2 disabled:opacity-40"
            >
              {busy === 'ai' ? '测试中…' : '测试连接'}
            </button>
            <button
              onClick={() => navigate({ name: 'aiReview' })}
              disabled={!aiReady}
              className="tap flex-[1.3] rounded-field bg-accent py-2.5 text-small font-medium text-accent-ink disabled:opacity-40"
            >
              去整理
            </button>
          </div>

          {aiMsg && (
            <p
              className={`rounded-field px-3 py-2 text-[12px] leading-relaxed ${
                aiMsg.ok ? 'bg-accent-soft text-accent' : 'bg-margin/8 text-margin'
              }`}
            >
              {aiMsg.text}
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-ink-3">
            请求直接从这台设备发往你填的服务商，没有中间服务器。
            AI 只出建议，写不写由你决定。
          </p>
        </div>
      </Section>

      {/* —— 分类 —— */}
      <Section title="分类" hint="知识库的目录">
        <div className="space-y-2">
          {Object.entries(settings.categories).map(([top, subs]) => (
            <div key={top} className="rounded-field border border-rule bg-raised px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="editorial text-[15px] text-ink">{top}</span>
                <button
                  onClick={() => void removeCategory(top)}
                  aria-label={`删除分类 ${top}`}
                  className="tap p-1 text-ink-3"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-field px-2.5 py-1 text-[12px] text-ink-2"
                  >
                    {s}
                    <button
                      onClick={async () => {
                        const cats = {
                          ...settings.categories,
                          [top]: subs.filter((x) => x !== s),
                        };
                        await saveSettings({ ...settings, categories: cats });
                      }}
                      aria-label={`删除 ${s}`}
                      className="tap text-ink-3"
                    >
                      <Icon name="close" size={11} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="新的一级分类"
              className="w-full rounded-field border border-rule bg-field px-3 py-2.5 text-small text-ink placeholder:text-ink-3/60"
            />
            <button
              onClick={() => void addCategory()}
              disabled={!newCat.trim()}
              className="tap shrink-0 rounded-field border border-rule px-3.5 text-small text-ink-2 disabled:opacity-40"
            >
              添加
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="新的二级分类，添加到第一个分类下"
              className="w-full rounded-field border border-rule bg-field px-3 py-2.5 text-small text-ink placeholder:text-ink-3/60"
            />
            <button
              onClick={() => void addSub(Object.keys(settings.categories)[0] ?? '')}
              disabled={!newSub.trim() || !Object.keys(settings.categories).length}
              className="tap shrink-0 rounded-field border border-rule px-3.5 text-small text-ink-2 disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>
      </Section>

      {/* —— 数据 —— */}
      <Section title="数据" hint="全在这台设备上">
        <div className="rounded-field border border-rule bg-raised p-3.5">
          <div className="flex items-center justify-between text-small">
            <span className="text-ink-2">速记</span>
            <span className="editorial text-ink">{counts?.c ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-small">
            <span className="text-ink-2">日志</span>
            <span className="editorial text-ink">{counts?.j ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-small">
            <span className="text-ink-2">笔记</span>
            <span className="editorial text-ink">{counts?.n ?? 0}</span>
          </div>
          <div className="mt-3 border-t border-rule pt-3 text-[11px] leading-relaxed text-ink-3">
            {exportAge === null ? (
              '还没有导出过。建议每周导出一次。'
            ) : exportAge <= 7 ? (
              `上次导出：${exportAge === 0 ? '今天' : `${exportAge} 天前`}`
            ) : (
              <span className="text-margin">
                已经 {exportAge} 天没导出了 —— 数据只在本机
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => void doExport()}
            disabled={busy === 'export'}
            className="tap flex flex-col items-center gap-1.5 rounded-field border border-rule bg-raised py-3.5 text-small text-ink disabled:opacity-40"
          >
            <Icon name="upload" size={18} className="text-accent" />
            {busy === 'export' ? '导出中…' : '导出'}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === 'import'}
            className="tap flex flex-col items-center gap-1.5 rounded-field border border-rule bg-raised py-3.5 text-small text-ink disabled:opacity-40"
          >
            <Icon name="download" size={18} className="text-accent" />
            导入
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f, 'merge');
          }}
        />

        {snapshots && snapshots.length > 0 && (
          <div className="mt-3">
            <div className="caps mb-1.5">本地快照</div>
            <p className="text-[11px] text-ink-3">
              自动保留最近 10 份，误删了可以回滚。当前有 {snapshots.length} 份。
            </p>
          </div>
        )}
      </Section>

      {/* —— 关于 —— */}
      <Section title="关于" hint="私人档案 · Recorder">
        <div className="rounded-field border border-rule bg-raised p-3.5 text-[12px] leading-relaxed text-ink-2">
          <p>
            这套系统只属于你。数据存在浏览器的 IndexedDB 里，没有账号，没有云端，
            不联网上报任何东西。
          </p>
          <p className="mt-2">
            想搬家时，导出一个 zip 就行 —— 那里面是标准 Markdown，
            Obsidian 直接能打开，git 也能提交。
          </p>
          <p className="mt-2 text-ink-3">
            在手机浏览器菜单里选「添加到主屏幕」，它就会像 App 一样全屏打开。
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 px-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium tracking-wide text-ink">{title}</span>
        <span className="text-[11px] text-ink-3">{hint}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="caps mb-1 block">{label}</span>
      {children}
    </label>
  );
}
