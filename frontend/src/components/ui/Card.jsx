import { cn } from '../../lib/cn';

const VARIANTS = {
  default: 'surface-card',
  elevated: 'surface-card surface-card-elevated',
  glass: 'rounded-[var(--radius-lg)] border border-white/35 bg-white/60 shadow-[var(--shadow-md)] backdrop-blur',
  bordered: 'rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface-1)]',
};

export default function Card({
  as: Component = 'section',
  variant = 'default',
  hoverable = false,
  className,
  children,
  ...rest
}) {
  return (
    <Component
      className={cn(
        VARIANTS[variant] || VARIANTS.default,
        hoverable && 'transition-all duration-200 ease-[var(--ease-smooth)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-lg)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className, children, ...rest }) {
  return (
    <header className={cn('border-b border-[var(--color-border)] p-[var(--space-4)]', className)} {...rest}>
      {children}
    </header>
  );
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cn('p-[var(--space-4)]', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }) {
  return (
    <footer className={cn('border-t border-[var(--color-border)] p-[var(--space-4)]', className)} {...rest}>
      {children}
    </footer>
  );
}
