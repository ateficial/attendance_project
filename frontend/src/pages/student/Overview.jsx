import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { exportToPDF, getStudentDashboardStats, getStudentHistory, getStudentWarnings } from '../../lib/apiClient';
import { useRealtimePulse } from '../../hooks/useRealtimePulse';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';
import StatCard from '../../components/ui/StatCard';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function warningVariant(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'ok') return 'ok';
  if (normalized === 'warning') return 'warning';
  if (normalized === 'danger') return 'critical';
  return 'critical';
}

function statusColor(status) {
  if (status === 'present') return 'bg-[var(--color-success)] text-white';
  if (status === 'late') return 'bg-[var(--color-warning)] text-white';
  if (status === 'absent') return 'bg-[var(--color-danger)] text-white';
  return 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]';
}

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [warningSnapshot, setWarningSnapshot] = useState({ warnings: [], overall_status: 'ok', warnings_count: 0 });
  const [historyRows, setHistoryRows] = useState([]);
  const [monthDate, setMonthDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  const pulse = useRealtimePulse(() => {
    if (!user?.id) return;
    loadDashboard();
  }, { enabled: Boolean(user?.id), interval: 25000 });

  async function loadDashboard() {
    try {
      const [stats, warnings, history] = await Promise.all([
        getStudentDashboardStats(),
        getStudentWarnings(user?.id),
        getStudentHistory(),
      ]);

      setDashboard(stats);
      setWarningSnapshot(warnings);
      setHistoryRows(Array.isArray(history) ? history : []);
      setError('');
    } catch (e) {
      setError('Failed to load student dashboard');
    } finally {
      setLoading(false);
    }
  }

  const recentRows = useMemo(() => historyRows.slice(0, 10), [historyRows]);

  const calendarStatusMap = useMemo(() => {
    const map = new Map();
    const rows = Array.isArray(dashboard?.calendar_data) ? dashboard.calendar_data : [];
    for (const row of rows) {
      map.set(row.date, row.status || 'no_session');
    }
    return map;
  }, [dashboard]);

  const monthGrid = useMemo(() => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().slice(0, 10);
      cells.push({ day, date: isoDate, status: calendarStatusMap.get(isoDate) || 'no_session' });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthDate, calendarStatusMap]);

  function exportHistoryPdf() {
    const rows = historyRows.map((row) => ({
      subject: row.subject?.name_en || row.subject?.name_ar || 'Unknown Subject',
      code: row.subject?.code || '',
      date: row.check_in_time ? new Date(row.check_in_time).toLocaleDateString() : '',
      time: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '',
      status: row.status || '',
    }));

    exportToPDF(
      rows,
      'Student Attendance History',
      [
        { key: 'subject', label: 'Subject' },
        { key: 'code', label: 'Code' },
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'status', label: 'Status' },
      ],
      'student-history',
      {
        Student: user?.name_en || user?.name || 'Student',
        StudentID: user?.national_id || '-',
      }
    );
  }

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

  const overallPct = Number(dashboard?.overall_attendance_pct || 0);
  const warningCount = Number(warningSnapshot?.warnings_count || 0);
  const warningLevel = dashboard?.warning_status?.level || warningSnapshot?.overall_status || 'ok';
  const subjectsBreakdown = Array.isArray(dashboard?.subjects_breakdown) ? dashboard.subjects_breakdown : [];
  const liveLabel = pulse.isLive ? 'LIVE' : pulse.isPolling ? 'POLLING' : 'OFFLINE';
  const liveClasses = pulse.isLive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pulse.isPolling
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Student Dashboard</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Realtime attendance and warning snapshot.</p>
        </div>

        <div aria-label={`Connection status ${liveLabel}`} className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1 text-[11px] font-semibold ${liveClasses}`}>
          <span className={`h-2 w-2 rounded-full ${pulse.isLive ? 'animate-pulse bg-emerald-500' : pulse.isPolling ? 'animate-pulse bg-blue-500' : 'bg-rose-500'}`} />
          {liveLabel}
        </div>
      </header>

      {warningCount > 0 ? (
        <Card variant="bordered" className="border-amber-200 bg-amber-50 px-4 py-3 text-[var(--text-sm)] text-amber-800">
          You have {warningCount} absence warnings.
          <button
            type="button"
            onClick={() => navigate('/student/warnings')}
            className="ml-2 font-semibold underline"
          >
            View details
          </button>
        </Card>
      ) : null}

      {pulse.isPolling ? (
        <Card variant="bordered" className="border-blue-200 bg-blue-50 px-4 py-3 text-[var(--text-sm)] text-blue-700">
          POLLING MODE ACTIVE - Attendance window open
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall Attendance"
          metric={`${overallPct.toFixed(1)}%`}
          icon={<span className="material-symbols-outlined text-[22px]">query_stats</span>}
          trendDirection={overallPct >= 75 ? 'up' : 'down'}
          trendDelta={Number((overallPct - 75).toFixed(1))}
          delay={0}
        />
        <StatCard
          label="Total Present"
          metric={dashboard?.total_present || 0}
          icon={<span className="material-symbols-outlined text-[22px]">task_alt</span>}
          delay={1}
        />
        <StatCard
          label="Total Absent"
          metric={dashboard?.total_absent || 0}
          icon={<span className="material-symbols-outlined text-[22px]">person_off</span>}
          trendDirection={Number(dashboard?.total_absent || 0) > 0 ? 'down' : 'up'}
          delay={2}
        />
        <Card variant="elevated" className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Warning Status</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge variant={warningVariant(warningLevel)}>{String(warningLevel).toUpperCase()}</Badge>
            <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">{warningCount} warning(s)</span>
          </div>
          <ProgressBar className="mt-3" value={overallPct} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Attendance Calendar</h2>
            <div className="flex items-center gap-2 text-sm">
              <Button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                variant="ghost"
                size="sm"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </Button>
              <span className="font-medium text-[var(--color-text-primary)]">
                {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <Button
                type="button"
                aria-label="Next month"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                variant="ghost"
                size="sm"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-[var(--color-text-secondary)]">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="py-1 font-semibold uppercase tracking-[var(--tracking-label)]">{day}</div>
              ))}
              {monthGrid.map((cell, index) => (
                <div key={index} className="flex aspect-square items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs">
                  {cell ? (
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${statusColor(cell.status)}`}>
                      {cell.day}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <Badge variant="present" showDot={false}>Present</Badge>
              <Badge variant="late" showDot={false}>Late</Badge>
              <Badge variant="absent" showDot={false}>Absent</Badge>
              <Badge variant="neutral" showDot={false}>No Session</Badge>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Recent Logs</h2>
            <Button type="button" variant="ghost" size="sm" onClick={exportHistoryPdf}>Export PDF</Button>
          </CardHeader>

          <CardBody className="space-y-2">
            {recentRows.map((row) => {
              const state = String(row.status || '').toLowerCase();
              const variant = state === 'present' ? 'present' : state === 'late' ? 'late' : state === 'absent' ? 'absent' : 'neutral';

              return (
                <div key={row.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2">
                  <div>
                    <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">{row.subject?.name_en || row.subject?.name_ar || 'Unknown Subject'}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {row.check_in_time ? new Date(row.check_in_time).toLocaleString() : '-'}
                    </p>
                  </div>
                  <Badge variant={variant}>{row.status || 'Unknown'}</Badge>
                </div>
              );
            })}

            {recentRows.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                No recent attendance logs.
              </p>
            ) : null}
          </CardBody>
        </Card>
      </section>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Subjects Breakdown</h2>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjectsBreakdown.map((row) => (
            <article key={row.subject_id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{row.name || 'Unknown Subject'}</p>
                <span className="text-[11px] text-[var(--color-text-secondary)]">{row.code || 'N/A'}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">Level {row.level || '-'}</p>
              <div className="mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                <p>Present: {row.present || 0}</p>
                <p>Absent: {row.absent || 0}</p>
                <p>Late: {row.late || 0}</p>
              </div>
              <ProgressBar className="mt-3" value={Number(row.pct || 0)} />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[var(--text-lg)] font-bold text-[var(--color-text-primary)]">{Number(row.pct || 0).toFixed(1)}%</span>
                <Badge variant={warningVariant(row.warning_level || 'critical')}>{String(row.warning_level || 'critical').toUpperCase()}</Badge>
              </div>
            </article>
          ))}

          {subjectsBreakdown.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              No subject breakdown available yet.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
