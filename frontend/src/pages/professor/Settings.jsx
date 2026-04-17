import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { changePasscode, getApiBaseUrl } from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Toggle from '../../components/ui/Toggle';

const STORAGE_KEY = 'professor_settings_v1';

export default function Settings() {
  const { lang, toggleLang } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPasscode, setSavingPasscode] = useState(false);

  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    pushReminders: true,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.emailAlerts === 'boolean' && typeof parsed?.pushReminders === 'boolean') {
        setPrefs(parsed);
      }
    } catch (e) {
      // ignore invalid local settings
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const canSubmit = useMemo(() => {
    return currentPasscode && newPasscode && confirmPasscode;
  }, [currentPasscode, newPasscode, confirmPasscode]);

  async function onSubmitPasscode(event) {
    event.preventDefault();

    if (!/^\d{4,8}$/.test(newPasscode)) {
      toast.error('New passcode must be 4 to 8 digits');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      toast.error('New and confirm passcodes do not match');
      return;
    }

    setSavingPasscode(true);
    try {
      await changePasscode(currentPasscode, newPasscode);
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      toast.success('Session passcode updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update passcode');
    } finally {
      setSavingPasscode(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Manage your session passcode, alerts, and display options.</p>
      </header>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Change Session Passcode</h2>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            This passcode is used on the attendance keypad when opening session check-in.
          </p>
        </CardHeader>

        <CardBody>
          <form onSubmit={onSubmitPasscode} className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Current</span>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPasscode}
                  onChange={(event) => setCurrentPasscode(event.target.value)}
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 pr-10 text-[var(--text-sm)]"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  <span className="material-symbols-outlined text-base">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">New</span>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={(event) => setNewPasscode(event.target.value)}
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 pr-10 text-[var(--text-sm)]"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  <span className="material-symbols-outlined text-base">{showNew ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Confirm</span>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(event) => setConfirmPasscode(event.target.value)}
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 pr-10 text-[var(--text-sm)]"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  <span className="material-symbols-outlined text-base">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </label>

            <div className="md:col-span-3 flex items-center justify-between gap-3">
              <Badge variant="info" showDot={false}>4-8 numeric digits</Badge>
              <Button type="submit" variant="primary" size="sm" disabled={!canSubmit || savingPasscode} loading={savingPasscode}>
                {savingPasscode ? 'Updating' : 'Update Passcode'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Notification Preferences</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <Toggle
              id="prof-email-alerts"
              checked={prefs.emailAlerts}
              onChange={(checked) => setPrefs((prev) => ({ ...prev, emailAlerts: checked }))}
              label="Email alerts for at-risk students"
              description="Receive summary alerts when students cross warning thresholds."
            />
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <Toggle
              id="prof-push-reminders"
              checked={prefs.pushReminders}
              onChange={(checked) => setPrefs((prev) => ({ ...prev, pushReminders: checked }))}
              label="Push reminders for session start"
              description="Get a quick reminder before your scheduled classes begin."
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Display & Runtime</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div>
              <p className="text-[var(--text-base)] font-medium text-[var(--color-text-primary)]">Interface Language</p>
              <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">Current: {lang.toUpperCase()}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={toggleLang}>
              {lang === 'en' ? 'Switch to AR' : 'Switch to EN'}
            </Button>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">API Base URL</p>
            <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--text-sm)] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
              {getApiBaseUrl()}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
