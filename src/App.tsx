import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useApp, watchSystemTheme, applyTheme } from './store/useApp';
import { addCapture, makeSnapshot } from './db/repo';
import { isIndexedDbAvailable } from './db/db';
import { TabBar } from './components/TabBar';
import { Toasts } from './components/Toasts';
import { InboxPage } from './pages/InboxPage';
import { JournalPage } from './pages/JournalPage';
import { JournalEntryPage } from './pages/JournalEntryPage';
import { LibraryPage } from './pages/LibraryPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { AiReviewPage } from './pages/AiReviewPage';
import { listSnapshots } from './db/repo';

export default function App() {
  const route = useApp((s) => s.route);
  const ready = useApp((s) => s.ready);
  const loadSettings = useApp((s) => s.loadSettings);
  const toast = useApp((s) => s.toast);
  const theme = useApp((s) => s.settings?.theme);

  const [dbOk] = useState(isIndexedDbAvailable());
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSW = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    loadSettings();
    const unwatch = watchSystemTheme();
    return unwatch;
  }, [loadSettings]);

  // 主题永远跟着 store 走，DOM 与状态不可能不一致
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  // PWA：注册 + 新版本提示
  useEffect(() => {
    updateSW.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        toast('已可离线使用');
      },
    });
  }, [toast]);

  // 分享进速记
  useEffect(() => {
    if (!dbOk) return;
    const handle = async () => {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const text = params.get('text') || params.get('title') || '';
      const link = params.get('url') || '';
      const isSharePath = url.pathname.endsWith('/share');
      const hasShareParams = !!(text || link);
      if (!isSharePath && !hasShareParams) return;
      if (!text && !link) return;

      const content = [text, link].filter(Boolean).join('\n');
      if (content) await addCapture(content, 'share');

      url.searchParams.delete('text');
      url.searchParams.delete('title');
      url.searchParams.delete('url');
      url.pathname = url.pathname.replace(/\/share\/?$/, '/');
      window.history.replaceState({}, '', url.toString());
    };
    void handle();
  }, [dbOk]);

  // 定期做一份本地快照
  useEffect(() => {
    if (!dbOk) return;
    const timer = window.setInterval(async () => {
      const snaps = await listSnapshots();
      const last = snaps[0];
      if (!last || Date.now() - new Date(last.createdAt).getTime() > 6 * 3600 * 1000) {
        await makeSnapshot('auto');
      }
    }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [dbOk]);

  if (!dbOk) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
        <div>
          <div className="editorial text-[22px] text-ink">这台设备不让存数据</div>
          <p className="mt-3 text-small leading-relaxed text-ink-2">
            浏览器拒绝了本地存储（常见于无痕模式）。换成普通窗口打开就能正常记录。
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] px-5 pt-6">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-9 w-56" />
        <div className="skeleton mt-8 h-16 w-full rounded-card" />
        <div className="skeleton mt-6 h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <main className="shell min-h-[100dvh]">
        <div key={routeKey(route)} className="animate-settle">
          {renderRoute(route)}
        </div>
      </main>

      <TabBar />
      <Toasts />

      {needRefresh && (
        <div className="safe-b fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-rule bg-raised py-2 pr-2 pl-4 shadow-[0_8px_28px_rgb(var(--c-shadow)/0.16)]">
            <span className="text-small text-ink">有新版本了</span>
            <button
              onClick={() => {
                setNeedRefresh(false);
                void updateSW.current?.(true);
              }}
              className="tap rounded-full bg-accent px-3.5 py-1.5 text-small font-medium text-accent-ink"
            >
              刷新
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function routeKey(route: { name: string } & Record<string, unknown>): string {
  return `${route.name}:${(route as { id?: string }).id ?? (route as { date?: string }).date ?? ''}`;
}

function renderRoute(route: ReturnType<typeof useApp.getState>['route']) {
  switch (route.name) {
    case 'inbox':
      return <InboxPage />;
    case 'journal':
      return <JournalPage />;
    case 'journalEntry':
      return <JournalEntryPage date={route.date} />;
    case 'library':
      return <LibraryPage />;
    case 'noteEditor':
      return <NoteEditorPage id={route.id} />;
    case 'search':
      return <SearchPage />;
    case 'settings':
      return <SettingsPage />;
    case 'aiReview':
      return <AiReviewPage />;
    default:
      return <InboxPage />;
  }
}
