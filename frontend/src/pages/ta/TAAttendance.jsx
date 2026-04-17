import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  bulkMarkAttendance,
  exportToExcel,
  exportToPDF,
  getAttendanceExportData,
  getAttendanceReport,
  getTASessions,
  getTASubjects,
  markAttendance,
} from '../../lib/apiClient';
import { useRealtimePulse } from '../../hooks/useRealtimePulse';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function TAAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject_id') || '');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [actionMenuStudentId, setActionMenuStudentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const results = await getTASubjects();
      setSubjects(results);
      if (!selectedSubject && results.length > 0) {
        setSelectedSubject(results[0].id);
      }
      setError('');
    } catch {
      setError('Failed to load subjects');
    }
  }

  useEffect(() => {
    if (!selectedSubject) {
      setSessions([]);
      setSelectedSession('');
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('subject_id', selectedSubject);
      return next;
    });

    loadSessions(selectedSubject);
  }, [selectedSubject]);

  async function loadSessions(subjectId) {
    try {
      const results = await getTASessions(subjectId);
      setSessions(results);
      if (results.length > 0) {
        setSelectedSession((prev) => prev || results[0].id);
      } else {
        setSelectedSession('');
      }
      setError('');
    } catch {
      setError('Failed to load sessions');
    }
  }

  useEffect(() => {
    if (!selectedSession) {
      setReport(null);
      return;
    }
    loadReport(selectedSession);
  }, [selectedSession]);

  const pulse = useRealtimePulse(() => {
    if (!selectedSession) return;
    loadReport(selectedSession);
  }, { enabled: Boolean(selectedSession), interval: 30000 });

  async function loadReport(sessionId) {
    setLoading(true);
    try {
      const response = await getAttendanceReport({ sessionId });
      setReport(response);
      setError('');
    } catch {
      setError('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkMark(status) {
    if (!selectedSession) return;

    const studentIds = baseRecords
      .map((row) => row.student_id)
      .filter(Boolean);

    try {
      await bulkMarkAttendance(selectedSession, status, studentIds);
      toast.success(`Students marked ${status.toLowerCase()}`);
      await loadReport(selectedSession);
    } catch {
      toast.error('Failed to apply bulk mark');
    }
  }

  async function handleExport(format) {
    if (!selectedSession) return;
    try {
      const payload = await getAttendanceExportData(selectedSession);
      const rows = Array.isArray(payload.records)
        ? payload.records.map((record) => ({
            student_id_number: record.student_id_number || '',
            student_name: record.student_name || '',
            status: record.status || '',
            check_in_time: record.check_in_time ? new Date(record.check_in_time).toLocaleString() : '',
          }))
        : [];

      const columns = [
        { key: 'student_id_number', label: 'Student ID' },
        { key: 'student_name', label: 'Student Name' },
        { key: 'status', label: 'Status' },
        { key: 'check_in_time', label: 'Check-in Time' },
      ];

      const meta = {
        Subject: `${payload?.subject?.name || ''} (${payload?.subject?.code || ''})`,
        Date: payload?.date || '',
        Instructor: payload?.professor_ta_name || '',
      };

      if (format === 'pdf') {
        exportToPDF(rows, 'TA Session Attendance Report', columns, 'ta-session-attendance', meta);
      } else {
        exportToExcel(rows, columns, 'ta-session-attendance');
      }

      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch {
      toast.error('Failed to export data');
    }
  }

  async function handleManualRowMark(studentId, status) {
    if (!selectedSession || !studentId) return;
    setActionMenuStudentId('');

    try {
      await markAttendance(selectedSession, studentId, status);
      toast.success(`Student marked ${status.toLowerCase()}`);
      await loadReport(selectedSession);
    } catch (markError) {
      toast.error(markError?.message || 'Failed to update student attendance');
    }
  }

  const baseRecords = Array.isArray(report?.records) ? report.records : [];
  const filteredRecords = baseRecords.filter((row) => {
    const statusMatch = statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter;
    const groupMatch = groupFilter === 'all' || groupFilter === String(report?.group?.name || '');
    const q = searchTerm.trim().toLowerCase();
    const searchMatch = !q || String(row.student_name || '').toLowerCase().includes(q);
    return statusMatch && groupMatch && searchMatch;
  });

  const computedSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;

    for (const row of filteredRecords) {
      const status = String(row.status || '').toLowerCase();
      if (status === 'present') present += 1;
      else if (status === 'absent') absent += 1;
      else if (status === 'late') late += 1;
    }

    const total = filteredRecords.length;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;
    return { total, present, absent, late, attendanceRate };
  }, [filteredRecords]);

  const sessionGroupName = report?.group?.name || '';
  const groupOptions = sessionGroupName ? ['all', sessionGroupName] : ['all'];

  const realtimeStateLabel = pulse.isLive ? 'LIVE' : pulse.isPolling ? 'POLLING' : 'OFFLINE';
  const realtimeStateClasses = pulse.isLive
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : pulse.isPolling
      ? 'text-blue-700 bg-blue-50 border-blue-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  const gaugeCircumference = 2 * Math.PI * 18;
  const gaugeOffset = gaugeCircumference - ((computedSummary.attendanceRate / 100) * gaugeCircumference);

  function resetFilters() {
    setStatusFilter('all');
    setGroupFilter('all');
    setSearchInput('');
    setSearchTerm('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Attendance Sheets</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Filter section sessions and manage attendance records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1 text-[11px] font-semibold ${realtimeStateClasses}`}>
            <span className="pulse-dot" />
            {realtimeStateLabel}
          </span>

          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedSession}
            onClick={() => handleExport('pdf')}
            leftIcon={<span className="material-symbols-outlined text-base">picture_as_pdf</span>}
          >
            Export PDF
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedSession}
            onClick={() => handleExport('excel')}
            leftIcon={<span className="material-symbols-outlined text-base">table_view</span>}
          >
            Export Excel
          </Button>
        </div>
      </header>

      <Card variant="elevated">
        <CardBody>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Subject</p>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                options={[
                  { value: '', label: 'Choose subject' },
                  ...subjects.map((subject) => ({
                    value: subject.id,
                    label: `${subject.name_en || subject.name_ar || 'Untitled'} (${subject.code || subject.subject_code || 'N/A'})`,
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Session / Date</p>
              <Select
                value={selectedSession}
                onChange={setSelectedSession}
                disabled={!selectedSubject || sessions.length === 0}
                options={[
                  { value: '', label: 'Choose session' },
                  ...sessions.map((session) => ({
                    value: session.id,
                    label: `${new Date(session.start_time).toLocaleString()} | ${session.status}`,
                  })),
                ]}
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Group</p>
              <Select
                value={groupFilter}
                onChange={setGroupFilter}
                options={groupOptions.map((option) => ({
                  value: option,
                  label: option === 'all' ? 'All Groups' : option,
                }))}
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
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Search</p>
              <input
                value={searchInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchInput(value);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (value.trim()) next.set('search', value);
                    else next.delete('search');
                    return next;
                  });
                }}
                placeholder="Student name"
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)]"
              />
            </div>
          </div>

          <div className="mt-3 flex">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset Filters</Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <Skeleton variant="card" className="h-72" />
      ) : (
        <>
          <ErrorBanner message={error} />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card variant="elevated" className="p-4">
              <p className="text-[11px] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Total Students</p>
              <p className="mt-2 text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">{computedSummary.total}</p>
            </Card>

            <Card variant="elevated" className="p-4">
              <p className="text-[11px] uppercase tracking-[var(--tracking-label)] text-emerald-600">Present + Late</p>
              <p className="mt-2 text-[var(--text-3xl)] font-bold text-emerald-700">{computedSummary.present + computedSummary.late}</p>
            </Card>

            <Card variant="elevated" className="p-4">
              <p className="text-[11px] uppercase tracking-[var(--tracking-label)] text-rose-600">Absent</p>
              <p className="mt-2 text-[var(--text-3xl)] font-bold text-rose-700">{computedSummary.absent}</p>
            </Card>

            <Card variant="elevated" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Attendance Rate</p>
                  <p className="mt-2 text-[var(--text-3xl)] font-bold text-[var(--role-primary)]">{computedSummary.attendanceRate.toFixed(1)}%</p>
                </div>
                <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                  <circle cx="22" cy="22" r="18" stroke="var(--color-surface-3)" strokeWidth="5" fill="none" />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    stroke="var(--role-primary)"
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </Card>
          </section>

          <Card variant="elevated">
            <CardHeader className="sticky top-[calc(var(--topbar-height)+8px)] z-20 bg-[var(--color-surface-1)]">
              <div className="flex flex-wrap gap-2">
                <Button variant="success" size="sm" disabled={!selectedSession} onClick={() => handleBulkMark('Present')}>
                  Mark All Present
                </Button>
                <Button variant="danger" size="sm" disabled={!selectedSession} onClick={() => handleBulkMark('Absent')}>
                  Mark All Absent
                </Button>
              </div>
            </CardHeader>

            <div className="app-scrollbar overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-[var(--text-sm)]">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th scope="col" className="border-b border-[var(--color-border)] px-4 py-3">Student ID</th>
                    <th scope="col" className="border-b border-[var(--color-border)] px-4 py-3">Student Name</th>
                    <th scope="col" className="border-b border-[var(--color-border)] px-4 py-3">Status</th>
                    <th scope="col" className="border-b border-[var(--color-border)] px-4 py-3">Check-in Time</th>
                    <th scope="col" className="border-b border-[var(--color-border)] px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => {
                    const studentId = record.student_id;
                    const initials = String(record.student_name || 'S').slice(0, 1).toUpperCase();

                    return (
                      <tr
                        key={`${record.student_id}-${record.check_in_time || record.status}`}
                        className={index % 2 === 0 ? 'bg-[var(--color-surface-1)] hover:bg-[var(--role-primary-soft)]/40' : 'bg-[var(--color-surface-2)]/35 hover:bg-[var(--role-primary-soft)]/40'}
                      >
                        <td className="border-b border-[var(--color-border)] px-4 py-3 text-[var(--color-text-secondary)]">{record.national_id || 'N/A'}</td>
                        <td className="border-b border-[var(--color-border)] px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--role-primary-soft)] text-[11px] font-semibold text-[var(--role-primary-strong)]">{initials}</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{record.student_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="border-b border-[var(--color-border)] px-4 py-3">
                          <Badge variant={record.status}>{record.status}</Badge>
                        </td>
                        <td className="border-b border-[var(--color-border)] px-4 py-3 text-[var(--color-text-secondary)]">
                          {record.check_in_time ? new Date(record.check_in_time).toLocaleString() : '-'}
                        </td>
                        <td className="relative border-b border-[var(--color-border)] px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setActionMenuStudentId((prev) => (prev === studentId ? '' : studentId))}
                            aria-label={`Open row actions for ${record.student_name || 'student'}`}
                            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>

                          {actionMenuStudentId === studentId ? (
                            <div className="absolute inset-inline-end-4 z-20 mt-2 w-36 origin-top-right rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-1 shadow-[var(--shadow-lg)] transition-all duration-150">
                              <button
                                type="button"
                                onClick={() => handleManualRowMark(studentId, 'Present')}
                                className="block w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[var(--text-sm)] hover:bg-[var(--color-surface-2)]"
                              >
                                Mark Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualRowMark(studentId, 'Late')}
                                className="block w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[var(--text-sm)] hover:bg-[var(--color-surface-2)]"
                              >
                                Mark Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualRowMark(studentId, 'Absent')}
                                className="block w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[var(--text-sm)] hover:bg-[var(--color-surface-2)]"
                              >
                                Mark Absent
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                        No attendance records match the selected filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!selectedSession && !loading ? (
        <Card variant="bordered" className="p-6 text-center text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Select a subject and session to display attendance details.
        </Card>
      ) : null}
    </div>
  );
}
