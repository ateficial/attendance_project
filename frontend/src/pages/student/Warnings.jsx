import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentDashboardStats, getStudentWarnings } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import StatCard from '../../components/ui/StatCard';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

function levelVariant(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'ok') return 'ok';
  if (normalized === 'warning') return 'warning';
  if (normalized === 'danger') return 'critical';
  return 'critical';
}

export default function Warnings() {
  const { user } = useAuth();
  const [warningData, setWarningData] = useState({ warnings: [], overall_status: 'ok', warnings_count: 0 });
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWarnings();
  }, [user?.id]);

  async function loadWarnings() {
    try {
      const [warnings, stats] = await Promise.all([
        getStudentWarnings(user?.id),
        getStudentDashboardStats(),
      ]);

      setWarningData(warnings || { warnings: [], overall_status: 'ok', warnings_count: 0 });
      setDashboard(stats || {});
      setError('');
    } catch (e) {
      setError('Failed to load warning data');
    } finally {
      setLoading(false);
    }
  }

  const subjectRows = useMemo(() => {
    const warningByCode = new Map();
    for (const warning of warningData.warnings || []) {
      warningByCode.set(String(warning.subject_code || ''), warning);
    }

    const breakdown = Array.isArray(dashboard?.subjects_breakdown) ? dashboard.subjects_breakdown : [];
    return breakdown.map((row) => {
      const existingWarning = warningByCode.get(String(row.code || ''));
      const totalSessions = Number(row.present || 0) + Number(row.absent || 0) + Number(row.late || 0);
      const attended = Number(row.present || 0) + Number(row.late || 0);
      const absencePct = totalSessions > 0 ? ((Number(row.absent || 0) / totalSessions) * 100) : 0;

      return {
        code: row.code || '',
        name: row.name || 'Unknown Subject',
        total_sessions: totalSessions,
        attended,
        absence_pct: Number(absencePct.toFixed(2)),
        warning_level: row.warning_level || existingWarning?.warning_level || 'critical',
      };
    });
  }, [dashboard, warningData]);

  if (loading) {
    return (
      <Skeleton variant="card" className="h-64" />
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  const overallPct = Number(dashboard?.overall_attendance_pct || 0);
  const overallLevel = dashboard?.warning_status?.level || warningData.overall_status || 'critical';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Reports & Warnings</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Monitor your warning thresholds per subject.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall Attendance"
          metric={`${overallPct.toFixed(1)}%`}
          icon={<span className="material-symbols-outlined text-[22px]">percent</span>}
          trendDirection={overallPct >= 75 ? 'up' : 'down'}
          trendDelta={Number((overallPct - 75).toFixed(1))}
          delay={0}
        />
        <StatCard
          label="Warning Count"
          metric={warningData.warnings_count || 0}
          icon={<span className="material-symbols-outlined text-[22px]">warning</span>}
          trendDirection={Number(warningData.warnings_count || 0) > 0 ? 'down' : 'up'}
          delay={1}
        />
        <Card variant="elevated" className="sm:col-span-2 xl:col-span-2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Overall Warning Status</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <Badge variant={levelVariant(overallLevel)}>{String(overallLevel).toUpperCase()}</Badge>
            <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">Threshold target: 75%</span>
          </div>
          <ProgressBar value={overallPct} className="mt-3" />
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {subjectRows.map((row) => {
          const thresholdPct = 25;
          const progress = Math.max(0, Math.min(100, (row.absence_pct / thresholdPct) * 100));
          return (
            <Card key={row.code || row.name} variant="elevated" className="p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">{row.name}</h3>
                  <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">{row.code || 'N/A'}</p>
                </div>
                <Badge variant={levelVariant(row.warning_level)}>{String(row.warning_level || 'critical').toUpperCase()}</Badge>
              </div>

              <div className="space-y-1 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                <p>Total Sessions: {row.total_sessions}</p>
                <p>Attended: {row.attended}</p>
                <p>Absence %: {row.absence_pct.toFixed(1)}%</p>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                  <span>Threshold Progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className={`h-2 rounded-full ${progress >= 100 ? 'bg-[var(--color-danger)]' : progress >= 70 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}

        {subjectRows.length === 0 ? (
          <Card variant="bordered" className="px-4 py-4 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            No warning-related subject data available.
          </Card>
        ) : null}
      </section>
    </div>
  );
}
