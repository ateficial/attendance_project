import { useEffect, useMemo, useState } from 'react';
import { exportToExcel, exportToPDF, getStudentCourses, getStudentHistory } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';

function statusVariant(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'present') return 'present';
  if (normalized === 'late') return 'late';
  if (normalized === 'absent') return 'absent';
  return 'neutral';
}

export default function History() {
  const [historyRows, setHistoryRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const dateRangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return '';
    return dateFrom > dateTo ? 'Date range is invalid: from-date must be earlier than or equal to to-date.' : '';
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [history, studentCourses] = await Promise.all([
        getStudentHistory(),
        getStudentCourses(),
      ]);

      setHistoryRows(Array.isArray(history) ? history : []);
      setCourses(Array.isArray(studentCourses) ? studentCourses : []);
      setError('');
    } catch {
      setError('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return historyRows.filter((row) => {
      const checkIn = row.check_in_time ? new Date(row.check_in_time) : null;
      const rowDate = checkIn ? checkIn.toISOString().slice(0, 10) : '';
      const subjectId = row.subject?.id || '';
      const subjectName = (row.subject?.name_en || row.subject?.name_ar || '').toLowerCase();

      const courseMatch = courseFilter === 'all' || courseFilter === subjectId;
      const statusMatch = statusFilter === 'all' || statusFilter === String(row.status || '').toLowerCase();
      const fromMatch = dateRangeError ? true : (!dateFrom || (rowDate && rowDate >= dateFrom));
      const toMatch = dateRangeError ? true : (!dateTo || (rowDate && rowDate <= dateTo));
      const searchMatch = !searchTerm.trim() || subjectName.includes(searchTerm.trim().toLowerCase());

      return courseMatch && statusMatch && fromMatch && toMatch && searchMatch;
    });
  }, [historyRows, courseFilter, statusFilter, dateFrom, dateTo, searchTerm]);

  const groupedByMonth = useMemo(() => {
    const map = new Map();
    for (const row of filteredRows) {
      const date = row.check_in_time ? new Date(row.check_in_time) : null;
      const monthKey = date
        ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : 'Unknown Month';

      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey).push(row);
    }
    return Array.from(map.entries());
  }, [filteredRows]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    let attended = 0;
    for (const row of filteredRows) {
      const state = String(row.status || '').toLowerCase();
      if (state === 'present' || state === 'late') attended += 1;
    }
    const pct = total > 0 ? (attended / total) * 100 : 0;
    return { total, attended, pct };
  }, [filteredRows]);

  function exportFilteredPdf() {
    if (dateRangeError) return;

    const rows = filteredRows.map((row) => ({
      subject: row.subject?.name_en || row.subject?.name_ar || 'Unknown Subject',
      code: row.subject?.code || '',
      date: row.check_in_time ? new Date(row.check_in_time).toLocaleDateString() : '',
      time: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '',
      status: row.status || '',
    }));

    exportToPDF(
      rows,
      'Filtered Attendance History',
      [
        { key: 'subject', label: 'Subject' },
        { key: 'code', label: 'Code' },
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'status', label: 'Status' },
      ],
      'student-history-filtered',
      {
        DateFrom: dateFrom || 'All',
        DateTo: dateTo || 'All',
        Course: courseFilter === 'all' ? 'All Courses' : (courses.find((course) => course.id === courseFilter)?.name_en || 'Selected Course'),
      },
    );
  }

  function exportFilteredExcel() {
    if (dateRangeError) return;

    const rows = filteredRows.map((row) => ({
      subject: row.subject?.name_en || row.subject?.name_ar || 'Unknown Subject',
      code: row.subject?.code || '',
      date: row.check_in_time ? new Date(row.check_in_time).toLocaleDateString() : '',
      time: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '',
      status: row.status || '',
    }));

    exportToExcel(
      rows,
      [
        { key: 'subject', label: 'Subject' },
        { key: 'code', label: 'Code' },
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'status', label: 'Status' },
      ],
      'student-history-filtered',
    );
  }

  if (loading) {
    return <Skeleton variant="card" className="h-72" />;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Attendance History</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Filter your logs by subject, status, date range, and search.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={exportFilteredPdf}
            disabled={filteredRows.length === 0 || Boolean(dateRangeError)}
            variant="ghost"
            size="sm"
          >
            Export PDF
          </Button>
          <Button
            type="button"
            onClick={exportFilteredExcel}
            disabled={filteredRows.length === 0 || Boolean(dateRangeError)}
            variant="secondary"
            size="sm"
          >
            Export Excel
          </Button>
        </div>
      </header>

      <ErrorBanner message={dateRangeError} />

      <Card variant="elevated">
        <CardBody className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Course</p>
              <Select
                value={courseFilter}
                onChange={setCourseFilter}
                options={[
                  { value: 'all', label: 'All Courses' },
                  ...courses.map((course) => ({
                    value: course.id,
                    label: course.name_en || course.name_ar || 'Unknown Course',
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Status</p>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'present', label: 'Present' },
                  { value: 'late', label: 'Late' },
                  { value: 'absent', label: 'Absent' },
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">From</p>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                aria-label="Filter history from date"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">To</p>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                aria-label="Filter history to date"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Search</p>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Subject name"
                aria-label="Search history by subject"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Date Range
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCourseFilter('all');
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearchInput('');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {groupedByMonth.length === 0 ? (
        <Card variant="bordered" className="p-10 text-center text-[var(--color-text-secondary)]">
          No attendance records match your filters.
        </Card>
      ) : (
        <section className="space-y-5">
          {groupedByMonth.map(([month, rows]) => (
            <Card key={month} variant="elevated">
              <CardHeader>
                <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">{month}</h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {rows.map((row) => (
                  <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2">
                    <div>
                      <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">{row.subject?.name_en || row.subject?.name_ar || 'Unknown Subject'}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        {row.check_in_time ? new Date(row.check_in_time).toLocaleDateString() : '-'}
                        {' • '}
                        {row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    <Badge variant={statusVariant(row.status)}>{row.status || 'Unknown'}</Badge>
                  </article>
                ))}
              </CardBody>
            </Card>
          ))}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Lectures"
          metric={summary.total}
          icon={<span className="material-symbols-outlined text-[22px]">menu_book</span>}
          delay={0}
        />
        <StatCard
          label="Total Attended"
          metric={summary.attended}
          icon={<span className="material-symbols-outlined text-[22px]">task_alt</span>}
          delay={1}
        />
        <StatCard
          label="Attendance Percentage"
          metric={`${summary.pct.toFixed(1)}%`}
          icon={<span className="material-symbols-outlined text-[22px]">query_stats</span>}
          trendDirection={summary.pct >= 75 ? 'up' : 'down'}
          delay={2}
        />
      </section>
    </div>
  );
}
