import { useMemo, useState } from 'react';
import Badge from './Badge';
import Skeleton from './Skeleton';
import { cn } from '../../lib/cn';

function resolveSortValue(value) {
  if (typeof value === 'number') return value;
  return String(value || '').toLowerCase();
}

function defaultStatusVariant(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('present')) return 'present';
  if (normalized.includes('absent')) return 'absent';
  if (normalized.includes('late')) return 'late';
  if (normalized.includes('critical') || normalized.includes('danger')) return 'critical';
  if (normalized.includes('warning')) return 'warning';
  if (normalized.includes('ok') || normalized.includes('active')) return 'ok';
  return 'neutral';
}

export default function DataTable({
  columns,
  rows,
  loading = false,
  rowKey = 'id',
  onRowClick,
  emptyIcon = 'inbox',
  emptyTitle = 'No data available',
  emptySubtitle = 'Adjust your filters or try again later.',
  initialSort,
  className,
}) {
  const [sortState, setSortState] = useState(initialSort || null);

  const sortedRows = useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    if (!sortState?.key) return list;

    const { key, direction } = sortState;
    list.sort((a, b) => {
      const left = resolveSortValue(a?.[key]);
      const right = resolveSortValue(b?.[key]);
      if (left < right) return direction === 'asc' ? -1 : 1;
      if (left > right) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, sortState]);

  function toggleSort(columnKey) {
    setSortState((prev) => {
      if (!prev || prev.key !== columnKey) return { key: columnKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' };
      return null;
    });
  }

  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)]', className)}>
      <div className="app-scrollbar overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-[var(--color-surface-2)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            <tr>
              {columns.map((column) => {
                const isSorted = sortState?.key === column.key;
                const direction = sortState?.direction;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)] font-semibold',
                      column.align === 'right' && 'text-right',
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1"
                        aria-label={`Sort by ${column.label}`}
                      >
                        <span>{column.label}</span>
                        <span className="material-symbols-outlined text-[14px]">
                          {isSorted ? (direction === 'asc' ? 'north' : 'south') : 'unfold_more'}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`loading-${idx}`} className="bg-[var(--color-surface-1)]">
                    <td colSpan={columns.length} className="px-[var(--space-4)] py-[var(--space-3)]">
                      <Skeleton variant="text" className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : null}

            {!loading && sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-[var(--space-5)] py-[var(--space-10)] text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-[var(--color-text-secondary)]">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)]">{emptyIcon}</span>
                    <p className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">{emptyTitle}</p>
                    <p className="text-[var(--text-sm)]">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : null}

            {!loading
              ? sortedRows.map((row, index) => {
                  const key = typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey] ?? `row-${index}`;
                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'transition-colors duration-75',
                        index % 2 === 0 ? 'bg-[var(--color-surface-1)]' : 'bg-[var(--color-surface-2)]/45',
                        onRowClick && 'cursor-pointer',
                        'hover:bg-[color-mix(in_srgb,var(--role-primary)_9%,transparent)] hover:[box-shadow:inset_3px_0_0_var(--role-primary)]',
                      )}
                    >
                      {columns.map((column) => {
                        const rawValue = row?.[column.key];
                        let content = rawValue;
                        if (column.render) {
                          content = column.render(rawValue, row);
                        } else if (column.status || String(column.key).toLowerCase().includes('status')) {
                          content = <Badge variant={defaultStatusVariant(rawValue)}>{String(rawValue || '-')}</Badge>;
                        }

                        return (
                          <td
                            key={column.key}
                            className={cn(
                              'border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)] align-middle',
                              column.align === 'right' && 'text-right',
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
