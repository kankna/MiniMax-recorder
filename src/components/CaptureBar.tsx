import { useEffect, useRef, useState } from 'react';
import { addCapture } from '../db/repo';
import { haptics } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { Icon } from './Icons';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function CaptureBar() {
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sent, setSent] = useState(false);
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const markCaptured = useApp((s) => s.markCaptured);
  const SpeechCtor = getSpeechCtor();

  // 手机上没有 Shift 键，就别提 Shift 这回事了
  const isTouch =
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 ||
      (window.matchMedia?.('(pointer: coarse)').matches ?? false));

  const grow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  useEffect(grow, [text]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;

    // 1) 笔尖在纸面划过一道
    setSweeping(true);
    // 2) 字从输入框里升起来
    setLeaving(true);
    // 3) 按钮变成对勾
    setSent(true);

    const c = await addCapture(value, 'manual');
    markCaptured(c.id);
    haptics.success();

    setText('');
    window.setTimeout(() => setLeaving(false), 220);
    window.setTimeout(() => setSweeping(false), 480);
    window.setTimeout(() => setSent(false), 1100);
    taRef.current?.focus();
  };

  const toggleVoice = () => {
    if (!SpeechCtor) return;
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    try {
      const r = new SpeechCtor();
      recogRef.current = r;
      r.lang = 'zh-CN';
      r.interimResults = true;
      r.continuous = false;
      r.onresult = (e: any) => {
        let out = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          out += e.results[i][0].transcript;
        }
        setText(out);
      };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      r.start();
      setListening(true);
      haptics.tap();
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="px-4">
      <div
        className={`capture-field relative overflow-hidden rounded-card border border-rule bg-field px-3 py-2.5 transition-colors ${
          listening ? 'border-accent' : ''
        } ${sweeping ? 'send-sweep' : ''}`}
      >
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          enterKeyHint="send"
          aria-label="速记"
          placeholder="想到什么，先记下来"
          className={`block max-h-[132px] w-full resize-none bg-transparent text-body text-ink placeholder:text-ink-3/70 ${
            text.trim() ? 'pr-[92px] text-left' : 'text-center'
          } ${leaving ? 'animate-send' : ''}`}
        />

        {/* 工具浮在纸条右侧：空态时提示语才能在整个纸条上居中 */}
        <div className="absolute right-3 bottom-2.5 flex items-center gap-1">
          {SpeechCtor && (
            <button
              onClick={() => {
                haptics.tap();
                toggleVoice();
              }}
              aria-label={listening ? '停止语音输入' : '语音输入'}
              className={`tap grid h-9 w-9 place-items-center rounded-full transition-colors ${
                listening ? 'bg-accent text-accent-ink' : 'text-ink-3'
              }`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
              </svg>
            </button>
          )}

          <button
            onClick={() => void send()}
            disabled={!text.trim()}
            aria-label={sent ? '已记录' : '记录'}
            className={`tap grid h-9 w-9 place-items-center rounded-full transition-all duration-200 ${
              sent || text.trim()
                ? 'bg-accent text-accent-ink'
                : 'bg-rule/60 text-ink-3'
            }`}
          >
            {sent ? (
              <span key="check" className="sent-check grid place-items-center">
                <Icon name="check" size={18} strokeWidth={2.4} />
              </span>
            ) : (
              <Icon name="arrowUp" size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      <p
        className={`${
          isTouch ? 'hidden' : 'only-desktop'
        } mt-1.5 px-1 text-[11px] leading-none text-ink-3`}
      >
        回车即存 · Shift+回车换行
      </p>
    </div>
  );
}
