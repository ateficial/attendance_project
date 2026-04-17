import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

const ROLE_CARDS = [
  {
    key: 'professor',
    icon: 'school',
    labelKey: 'professor',
    description: 'Faculty teaching and lecture attendance',
  },
  {
    key: 'student',
    icon: 'person',
    labelKey: 'student',
    description: 'Student history, warnings, and profile',
  },
  {
    key: 'admin',
    icon: 'admin_panel_settings',
    labelKey: 'admin',
    description: 'System management and scheduling',
    subtle: true,
  },
];

function resolveRoute(role) {
  if (role === 'professor') return '/professor';
  if (role === 'student') return '/student';
  if (role === 'ta') return '/ta';
  return '/admin';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('professor');
  const [rememberSession, setRememberSession] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, lang, toggleLang, i } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError(i('emailRequired'));
      return;
    }

    if (!password) {
      setError(i('passwordRequired'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      localStorage.setItem('smart_attendance_remember', rememberSession ? '1' : '0');
      const result = await login(email.trim(), password, userType);

      if (!result.success) {
        setError(result.error || i('loginFailed'));
        return;
      }

      const targetRole = result.role || result.user?.role || userType;
      navigate(resolveRoute(targetRole), { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface-2)] lg:grid lg:grid-cols-[55%_45%]" data-role="professor">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#0f0c29,#302b63,#24243e)] p-[var(--space-10)] text-white lg:flex lg:flex-col lg:justify-center">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-65" />

        <div className="relative z-10 space-y-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-white/12 backdrop-blur">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>

          <div className="space-y-3">
            <h1 className="bg-gradient-to-r from-[#faf5ff] via-[#c7d2fe] to-[#99f6e4] bg-clip-text text-[52px] font-bold leading-[1.05] text-transparent">
              Smart Attendance
            </h1>
            <p className="max-w-xl text-[var(--text-lg)] text-slate-300">
              Higher Future Institute - Academic Year 2025-2026
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-[12px]">
            <span className="floating rounded-[var(--radius-full)] border border-white/20 bg-white/10 px-3 py-1">Realtime Class Presence</span>
            <span className="floating rounded-[var(--radius-full)] border border-white/20 bg-white/10 px-3 py-1 [animation-delay:0.4s]">Role-aware Dashboards</span>
            <span className="floating rounded-[var(--radius-full)] border border-white/20 bg-white/10 px-3 py-1 [animation-delay:0.8s]">Analytics Intelligence</span>
          </div>
        </div>

      </section>

      <section className="flex min-h-screen items-center justify-center p-[var(--space-4)] md:p-[var(--space-8)]">
        <Card variant="elevated" className="w-full max-w-[420px] rounded-[var(--radius-xl)] bg-white p-[var(--space-6)] md:p-[var(--space-8)]">
          <div className="mb-[var(--space-5)] flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[38px] font-bold leading-none text-[var(--color-text-primary)]">Welcome back</h2>
              <p className="mt-1 text-[var(--text-base)] text-[var(--color-text-secondary)]">{i('accessPortal')}</p>
            </div>

            <button
              type="button"
              onClick={toggleLang}
              aria-label="Toggle language"
              className="inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]"
            >
              <span className="material-symbols-outlined text-base">language</span>
              {lang === 'en' ? 'AR' : 'EN'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {ROLE_CARDS.map((role) => {
              const selected = userType === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setUserType(role.key)}
                  className={`rounded-[var(--radius-md)] border p-3 text-left transition-all duration-150 ${
                    selected
                      ? 'scale-[1.03] border-[var(--role-primary)] bg-[var(--role-primary-soft)] shadow-[var(--shadow-glow-primary)]'
                      : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-lg text-[var(--color-text-secondary)]">{role.icon}</span>
                    {selected ? <span className="material-symbols-outlined text-base text-[var(--role-primary)]">check_circle</span> : null}
                  </div>
                  <p className="mt-2 text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">{i(role.labelKey)}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-[var(--space-5)] space-y-[var(--space-4)]">
            <div className={error ? 'animate-[shakeError_400ms_ease]' : ''}>
              <div className="group relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder=" "
                  className={`peer h-12 w-full rounded-[var(--radius-md)] border bg-white px-3 pt-5 text-[var(--text-base)] text-[var(--color-text-primary)] transition focus-visible:outline-none ${
                    error ? 'border-rose-400' : 'border-[var(--color-border)] focus:border-[var(--role-primary)]'
                  }`}
                />
                <label htmlFor="email" className="pointer-events-none absolute start-3 top-3 text-[var(--text-sm)] text-[var(--color-text-muted)] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[var(--text-base)] peer-focus:top-2 peer-focus:text-[var(--text-xs)] peer-focus:text-[var(--role-primary)] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[var(--text-xs)]">
                  {i('email')}
                </label>
              </div>
            </div>

            <div className={error ? 'animate-[shakeError_400ms_ease]' : ''}>
              <div className="group relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder=" "
                  className={`peer h-12 w-full rounded-[var(--radius-md)] border bg-white px-3 pe-11 pt-5 text-[var(--text-base)] text-[var(--color-text-primary)] transition focus-visible:outline-none ${
                    error ? 'border-rose-400' : 'border-[var(--color-border)] focus:border-[var(--role-primary)]'
                  }`}
                />
                <label htmlFor="password" className="pointer-events-none absolute start-3 top-3 text-[var(--text-sm)] text-[var(--color-text-muted)] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[var(--text-base)] peer-focus:top-2 peer-focus:text-[var(--text-xs)] peer-focus:text-[var(--role-primary)] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[var(--text-xs)]">
                  {i('password')}
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[var(--text-sm)]">
              <label className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]" htmlFor="remember-session">
                <span className="relative inline-flex items-center">
                  <input
                    id="remember-session"
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(event) => setRememberSession(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="block h-4 w-4 rounded-[4px] border border-[var(--color-border)] bg-white peer-checked:border-[var(--role-primary)] peer-checked:bg-[var(--role-primary)]" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-white opacity-0 peer-checked:opacity-100">✓</span>
                </span>
                {i('rememberMe')}
              </label>

              <a href="mailto:admin@university.edu" className="font-medium text-[var(--role-primary)]">{i('forgotPassword')}</a>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              variant="primary"
              className="h-12 rounded-[var(--radius-full)] bg-[#030712] text-white hover:bg-black"
              rightIcon={<span className="material-symbols-outlined text-base">arrow_right_alt</span>}
            >
              {i('login')}
            </Button>
          </form>

          {error ? (
            <div role="alert" className="mt-[var(--space-4)] rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-3 py-2 text-[var(--text-sm)] text-rose-700">
              {error}
            </div>
          ) : null}

          <footer className="mt-[var(--space-5)] border-t border-[var(--color-border)] pt-[var(--space-4)] text-center text-[11px] text-[var(--color-text-muted)]">
            <p>{i('authorizedAccessOnly')}.</p>
            <p>Institutional Privacy Policy &amp; Data Protection Terms</p>
          </footer>
        </Card>
      </section>
    </main>
  );
}
