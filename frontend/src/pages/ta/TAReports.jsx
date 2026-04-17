import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import {
  exportToExcel,
  exportToPDF,
  getAttendanceReport,
  getSubjectAttendanceExportData,
  getTASubjects,
} from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function TAReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject_id') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [report, setReport] = useState(null);
  const [studentRows, setStudentRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dateRangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return '';
    return dateFrom > dateTo ? 'Date range is invalid: from-date must be earlier than or equal to to-date.' : '';
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const results = await getTASubjects();
      setSubjects(results);
      if (results.length > 0 && !selectedSubject) {
        setSelectedSubject(results[0].id);
      }
    } catch {
      setError('Failed to load subjects');
    }
  }

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedSubject) next.set('subject_id', selectedSubject);
    if (dateFrom) next.set('date_from', dateFrom);
    if (dateTo) next.set('date_to', dateTo);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [selectedSubject, dateFrom, dateTo, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedSubject) return;
    generateReport({ subjectId: selectedSubject });
  }, [selectedSubject]);

  async function generateReport(nextFilters = {}) {
    const subjectId = nextFilters.subjectId ?? selectedSubject;
    const reportDateFrom = nextFilters.dateFrom ?? dateFrom;
    const reportDateTo = nextFilters.dateTo ?? dateTo;

    if (!subjectId) return;

    if (reportDateFrom && reportDateTo && reportDateFrom > reportDateTo) {
      setError('Date range is invalid: from-date must be earlier than to-date');
      return;
    }

    setLoading(true);
    try {
      const [attendanceReport, subjectExport] = await Promise.all([
        getAttendanceReport({ subjectId, dateFrom: reportDateFrom, dateTo: reportDateTo }),
        getSubjectAttendanceExportData(subjectId, reportDateFrom, reportDateTo),
      ]);

      setReport(attendanceReport);
      setStudentRows(buildStudentBreakdown(subjectExport?.sessions || []));
      setError('');
    } catch {
      setError('Failed to generate report');
      setReport(null);
      setStudentRows([]);
    } finally {
      setLoading(false);
    }
  }

  function buildStudentBreakdown(sessions) {
    const map = new Map();

    for (const session of sessions) {
      const records = Array.isArray(session.records) ? session.records : [];
      for (const record of records) {
        const key = record.student_id || record.student_id_number || record.student_name;
        if (!map.has(key)) {
          map.set(key, {
            student_name: record.student_name || 'Unknown',
            student_id_number: record.student_id_number || 'N/A',
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          });
        }

        const current = map.get(key);
        const status = String(record.status || '').toLowerCase();
        if (status === 'present') current.present += 1;
        else if (status === 'absent') current.absent += 1;
        else if (status === 'late') current.late += 1;
        current.total += 1;
      }
    }

    return Array.from(map.values())
      .map((row) => {
        const pct = row.total > 0 ? ((row.present + row.late) / row.total) * 100 : 0;
        let warningLevel = 'Critical';
        if (pct >= 75) warningLevel = 'OK';
        else if (pct >= 60) warningLevel = 'Warning';
        else if (pct >= 50) warningLevel = 'Danger';

        return {
          ...row,
          attendance_pct: Number(pct.toFixed(2)),
          warning_level: warningLevel,
        };
      })
      .sort((a, b) => a.attendance_pct - b.attendance_pct);
  }

  const selectedSubjectMeta = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubject) || null,
    [subjects, selectedSubject],
  );

  const trendData = useMemo(() => {
    const sorted = Array.isArray(report?.sessions)
      ? [...report.sessions].sort((a, b) => new Date(a.date) - new Date(b.date))
      : [];

    return {
      labels: sorted.map((session) => {
        const d = new Date(session.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          label: 'Attendance Rate (%)',
          data: sorted.map((session) => (session.total > 0 ? Math.round(((session.present + session.late) / session.total) * 100) : 0)),
          borderColor: 'var(--role-primary)',
          backgroundColor: 'color-mix(in srgb, var(--role-primary) 15%, transparent)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: 'var(--role-primary)',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  }, [report]);

  const distributionData = useMemo(
    () => ({
      labels: ['Present', 'Late', 'Absent'],
      datasets: [
        {
          data: [report?.overall?.present || 0, report?.overall?.late || 0, report?.overall?.absent || 0],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    [report],
  );

  function exportRows(format) {
    const rows = studentRows.map((row) => ({
      student_id_number: row.student_id_number,
      student_name: row.student_name,
      total_sessions: row.total,
      present: row.present,
      absent: row.absent,
      late: row.late,
      attendance_pct: `${row.attendance_pct}%`,
      warning_level: row.warning_level,
    }));

    const columns = [
      { key: 'student_id_number', label: 'Student ID' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'total_sessions', label: 'Total Sessions' },
      { key: 'present', label: 'Present' },
      { key: 'absent', label: 'Absent' },
      { key: 'late', label: 'Late' },
      { key: 'attendance_pct', label: 'Attendance %' },
      { key: 'warning_level', label: 'Warning Level' },
    ];

    const meta = {
      Subject: selectedSubjectMeta?.name_en || selectedSubjectMeta?.name_ar || 'N/A',
      DateFrom: dateFrom || 'All',
      DateTo: dateTo || 'All',
    };

    if (format === 'pdf') {
      exportToPDF(rows, 'TA Analytics Report', columns, 'ta-analytics', meta);
    } else {
      exportToExcel(rows, columns, 'ta-analytics');
    }

    toast.success(`Exported ${format.toUpperCase()} successfully`);
  }

  const chartOptions = {
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
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, boxWidth: 8 } },
      centerLabelPlugin: {
        total: studentRows.length,
        title: String(studentRows.length),
        subtitle: 'Students',
      },
    },
  };

  const summary = {
    avg: Number(report?.overall?.attendance_percentage || 0),
    present: Number(report?.overall?.present || 0),
    late: Number(report?.overall?.late || 0),
    absent: Number(report?.overall?.absent || 0),
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Reports</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Generate filtered attendance insights for your sections.</p>
        </div>
      </header>

      <Card variant="elevated">
        <CardBody className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Subject</p>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                options={[
                  { value: '', label: 'Select subject' },
                  ...subjects.map((subject) => ({
                    value: subject.id,
                    label: `${subject.name_en || subject.name_ar || 'Untitled'} (${subject.code || 'N/A'})`,
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">From</p>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                aria-label="Filter reports from date"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">To</p>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                aria-label="Filter reports to date"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>

            <div className="md:col-span-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={() => generateReport()}>
                  Generate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    generateReport({ dateFrom: '', dateTo: '' });
                  }}
                >
                  Clear Dates
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const fallbackSubject = subjects[0]?.id || '';
                    setSelectedSubject(fallbackSubject);
                    setDateFrom('');
                    setDateTo('');
                    if (fallbackSubject) {
                      generateReport({ subjectId: fallbackSubject, dateFrom: '', dateTo: '' });
                    }
                  }}
                >
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportRows('pdf')}
                  disabled={!studentRows.length || Boolean(dateRangeError)}
                >
                  Export PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportRows('excel')}
                  disabled={!studentRows.length || Boolean(dateRangeError)}
                >
                  Export Excel
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <ErrorBanner message={dateRangeError} />
      {!dateRangeError ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <Skeleton variant="card" className="h-72" />
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Average Attendance"
              metric={`${summary.avg.toFixed(1)}%`}
              icon={<span className="material-symbols-outlined text-[22px]">query_stats</span>}
              trendDirection={summary.avg >= 75 ? 'up' : 'down'}
              trendDelta={Number((summary.avg - 75).toFixed(1))}
              delay={0}
            />
            <StatCard
              label="Total Present"
              metric={summary.present}
              icon={<span className="material-symbols-outlined text-[22px]">check_circle</span>}
              delay={1}
            />
            <StatCard
              label="Total Late"
              metric={summary.late}
              icon={<span className="material-symbols-outlined text-[22px]">schedule</span>}
              delay={2}
            />
            <StatCard
              label="Total Absent"
              metric={summary.absent}
              icon={<span className="material-symbols-outlined text-[22px]">person_off</span>}
              trendDirection={summary.absent > 0 ? 'down' : 'up'}
              delay={3}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card variant="elevated" className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Trend by Session</h2>
              </CardHeader>
              <CardBody className="h-[320px]">
                <Line data={trendData} options={chartOptions} />
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Status Distribution</h2>
              </CardHeader>
              <CardBody className="h-[320px]">
                <Doughnut data={distributionData} options={doughnutOptions} />
              </CardBody>
            </Card>
          </section>

          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Per-Student Breakdown</h2>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable
                columns={[
                  { key: 'student_name', label: 'Student Name', sortable: true },
                  { key: 'student_id_number', label: 'Student ID' },
                  { key: 'total', label: 'Total Sessions', sortable: true },
                  { key: 'present', label: 'Present', sortable: true },
                  { key: 'absent', label: 'Absent', sortable: true },
                  { key: 'late', label: 'Late', sortable: true },
                  {
                    key: 'attendance_pct',
                    label: 'Attendance %',
                    sortable: true,
                    render: (value) => `${Number(value || 0).toFixed(2)}%`,
                  },
                  {
                    key: 'warning_level',
                    label: 'Warning Level',
                    render: (value) => {
                      const normalized = String(value || 'critical').toLowerCase();
                      const variant = normalized === 'ok'
                        ? 'ok'
                        : normalized === 'warning'
                          ? 'warning'
                          : normalized === 'danger'
                            ? 'critical'
                            : 'critical';
                      return <Badge variant={variant}>{value}</Badge>;
                    },
                  },
                ]}
                rows={studentRows}
                rowKey={(row) => `${row.student_id_number}-${row.student_name}`}
                emptyIcon="analytics"
                emptyTitle="No student rows available"
                emptySubtitle="No records were found for this subject and date range."
                initialSort={{ key: 'attendance_pct', direction: 'asc' }}
              />
            </CardBody>
          </Card>
        </>
      ) : (
        <Card variant="bordered" className="p-12 text-center text-[var(--color-text-secondary)]">
          Select a subject, then click Generate to build your analytics report.
        </Card>
      )}
    </div>
  );
}
