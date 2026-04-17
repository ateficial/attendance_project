import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';

function resolveTone(value) {
  if (value >= 75) return 'bg-[var(--color-success)]';
  if (value >= 50) return 'bg-[var(--color-warning)]';
  return 'bg-[var(--color-danger)]';
}

export default function ProgressBar({
  value = 0,
  showLabel = true,
  className,
  labelClassName,
  barClassName,
}) {
  const clamped = useMemo(() => Math.max(0, Math.min(100, Number(value) || 0)), [value]);
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimatedWidth(clamped);
    });
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel ? (
        <div className={cn('text-[11px] font-medium text-[var(--color-text-secondary)]', labelClassName)}>
          {clamped.toFixed(1)}%
        </div>
      ) : null}
      <div className={cn('h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-3)]', barClassName)}>
        <div
          className={cn('h-full rounded-[var(--radius-full)] transition-[width] duration-[600ms] ease-out', resolveTone(clamped))}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  );
}
