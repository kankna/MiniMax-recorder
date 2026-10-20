import type { ReactElement } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

type IconDef = (p: Required<IconProps>) => ReactElement;

const S = ({ size, strokeWidth, className }: Required<IconProps>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

const defs: Record<string, IconDef> = {
  plus: (p) => (
    <svg {...S(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  search: (p) => (
    <svg {...S(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  ),
  sliders: (p) => (
    <svg {...S(p)}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </svg>
  ),
  page: (p) => (
    <svg {...S(p)}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </svg>
  ),
  book: (p) => (
    <svg {...S(p)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5" />
    </svg>
  ),
  pen: (p) => (
    <svg {...S(p)}>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m14.5 5.5 4 4" />
    </svg>
  ),
  trash: (p) => (
    <svg {...S(p)}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  ),
  undo: (p) => (
    <svg {...S(p)}>
      <path d="M4 9h9a5 5 0 0 1 0 10h-3" />
      <path d="m7 5-3 4 3 4" />
    </svg>
  ),
  check: (p) => (
    <svg {...S(p)}>
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  ),
  close: (p) => (
    <svg {...S(p)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ),
  left: (p) => (
    <svg {...S(p)}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  ),
  right: (p) => (
    <svg {...S(p)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  ),
  share: (p) => (
    <svg {...S(p)}>
      <path d="M12 16V4M8.5 7.5 12 4l3.5 3.5" />
      <path d="M6 13v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6" />
    </svg>
  ),
  download: (p) => (
    <svg {...S(p)}>
      <path d="M12 4v12M8.5 12.5 12 16l3.5-3.5" />
      <path d="M6 19h12" />
    </svg>
  ),
  upload: (p) => (
    <svg {...S(p)}>
      <path d="M12 16V4M8.5 7.5 12 4l3.5 3.5" />
      <path d="M6 19h12" />
    </svg>
  ),
  spark: (p) => (
    <svg {...S(p)}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.8L12 18l-1.7-5.5L4.8 10.7 10.3 9z" />
      <path d="M18.5 15.5 19 17.6l2.1.6-2.1.7-.5 2.1-.6-2.1-2-.7 2-.6z" />
    </svg>
  ),
  clock: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  tag: (p) => (
    <svg {...S(p)}>
      <path d="M4 12V5.5A1.5 1.5 0 0 1 5.5 4H12l7.5 7.5a1.6 1.6 0 0 1 0 2.3l-5.2 5.2a1.6 1.6 0 0 1-2.3 0z" />
      <circle cx="8.3" cy="8.3" r="1.4" />
    </svg>
  ),
  link: (p) => (
    <svg {...S(p)}>
      <path d="M10 13.5a4 4 0 0 0 5.7.3l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </svg>
  ),
  more: (p) => (
    <svg {...S(p)}>
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  arrowUp: (p) => (
    <svg {...S(p)}>
      <path d="M12 20V4M6.5 9.5 12 4l5.5 5.5" />
    </svg>
  ),
  arrowDown: (p) => (
    <svg {...S(p)}>
      <path d="M12 4v16M6.5 14.5 12 20l5.5-5.5" />
    </svg>
  ),
  sun: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  ),
  moon: (p) => (
    <svg {...S(p)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />
    </svg>
  ),
  auto: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
    </svg>
  ),
  layers: (p) => (
    <svg {...S(p)}>
      <path d="m12 3.5 8.5 4.3L12 12 3.5 7.8z" />
      <path d="m3.5 12 8.5 4.3 8.5-4.3M3.5 16.2l8.5 4.3 8.5-4.3" />
    </svg>
  ),
  inbox: (p) => (
    <svg {...S(p)}>
      <path d="M4 13h4l1.2 2.5h5.6L16 13h4" />
      <path d="M5.6 5h12.8l1.6 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" />
    </svg>
  ),
  fold: (p) => (
    <svg {...S(p)}>
      <path d="M3 7h18M3 12h11M3 17h14" />
    </svg>
  ),
  eye: (p) => (
    <svg {...S(p)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ),
  folder: (p) => (
    <svg {...S(p)}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
    </svg>
  ),
  sparkleSmall: (p) => (
    <svg {...S(p)}>
      <path d="M12 5.5 13.4 10l4.6 1.4-4.6 1.5L12 17.5l-1.4-4.6L6 11.4 10.6 10z" />
    </svg>
  ),
};

export type IconName = keyof typeof defs;

export function Icon({
  name,
  size = 22,
  className,
  strokeWidth = 1.4,
}: IconProps & { name: IconName }) {
  const def = defs[name];
  if (!def) return null;
  return def({ size, className: className ?? '', strokeWidth });
}
