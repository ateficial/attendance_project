import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export default function Tabs({ tabs = [], value, onChange, className }) {
  const refs = useRef({});
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });

  const activeKey = useMemo(() => value ?? tabs[0]?.key, [tabs, value]);

  useEffect(() => {
    const activeNode = refs.current[activeKey];
    if (!activeNode) return;
    setIndicator({ width: activeNode.offsetWidth, left: activeNode.offsetLeft });
  }, [activeKey, tabs]);

  return (
    <div className={cn('relative rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1', className)}>
      <span
        aria-hidden="true"
        className="absolute inset-block-start-1 block h-[calc(100%-8px)] rounded-[var(--radius-full)] bg-[var(--role-primary-soft)] transition-all duration-200 ease-[var(--ease-smooth)]"
        style={{ width: indicator.width, left: indicator.left }}
      />
      <div className="relative flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                refs.current[tab.key] = node;
              }}
              type="button"
              onClick={() => onChange?.(tab.key)}
              className={cn(
                'relative z-[1] rounded-[var(--radius-full)] px-4 py-1.5 text-[var(--text-sm)] font-medium transition-colors',
                isActive ? 'text-[var(--role-primary-strong)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
