import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

function normalizeOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: String(option), label: String(option) };
  }
  return {
    value: String(option?.value ?? ''),
    label: String(option?.label ?? option?.name ?? option?.value ?? ''),
  };
}

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  searchable = false,
  disabled = false,
  className,
  menuClassName,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const normalized = useMemo(() => options.map(normalizeOption), [options]);
  const selected = normalized.find((item) => item.value === String(value ?? ''));

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return normalized;
    const query = search.toLowerCase();
    return normalized.filter((item) => item.label.toLowerCase().includes(query));
  }, [normalized, search, searchable]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-left text-[var(--text-base)] text-[var(--color-text-primary)] transition-colors',
          'focus-visible:outline-none',
          disabled && 'opacity-60',
        )}
      >
        <span className={cn(!selected && 'text-[var(--color-text-muted)]')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={cn('material-symbols-outlined text-base transition-transform duration-200', open && 'rotate-180')}>
          expand_more
        </span>
      </button>

      <div
        className={cn(
          'absolute z-30 mt-1 w-full origin-top rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-lg)] transition-all duration-200 ease-[var(--ease-smooth)]',
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
          menuClassName,
        )}
      >
        {searchable ? (
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 text-[var(--text-sm)]"
            />
          </div>
        ) : null}

        <div className="app-scrollbar max-h-60 overflow-y-auto p-1">
          {filtered.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onChange?.(item.value);
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                'flex w-full items-center rounded-[var(--radius-sm)] px-2 py-2 text-left text-[var(--text-sm)] transition-colors',
                item.value === String(value ?? '')
                  ? 'bg-[var(--role-primary-soft)] text-[var(--role-primary-strong)]'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]',
              )}
            >
              {item.label}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">No results</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
