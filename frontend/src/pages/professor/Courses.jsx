import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import { getProfessorCourses } from '../../lib/apiClient';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

function attendanceColor(rate) {
  if (rate >= 75) return 'text-emerald-700';
  if (rate >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function seededGradient(input) {
  const palette = [
    ['#4f46e5', '#4338ca'],
    ['#0d9488', '#0f766e'],
    ['#7c3aed', '#6d28d9'],
    ['#2563eb', '#1d4ed8'],
    ['#db2777', '#be185d'],
    ['#ea580c', '#c2410c'],
  ];

  const key = String(input || 'course');
  const hash = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export default function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCourseId, setActiveCourseId] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const results = await getProfessorCourses();
      setCourses(results);
      setError('');
    } catch (e) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === activeCourseId) || null,
    [courses, activeCourseId]
  );

  if (loading) {
    return (
      <Skeleton variant="card" className="h-64" count={3} />
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">My Courses</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">All your assigned subjects with attendance performance.</p>
      </header>

      {courses.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <span className="material-symbols-outlined text-slate-500">menu_book</span>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-800">No courses assigned</h3>
          <p className="text-slate-500">You don't have any courses assigned to you yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const code = course.code || course.subject_code || 'N/A';
            const rate = Number(course.attendance_percentage || 0);
            const creditHours = Number(course.credit_hours || 0);
            const [start, end] = seededGradient(code);

            return (
              <Card key={course.id} variant="elevated" hoverable className="overflow-hidden">
                <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}>
                  <p className="line-clamp-1 text-[var(--text-2xl)] font-bold leading-tight">{course.name_en || 'Untitled Subject'}</p>
                  <p className="mt-1 text-[var(--text-sm)] text-white/80">{code}</p>
                  <span className="absolute right-4 top-4 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
                    Level {course.level || '-'}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-end justify-between text-sm">
                    <div>
                      <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">Attendance Rate</p>
                      <p className={`text-[var(--text-3xl)] font-bold ${attendanceColor(rate)}`}>{rate.toFixed(1)}%</p>
                    </div>
                    <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                      {rate >= 75 ? 'Healthy' : rate >= 50 ? 'Watch' : 'Critical'}
                    </span>
                  </div>

                  <ProgressBar value={rate} showLabel={false} />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Credit Hours</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{creditHours || '-'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      onClick={() => setActiveCourseId(course.id)}
                      variant="ghost"
                      size="sm"
                      fullWidth
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => navigate(`/professor/attendance?subject_id=${encodeURIComponent(course.id)}`)}
                      variant="primary"
                      size="sm"
                      fullWidth
                    >
                      Attendance Sheets
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeCourse ? (
        <Modal
          open
          onClose={() => setActiveCourseId('')}
          title={activeCourse.name_en || 'Course Details'}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveCourseId('')}>Close</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/professor/attendance?subject_id=${encodeURIComponent(activeCourse.id)}`)}
              >
                Open Attendance
              </Button>
            </div>
          }
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Code</dt>
              <dd className="mt-1 text-[var(--text-base)] text-[var(--color-text-primary)]">{activeCourse.code || activeCourse.subject_code || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Level</dt>
              <dd className="mt-1 text-[var(--text-base)] text-[var(--color-text-primary)]">{activeCourse.level || '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Department</dt>
              <dd className="mt-1 text-[var(--text-base)] text-[var(--color-text-primary)]">{activeCourse.department || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Credit Hours</dt>
              <dd className="mt-1 text-[var(--text-base)] text-[var(--color-text-primary)]">{activeCourse.credit_hours || '-'}</dd>
            </div>
          </dl>
        </Modal>
      ) : null}
    </div>
  );
}
