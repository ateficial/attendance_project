import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import RoleLayoutShell from '../../components/layout/RoleLayoutShell';
import { useAuth } from '../../hooks/useAuth';

const navLinks = [
  { to: '/student', icon: 'dashboard', label: 'Overview', end: true },
  { to: '/student/courses', icon: 'menu_book', label: 'My Courses' },
  { to: '/student/history', icon: 'calendar_month', label: 'Attendance History' },
  { to: '/student/warnings', icon: 'bar_chart', label: 'Reports & Warnings' },
  { to: '/student/profile', icon: 'person', label: 'Profile' },
];

export default function StudentLayout() {
  const { user, logout, toggleLang, lang } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const initials = useMemo(() => {
    const source = user?.name_en || user?.name || user?.email || 'ST';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST';
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <RoleLayoutShell
      role="student"
      brandTitle="Smart Attendance"
      roleLabel="Student Portal"
      initials={initials}
      userName={user?.name_en || user?.name || 'Student'}
      userMeta={user?.national_id || user?.email || 'Student'}
      navLinks={navLinks}
      onLogout={handleLogout}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder="Search courses and history"
      searchResults={[]}
      onSearchSelect={() => {}}
      notificationCount={1}
      onNotificationClick={() => navigate('/student/warnings')}
      lang={lang}
      onToggleLang={toggleLang}
      profileItems={[
        {
          key: 'profile',
          label: 'Profile',
          icon: 'person',
          onClick: () => navigate('/student/profile'),
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
