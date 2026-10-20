import { useEffect, useRef, useState } from 'react';
import { addCapture } from '../db/repo';
import { haptics } from '../lib/haptics';
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
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const SpeechCtor = getSpeechCtor();

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
    setLeaving(true);
    await addCapture(value, 'manual');
    haptics.success();
    setText('');
    window.setTimeout(() => setLeaving(false), 210);
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
        className={`capture-field ruled relative rounded-card border border-rule bg-field transition-colors ${
          listening ? 'border-accent' : ''
        }`}
      >
        <div className="flex items-end gap-2 px-3 py-2.5">
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
            className={`max-h-[132px] min-h-[26px] flex-1 bg-transparent text-body text-ink placeholder:text-ink-3/70 ${
              leaving ? 'animate-send' : ''
            }`}
          />

          <div className="flex shrink-0 items-center gap-1 pb-0.5">
            {SpeechCtor && (
              <button
                onClick={toggleVoice}
                aria-label={listening ? '停止语音输入' : '语音输入'}
                className={`tap grid h-9 w-9 place-items-center rounded-full transition-colors ${
                  listening ? 'bg-accent text-accent-ink' : 'text-ink-3'
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
                </svg>
              </button>
            )}
            <button
              onClick={() => void send()}
              disabled={!text.trim()}
              aria-label="记录"
              className={`tap grid h-9 w-9 place-items-center rounded-full transition-all duration-200 ${
                text.trim()
                  ? 'bg-accent text-accent-ink'
                  : 'bg-rule/60 text-ink-3'
              }`}
            >
              <Icon name="arrowUp" size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[11px] leading-none text-ink-3">
        回车即存 · Shift+回车换行
      </p>
    </div>
  );
}
