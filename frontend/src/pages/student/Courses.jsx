import { useEffect, useState } from 'react';
import { getStudentCourses } from '../../lib/apiClient';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

function attendanceVariant(rate) {
  if (rate >= 75) return 'ok';
  if (rate >= 60) return 'warning';
  return 'critical';
}

function seededGradient(input) {
  const palette = [
    ['#0ea5e9', '#06b6d4'],
    ['#14b8a6', '#10b981'],
    ['#0f766e', '#0ea5e9'],
    ['#2563eb', '#14b8a6'],
  ];

  const key = String(input || 'subject');
  const hash = key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const rows = await getStudentCourses();
      setCourses(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (e) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

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
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Your enrolled subjects and attendance performance.</p>
      </header>

      {courses.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
            <span className="material-symbols-outlined text-[var(--color-text-secondary)]">menu_book</span>
          </div>
          <h3 className="mb-1 text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">No courses available</h3>
          <p className="text-[var(--color-text-secondary)]">Your enrolled courses will appear here.</p>
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const rate = Number(course.attendance_percentage || 0);
            const [start, end] = seededGradient(course.code || course.subject_code || course.id);
            return (
              <Card key={course.id} variant="elevated" hoverable className="overflow-hidden">
                <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}>
                  <h2 className="line-clamp-1 text-[var(--text-xl)] font-semibold">{course.name_en || course.name_ar || 'Untitled Subject'}</h2>
                  <p className="text-[var(--text-sm)] text-white/85">{course.code || 'N/A'}</p>
                </div>

                <div className="space-y-3 p-5 text-[var(--text-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Level</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{course.level || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Attended</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{course.lectures_attended || 0} / {course.total_lectures || 0}</span>
                  </div>

                  <ProgressBar value={rate} showLabel={false} />

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Attendance</span>
                    <Badge variant={attendanceVariant(rate)} showDot={false}>{rate.toFixed(1)}%</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
