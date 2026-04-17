import { cn } from '../../lib/cn';

const MAP = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  absent: 'border-rose-200 bg-rose-50 text-rose-700',
  late: 'border-amber-200 bg-amber-50 text-amber-700',
  ok: 'border-teal-200 bg-teal-50 text-teal-700',
  warning: 'border-orange-200 bg-orange-50 text-orange-700',
  critical: 'border-rose-300 bg-rose-100 text-rose-800',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
};

function normalizeVariant(variant) {
  const key = String(variant || '').toLowerCase();
  if (MAP[key]) return key;
  if (key.includes('present')) return 'present';
  if (key.includes('late')) return 'late';
  if (key.includes('absent')) return 'absent';
  if (key.includes('warning')) return 'warning';
  if (key.includes('critical') || key.includes('danger')) return 'critical';
  if (key.includes('ok') || key.includes('active')) return 'ok';
  return 'neutral';
}

export default function Badge({
  variant = 'neutral',
  children,
  showDot = true,
  className,
  ...rest
}) {
  const resolved = normalizeVariant(variant);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] transition-colors duration-150 ease-[var(--ease-smooth)]',
        MAP[resolved],
        className,
      )}
      {...rest}
    >
      {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}
