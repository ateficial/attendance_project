import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getTASessions, getTASubjects } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';

function statusVariant(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('active')) return 'ok';
  if (normalized.includes('inactive') || normalized.includes('suspend')) return 'critical';
  return 'neutral';
}

export default function TAProfile() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [sessionRows, setSessionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [subjectRows, allSessions] = await Promise.all([
          getTASubjects(),
          getTASessions(),
        ]);

        if (!active) return;
        setSubjects(Array.isArray(subjectRows) ? subjectRows : []);
        setSessionRows(Array.isArray(allSessions) ? allSessions : []);
        setError('');
      } catch (loadError) {
        if (!active) return;
        setSubjects([]);
        setSessionRows([]);
        setError(loadError?.message || 'Unable to load profile details right now.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const displayName = user?.name || user?.name_en || 'Teaching Assistant';

  const initials = useMemo(() => {
    const source = displayName || user?.email || 'TA';
    return (
      source
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'TA'
    );
  }, [displayName, user]);

  const assignedSubjectRows = useMemo(() => {
    const ids = Array.isArray(user?.assigned_subjects) ? user.assigned_subjects.map((id) => String(id)) : [];
    if (ids.length === 0) return subjects;
    return subjects.filter((subject) => ids.includes(String(subject.id)));
  }, [user, subjects]);

  const assignedGroups = useMemo(() => {
    const map = new Map();
    const ids = Array.isArray(user?.assigned_groups) ? user.assigned_groups.map((id) => String(id)) : [];

    for (const session of sessionRows) {
      const groupId = String(session.group_id || '');
      if (!groupId) continue;
      if (ids.length > 0 && !ids.includes(groupId)) continue;
      map.set(groupId, {
        id: groupId,
        name: session.group_name || `Group ${groupId.slice(0, 6)}`,
      });
    }

    if (map.size === 0 && ids.length > 0) {
      for (const id of ids) {
        map.set(id, { id, name: `Group ${id.slice(0, 6)}` });
      }
    }

    return Array.from(map.values());
  }, [user, sessionRows]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton variant="card" className="h-28" count={3} />
        <Skeleton variant="card" className="h-80" />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">TA Profile</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Your profile details, teaching assignments, and operational scope.</p>
        </div>
        <Badge variant={statusVariant(user?.status)}>{user?.status || 'active'}</Badge>
      </header>

      <ErrorBanner message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned Subjects"
          metric={assignedSubjectRows.length}
          icon={<span className="material-symbols-outlined text-[22px]">book_2</span>}
          trendDirection="up"
          delay={0}
        />
        <StatCard
          label="Assigned Groups"
          metric={assignedGroups.length}
          icon={<span className="material-symbols-outlined text-[22px]">groups</span>}
          trendDirection="up"
          delay={1}
        />
        <StatCard
          label="Linked Sessions"
          metric={sessionRows.length}
          icon={<span className="material-symbols-outlined text-[22px]">event_repeat</span>}
          trendDirection={sessionRows.length > 0 ? 'up' : 'down'}
          delay={2}
        />
        <StatCard
          label="Department"
          metric={user?.department ? String(user.department).slice(0, 12) : 'N/A'}
          icon={<span className="material-symbols-outlined text-[22px]">apartment</span>}
          trendDirection="up"
          delay={3}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card variant="elevated" className="overflow-hidden">
          <div className="relative overflow-hidden border-b border-[var(--role-primary)]/20 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.26),transparent_45%),linear-gradient(135deg,var(--role-primary),var(--role-accent))] p-[var(--space-5)] text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Smart Attendance System</p>
            <p className="text-[var(--text-sm)] font-medium text-white/90">Teaching Assistant Identity</p>
            <span className="absolute right-4 top-4 rounded-[var(--radius-md)] bg-white/20 px-2 py-1 text-[11px] font-semibold text-white/90">{user?.employee_id || 'N/A'}</span>
          </div>

          <CardBody>
            <div className="-mt-12 flex justify-center">
              <span className="inline-flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[var(--color-surface-3)] text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] shadow-[var(--shadow-md)]">
                {initials}
              </span>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)]">{displayName}</h2>
              <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]" dir="rtl">{user?.name_ar || '—'}</p>
            </div>

            <dl className="mt-5 space-y-3 text-[var(--text-sm)]">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Email</dt>
                <dd className="mt-1 break-all font-semibold text-[var(--color-text-primary)]">{user?.email || 'N/A'}</dd>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Employee ID</dt>
                <dd className="mt-1 font-semibold text-[var(--color-text-primary)]">{user?.employee_id || 'N/A'}</dd>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Department</dt>
                <dd className="mt-1 font-semibold text-[var(--color-text-primary)]">{user?.department || 'N/A'}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Assigned Subjects</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {assignedSubjectRows.map((subject, index) => (
                  <article
                    key={subject.id}
                    className="rounded-[var(--radius-md)] border border-[var(--role-primary)]/20 bg-[var(--role-soft)]/55 p-3"
                    style={{
                      animation: 'pageEnter 220ms var(--ease-enter) both',
                      animationDelay: `${index * 60}ms`,
                    }}
                  >
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{subject.name_en || subject.name_ar || 'Unknown Subject'}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">{subject.code || subject.subject_code || 'N/A'}</p>
                  </article>
                ))}

                {assignedSubjectRows.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                    No assigned subjects found.
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Assigned Groups</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {assignedGroups.map((group, index) => (
                  <article
                    key={group.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                    style={{
                      animation: 'pageEnter 220ms var(--ease-enter) both',
                      animationDelay: `${index * 60}ms`,
                    }}
                  >
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{group.name}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">ID: {group.id}</p>
                  </article>
                ))}

                {assignedGroups.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                    No assigned groups found.
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
