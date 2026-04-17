import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTASubjects } from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import ErrorBanner from '../../components/ui/ErrorBanner';

function seededGradient(input) {
  const palette = [
    ['#0891b2', '#2563eb'],
    ['#0f766e', '#0ea5e9'],
    ['#0369a1', '#0d9488'],
    ['#0284c7', '#14b8a6'],
  ];

  const key = String(input || 'ta-subject');
  const hash = key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export default function TASubjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubjectId, setActiveSubjectId] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const results = await getTASubjects();
      setSubjects(results);
      setError('');
    } catch (e) {
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId) || null,
    [subjects, activeSubjectId]
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
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">My Subjects</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">All your assigned sections with quick attendance access.</p>
      </header>

      {subjects.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
            <span className="material-symbols-outlined text-[var(--color-text-secondary)]">menu_book</span>
          </div>
          <h3 className="mb-1 text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">No sections assigned</h3>
          <p className="text-[var(--color-text-secondary)]">You don't have any sections assigned to you yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const [start, end] = seededGradient(subject.code || subject.subject_code || subject.id);
            return (
            <Card key={subject.id} variant="elevated" hoverable className="overflow-hidden">
              <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}>
                <p className="line-clamp-1 text-[var(--text-xl)] font-semibold">{subject.name_en || subject.name_ar || 'Untitled Subject'}</p>
                <p className="mt-1 text-[var(--text-sm)] text-white/85">{subject.code || subject.subject_code || 'N/A'}</p>
                <span className="absolute right-4 top-4 rounded-[var(--radius-full)] bg-white/20 px-2 py-1 text-xs font-semibold">
                  Section
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between text-[var(--text-sm)]">
                  <span className="text-[var(--color-text-secondary)]">Level</span>
                  <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {subject.level || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--text-sm)]">
                  <span className="text-[var(--color-text-secondary)]">Department</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{subject.department || '-'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => setActiveSubjectId(subject.id)}
                    variant="ghost"
                    size="sm"
                    fullWidth
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => navigate(`/ta/attendance?subject_id=${encodeURIComponent(subject.id)}`)}
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

      {activeSubject ? (
        <Modal
          open
          onClose={() => setActiveSubjectId('')}
          title={activeSubject.name_en || activeSubject.name_ar || 'Subject Details'}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveSubjectId('')}>Close</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/ta/attendance?subject_id=${encodeURIComponent(activeSubject.id)}`)}
              >
                Open Attendance
              </Button>
            </div>
          }
        >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Subject Type</dt>
                <dd className="mt-1 text-[var(--text-sm)] text-[var(--color-text-primary)]">{activeSubject.subject_type || 'Section'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Level</dt>
                <dd className="mt-1 text-[var(--text-sm)] text-[var(--color-text-primary)]">{activeSubject.level || '-'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Department</dt>
                <dd className="mt-1 text-[var(--text-sm)] text-[var(--color-text-primary)]">{activeSubject.department || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">Arabic Name</dt>
                <dd className="mt-1 text-[var(--text-sm)] text-[var(--color-text-primary)]">{activeSubject.name_ar || '-'}</dd>
              </div>
            </dl>
        </Modal>
      ) : null}
    </div>
  );
}
