/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Teachers } from './pages/Teachers';
import { TeacherProfile } from './pages/TeacherProfile';
import { TeacherLeaderboard } from './pages/TeacherLeaderboard';
import { Groups } from './pages/Groups';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { StudentProfile } from './pages/StudentProfile';
import { Salaries } from './pages/Salaries';
import { Courses } from './pages/Courses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Schedule } from './pages/Schedule';
import { Gamification } from './pages/Gamification';
import { Library } from './pages/Library';
import { SupportTeachers } from './pages/SupportTeachers';
import { SMS } from './pages/SMS';
import { Chat } from './pages/Chat';
import { Branches } from './pages/Branches';
import { CRM } from './pages/CRM';
import { Kanban } from './pages/Kanban';
import { BranchManagers } from './pages/BranchManagers';
import { WebsiteManager } from './pages/WebsiteManager';
import { Polls } from './pages/Polls';
import { CourseModules } from './pages/CourseModules';
import { BranchProvider } from './contexts/BranchContext';

// Teacher Dashboard pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherHomework } from './pages/teacher/TeacherHomework';
import { MyProfile } from './pages/teacher/MyProfile';
// Student Dashboard
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentMobileDemo } from './pages/student/StudentMobileDemo';
import { useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'TEACHER') return <Navigate to="/teacher-dashboard" replace />;
  if (user?.role === 'STUDENT') return <Navigate to="/student-dashboard" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <BranchProvider>
      <Router>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/student-demo" element={<StudentMobileDemo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<RoleDashboard />} />
            <Route path="students" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Students /></ProtectedRoute>} />
            <Route path="students/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><StudentProfile /></ProtectedRoute>} />
            <Route path="teachers" element={<ProtectedRoute allowedRoles={['ADMIN']}><Teachers /></ProtectedRoute>} />
            <Route path="teachers/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><TeacherProfile /></ProtectedRoute>} />
            <Route path="teacher-leaderboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><TeacherLeaderboard /></ProtectedRoute>} />
            <Route path="support-teachers" element={<ProtectedRoute allowedRoles={['ADMIN']}><SupportTeachers /></ProtectedRoute>} />
            <Route path="groups" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><Groups /></ProtectedRoute>} />
            <Route path="courses" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><Courses /></ProtectedRoute>} />
            <Route path="attendance" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Attendance /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute allowedRoles={['ADMIN', 'STUDENT']}><Payments /></ProtectedRoute>} />
            <Route path="schedule" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><Schedule /></ProtectedRoute>} />
            <Route path="salaries" element={<ProtectedRoute allowedRoles={['ADMIN']}><Salaries /></ProtectedRoute>} />
            <Route path="sms" element={<ProtectedRoute allowedRoles={['ADMIN']}><SMS /></ProtectedRoute>} />
            <Route path="chat" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><Chat /></ProtectedRoute>} />
            <Route path="gamification" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}><Gamification /></ProtectedRoute>} />
            <Route path="library" element={<ProtectedRoute allowedRoles={['ADMIN']}><Library /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><Reports /></ProtectedRoute>} />
            <Route path="branches" element={<ProtectedRoute allowedRoles={['ADMIN']}><Branches /></ProtectedRoute>} />
            <Route path="crm" element={<ProtectedRoute allowedRoles={['ADMIN']}><CRM /></ProtectedRoute>} />
            <Route path="kanban" element={<ProtectedRoute allowedRoles={['ADMIN']}><Kanban /></ProtectedRoute>} />
            <Route path="branch-managers" element={<ProtectedRoute allowedRoles={['ADMIN']}><BranchManagers /></ProtectedRoute>} />
            <Route path="website" element={<ProtectedRoute allowedRoles={['ADMIN']}><WebsiteManager /></ProtectedRoute>} />
            <Route path="polls" element={<ProtectedRoute allowedRoles={['ADMIN']}><Polls /></ProtectedRoute>} />
            <Route path="course-modules" element={<ProtectedRoute allowedRoles={['ADMIN']}><CourseModules /></ProtectedRoute>} />
            <Route path="settings" element={<Settings />} />

            {/* Teacher-specific routes */}
            <Route path="teacher-dashboard" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="homework" element={<ProtectedRoute allowedRoles={['TEACHER']}><TeacherHomework /></ProtectedRoute>} />
            <Route path="my-profile" element={<ProtectedRoute allowedRoles={['TEACHER']}><MyProfile /></ProtectedRoute>} />

            {/* Student-specific routes */}
            <Route path="student-dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />

            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
      </BranchProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
