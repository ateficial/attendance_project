import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import RoleLayoutShell from '../../components/layout/RoleLayoutShell';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { user, logout, toggleLang, lang } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const navLinks = [
    { to: '/admin', icon: 'dashboard', label: 'Overview', end: true },
    { to: '/admin/rooms', icon: 'meeting_room', label: 'Rooms' },
    { to: '/admin/users', icon: 'groups', label: 'Users' },
    { to: '/admin/schedule', icon: 'calendar_month', label: 'Schedule' },
    { to: '/admin/reports', icon: 'analytics', label: 'Reports' },
    { to: '/admin/settings', icon: 'settings', label: 'Settings' },
  ];

  const initials = useMemo(() => {
    const source = user?.name || user?.name_en || user?.email || 'AD';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AD';
  }, [user]);

  const searchItems = navLinks
    .filter((link) => !link.end)
    .map((link) => ({
      key: link.to,
      label: link.label,
      subLabel: 'Admin section',
      to: link.to,
    }))
    .filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase()));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <RoleLayoutShell
      role="admin"
      brandTitle="Smart Attendance"
      roleLabel="Admin Portal"
      initials={initials}
      userName={user?.name || user?.name_en || 'Administrator'}
      userMeta={user?.email || 'System Owner'}
      navLinks={navLinks}
      onLogout={handleLogout}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder="Search admin sections"
      searchResults={searchItems}
      onSearchSelect={(item) => {
        setSearchTerm('');
        navigate(item.to);
      }}
      notificationCount={0}
      onNotificationClick={() => navigate('/admin/reports')}
      lang={lang}
      onToggleLang={toggleLang}
      profileItems={[
        {
          key: 'settings',
          label: 'System Settings',
          icon: 'settings',
          onClick: () => navigate('/admin/settings'),
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
