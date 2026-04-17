import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RoleLayoutShell from '../../components/layout/RoleLayoutShell';
import { useAuth } from '../../hooks/useAuth';
import { getProfessorCourses, getProfessorDashboardStats, getProfessorRecentAttendance } from '../../lib/apiClient';

const navLinks = [
  { to: '/professor', icon: 'dashboard', label: 'Overview', end: true },
  { to: '/professor/courses', icon: 'menu_book', label: 'My Courses' },
  { to: '/professor/attendance', icon: 'fact_check', label: 'Attendance Sheets' },
  { to: '/professor/analytics', icon: 'bar_chart', label: 'Reports & Analytics' },
  { to: '/professor/schedule', icon: 'calendar_month', label: 'Schedule' },
  { to: '/professor/settings', icon: 'settings', label: 'Settings' },
];

export default function ProfessorLayout() {
  const { user, logout, toggleLang, lang } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadHeaderData() {
      try {
        const [stats, fetchedCourses, fetchedRecords] = await Promise.all([
          getProfessorDashboardStats(),
          getProfessorCourses(),
          getProfessorRecentAttendance(undefined, 40),
        ]);

        if (!active) return;
        setAtRiskCount(Array.isArray(stats?.at_risk_students) ? stats.at_risk_students.length : 0);
        setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
        setRecentRecords(Array.isArray(fetchedRecords) ? fetchedRecords : []);
      } catch {
        if (!active) return;
        setAtRiskCount(0);
      }
    }

    loadHeaderData();
    return () => {
      active = false;
    };
  }, []);

  const initials = useMemo(() => {
    const source = user?.name || user?.name_en || user?.email || 'PR';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'PR';
  }, [user]);

  const searchItems = useMemo(() => {
    const studentRows = recentRecords
      .filter((row) => row?.student?.name_en)
      .map((row) => ({
        key: `student-${row.id}`,
        label: row.student.name_en,
        subLabel: row?.subject?.name_en ? `Student | ${row.subject.name_en}` : 'Student',
        to: `/professor/attendance?search=${encodeURIComponent(row.student.name_en)}`,
      }));

    const courseRows = courses.map((course) => ({
      key: `course-${course.id}`,
      label: course.name_en,
      subLabel: `Course | ${course.code || course.subject_code || 'N/A'}`,
      to: `/professor/attendance?subject_id=${encodeURIComponent(course.id)}`,
    }));

    return [...courseRows, ...studentRows];
  }, [courses, recentRecords]);

  const filteredSearchItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((item) => item.label.toLowerCase().includes(q) || item.subLabel.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchItems, searchTerm]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <RoleLayoutShell
      role="professor"
      brandTitle="Smart Attendance"
      roleLabel="Professor Portal"
      initials={initials}
      userName={user?.name || user?.name_en || 'Professor'}
      userMeta={user?.email || 'Senior Faculty'}
      navLinks={navLinks}
      onLogout={handleLogout}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder="Search courses and students"
      searchResults={filteredSearchItems}
      onSearchSelect={(item) => {
        setSearchTerm('');
        navigate(item.to);
      }}
      notificationCount={atRiskCount}
      onNotificationClick={() => {
        if (atRiskCount > 0) {
          navigate('/professor/analytics');
          return;
        }
        toast('No new notifications');
      }}
      lang={lang}
      onToggleLang={toggleLang}
      profileItems={[
        {
          key: 'settings',
          label: 'Change Passcode',
          icon: 'password',
          onClick: () => navigate('/professor/settings'),
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
