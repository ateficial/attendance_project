import { cn } from '../../lib/cn';

const VARIANTS = {
  text: 'h-4 rounded-[var(--radius-sm)]',
  circle: 'h-10 w-10 rounded-full',
  rect: 'h-20 rounded-[var(--radius-md)]',
  card: 'h-32 rounded-[var(--radius-lg)]',
};

export default function Skeleton({
  className,
  variant = 'rect',
  count = 1,
}) {
  const items = Array.from({ length: Math.max(1, Number(count) || 1) });
  const variantClass = VARIANTS[variant] || VARIANTS.rect;

  return (
    <div className="space-y-2" aria-live="polite" aria-label="Loading content">
      {items.map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={cn(
            'shimmer bg-[var(--color-surface-3)]',
            variantClass,
            className,
          )}
        />
      ))}
    </div>
  );
}
