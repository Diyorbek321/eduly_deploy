import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { Staff } from './pages/Staff';
import { Students } from './pages/Students';
import { StudentProfile } from './pages/StudentProfile';
import { Teachers } from './pages/Teachers';
import { TeacherProfile } from './pages/TeacherProfile';
import { TeacherLeaderboard } from './pages/TeacherLeaderboard';
import { SupportTeachers } from './pages/SupportTeachers';
import { Groups } from './pages/Groups';
import { Courses } from './pages/Courses';
import { CourseModules } from './pages/CourseModules';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { Salaries } from './pages/Salaries';
import { Schedule } from './pages/Schedule';
import { SMS } from './pages/SMS';
import { Library } from './pages/Library';
import { Reports } from './pages/Reports';
import { CRM } from './pages/CRM';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/manager">
        <Routes>
          <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="finance" element={<Finance />} />
            <Route path="staff" element={<Staff />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="teachers/:id" element={<TeacherProfile />} />
            <Route path="teachers/leaderboard" element={<TeacherLeaderboard />} />
            <Route path="support-teachers" element={<SupportTeachers />} />
            <Route path="groups" element={<Groups />} />
            <Route path="courses" element={<Courses />} />
            <Route path="course-modules" element={<CourseModules />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payments" element={<Payments />} />
            <Route path="salaries" element={<Salaries />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="sms" element={<SMS />} />
            <Route path="library" element={<Library />} />
            <Route path="reports" element={<Reports />} />
            <Route path="crm" element={<CRM />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
