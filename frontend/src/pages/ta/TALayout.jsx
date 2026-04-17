import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RoleLayoutShell from '../../components/layout/RoleLayoutShell';
import { useAuth } from '../../hooks/useAuth';
import { getTARecentAttendance, getTADashboardStats, getTASubjects } from '../../lib/apiClient';

const navLinks = [
  { to: '/ta', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/ta/subjects', label: 'My Subjects', icon: 'menu_book' },
  { to: '/ta/attendance', label: 'Attendance Sheets', icon: 'fact_check' },
  { to: '/ta/reports', label: 'Reports', icon: 'bar_chart' },
  { to: '/ta/profile', label: 'Profile', icon: 'person' },
];

export default function TALayout() {
  const { user, logout, toggleLang, lang } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [atRiskCount, setAtRiskCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadHeaderData() {
      try {
        const [stats, fetchedSubjects, fetchedRecords] = await Promise.all([
          getTADashboardStats(),
          getTASubjects(),
          getTARecentAttendance(40),
        ]);

        if (!active) return;
        setSubjects(Array.isArray(fetchedSubjects) ? fetchedSubjects : []);
        setRecentRecords(Array.isArray(fetchedRecords) ? fetchedRecords : []);
        setAtRiskCount(Array.isArray(stats?.at_risk_students) ? stats.at_risk_students.length : 0);
      } catch (error) {
        if (!active) return;
        setSubjects([]);
        setRecentRecords([]);
        setAtRiskCount(0);
      }
    }

    loadHeaderData();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = useMemo(() => {
    const source = user?.name || user?.name_en || user?.email || 'TA';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'TA';
  }, [user]);

  const searchItems = useMemo(() => {
    const subjectRows = subjects.map((subject) => ({
      key: `subject-${subject.id}`,
      label: subject.name_en || subject.name_ar || 'Untitled Subject',
      subLabel: `Section • ${subject.code || subject.subject_code || 'N/A'}`,
      to: `/ta/attendance?subject_id=${encodeURIComponent(subject.id)}`,
    }));

    const studentRows = recentRecords
      .filter((row) => row?.student?.name_en)
      .map((row) => ({
        key: `student-${row.id}`,
        label: row.student.name_en,
        subLabel: row?.subject?.name_en ? `Student • ${row.subject.name_en}` : 'Student',
        to: `/ta/attendance?search=${encodeURIComponent(row.student.name_en)}`,
      }));

    return [...subjectRows, ...studentRows];
  }, [subjects, recentRecords]);

  const filteredSearchItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((item) => item.label.toLowerCase().includes(q) || item.subLabel.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchItems, searchTerm]);

  return (
    <RoleLayoutShell
      role="ta"
      brandTitle="Smart Attendance"
      roleLabel="TA Portal"
      initials={initials}
      userName={user?.name || user?.name_en || 'Teaching Assistant'}
      userMeta={user?.email || 'Section Staff'}
      navLinks={navLinks}
      onLogout={handleLogout}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder="Search sections and students"
      searchResults={filteredSearchItems}
      onSearchSelect={(item) => {
        setSearchTerm('');
        navigate(item.to);
      }}
      notificationCount={atRiskCount}
      onNotificationClick={() => {
        if (atRiskCount > 0) {
          navigate('/ta/reports');
          return;
        }
        toast('No new notifications');
      }}
      lang={lang}
      onToggleLang={toggleLang}
      profileItems={[
        {
          key: 'profile',
          label: 'Profile',
          icon: 'person',
          onClick: () => navigate('/ta/profile'),
        },
        {
          key: 'logout',
          label: 'Logout',
          icon: 'logout',
          onClick: handleLogout,
          danger: true,
        },
      ]}
    >
      <Outlet />
    </RoleLayoutShell>
  );
}
