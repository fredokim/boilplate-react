import type { PropsWithChildren } from 'react';

type BadgeTone = 'neutral' | 'success' | 'danger' | 'primary';

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-success',
  danger: 'bg-red-50 text-danger',
  primary: 'bg-blue-50 text-primary',
};

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: BadgeTone }>) {
  return <span className={['inline-flex rounded-full px-2.5 py-1 text-xs font-bold', toneClass[tone]].join(' ')}>{children}</span>;
}
