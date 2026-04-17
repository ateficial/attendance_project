import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';

function matchLabel(pathname, links) {
  const exact = links.find((link) => link.end && pathname === link.to);
  if (exact) return exact.label;
  const partial = links.find((link) => !link.end && pathname.startsWith(link.to));
  return partial?.label || links.find((link) => link.end)?.label || 'Overview';
}

export default function RoleLayoutShell({
  role,
  brandTitle,
  roleLabel,
  initials,
  userName,
  userMeta,
  navLinks,
  onLogout,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  searchResults,
  onSearchSelect,
  notificationCount,
  onNotificationClick,
  lang,
  onToggleLang,
  profileItems,
  children,
}) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const activeLabel = useMemo(() => matchLabel(location.pathname, navLinks), [location.pathname, navLinks]);
  const showSearchResults =
    Boolean(String(searchTerm || '').trim()) &&
    Array.isArray(searchResults) &&
    searchResults.length > 0;

  return (
    <div data-role={role} className="app-shell lg:flex">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'sidebar-shell fixed inset-y-0 z-50 flex -translate-x-full flex-col transition-all duration-300 ease-[var(--ease-smooth)] lg:sticky lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-[var(--sidebar-collapsed)]' : 'lg:w-[var(--sidebar-expanded)]',
          mobileOpen ? 'translate-x-0' : '',
          'w-[var(--sidebar-expanded)]',
        )}
      >
        <div className="border-b border-[var(--color-border)] p-[var(--space-4)]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--role-gradient-start),var(--role-gradient-end))] text-white shadow-[var(--shadow-sm)]">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">{brandTitle}</p>
                <p className="truncate text-[11px] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">{roleLabel}</p>
              </div>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-[var(--space-2)]">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              title={sidebarCollapsed ? link.label : undefined}
              className={({ isActive }) => cn('nav-pill px-[var(--space-3)] py-[var(--space-2)]', isActive && 'active')}
            >
              <span className="material-symbols-outlined text-xl">{link.icon}</span>
              {!sidebarCollapsed ? <span className="truncate text-[var(--text-sm)] font-medium">{link.label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-[var(--space-2)]">
          <div className={cn('mb-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-[var(--space-2)]', sidebarCollapsed && 'justify-center')}>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--role-gradient-start),var(--role-gradient-end))] text-[11px] font-semibold text-white">
              {initials}
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{userName}</p>
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">{userMeta}</p>
              </div>
            ) : null}
          </div>

          <Button variant="ghost" size="sm" fullWidth onClick={onLogout} leftIcon={<span className="material-symbols-outlined text-base">logout</span>}>
            {sidebarCollapsed ? '' : 'Logout'}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-topbar sticky top-0 z-30 overflow-visible">
          <div className="flex h-[var(--topbar-height)] items-center justify-between gap-3 overflow-visible px-[var(--space-3)] lg:px-[var(--space-4)]">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] lg:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <button
                type="button"
                className="hidden rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] lg:inline-flex"
                aria-label="Toggle sidebar"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <span className="material-symbols-outlined">left_panel_close</span>
              </button>

              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{activeLabel}</p>
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">{roleLabel}</p>
              </div>
            </div>

            <div className="relative flex-1 justify-center px-[var(--space-2)] sm:flex">
              <div className="group hidden w-full max-w-[320px] items-center sm:flex">
                <span className="pointer-events-none absolute inset-inline-start-[18px] text-[var(--color-text-muted)]">
                  <span className="material-symbols-outlined text-base">search</span>
                </span>
                <input
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange?.(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 w-full rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface-1)] ps-10 pe-3 text-[var(--text-sm)] text-[var(--color-text-primary)] transition-[width] duration-200 ease-[var(--ease-smooth)] group-focus-within:max-w-[520px] focus-visible:outline-none"
                />

                {showSearchResults ? (
                  <div className="app-scrollbar absolute inset-inline-start-0 inset-block-start-[46px] z-40 max-h-72 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-1 shadow-[var(--shadow-lg)]">
                    {searchResults.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onSearchSelect?.(item)}
                        className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left transition hover:bg-[var(--color-surface-2)]"
                      >
                        <p className="truncate text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">{item.label}</p>
                        <p className="truncate text-[11px] text-[var(--color-text-muted)]">{item.subLabel}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="relative rounded-[var(--radius-full)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                aria-label="Notifications"
                onClick={onNotificationClick}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute inset-inline-end-1 inset-block-start-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-warning)] px-1 text-[10px] font-semibold text-white">
                  {Number(notificationCount || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleLang}
                className="rounded-[var(--radius-full)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                aria-label="Toggle language"
              >
                <span className="material-symbols-outlined">language</span>
                <span className="sr-only">{lang === 'en' ? 'AR' : 'EN'}</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Open profile menu"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--role-gradient-start),var(--role-gradient-end))] text-[11px] font-semibold text-white"
                >
                  {initials}
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2 shadow-[var(--shadow-lg)]">
                    <div className="border-b border-[var(--color-border)] px-2 pb-2">
                      <p className="truncate text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{userName}</p>
                      <p className="truncate text-[11px] text-[var(--color-text-muted)]">{roleLabel}</p>
                    </div>
                    {profileItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          item.onClick?.();
                        }}
                        className={cn(
                          'mt-1 flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-[var(--text-sm)] transition',
                          item.danger
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]',
                        )}
                      >
                        <span className="material-symbols-outlined text-base">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="min-w-0 flex-1 p-[var(--space-3)] lg:p-[var(--space-4)]">
          <div key={location.pathname} className="route-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
