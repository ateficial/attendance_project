export default function ErrorBanner({ message, className = '' }) {
  if (!message) return null;

  return (
    <section
      role="alert"
      className={`rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-sm)] text-rose-700 ${className}`.trim()}
    >
      {message}
    </section>
  );
}
