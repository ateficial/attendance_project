import { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  primary: 'bg-[var(--role-primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--role-primary-strong)] active:bg-[var(--role-primary-strong)]',
  secondary: 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
  danger: 'bg-[var(--color-danger)] text-white shadow-[var(--shadow-sm)] hover:brightness-95 active:brightness-90',
  success: 'bg-[var(--color-success)] text-white shadow-[var(--shadow-sm)] hover:brightness-95 active:brightness-90',
};

const SIZE_CLASSES = {
  sm: 'h-9 px-3 text-[var(--text-sm)]',
  md: 'h-10 px-4 text-[var(--text-base)]',
  lg: 'h-11 px-5 text-[var(--text-lg)]',
};

const Spinner = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 animate-spin text-current">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    fullWidth = false,
    type = 'button',
    ...rest
  },
  forwardedRef,
) {
  const innerRef = useRef(null);
  const [lockedWidth, setLockedWidth] = useState(undefined);

  useEffect(() => {
    if (loading && innerRef.current) {
      setLockedWidth(innerRef.current.getBoundingClientRect().width);
      return;
    }
    setLockedWidth(undefined);
  }, [loading, children, leftIcon, rightIcon]);

  return (
    <button
      ref={(node) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'button-press inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-150 ease-[var(--ease-smooth)]',
        'focus-visible:outline-none',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        fullWidth && 'w-full',
        (disabled || loading) && 'cursor-not-allowed opacity-65',
        className,
      )}
      style={lockedWidth ? { width: `${lockedWidth}px` } : undefined}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center" aria-hidden="true">
          <Spinner />
        </span>
      ) : (
        <>
          {leftIcon ? <span className="inline-flex items-center" aria-hidden="true">{leftIcon}</span> : null}
          <span>{children}</span>
          {rightIcon ? <span className="inline-flex items-center" aria-hidden="true">{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
});

export default Button;
