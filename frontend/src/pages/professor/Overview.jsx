import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { getProfessorDashboardStats } from '../../lib/apiClient';
import { useRealtimePulse } from '../../hooks/useRealtimePulse';
import Badge from '../../components/ui/Badge';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import ErrorBanner from '../../components/ui/ErrorBanner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

export default function Overview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const loadDashboard = async () => {
    try {
      const payload = await getProfessorDashboardStats();
      setStats(payload);
      setError('');
    } catch (e) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const pulse = useRealtimePulse(loadDashboard, { enabled: true, interval: 30000 });

  const statusDistribution = stats?.status_distribution || { present: 0, late: 0, absent: 0 };
  const summaryRows = Array.isArray(stats?.subjects_summary) ? stats.subjects_summary : [];
  const atRiskRows = Array.isArray(stats?.at_risk_students) ? stats.at_risk_students : [];

  const trendPoints = useMemo(() => {
    const rows = Array.isArray(stats?.recent_7_days_trend) ? stats.recent_7_days_trend : [];
    return rows.map((item) => ({
      label: String(item.date || '').slice(5),
      value: Number(item.present_pct || 0),
    }));
  }, [stats]);

  const lineData = {
    labels: trendPoints.map((item) => item.label),
    datasets: [
      {
        label: 'Attendance %',
        data: trendPoints.map((item) => item.value),
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#2563eb',
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const area = chart.chartArea;
          if (!area) return 'rgba(37,99,235,0.15)';
          const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          gradient.addColorStop(0, 'rgba(37,99,235,0.28)');
          gradient.addColorStop(1, 'rgba(37,99,235,0.02)');
          return gradient;
        },
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (value) => `${value}%` },
        grid: { color: '#e2e8f0' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const donutData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [
      {
        data: [statusDistribution.present || 0, statusDistribution.late || 0, statusDistribution.absent || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const totalStatuses = (statusDistribution.present || 0) + (statusDistribution.late || 0) + (statusDistribution.absent || 0);

  const liveLabel = pulse.isLive ? 'LIVE' : pulse.isPolling ? 'POLLING' : 'OFFLINE';
  const liveClasses = pulse.isLive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pulse.isPolling
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton variant="card" className="h-28" count={4} />
        <Skeleton variant="card" className="h-80" />
      </section>
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Professor Dashboard</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Realtime attendance overview across your subjects.</p>
        </div>

        <div aria-label={`Connection status ${liveLabel}`} className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1 text-[11px] font-semibold ${liveClasses}`}>
          <span className="pulse-dot" />
          {liveLabel}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          metric={stats?.total_students || 0}
          icon={<span className="material-symbols-outlined text-[22px]">group</span>}
          trendDirection="up"
          trendDelta={12.3}
          delay={0}
          refreshKey={pulse.pulseCount}
        />
        <StatCard
          label="Avg Attendance Rate"
          metric={`${Number(stats?.avg_attendance_rate || 0).toFixed(1)}%`}
          icon={<span className="material-symbols-outlined text-[22px]">percent</span>}
          trendDirection={Number(stats?.avg_attendance_rate || 0) >= 75 ? 'up' : 'down'}
          trendDelta={4.8}
          delay={1}
          refreshKey={pulse.pulseCount}
        />
        <StatCard
          label="Sessions This Semester"
          metric={stats?.total_sessions_held || 0}
          icon={<span className="material-symbols-outlined text-[22px]">event_available</span>}
          trendDirection="up"
          trendDelta={6.1}
          delay={2}
          refreshKey={pulse.pulseCount}
        />
        <StatCard
          label="At-Risk Students"
          metric={atRiskRows.length}
          icon={<span className="material-symbols-outlined text-[22px]">warning</span>}
          trendDirection={atRiskRows.length > 0 ? 'down' : 'up'}
          trendDelta={atRiskRows.length > 0 ? atRiskRows.length : 0}
          delay={3}
          refreshKey={pulse.pulseCount}
          glow={atRiskRows.length > 0}
          className={atRiskRows.length > 0 ? 'shadow-[var(--shadow-glow-danger)]' : ''}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Attendance Trend (7 days)</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">Updated pulses: {pulse.pulseCount}</p>
          </CardHeader>
          <CardBody className="h-[280px]">
            <Line data={lineData} options={lineOptions} />
          </CardBody>
        </Card>

        <Card variant="elevated" className="relative">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Status Distribution</h2>
          </CardHeader>
          <CardBody className="h-[300px]">
            <Doughnut
              data={donutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                hoverOffset: 6,
                animation: {
                  animateRotate: true,
                  duration: 800,
                },
                plugins: {
                  legend: { position: 'bottom' },
                  centerLabelPlugin: {
                    total: totalStatuses,
                    title: String(totalStatuses),
                    subtitle: 'Records',
                  },
                },
              }}
            />
          </CardBody>
        </Card>
      </section>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Subjects Summary</h2>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              { key: 'subject_name', label: 'Subject' },
              { key: 'subject_code', label: 'Code' },
              { key: 'level', label: 'Level' },
              { key: 'session_count', label: 'Sessions', sortable: true },
              {
                key: 'avg_rate',
                label: 'Avg Rate',
                sortable: true,
                render: (value) => <ProgressBar value={Number(value || 0)} showLabel />,
              },
              {
                key: 'present_count',
                label: 'Present',
                render: (value) => <Badge variant="present">{value || 0}</Badge>,
              },
              {
                key: 'absent_count',
                label: 'Absent',
                render: (value) => <Badge variant="absent">{value || 0}</Badge>,
              },
              {
                key: 'late_count',
                label: 'Late',
                render: (value) => <Badge variant="late">{value || 0}</Badge>,
              },
            ]}
            rows={summaryRows}
            rowKey="subject_id"
            onRowClick={(row) => navigate(`/professor/attendance?subject_id=${encodeURIComponent(row.subject_id)}`)}
            emptyIcon="analytics"
            emptyTitle="No subject analytics"
            emptySubtitle="Attendance distribution appears here when sessions are available."
          />
        </CardBody>
      </Card>

      <Card variant="elevated">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">At-Risk Students</h2>
          <button
            type="button"
            onClick={() => navigate('/professor/analytics')}
            className="text-[var(--text-sm)] font-semibold text-[var(--role-primary)]"
          >
            View Full Report
          </button>
        </div>

        <div className="space-y-2">
          {atRiskRows.map((row, index) => {
            const initials = String(row.name || 'ST')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((piece) => piece[0]?.toUpperCase())
              .join('');

            return (
              <article
                key={`${row.student_id}-${row.subject_name}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-rose-200 bg-rose-50/50 p-3"
                style={{
                  animation: 'pageEnter 220ms var(--ease-enter) both',
                  animationDelay: `${index * 60}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-200 text-[11px] font-semibold text-rose-800">{initials}</span>
                  <div>
                    <p className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">{row.name || 'Unknown Student'}</p>
                    <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">{row.subject_name || 'Unknown Subject'}</p>
                  </div>
                </div>
                <Badge variant="critical">{Number(row.absence_pct || 0).toFixed(1)}% absent</Badge>
              </article>
            );
          })}

          {atRiskRows.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-3 py-3 text-[var(--text-sm)] text-emerald-700">
              Great news. No at-risk students above the 25% threshold.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
