import type { Capture } from '../db/types';
import { fmtTime } from '../lib/date';
import { SwipeRow } from './SwipeRow';
import { Icon } from './Icons';

interface CaptureItemProps {
  capture: Capture;
  selectable?: boolean;
  selected?: boolean;
  /** 刚写入的那一条：给它一个"落笔"的动效 */
  land?: boolean;
  onOpen?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
}

export function CaptureItem({
  capture,
  selectable,
  selected,
  land,
  onOpen,
  onToggle,
  onDelete,
  onLongPress,
}: CaptureItemProps) {
  const promoted = capture.status === 'promoted';

  return (
    <SwipeRow onDelete={onDelete} onLongPress={onLongPress}>
      <button
        onClick={selectable ? onToggle : onOpen}
        className={`flex w-full items-start gap-3 px-5 py-3 text-left ${
          land ? 'capture-land' : ''
        }`}
      >
        {selectable && (
          <span
            className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors ${
              selected ? 'border-accent bg-accent text-accent-ink' : 'border-rule-2'
            }`}
          >
            {selected && <Icon name="check" size={12} strokeWidth={2.4} />}
          </span>
        )}

        <span className="editorial w-[42px] shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-3">
          {fmtTime(capture.createdAt)}
        </span>

        <span
          className={`flex-1 text-body whitespace-pre-wrap ${
            promoted ? 'text-ink-2' : 'text-ink'
          }`}
        >
          {capture.text}
        </span>

        {promoted && (
          <span className="mt-1 shrink-0 text-accent" title="已固化为笔记">
            <Icon name="check" size={14} strokeWidth={1.8} />
          </span>
        )}
      </button>
    </SwipeRow>
  );
}
