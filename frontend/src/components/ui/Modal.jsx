import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(false);
  const wrapperRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      previousFocusRef.current = document.activeElement;
      requestAnimationFrame(() => setActive(true));
      return;
    }

    setActive(false);
    const timer = setTimeout(() => {
      setMounted(false);
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !wrapperRef.current) return;
      const focusables = wrapperRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, onClose]);

  useEffect(() => {
    if (!mounted || !wrapperRef.current) return;
    const autofocusTarget = wrapperRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    autofocusTarget?.focus();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-[var(--space-4)] transition-opacity duration-[220ms]',
        active ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={cn(
          'absolute inset-0 bg-slate-950/45 backdrop-blur-[8px] transition-opacity duration-[220ms]',
          active ? 'opacity-100' : 'opacity-0',
        )}
        onClick={closeOnBackdrop ? () => onClose?.() : undefined}
      />

      <div
        ref={wrapperRef}
        className={cn(
          'relative z-[1] w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-xl)] transition-all duration-[220ms] ease-[var(--ease-spring)]',
          SIZE_MAP[size] || SIZE_MAP.md,
          active ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close modal"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-[var(--space-4)] app-scrollbar">{children}</div>

        {footer ? (
          <div className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
