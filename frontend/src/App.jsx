import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import { setupChartDefaults } from './lib/chartDefaults';

// Pages
import Login from './pages/Login';

// Professor
import ProfessorLayout from './pages/professor/ProfessorLayout';
import ProfOverview from './pages/professor/Overview';
import ProfCourses from './pages/professor/Courses';
import ProfAttendance from './pages/professor/Attendance';
import ProfAnalytics from './pages/professor/Analytics';
import ProfSchedule from './pages/professor/Schedule';
import ProfSettings from './pages/professor/Settings';

// Student
import StudentLayout from './pages/student/StudentLayout';
import StudentOverview from './pages/student/Overview';
import StudentCourses from './pages/student/Courses';
import StudentHistory from './pages/student/History';
import StudentWarnings from './pages/student/Warnings';
import StudentProfile from './pages/student/Profile';

import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminSchedule from './pages/admin/Schedule';
import AdminRooms from './pages/admin/Rooms';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import AdminReports from './pages/admin/Reports';

// Teaching Assistant
import TALayout from './pages/ta/TALayout';
import TAOverview from './pages/ta/TAOverview';
import TASubjects from './pages/ta/TASubjects';
import TAAttendance from './pages/ta/TAAttendance';
import TAReports from './pages/ta/TAReports';
import TAProfile from './pages/ta/TAProfile';

export default function App() {
  useEffect(() => {
    setupChartDefaults();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'app-toast',
            duration: 3800,
            style: {
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: {
              className: 'app-toast app-toast-success',
              iconTheme: {
                primary: 'var(--color-success)',
                secondary: '#ffffff',
              },
            },
            error: {
              className: 'app-toast app-toast-error',
              iconTheme: {
                primary: 'var(--color-danger)',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Professor Routes */}
          <Route path="/professor" element={<ProtectedRoute allowedRole="professor"><ProfessorLayout /></ProtectedRoute>}>
            <Route index element={<ProfOverview />} />
            <Route path="courses" element={<ProfCourses />} />
            <Route path="attendance" element={<ProfAttendance />} />
            <Route path="analytics" element={<ProfAnalytics />} />
            <Route path="schedule" element={<ProfSchedule />} />
            <Route path="settings" element={<ProfSettings />} />
            <Route path="*" element={<Navigate to="/professor" replace />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentLayout /></ProtectedRoute>}>
            <Route index element={<StudentOverview />} />
            <Route path="courses" element={<StudentCourses />} />
            <Route path="history" element={<StudentHistory />} />
            <Route path="warnings" element={<StudentWarnings />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* TA Routes */}
          <Route path="/ta" element={<ProtectedRoute allowedRole="ta"><TALayout /></ProtectedRoute>}>
            <Route index element={<TAOverview />} />
            <Route path="subjects" element={<TASubjects />} />
            <Route path="attendance" element={<TAAttendance />} />
            <Route path="reports" element={<TAReports />} />
            <Route path="profile" element={<TAProfile />} />
            <Route path="*" element={<Navigate to="/ta" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function ProtectedRoute({ children, allowedRole }) {
  const { user, userType, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && userType !== allowedRole) {
    if (userType === 'professor') return <Navigate to="/professor" replace />;
    if (userType === 'student') return <Navigate to="/student" replace />;
    if (userType === 'ta') return <Navigate to="/ta" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
}
