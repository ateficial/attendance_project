import { cn } from '../../lib/cn';

export default function Toggle({
  checked = false,
  onChange,
  id,
  label,
  description,
  disabled = false,
  className,
}) {
  return (
    <label htmlFor={id} className={cn('flex items-center justify-between gap-3', className)}>
      <span>
        {label ? <span className="block text-[var(--text-base)] font-medium text-[var(--color-text-primary)]">{label}</span> : null}
        {description ? <span className="block text-[var(--text-sm)] text-[var(--color-text-secondary)]">{description}</span> : null}
      </span>
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className={cn(
            'block h-6 w-11 rounded-[var(--radius-full)] border transition-colors duration-200 ease-[var(--ease-smooth)]',
            checked
              ? 'border-transparent bg-[var(--role-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-2)]',
            disabled && 'opacity-60',
          )}
        />
        <span
          className={cn(
            'pointer-events-none absolute inset-block-start-[2px] inset-inline-start-[2px] block h-5 w-5 rounded-[var(--radius-full)] bg-white shadow-[var(--shadow-xs)] transition-transform duration-200 ease-[var(--ease-smooth)]',
            checked && 'translate-x-5',
          )}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
