import { useEffect, useState } from 'react';
import Card from './Card';
import { cn } from '../../lib/cn';

function trendMeta(direction) {
  if (direction === 'down') {
    return {
      icon: 'south_east',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }
  return {
    icon: 'north_east',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
}

export default function StatCard({
  label,
  metric,
  icon,
  trendDirection = 'up',
  trendDelta,
  delay = 0,
  refreshKey,
  className,
  glow = false,
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (refreshKey === undefined) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 520);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  const trend = trendMeta(trendDirection);

  return (
    <Card
      variant="elevated"
      className={cn('relative overflow-hidden p-[var(--space-4)]', glow && 'shadow-[var(--shadow-glow-primary)]', className)}
      style={{
        animation: 'pageEnter 260ms var(--ease-enter) both',
        animationDelay: `${delay * 60}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">{label}</p>
        {icon ? <span className="inline-flex text-[var(--role-primary)]">{icon}</span> : null}
      </div>

      <div className={cn('mt-[var(--space-3)] text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]', pulse && 'animate-[statPulse_520ms_var(--ease-smooth)]')}>
        {metric}
      </div>

      {trendDelta !== undefined && trendDelta !== null ? (
        <div className="mt-[var(--space-2)] inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-2.5 py-1 text-[11px] font-semibold">
          <span className={cn('inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5', trend.className)}>
            <span className="material-symbols-outlined text-[14px]">{trend.icon}</span>
            <span>{trendDelta}%</span>
          </span>
        </div>
      ) : null}
    </Card>
  );
}
