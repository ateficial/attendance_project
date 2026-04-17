import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import pb from '../../lib/pb';
import { useRealtimePulse } from '../../hooks/useRealtimePulse';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';
import StatCard from '../../components/ui/StatCard';

const INITIAL_STATS = {
  rooms: 0,
  students: 0,
  professors: 0,
  tas: 0,
  activeSessions: 0,
};

function statusVariant(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'open' || normalized === 'active') return 'ok';
  if (normalized === 'closed') return 'neutral';
  return 'warning';
}

export default function Overview() {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function countCollection(name, filter) {
    const result = await pb.collection(name).getList(1, 1, filter ? { filter } : undefined);
    return Number(result?.totalItems || 0);
  }

  async function loadStats({ manual = false } = {}) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const [rooms, students, professors, tas, activeSessions, sessionsList] = await Promise.all([
        countCollection('rooms'),
        countCollection('students'),
        countCollection('professors'),
        countCollection('teaching_assistants'),
        countCollection('sessions', 'status~"open" || status~"Open" || status~"active" || status~"Active"'),
        pb.collection('sessions').getList(1, 10, {
          sort: '-start_time',
          expand: 'schedule_id,schedule_id.subject_id,schedule_id.professor_id,schedule_id.ta_id,schedule_id.room_id',
        }),
      ]);

      setStats({
        rooms,
        students,
        professors,
        tas,
        activeSessions,
      });
      setRecentSessions(Array.isArray(sessionsList?.items) ? sessionsList.items : []);
      setError('');

      if (manual) {
        toast.success('Dashboard refreshed');
      }
    } catch (loadError) {
      console.error(loadError);
      const message = 'Failed to load admin overview data.';
      setError(message);
      if (manual) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const pulse = useRealtimePulse(() => loadStats(), { enabled: true, interval: 30000 });

  const liveLabel = pulse.isLive ? 'LIVE' : pulse.isPolling ? 'POLLING' : 'OFFLINE';
  const liveClasses = pulse.isLive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : pulse.isPolling
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';

  const metricCards = useMemo(
    () => [
      { key: 'students', label: 'Students', value: stats.students, icon: 'school' },
      { key: 'professors', label: 'Professors', value: stats.professors, icon: 'person' },
      { key: 'tas', label: 'Teaching Assistants', value: stats.tas, icon: 'groups' },
      { key: 'rooms', label: 'Rooms', value: stats.rooms, icon: 'meeting_room' },
      { key: 'activeSessions', label: 'Active Sessions', value: stats.activeSessions, icon: 'event_available' },
    ],
    [stats],
  );

  const recentRows = useMemo(() => {
    return recentSessions.map((session) => {
      const schedule = session?.expand?.schedule_id;
      const subject = schedule?.expand?.subject_id;
      const professor = schedule?.expand?.professor_id;
      const ta = schedule?.expand?.ta_id;
      const room = schedule?.expand?.room_id;

      return {
        id: session.id,
        start_time: session.start_time,
        subject: subject?.name_en || subject?.name_ar || 'Unknown Subject',
        instructor: professor?.name_en || professor?.name_ar || ta?.name || ta?.name_ar || 'Unassigned',
        room: room?.room_code || room?.name || '-',
        status: String(session.status || 'unknown'),
      };
    });
  }, [recentSessions]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton variant="card" className="h-28" count={5} />
        <Skeleton variant="card" className="h-80" />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">System Overview</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Realtime institutional attendance and activity metrics.</p>
        </div>

        <div className="flex items-center gap-2">
          <div aria-label={`Connection status ${liveLabel}`} className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1 text-[11px] font-semibold ${liveClasses}`}>
            <span className="pulse-dot" />
            {liveLabel}
          </div>

          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={() => {
              void loadStats({ manual: true });
            }}
            aria-label="Refresh dashboard"
          >
            Refresh
          </Button>
        </div>
      </header>

      <ErrorBanner message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card, index) => (
          <StatCard
            key={card.key}
            label={card.label}
            metric={card.value}
            icon={<span className="material-symbols-outlined text-[22px]">{card.icon}</span>}
            trendDirection={card.key === 'activeSessions' && card.value === 0 ? 'down' : 'up'}
            delay={index}
            refreshKey={pulse.pulseCount}
            className={card.key === 'activeSessions' && card.value > 0 ? 'shadow-[var(--shadow-glow-primary)]' : ''}
          />
        ))}
      </section>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Recent Sessions</h2>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={[
              {
                key: 'start_time',
                label: 'Start Time',
                sortable: true,
                render: (value) => (value ? new Date(value).toLocaleString() : '-'),
              },
              { key: 'subject', label: 'Subject' },
              { key: 'instructor', label: 'Instructor' },
              { key: 'room', label: 'Room' },
              {
                key: 'status',
                label: 'Status',
                render: (value) => <Badge variant={statusVariant(value)}>{String(value || 'unknown')}</Badge>,
              },
            ]}
            rows={recentRows}
            rowKey="id"
            emptyIcon="event_busy"
            emptyTitle="No sessions available"
            emptySubtitle="Recent classes will appear after sessions begin running."
          />
        </CardBody>
      </Card>
    </div>
  );
}
