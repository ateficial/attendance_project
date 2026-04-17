import { useMemo, useState } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { getApiBaseUrl } from '../../lib/apiClient';

export default function AdminSettings() {
  const [warningThreshold, setWarningThreshold] = useState(75);
  const [dangerThreshold, setDangerThreshold] = useState(60);
  const [criticalThreshold, setCriticalThreshold] = useState(50);
  const [saved, setSaved] = useState(false);

  const apiUrl = useMemo(() => getApiBaseUrl(), []);

  function handleSave(event) {
    event.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">System Configuration</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Review runtime endpoints and attendance-policy thresholds.</p>
        </div>
        <Badge variant="info">Admin Console</Badge>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Warning Threshold"
          metric={`${warningThreshold}%`}
          icon={<span className="material-symbols-outlined text-[22px]">notification_important</span>}
          trendDirection="up"
          delay={0}
        />
        <StatCard
          label="Danger Threshold"
          metric={`${dangerThreshold}%`}
          icon={<span className="material-symbols-outlined text-[22px]">report_problem</span>}
          trendDirection="down"
          delay={1}
        />
        <StatCard
          label="Critical Threshold"
          metric={`${criticalThreshold}%`}
          icon={<span className="material-symbols-outlined text-[22px]">warning</span>}
          trendDirection="down"
          delay={2}
          glow
          className="shadow-[var(--shadow-glow-danger)]"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Attendance Thresholds</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4">
              <ThresholdInput label="Warning (%)" value={warningThreshold} onChange={setWarningThreshold} />
              <ThresholdInput label="Danger (%)" value={dangerThreshold} onChange={setDangerThreshold} />
              <ThresholdInput label="Critical (%)" value={criticalThreshold} onChange={setCriticalThreshold} />

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="primary">Save Policy</Button>
                {saved ? <Badge variant="ok">Policy saved locally</Badge> : null}
              </div>
            </form>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Runtime</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-[var(--text-sm)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Backend API URL</p>
              <p className="mt-1 break-all rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-text-primary)]">{apiUrl}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Mode</p>
              <p className="mt-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-text-primary)]">Admin Console</p>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function ThresholdInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label}</span>
      <input
        type="number"
        min="1"
        max="99"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="mt-2 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)]"
      />
    </label>
  );
}
