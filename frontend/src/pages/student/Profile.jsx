import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getApiBaseUrl, getStudentCourses } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';

function resolveAvatarUrl(user) {
  const raw = String(
    user?.avatar_url ||
    user?.avatarUrl ||
    user?.avatar ||
    user?.photo_url ||
    user?.photoUrl ||
    user?.image_url ||
    user?.image ||
    '',
  ).trim();

  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const base = getApiBaseUrl();
  if (raw.startsWith('/')) return `${base}${raw}`;

  if (user?.id) {
    return `${base}/api/files/students/${user.id}/${raw}`;
  }

  return `${base}/${raw}`;
}

export default function Profile() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [avatarErrored, setAvatarErrored] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const rows = await getStudentCourses();
      setCourses(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setCourses([]);
    }
  }

  const name = user?.name_en || user?.name || 'Student';
  const arabicName = user?.name_ar || '-';
  const faculty = user?.faculty || user?.college || '-';
  const enrollmentStatus = String(user?.enrollment_status || user?.status || '-');
  const enrollmentActive = ['active', 'enrolled', 'current'].includes(enrollmentStatus.toLowerCase());
  const rfidStatus = String(user?.rfid_status || '-');
  const rfidActive = rfidStatus.toLowerCase() === 'active';
  const academicYear = user?.academic_year || user?.year || '-';
  const semester = user?.semester || user?.term || '-';
  const groupName = user?.group_name || user?.group?.name || user?.group_id || '-';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';
  const avatarUrl = resolveAvatarUrl(user);

  useEffect(() => {
    setAvatarErrored(false);
  }, [avatarUrl]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Profile</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Student identity and academic details.</p>
      </header>

      <div className="flex justify-center">
        <Card variant="elevated" className="relative w-full max-w-[400px] overflow-hidden">
          <div className="relative h-28 bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">SMART ATTENDANCE SYSTEM</p>
            <div className="absolute right-5 top-4 rounded-lg bg-white/20 p-2">
              <span className="material-symbols-outlined text-base">sim_card</span>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-10 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[var(--color-surface-2)] text-2xl font-semibold text-[var(--color-text-primary)]">
                {avatarUrl && !avatarErrored ? (
                  <img
                    src={avatarUrl}
                    alt={`${name} avatar`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarErrored(true)}
                  />
                ) : (
                  initials
                )}
              </div>
            </div>

            <div className="mt-3 text-center">
              <h2 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)]">{name}</h2>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-secondary)]" dir="rtl">{arabicName}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[var(--text-sm)]">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Faculty</p>
                <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{faculty}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Department</p>
                <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{user?.department || '-'}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Level</p>
                <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{user?.level || '-'}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Status</p>
                <p className={`mt-1 inline-flex items-center gap-1 font-semibold ${enrollmentActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span className={`h-2 w-2 rounded-full ${enrollmentActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {enrollmentStatus}
                </p>
              </div>
            </div>

            <div className={`mt-4 flex items-center justify-between rounded-[var(--radius-md)] px-3 py-3 ${rfidActive ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'}`}>
              <div className={`flex items-center gap-2 ${rfidActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                <span className="material-symbols-outlined">contactless</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)]">RFID STATUS</p>
                  <p className="text-[var(--text-sm)] font-semibold">{rfidStatus}</p>
                </div>
              </div>
              <Badge variant={rfidActive ? 'ok' : 'warning'}>{rfidStatus.toUpperCase()}</Badge>
            </div>

            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">STUDENT ID</p>
              <p className="mt-1 text-[var(--text-xl)] font-bold tracking-wider text-[var(--color-text-primary)] [font-family:var(--font-mono)]">
                {user?.student_id_number || user?.national_id || '-'}
              </p>
            </div>

            <div className="absolute bottom-5 right-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-1.5 shadow-[var(--shadow-sm)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-[var(--color-text-secondary)]">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 4h2v2h-2v-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Enrolled Subjects</h2>
          </CardHeader>
          <CardBody className="space-y-2">
          <div className="mt-3 space-y-2">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                <div>
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{course.name_en || course.name_ar || 'Unknown Subject'}</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">{course.code || 'N/A'}</p>
                </div>
                <Badge variant="info" showDot={false}>Level {course.level || '-'}</Badge>
              </div>
            ))}
            {courses.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                No enrolled subjects found.
              </p>
            ) : null}
          </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Academic Info</h2>
          </CardHeader>
          <CardBody>
            <dl className="mt-3 space-y-2 text-[var(--text-sm)]">
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <dt className="text-[var(--color-text-secondary)]">Academic Year</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">{academicYear}</dd>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <dt className="text-[var(--color-text-secondary)]">Semester</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">{semester}</dd>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <dt className="text-[var(--color-text-secondary)]">Group</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">{groupName}</dd>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <dt className="text-[var(--color-text-secondary)]">Email</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">{user?.email || '-'}</dd>
            </div>
          </dl>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
