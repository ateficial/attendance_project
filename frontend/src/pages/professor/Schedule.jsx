import { useEffect, useMemo, useState } from 'react';
import { getProfessorSchedule } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const SLOT_MAP = {
  '1': '09:00-10:00',
  '2': '10:00-11:00',
  '3': '11:00-12:00',
  '4': '12:00-13:00',
  '5': '13:00-14:00',
  '6': '14:00-15:00',
  '7': '15:00-16:00',
  '8': '16:00-16:30',
};

function cellCardClasses(type) {
  return type === 'section'
    ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
    : 'border-[color-mix(in_srgb,var(--role-primary)_32%,white)] bg-[var(--role-primary-soft)]/40 text-[var(--role-primary-strong)]';
}

export default function Schedule() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState('sunday');

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      try {
        const response = await getProfessorSchedule();
        if (!mounted) return;
        setRows(Array.isArray(response) ? response : []);
        setError('');
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load professor schedule');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  const grid = useMemo(() => {
    const output = {};
    for (const day of DAYS) {
      output[day] = {};
      for (const slot of Object.keys(SLOT_MAP)) {
        output[day][slot] = [];
      }
    }

    for (const row of rows) {
      const day = String(row.day || '').toLowerCase();
      const slot = String(row.slot || '');
      if (!output[day] || !output[day][slot]) continue;
      output[day][slot].push(row);
    }

    return output;
  }, [rows]);

  if (loading) {
    return (
      <Skeleton variant="card" className="h-80" />
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Weekly Schedule</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">View-only timetable for the current semester.</p>
      </header>

      <Card variant="elevated" className="hidden lg:block">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Desktop Timetable</h2>
          <div className="flex items-center gap-2">
            <Badge variant="info">Lecture</Badge>
            <Badge variant="ok">Section</Badge>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <div className="app-scrollbar overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            <tr>
              <th className="w-28 border-b border-r border-[var(--color-border)] px-3 py-3 font-medium">Day</th>
              {Object.entries(SLOT_MAP).map(([slot, label]) => (
                <th key={slot} className="border-b border-r border-[var(--color-border)] px-2 py-3 font-medium">
                  <div className="text-xs">Slot {slot}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day}>
                <th className="border-b border-r border-[var(--color-border)] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {day}
                </th>
                {Object.keys(SLOT_MAP).map((slot) => {
                  const entries = grid[day]?.[slot] || [];
                  return (
                    <td key={`${day}-${slot}`} className="h-28 border-b border-r border-[var(--color-border)] p-2 align-top">
                      {entries.length > 0 ? (
                        <div className="space-y-2">
                          {entries.map((item) => (
                            <article key={item.id} className={`rounded-xl border px-2 py-2 text-xs ${cellCardClasses(item.session_type)}`}>
                              <p className="font-semibold">{item.subject_name || 'Untitled'}</p>
                              <p>{item.subject_code || ''}</p>
                              <p>{item.room || 'Room N/A'}</p>
                              <p>{item.group || '-'}</p>
                              <Badge variant={item.session_type === 'section' ? 'ok' : 'info'} className="mt-1" showDot={false}>
                                {item.session_type || 'lecture'}
                              </Badge>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated" className="space-y-4 p-4 lg:hidden">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              aria-label={`Show ${day} schedule`}
              className={`rounded-[var(--radius-md)] px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeDay === day
                  ? 'bg-[var(--role-primary)] text-white'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-secondary)]'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
          {Object.keys(SLOT_MAP).map((slot) => {
            const entries = grid[activeDay]?.[slot] || [];
            return (
              <div key={`${activeDay}-${slot}`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Slot {slot}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{SLOT_MAP[slot]}</p>
                </div>

                {entries.length > 0 ? (
                  <div className="space-y-2">
                    {entries.map((item) => (
                      <article key={item.id} className={`rounded-lg border p-2 text-xs ${cellCardClasses(item.session_type)}`}>
                        <p className="font-semibold">{item.subject_name}</p>
                        <p>{item.subject_code}</p>
                        <p>{item.room}</p>
                        <Badge variant={item.session_type === 'section' ? 'ok' : 'info'} className="mt-1" showDot={false}>
                          {item.session_type || 'lecture'}
                        </Badge>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">No scheduled class.</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
